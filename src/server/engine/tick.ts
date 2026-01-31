// ============================================================
// ClawCity — Tick Engine
// Core game loop running every 30 seconds
// ============================================================

import { EventEmitter } from 'events';
import { getWorldState, setWorldState, getAllAgents, getDb } from '../db/index.js';
import { CONFIG } from '../config.js';
import { MapManager } from './map.js';
import { ActionQueue } from './actions.js';
import type { HighlightDetector } from './highlights.js';
import type { WorldEventSystem } from './world-events.js';
import type { SpectatorWebSocket } from '../ws/index.js';
import type { EconomySystem } from './economy.js';
import type { SocialSystem } from './social.js';

// --- Time Phase Mapping ---
// 480 ticks per game day
const PHASES = [
  { name: 'dawn',      startTick: 0,   endTick: 80,  startHour: 5,  endHour: 7 },
  { name: 'morning',   startTick: 80,  endTick: 240, startHour: 7,  endHour: 12 },
  { name: 'afternoon', startTick: 240, endTick: 340, startHour: 12, endHour: 17 },
  { name: 'evening',   startTick: 340, endTick: 420, startHour: 17, endHour: 21 },
  { name: 'night',     startTick: 420, endTick: 480, startHour: 21, endHour: 29 }, // 29 = 5am next day
] as const;

const WEATHERS = ['clear', 'cloudy', 'rain', 'storm', 'fog', 'sunny', 'windy'] as const;
const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;
const TICKS_PER_SEASON = CONFIG.TICKS_PER_DAY * 7; // 3360 ticks = 7 game days

export class TickEngine extends EventEmitter {
  private intervalId: NodeJS.Timeout | null = null;
  private wsServer: SpectatorWebSocket | null = null;
  private mapManager: MapManager | null = null;
  private actionQueue: ActionQueue | null = null;
  private highlightDetector: HighlightDetector | null = null;
  private worldEventSystem: WorldEventSystem | null = null;
  private economySystem: EconomySystem | null = null;
  private socialSystem: SocialSystem | null = null;

  attachWebSocket(wsServer: SpectatorWebSocket): void {
    this.wsServer = wsServer;
  }

  attachMapManager(mapManager: MapManager): void {
    this.mapManager = mapManager;
  }

  attachActionQueue(actionQueue: ActionQueue): void {
    this.actionQueue = actionQueue;
  }

  attachHighlightDetector(detector: HighlightDetector): void {
    this.highlightDetector = detector;
  }

  attachWorldEventSystem(system: WorldEventSystem): void {
    this.worldEventSystem = system;
  }

  attachEconomySystem(system: EconomySystem): void {
    this.economySystem = system;
  }

  attachSocialSystem(system: SocialSystem): void {
    this.socialSystem = system;
  }

  start(): void {
    console.log(`⏱️  Tick engine started (${CONFIG.TICK_INTERVAL_MS}ms per tick)`);

    // Initialize world state if not set
    if (!getWorldState('tick')) setWorldState('tick', '0');
    if (!getWorldState('weather')) setWorldState('weather', 'clear');
    if (!getWorldState('season')) setWorldState('season', 'spring');

    this.intervalId = setInterval(() => {
      this.processTick();
    }, CONFIG.TICK_INTERVAL_MS);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('⏱️  Tick engine stopped');
    }
  }

  getCurrentTick(): number {
    return parseInt(getWorldState('tick') || '0', 10);
  }

  processTick(): void {
    const currentTick = this.getCurrentTick();
    const newTick = currentTick + 1;

    // 1. Increment tick counter
    setWorldState('tick', String(newTick));

    // 2. Process queued agent actions
    let actionResults: unknown[] = [];
    if (this.actionQueue) {
      actionResults = this.actionQueue.processAll(newTick);
    }

    // 3. Respawn depleted resources
    if (this.mapManager) {
      this.mapManager.respawnResources(newTick);
    }

    // 3.5. Process economy system (property tax, rent, market expiry, scarcity)
    if (this.economySystem) {
      this.economySystem.processTick(newTick, this.getSeason());
    }

    // 3.6. Process social system (relationships, gossip decay, faction reputation)
    if (this.socialSystem) {
      this.socialSystem.processTick(newTick);
      this.socialSystem.spreadGossip(newTick);
    }

    // 4. Update weather (10% chance of change per tick)
    const weatherChanged = this.maybeUpdateWeather(newTick);

    // 5. Get day phase based on tick count
    const gameTime = this.getGameTime(newTick);

    // 6. Check for season change (every 3360 ticks)
    const seasonChanged = this.maybeUpdateSeason(newTick);

    // 6b. Check for world events
    if (this.worldEventSystem) {
      const worldEvent = this.worldEventSystem.checkForEvents(newTick, this.getSeason(), this.getWeather());
      if (worldEvent && this.wsServer) {
        this.wsServer.broadcastWorldEvent('world_event', {
          type: worldEvent.type,
          summary: worldEvent.summary,
          tick: newTick,
        });
      }
      // Apply ongoing effects of active events
      this.worldEventSystem.applyActiveEffects(newTick);
    }

    // 6c. Run highlight tick checks (milestones)
    if (this.highlightDetector) {
      const tickHighlights = this.highlightDetector.checkTick(newTick);
      for (const h of tickHighlights) {
        if (this.wsServer) {
          this.wsServer.broadcastHighlight(h);
        }
      }
    }

    // Energy regeneration for all agents (small passive regen)
    getDb().exec('UPDATE agents SET energy = MIN(1.0, energy + 0.01)');

    // 7. Emit tick event via EventEmitter
    const tickPayload = {
      tick: newTick,
      gameTime,
      weather: this.getWeather(),
      season: this.getSeason(),
      actionResults,
    };
    this.emit('tick', tickPayload);

    // Broadcast tick to spectators
    if (this.wsServer) {
      this.wsServer.broadcastTick(newTick);
    }

    // 8. Log interesting events
    if (weatherChanged) {
      this.logEvent('weather_change', { weather: this.getWeather(), tick: newTick }, newTick, gameTime);
    }
    if (seasonChanged) {
      this.logEvent('season_change', { season: this.getSeason(), tick: newTick }, newTick, gameTime);
    }

    // Log day change
    const tickInDay = newTick % CONFIG.TICKS_PER_DAY;
    if (tickInDay === 1) {
      const day = Math.floor(newTick / CONFIG.TICKS_PER_DAY) + 1;
      this.logEvent('day_change', { day, tick: newTick }, newTick, gameTime);
    }

    // Periodic log
    if (newTick % 10 === 0) {
      const agents = getAllAgents();
      console.log(`⏱️  Tick ${newTick} | ${gameTime.phase} ${gameTime.hour}:${String(gameTime.minute).padStart(2, '0')} Day ${gameTime.day} | ${this.getWeather()} | ${this.getSeason()} | ${agents.length} agents`);
    }
  }

  getGameTime(tick?: number): { day: number; hour: number; minute: number; phase: string } {
    const t = tick ?? this.getCurrentTick();
    const day = Math.floor(t / CONFIG.TICKS_PER_DAY) + 1;
    const tickInDay = t % CONFIG.TICKS_PER_DAY;

    // Find current phase
    let phase = 'night';
    let hour = 21;
    let minute = 0;

    for (const p of PHASES) {
      if (tickInDay >= p.startTick && tickInDay < p.endTick) {
        phase = p.name;
        // Linear interpolation of hours within the phase
        const phaseProgress = (tickInDay - p.startTick) / (p.endTick - p.startTick);
        const totalMinutes = p.startHour * 60 + phaseProgress * (p.endHour - p.startHour) * 60;
        hour = Math.floor(totalMinutes / 60) % 24;
        minute = Math.floor(totalMinutes % 60);
        break;
      }
    }

    return { day, hour, minute, phase };
  }

  getGameTimeString(tick?: number): string {
    const gt = this.getGameTime(tick);
    return `Day ${gt.day} ${String(gt.hour).padStart(2, '0')}:${String(gt.minute).padStart(2, '0')} (${gt.phase})`;
  }

  getWeather(): string {
    return getWorldState('weather') || 'clear';
  }

  getSeason(): string {
    return getWorldState('season') || 'spring';
  }

  private maybeUpdateWeather(tick: number): boolean {
    if (Math.random() < 0.10) {
      const current = this.getWeather();
      let newWeather: string;
      do {
        newWeather = WEATHERS[Math.floor(Math.random() * WEATHERS.length)];
      } while (newWeather === current);

      setWorldState('weather', newWeather);

      if (this.wsServer) {
        this.wsServer.broadcastWorldEvent('weather_change', { weather: newWeather, tick });
      }
      return true;
    }
    return false;
  }

  private maybeUpdateSeason(tick: number): boolean {
    if (tick > 0 && tick % TICKS_PER_SEASON === 0) {
      const current = this.getSeason();
      const idx = SEASONS.indexOf(current as typeof SEASONS[number]);
      const newSeason = SEASONS[(idx + 1) % SEASONS.length];
      setWorldState('season', newSeason);

      if (this.wsServer) {
        this.wsServer.broadcastWorldEvent('season_change', { season: newSeason, tick });
      }
      console.log(`🌿 Season changed to ${newSeason}!`);
      return true;
    }
    return false;
  }

  private logEvent(type: string, data: unknown, tick: number, gameTime: { day: number; hour: number; minute: number; phase: string }): void {
    const gameTimeStr = `Day ${gameTime.day} ${String(gameTime.hour).padStart(2, '0')}:${String(gameTime.minute).padStart(2, '0')}`;
    const highlightScore = type === 'season_change' ? 3 : type === 'day_change' ? 2 : 1;

    getDb().prepare(
      'INSERT INTO events (type, data, tick, game_time, highlight_score) VALUES (?, ?, ?, ?, ?)'
    ).run(type, JSON.stringify(data), tick, gameTimeStr, highlightScore);
  }
}
