import express from 'express';
import cors from 'cors';
import { initDb } from './db/index.js';
import { setupAPI } from './api/index.js';
import { SpectatorWebSocket } from './ws/index.js';
import { TickEngine } from './engine/tick.js';
import { MapManager } from './engine/map.js';
import { ActionQueue } from './engine/actions.js';
import { CONFIG } from './config.js';

// --- Initialize ---
console.log('🏝️  ClawCity starting up...');

// Database
initDb();

// Express app
const app = express();
app.use(cors());
app.use(express.json());

// WebSocket server
const wsServer = new SpectatorWebSocket();

// Map manager — generates world if needed
const mapManager = new MapManager();
mapManager.generateMap(CONFIG.MAP_SIZE);

// Action queue
const actionQueue = new ActionQueue(mapManager);

// Tick engine — wire up all components
const engine = new TickEngine();
engine.attachWebSocket(wsServer);
engine.attachMapManager(mapManager);
engine.attachActionQueue(actionQueue);

// API routes — pass engine components
setupAPI(app, wsServer);

// Make engine components available globally for API routes
(app as any).mapManager = mapManager;
(app as any).actionQueue = actionQueue;
(app as any).tickEngine = engine;

// --- Start servers ---
app.listen(CONFIG.PORT, () => {
  console.log(`🏝️  ClawCity REST API running on http://localhost:${CONFIG.PORT}`);
});

// Only start WS if it has a start method (placeholder may not)
if (typeof wsServer.start === 'function') {
  try {
    wsServer.start(CONFIG.WS_PORT);
    console.log(`📡 WebSocket on ws://localhost:${CONFIG.WS_PORT}`);
  } catch {
    console.log('📡 WebSocket server not yet implemented (placeholder)');
  }
}

engine.start();

console.log(`🌍 Map size: ${CONFIG.MAP_SIZE}x${CONFIG.MAP_SIZE}`);
console.log(`⏱️  Tick interval: ${CONFIG.TICK_INTERVAL_MS}ms`);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down ClawCity...');
  engine.stop();
  if (typeof wsServer.stop === 'function') wsServer.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down ClawCity...');
  engine.stop();
  if (typeof wsServer.stop === 'function') wsServer.stop();
  process.exit(0);
});
