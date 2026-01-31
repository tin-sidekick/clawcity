import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { CONFIG } from '../config.js';
import type { Agent, Tile, Building, WorldEvent, Relationship, MarketListing, Message } from '../../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let db: DatabaseSync;

export function getDb(): DatabaseSync {
  if (!db) {
    db = new DatabaseSync(CONFIG.DB_PATH);
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');
  }
  return db;
}

export function initDb(): void {
  const database = getDb();
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  database.exec(schema);
  console.log('✅ Database schema initialized');
}

// --- Helper functions ---

export function getAgent(id: string): Agent | undefined {
  const row = getDb().prepare('SELECT * FROM agents WHERE id = ?').get(id);
  return row as unknown as Agent | undefined;
}

export function getAgentByName(name: string): Agent | undefined {
  const row = getDb().prepare('SELECT * FROM agents WHERE name = ?').get(name);
  return row as unknown as Agent | undefined;
}

export function getAgentByApiKey(apiKey: string): Agent | undefined {
  const row = getDb().prepare('SELECT * FROM agents WHERE api_key = ?').get(apiKey);
  return row as unknown as Agent | undefined;
}

export function getAllAgents(): Agent[] {
  return getDb().prepare('SELECT * FROM agents').all() as unknown as Agent[];
}

export function getTile(x: number, y: number): Tile | undefined {
  const row = getDb().prepare('SELECT * FROM tiles WHERE x = ? AND y = ?').get(x, y);
  return row as unknown as Tile | undefined;
}

export function getTilesInRange(cx: number, cy: number, radius: number): Tile[] {
  return getDb().prepare(
    'SELECT * FROM tiles WHERE x >= ? AND x <= ? AND y >= ? AND y <= ?'
  ).all(cx - radius, cx + radius, cy - radius, cy + radius) as unknown as Tile[];
}

export function getAllTiles(): Tile[] {
  return getDb().prepare('SELECT * FROM tiles').all() as unknown as Tile[];
}

export function getBuilding(id: string): Building | undefined {
  const row = getDb().prepare('SELECT * FROM buildings WHERE id = ?').get(id);
  return row as unknown as Building | undefined;
}

export function getAllBuildings(): Building[] {
  return getDb().prepare('SELECT * FROM buildings').all() as unknown as Building[];
}

export function getBuildingsInRange(cx: number, cy: number, radius: number): Building[] {
  return getDb().prepare(
    'SELECT * FROM buildings WHERE x >= ? AND x <= ? AND y >= ? AND y <= ?'
  ).all(cx - radius, cx + radius, cy - radius, cy + radius) as unknown as Building[];
}

export function getAgentsInRange(cx: number, cy: number, radius: number): Agent[] {
  return getDb().prepare(
    'SELECT * FROM agents WHERE x >= ? AND x <= ? AND y >= ? AND y <= ?'
  ).all(cx - radius, cx + radius, cy - radius, cy + radius) as unknown as Agent[];
}

export function getWorldState(key: string): string | undefined {
  const row = getDb().prepare('SELECT value FROM world_state WHERE key = ?').get(key) as unknown as { value: string } | undefined;
  return row?.value;
}

export function setWorldState(key: string, value: string): void {
  getDb().prepare(
    'INSERT OR REPLACE INTO world_state (key, value) VALUES (?, ?)'
  ).run(key, value);
}

export function getRecentEvents(limit: number = 50): WorldEvent[] {
  return getDb().prepare(
    'SELECT * FROM events ORDER BY id DESC LIMIT ?'
  ).all(limit) as unknown as WorldEvent[];
}

export function getRelationship(agentId: string, targetId: string): Relationship | undefined {
  const row = getDb().prepare(
    'SELECT * FROM relationships WHERE agent_id = ? AND target_id = ?'
  ).get(agentId, targetId);
  return row as unknown as Relationship | undefined;
}

export function getAgentRelationships(agentId: string): Relationship[] {
  return getDb().prepare(
    'SELECT * FROM relationships WHERE agent_id = ?'
  ).all(agentId) as unknown as Relationship[];
}

export function getMessagesForAgent(agentId: string, limit: number = 20, sinceTick: number = 0): Message[] {
  return getDb().prepare(
    'SELECT * FROM messages WHERE (to_id = ? OR from_id = ? OR (to_id IS NULL AND is_public = 1)) AND tick >= ? ORDER BY id DESC LIMIT ?'
  ).all(agentId, agentId, sinceTick, limit) as unknown as Message[];
}

export function getMarketListings(item?: string): MarketListing[] {
  if (item) {
    return getDb().prepare(
      'SELECT * FROM market_listings WHERE item = ? ORDER BY price_per_unit ASC'
    ).all(item) as unknown as MarketListing[];
  }
  return getDb().prepare(
    'SELECT * FROM market_listings ORDER BY listed_at_tick DESC'
  ).all() as unknown as MarketListing[];
}

export default getDb;
