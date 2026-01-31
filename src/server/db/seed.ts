import { initDb, getDb, setWorldState, getAllTiles } from './index.js';
import { CONFIG } from '../config.js';
import { STARTER_AGENTS } from './starter-agents.js';

console.log('🌱 Seeding ClawCity world...');

initDb();

const db = getDb();

// Check if already seeded
const tiles = getAllTiles();
if (tiles.length > 0) {
  console.log(`⚠️  World already has ${tiles.length} tiles. Skipping seed.`);
  process.exit(0);
}

// Generate map tiles
const tileTypes = ['grass', 'forest', 'stone', 'water', 'sand'] as const;
const resources: Record<string, string[]> = {
  forest: ['wood', 'berries', 'mushroom'],
  stone: ['stone', 'iron_ore', 'crystal'],
  grass: ['wheat', 'flowers', 'herbs'],
  sand: ['shells', 'sand', 'driftwood'],
};

const insertTile = db.prepare(`
  INSERT INTO tiles (x, y, type, resource, resource_amount, depleted_until, owner_id)
  VALUES (?, ?, ?, ?, ?, 0, NULL)
`);

for (let x = 0; x < CONFIG.MAP_SIZE; x++) {
  for (let y = 0; y < CONFIG.MAP_SIZE; y++) {
    // Simple terrain generation
    let type: string;
    const dist = Math.sqrt((x - CONFIG.MAP_SIZE / 2) ** 2 + (y - CONFIG.MAP_SIZE / 2) ** 2);

    if (dist < 3) {
      type = 'grass'; // Town center
    } else if (dist > CONFIG.MAP_SIZE / 2 - 2) {
      type = Math.random() < 0.5 ? 'water' : 'sand'; // Edges
    } else {
      const roll = Math.random();
      if (roll < 0.4) type = 'grass';
      else if (roll < 0.7) type = 'forest';
      else if (roll < 0.85) type = 'stone';
      else if (roll < 0.92) type = 'sand';
      else type = 'water';
    }

    // Add resources to non-water tiles
    let resource: string | null = null;
    let amount = 0;
    const tileResources = resources[type];
    if (tileResources && Math.random() < 0.4) {
      resource = tileResources[Math.floor(Math.random() * tileResources.length)];
      amount = Math.floor(Math.random() * 5) + 1;
    }

    insertTile.run(x, y, type, resource, amount);
  }
}

// Set initial world state
setWorldState('tick', '0');
setWorldState('weather', 'clear');
setWorldState('season', 'spring');

// Add a town hall at center
const center = Math.floor(CONFIG.MAP_SIZE / 2);
db.prepare(`
  INSERT INTO buildings (id, type, x, y, width, height, owner_id, name, data, built_at_tick)
  VALUES ('bld_townhall', 'town_hall', ?, ?, 3, 3, NULL, 'ClawCity Town Hall', '{}', 0)
`).run(center, center);

const totalTiles = CONFIG.MAP_SIZE * CONFIG.MAP_SIZE;
console.log(`✅ Seeded ${totalTiles} tiles (${CONFIG.MAP_SIZE}x${CONFIG.MAP_SIZE})`);
console.log(`✅ Town hall placed at (${center}, ${center})`);

// --- Register Starter Agents ---

const insertAgent = db.prepare(`
  INSERT INTO agents (id, name, api_key, personality, "values", bio, x, y, inventory, mood, energy, shell_coins, registered_at, last_active_tick)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, '{}', 0.7, 1.0, ?, 0, 0)
`);

const insertEvent = db.prepare(`
  INSERT INTO events (type, data, tick, game_time, highlight_score)
  VALUES ('agent_join', ?, 0, 'Day 1, 6:00 AM', 5)
`);

// Generate spawn points spread around the map (avoid water and edges)
function generateSpawnPoint(index: number, total: number): { x: number; y: number } {
  // Spread agents in a rough circle around the town center
  const angle = (index / total) * 2 * Math.PI;
  const radius = 4 + Math.floor(index % 3) * 3; // 4-10 tiles from center
  const cx = Math.floor(CONFIG.MAP_SIZE / 2);
  const cy = Math.floor(CONFIG.MAP_SIZE / 2);
  let x = Math.round(cx + radius * Math.cos(angle));
  let y = Math.round(cy + radius * Math.sin(angle));
  // Clamp to map bounds (leaving 2-tile border)
  x = Math.max(2, Math.min(CONFIG.MAP_SIZE - 3, x));
  y = Math.max(2, Math.min(CONFIG.MAP_SIZE - 3, y));
  return { x, y };
}

function generateApiKey(): string {
  const chars = '0123456789abcdef';
  let key = 'cc_';
  for (let i = 0; i < 32; i++) {
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}

const agentCredentials: Array<{ name: string; id: string; apiKey: string }> = [];

for (let i = 0; i < STARTER_AGENTS.length; i++) {
  const agent = STARTER_AGENTS[i];
  const spawn = generateSpawnPoint(i, STARTER_AGENTS.length);
  const shortId = Math.random().toString(36).slice(2, 10);
  const agentId = `${agent.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${shortId}`;
  const apiKey = generateApiKey();

  insertAgent.run(
    agentId,
    agent.name,
    apiKey,
    JSON.stringify(agent.personality),
    JSON.stringify(agent.values),
    agent.bio,
    spawn.x,
    spawn.y,
    CONFIG.STARTING_COINS,
  );

  insertEvent.run(JSON.stringify({ agentId, name: agent.name }));

  agentCredentials.push({ name: agent.name, id: agentId, apiKey });
}

console.log(`🤖 Registered ${STARTER_AGENTS.length} starter agents`);

// Log credentials for reference
for (const cred of agentCredentials) {
  console.log(`   ${cred.name}: id=${cred.id}`);
}

console.log('🏝️  World is ready!');
