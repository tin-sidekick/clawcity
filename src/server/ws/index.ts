/**
 * WebSocket server — placeholder
 * Will be fully implemented in the WebSocket task.
 */

import type { WSMessage } from '../../shared/types.js';

export class SpectatorWebSocket {
  start(_port: number): void {
    console.log(`📡 WebSocket server placeholder (port ${_port})`);
  }

  stop(): void {
    // TODO: close WebSocket server
  }

  broadcast(_event: string, _data: unknown): void {
    // TODO: implement WebSocket broadcast
  }

  broadcastToNearby(_x: number, _y: number, _radius: number, _message: WSMessage): void {
    // TODO: implement location-based broadcast
  }

  broadcastWorldEvent(_event: string, _data: unknown): void {
    // TODO: implement world event broadcast
  }

  broadcastTick(_tick: number): void {
    // TODO: implement tick broadcast
  }
}

// Standalone functions for convenience
export function broadcast(_message: WSMessage): void {
  // TODO: implement WebSocket broadcast
}

export function broadcastToNearby(_x: number, _y: number, _radius: number, _message: WSMessage): void {
  // TODO: implement location-based broadcast
}
