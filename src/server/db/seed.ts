import { initDb, getDb, setWorldState, getAllTiles } from './index.js';
import { CONFIG } from '../config.js';

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
console.log('🏝️  World is ready!');
