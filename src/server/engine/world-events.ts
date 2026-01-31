// ============================================================
// ClawCity — World Event System
// Scheduled and random world events that shake things up
// ============================================================

import { getDb, getWorldState, setWorldState, getAllAgents } from '../db/index.js';
import { CONFIG } from '../config.js';
import type { HighlightDetector } from './highlights.js';

export interface ActiveWorldEvent {
  id: string;
  type: string;
  startTick: number;
  endTick: number;
  data: Record<string, unknown>;
  summary: string;
}

export class WorldEventSystem {
  private activeEvents: ActiveWorldEvent[] = [];
  private highlightDetector: HighlightDetector | null = null;
  private eventCounter = 0;

  attachHighlightDetector(detector: HighlightDetector): void {
    this.highlightDetector = detector;
  }

  /**
   * Called each tick — chance-based event triggers
   */
  checkForEvents(tick: number, season: string, weather: string): ActiveWorldEvent | null {
    // Clean up expired events
    this.cleanupExpired(tick);

    // Don't stack too many events
    if (this.activeEvents.length >= 3) return null;

    const day = Math.floor(tick / CONFIG.TICKS_PER_DAY) + 1;
    const tickInDay = tick % CONFIG.TICKS_PER_DAY;
    const isNight = tickInDay >= 420 || tickInDay < 80;

    // --- Storm: 5% per tick when cloudy ---
    if ((weather === 'cloudy' || weather === 'rain') && Math.random() < 0.05) {
      if (!this.hasActiveEvent('storm')) {
        return this.triggerEvent('storm', { weather }, tick);
      }
    }

    // --- Resource Boom: Day 7+, 1% per tick ---
    if (day >= 7 && Math.random() < 0.01) {
      if (!this.hasActiveEvent('resource_boom')) {
        const mapSize = CONFIG.MAP_SIZE;
        const areaX = Math.floor(Math.random() * mapSize);
        const areaY = Math.floor(Math.random() * mapSize);
        return this.triggerEvent('resource_boom', { areaX, areaY, radius: 5 }, tick);
      }
    }

    // --- New Land: Every 7 days ---
    const lastExpansion = parseInt(getWorldState('last_land_expansion_day') || '0', 10);
    if (day > 0 && day % 7 === 0 && day !== lastExpansion) {
      setWorldState('last_land_expansion_day', String(day));
      return this.triggerEvent('new_land', { columns: 4 }, tick);
    }

    // --- Meteor Shower: Night, 2% per tick ---
    if (isNight && Math.random() < 0.02) {
      if (!this.hasActiveEvent('meteor_shower')) {
        return this.triggerEvent('meteor_shower', {}, tick);
      }
    }

    // --- Festival Day: Every 30 days ---
    const lastFestival = parseInt(getWorldState('last_festival_day') || '0', 10);
    if (day > 0 && day % 30 === 0 && day !== lastFestival) {
      setWorldState('last_festival_day', String(day));
      return this.triggerEvent('festival', {}, tick);
    }

    return null;
  }

  /**
   * Manually trigger a world event
   */
  triggerEvent(type: string, data: Record<string, unknown> = {}, tick?: number): ActiveWorldEvent {
    const currentTick = tick ?? parseInt(getWorldState('tick') || '0', 10);
    this.eventCounter++;
    const id = `evt_${currentTick}_${this.eventCounter}`;

    let duration: number;
    let summary: string;
    let score: number;

    switch (type) {
      case 'storm':
        duration = 10 + Math.floor(Math.random() * 11); // 10-20 ticks
        summary = '⛈️ A storm is hitting ClawCity!';
        score = 5;
        this.applyStormEffects(currentTick);
        break;

      case 'resource_boom':
        duration = 48; // 1 game day
        summary = `🌟 Resource boom! Double yields near (${data.areaX}, ${data.areaY})!`;
        score = 6;
        break;

      case 'new_land':
        duration = 0; // Permanent
        summary = '🗺️ New territory discovered! The map has expanded!';
        score = 7;
        this.expandMap(data.columns as number || 4, currentTick);
        break;

      case 'meteor_shower':
        duration = 5;
        summary = '☄️ A meteor shower lights up the sky! Rare crystals incoming!';
        score = 7;
        this.scatterCrystals(currentTick);
        break;

      case 'festival':
        duration = CONFIG.TICKS_PER_DAY; // 1 full game day
        summary = '🎉 Festival Day! Everyone is in high spirits!';
        score = 6;
        this.applyFestivalEffects();
        break;

      default:
        duration = 10;
        summary = `🌀 Unknown event: ${type}`;
        score = 3;
    }

    const event: ActiveWorldEvent = {
      id,
      type,
      startTick: currentTick,
      endTick: duration > 0 ? currentTick + duration : -1, // -1 = permanent
      data: { ...data, summary },
      summary,
    };

    this.activeEvents.push(event);

    // Log to events table
    getDb().prepare(
      'INSERT INTO events (type, data, tick, highlight_score) VALUES (?, ?, ?, ?)'
    ).run(
      `world_event_${type}`,
      JSON.stringify({ ...data, summary, event_id: id, duration }),
      currentTick,
      score
    );

    console.log(`🌍 World Event: ${summary} (duration: ${duration > 0 ? duration + ' ticks' : 'permanent'})`);

    return event;
  }

  /**
   * Apply ongoing effects of active events (called each tick)
   */
  applyActiveEffects(tick: number): void {
    for (const event of this.activeEvents) {
      switch (event.type) {
        case 'storm':
          // Drain energy of agents outdoors (no home)
          if (tick % 3 === 0) { // Every 3 ticks during storm
            getDb().exec('UPDATE agents SET energy = MAX(0, energy - 0.02) WHERE home_x IS NULL');
          }
          break;

        case 'festival':
          // Mood boost every 10 ticks during festival
          if (tick % 10 === 0) {
            getDb().exec('UPDATE agents SET mood = MIN(1.0, mood + 0.05)');
          }
          break;

        // resource_boom effects are handled in gather action checks
      }
    }
  }

  /**
   * Check if a resource boom is active at a location
   */
  isResourceBoomActive(x: number, y: number): boolean {
    for (const event of this.activeEvents) {
      if (event.type === 'resource_boom') {
        const ax = event.data.areaX as number;
        const ay = event.data.areaY as number;
        const radius = (event.data.radius as number) || 5;
        if (Math.abs(x - ax) <= radius && Math.abs(y - ay) <= radius) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Check if a festival is active (double affinity gains)
   */
  isFestivalActive(): boolean {
    return this.hasActiveEvent('festival');
  }

  /**
   * Get all active events
   */
  getActiveEvents(): ActiveWorldEvent[] {
    return [...this.activeEvents];
  }

  /**
   * Get recent world events from DB
   */
  getRecentEvents(limit: number = 10): Array<{ type: string; data: any; tick: number; score: number }> {
    const rows = getDb().prepare(
      "SELECT type, data, tick, highlight_score FROM events WHERE type LIKE 'world_event_%' ORDER BY id DESC LIMIT ?"
    ).all(limit) as unknown as Array<{ type: string; data: string; tick: number; highlight_score: number }>;

    return rows.map(r => ({
      type: r.type.replace('world_event_', ''),
      data: JSON.parse(r.data || '{}'),
      tick: r.tick,
      score: r.highlight_score,
    }));
  }

  // --- Private helpers ---

  private hasActiveEvent(type: string): boolean {
    return this.activeEvents.some(e => e.type === type);
  }

  private cleanupExpired(tick: number): void {
    this.activeEvents = this.activeEvents.filter(e => {
      if (e.endTick === -1) return true; // permanent
      return e.endTick > tick;
    });
  }

  private applyStormEffects(tick: number): void {
    // 2% chance each building takes damage (logged as event)
    const buildings = getDb().prepare('SELECT id, name FROM buildings').all() as unknown as Array<{ id: string; name: string }>;
    for (const b of buildings) {
      if (Math.random() < 0.02) {
        getDb().prepare(
          'INSERT INTO events (type, data, tick, highlight_score) VALUES (?, ?, ?, ?)'
        ).run(
          'building_damaged',
          JSON.stringify({ building_id: b.id, building_name: b.name, cause: 'storm' }),
          tick,
          3
        );
      }
    }
  }

  private expandMap(columns: number, tick: number): void {
    // Add new columns to the east side of the map
    const currentSize = CONFIG.MAP_SIZE;
    const newSize = currentSize + columns;

    // Generate new tiles
    const insertTile = getDb().prepare(
      'INSERT OR IGNORE INTO tiles (x, y, type, resource, resource_amount, depleted_until) VALUES (?, ?, ?, ?, ?, 0)'
    );

    const terrainTypes: Array<'grass' | 'forest' | 'stone' | 'sand'> = ['grass', 'forest', 'stone', 'sand'];

    for (let x = currentSize; x < newSize; x++) {
      for (let y = 0; y < currentSize; y++) {
        const terrain = terrainTypes[Math.floor(Math.random() * terrainTypes.length)];
        let resource: string | null = null;
        let amount = 0;

        // Simple resource assignment for new tiles
        if (terrain === 'forest' && Math.random() < 0.8) {
          resource = 'wood';
          amount = 3 + Math.floor(Math.random() * 3);
        } else if (terrain === 'stone' && Math.random() < 0.7) {
          resource = Math.random() < 0.1 ? 'gold_ore' : 'stone';
          amount = 1 + Math.floor(Math.random() * 3);
        }

        insertTile.run(x, y, terrain, resource, amount);
      }
    }

    // Note: CONFIG.MAP_SIZE is const, so we track expansion in world_state
    const totalExpansion = parseInt(getWorldState('map_expansion') || '0', 10);
    setWorldState('map_expansion', String(totalExpansion + columns));

    console.log(`🗺️ Map expanded by ${columns} columns (${currentSize} → ${newSize})`);
  }

  private scatterCrystals(tick: number): void {
    const mapSize = CONFIG.MAP_SIZE;
    const crystalCount = 3 + Math.floor(Math.random() * 5); // 3-7 crystals

    for (let i = 0; i < crystalCount; i++) {
      const x = Math.floor(Math.random() * mapSize);
      const y = Math.floor(Math.random() * mapSize);

      // Place crystal as a resource on random walkable tile
      getDb().prepare(
        'UPDATE tiles SET resource = ?, resource_amount = ? WHERE x = ? AND y = ? AND type != ?'
      ).run('crystal', 1, x, y, 'water');
    }

    console.log(`☄️ Scattered ${crystalCount} meteor crystals across the map`);
  }

  private applyFestivalEffects(): void {
    // Immediate mood boost for all agents
    getDb().exec('UPDATE agents SET mood = MIN(1.0, mood + 0.15)');
    console.log('🎉 Festival started! All agents received a mood boost.');
  }
}
