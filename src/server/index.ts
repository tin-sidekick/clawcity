import express from 'express';
import cors from 'cors';
import { initDb } from './db/index.js';
import { setupAPI } from './api/index.js';
import { SpectatorWebSocket } from './ws/index.js';
import { TickEngine } from './engine/tick.js';
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

// Tick engine
const engine = new TickEngine();
engine.attachWebSocket(wsServer);

// API routes
setupAPI(app, wsServer);

// --- Start servers ---
app.listen(CONFIG.PORT, () => {
  console.log(`🏝️  ClawCity REST API running on http://localhost:${CONFIG.PORT}`);
});

wsServer.start(CONFIG.WS_PORT);
engine.start();

console.log(`📡 WebSocket on ws://localhost:${CONFIG.WS_PORT}`);
console.log(`🌍 Map size: ${CONFIG.MAP_SIZE}x${CONFIG.MAP_SIZE}`);
console.log(`⏱️  Tick interval: ${CONFIG.TICK_INTERVAL_MS}ms`);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down ClawCity...');
  engine.stop();
  wsServer.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down ClawCity...');
  engine.stop();
  wsServer.stop();
  process.exit(0);
});
