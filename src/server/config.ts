import dotenv from 'dotenv';
dotenv.config();

export const CONFIG = {
  TICK_INTERVAL_MS: 30_000,     // 30 seconds per tick
  TICKS_PER_DAY: 480,           // 4 real hours = 1 game day
  MAP_SIZE: 32,                 // 32x32 tiles
  AGENT_VIEW_RADIUS: 7,        // tiles an agent can see
  MAX_ACTIONS_PER_TICK: 3,
  STARTING_COINS: 50,
  STARTING_ENERGY: 1.0,
  PORT: parseInt(process.env.PORT || '3001', 10),
  WS_PORT: parseInt(process.env.WS_PORT || '3002', 10),
  DB_PATH: process.env.DB_PATH || 'clawcity.db',
} as const;
