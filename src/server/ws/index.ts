import { createRequire } from 'module';
import { getAllAgents, getAllBuildings, getWorldState, getRecentEvents } from '../db/index.js';
import { CONFIG } from '../config.js';
import type { WSMessage } from '../../shared/types.js';

// ws doesn't export correctly with ESM in Node 25, use createRequire
const require = createRequire(import.meta.url);
const ws = require('ws');

export class SpectatorWebSocket {
  private wss: any = null;
  private clients: Set<any> = new Set();

  start(port: number): void {
    this.wss = new ws.Server({ port });

    this.wss.on('connection', (client: any) => {
      console.log('📡 Spectator connected');
      this.clients.add(client);

      // Send initial world state
      try {
        const snapshot = this.getWorldSnapshot();
        client.send(JSON.stringify({
          event: 'world:init',
          data: snapshot,
          timestamp: Date.now(),
        }));
      } catch (err) {
        console.error('Error sending init snapshot:', err);
      }

      client.on('close', () => {
        this.clients.delete(client);
        console.log('📡 Spectator disconnected');
      });

      client.on('error', (err: Error) => {
        console.error('WebSocket client error:', err);
        this.clients.delete(client);
      });
    });

    this.wss.on('error', (err: Error) => {
      console.error('WebSocket server error:', err);
    });

    console.log(`📡 WebSocket server listening on :${port}`);
  }

  broadcast(event: string, data: unknown): void {
    const message = JSON.stringify({
      event,
      data,
      timestamp: Date.now(),
    });

    for (const client of this.clients) {
      if (client.readyState === ws.OPEN) {
        try {
          client.send(message);
        } catch (err) {
          console.error('Error broadcasting to client:', err);
          this.clients.delete(client);
        }
      }
    }
  }

  broadcastTick(tick: number): void {
    const weather = getWorldState('weather') || 'clear';
    const season = getWorldState('season') || 'spring';
    const day = Math.floor(tick / CONFIG.TICKS_PER_DAY) + 1;
    const tickInDay = tick % CONFIG.TICKS_PER_DAY;
    const minutesInDay = (tickInDay / CONFIG.TICKS_PER_DAY) * 24 * 60;
    const hour = Math.floor(minutesInDay / 60);
    const minute = Math.floor(minutesInDay % 60);

    let phase: string;
    if (hour >= 6 && hour < 12) phase = 'morning';
    else if (hour >= 12 && hour < 18) phase = 'afternoon';
    else if (hour >= 18 && hour < 22) phase = 'evening';
    else phase = 'night';

    this.broadcast('world:tick', {
      tick, day, hour, minute, phase, weather, season,
    });
  }

  broadcastWorldEvent(event: string, data: unknown): void {
    this.broadcast('world:event', { type: event, ...data as object });
  }

  broadcastToNearby(_x: number, _y: number, _radius: number, _message: WSMessage): void {
    // TODO: filter clients by location (needs client→agent mapping)
    // For now broadcast to all
    this.broadcast(_message.type, _message.payload as string);
  }

  broadcastHighlight(data: unknown): void {
    this.broadcast('highlight:detected', data);
  }

  getClientCount(): number {
    return this.clients.size;
  }

  stop(): void {
    if (this.wss) {
      for (const client of this.clients) {
        client.close();
      }
      this.clients.clear();
      this.wss.close();
      this.wss = null;
      console.log('📡 WebSocket server stopped');
    }
  }

  private getWorldSnapshot() {
    const tick = parseInt(getWorldState('tick') || '0', 10);
    const weather = getWorldState('weather') || 'clear';
    const season = getWorldState('season') || 'spring';

    const agents = getAllAgents().map(a => ({
      id: a.id,
      name: a.name,
      x: a.x,
      y: a.y,
      mood: a.mood,
      energy: a.energy,
    }));

    const buildings = getAllBuildings();
    const recentEvents = getRecentEvents(20);

    return {
      tick,
      weather,
      season,
      mapSize: CONFIG.MAP_SIZE,
      agents,
      buildings,
      recentEvents,
    };
  }
}

// Standalone functions for convenience
export function broadcast(_message: WSMessage): void {
  // Will be connected to the singleton instance at startup
}

export function broadcastToNearby(_x: number, _y: number, _radius: number, _message: WSMessage): void {
  // Will be connected to the singleton instance at startup
}
