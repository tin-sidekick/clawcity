import type { Express } from 'express';
import { createWorldRouter } from './world.js';
import { createAgentRouter } from './agents.js';
import { createActionRouter } from './actions.js';
import { createSpectatorRouter } from './spectator.js';
import type { SpectatorWebSocket } from '../ws/index.js';
import type { HighlightDetector } from '../engine/highlights.js';
import type { WorldEventSystem } from '../engine/world-events.js';

export function setupAPI(
  app: Express,
  wsServer: SpectatorWebSocket,
  highlightDetector?: HighlightDetector,
  worldEventSystem?: WorldEventSystem
): void {
  // World routes (public)
  app.use('/api/world', createWorldRouter());

  // Agent routes (mix of public and authed)
  app.use('/api/agents', createAgentRouter());

  // Action routes (all authed)
  app.use('/api/agents', createActionRouter(wsServer));

  // Spectator routes (highlights, events, stats)
  if (highlightDetector && worldEventSystem) {
    app.use('/api', createSpectatorRouter(highlightDetector, worldEventSystem));
  }

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'clawcity', timestamp: Date.now() });
  });

  // 404 catch-all for API routes
  app.use('/api/*', (_req, res) => {
    res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
  });
}
