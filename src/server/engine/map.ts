// ============================================================
// ClawCity — Map Manager
// Perlin noise terrain generation + resource management
// ============================================================

import { getDb, getTile as dbGetTile, getTilesInRange } from '../db/index.js';
import { CONFIG } from '../config.js';
import type { Tile, TileType } from '../../shared/types.js';

// --- Resource Config ---
export interface ResourceConfig {
  resource: string;
  terrain: TileType[];
  baseAmountMin: number;
  baseAmountMax: number;
  respawnTicks: number;
  spawnChance: number;
}

export const RESOURCE_CONFIG: ResourceConfig[] = [
  { resource: 'wood',     terrain: ['forest'],          baseAmountMin: 3, baseAmountMax: 5, respawnTicks: 12,   spawnChance: 0.9 },
  { resource: 'stone',    terrain: ['stone'],           baseAmountMin: 2, baseAmountMax: 4, respawnTicks: 24,   spawnChance: 0.8 },
  { resource: 'food',     terrain: ['forest', 'grass'], baseAmountMin: 1, baseAmountMax: 3, respawnTicks: 48,   spawnChance: 0.3 },
  { resource: 'shells',   terrain: ['sand'],            baseAmountMin: 1, baseAmountMax: 2, respawnTicks: 48,   spawnChance: 0.5 },
  { resource: 'iron_ore', terrain: ['stone'],           baseAmountMin: 1, baseAmountMax: 1, respawnTicks: 480,  spawnChance: 0.15 },
  { resource: 'gold_ore', terrain: ['stone'],           baseAmountMin: 1, baseAmountMax: 1, respawnTicks: 2400, spawnChance: 0.05 },
];

// --- Perlin Noise Implementation ---

class PerlinNoise {
  private perm: number[];

  constructor(seed: number = 42) {
    this.perm = new Array(512);
    const p = new Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;

    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807 + 0) % 2147483647;
      const j = s % (i + 1);
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  noise(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = this.fade(xf);
    const v = this.fade(yf);

    const aa = this.perm[this.perm[X] + Y];
    const ab = this.perm[this.perm[X] + Y + 1];
    const ba = this.perm[this.perm[X + 1] + Y];
    const bb = this.perm[this.perm[X + 1] + Y + 1];

    return this.lerp(
      this.lerp(this.grad(aa, xf, yf), this.grad(ba, xf - 1, yf), u),
      this.lerp(this.grad(ab, xf, yf - 1), this.grad(bb, xf - 1, yf - 1), u),
      v
    );
  }

  fbm(x: number, y: number, octaves: number = 4): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      value += this.noise(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }

    return value / maxValue;
  }
}

function noiseToTerrain(elevation: number, moisture: number): TileType {
  if (elevation < -0.25) return 'water';
  if (elevation < -0.15) return 'sand';
  if (elevation < 0.1) return moisture > 0.0 ? 'grass' : 'sand';
  if (elevation < 0.4) return moisture > -0.1 ? 'forest' : 'grass';
  return 'stone';
}

export class MapManager {
  private perlin: PerlinNoise;
  private mapSize: number;

  constructor(seed: number = 42) {
    this.perlin = new PerlinNoise(seed);
    this.mapSize = CONFIG.MAP_SIZE;
  }

  generateMap(size?: number): void {
    const s = size ?? this.mapSize;
    this.mapSize = s;
    const db = getDb();
    const center = Math.floor(s / 2);
    const clearingRadius = 3;

    const existing = db.prepare('SELECT COUNT(*) as count FROM tiles').get() as unknown as { count: number };
    if (existing.count > 0) {
      console.log(`🗺️  Map already exists (${existing.count} tiles), skipping generation`);
      return;
    }

    console.log(`🗺️  Generating ${s}x${s} map...`);

    const insertTile = db.prepare(
      'INSERT INTO tiles (x, y, type, resource, resource_amount, depleted_until) VALUES (?, ?, ?, ?, ?, 0)'
    );

    const scale = 0.12;
    const moistureScale = 0.08;

    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const dx = (x - center) / (s / 2);
        const dy = (y - center) / (s / 2);
        const distFromCenter = Math.sqrt(dx * dx + dy * dy);

        let elevation = this.perlin.fbm(x * scale, y * scale, 4);
        const islandFalloff = 1 - Math.pow(distFromCenter, 2) * 1.5;
        elevation = elevation * 0.6 + islandFalloff * 0.4;

        const moisture = this.perlin.fbm(x * moistureScale + 100, y * moistureScale + 100, 3);

        const distToCenter = Math.abs(x - center) + Math.abs(y - center);
        let tileType: TileType;

        if (distToCenter <= clearingRadius) {
          tileType = 'grass';
        } else {
          tileType = noiseToTerrain(elevation, moisture);
        }

        const { resource, amount } = this.assignResource(tileType);
        insertTile.run(x, y, tileType, resource, amount);
      }
    }

    const stats = db.prepare(
      'SELECT type, COUNT(*) as count FROM tiles GROUP BY type ORDER BY count DESC'
    ).all() as unknown as { type: string; count: number }[];

    console.log('🗺️  Map generated! Terrain distribution:');
    for (const stat of stats) {
      const pct = ((stat.count / (s * s)) * 100).toFixed(1);
      console.log(`   ${stat.type}: ${stat.count} (${pct}%)`);
    }

    const resourceStats = db.prepare(
      "SELECT resource, COUNT(*) as count FROM tiles WHERE resource IS NOT NULL GROUP BY resource ORDER BY count DESC"
    ).all() as unknown as { resource: string; count: number }[];

    console.log('🗺️  Resources:');
    for (const rs of resourceStats) {
      console.log(`   ${rs.resource}: ${rs.count} tiles`);
    }
  }

  private assignResource(terrain: TileType): { resource: string | null; amount: number } {
    for (const rc of RESOURCE_CONFIG) {
      if (rc.terrain.includes(terrain) && Math.random() < rc.spawnChance) {
        const amount = rc.baseAmountMin + Math.floor(Math.random() * (rc.baseAmountMax - rc.baseAmountMin + 1));
        return { resource: rc.resource, amount };
      }
    }
    return { resource: null, amount: 0 };
  }

  getTile(x: number, y: number): Tile | undefined {
    return dbGetTile(x, y);
  }

  getTilesInRadius(x: number, y: number, radius: number): Tile[] {
    return getTilesInRange(x, y, radius);
  }

  isWalkable(x: number, y: number): boolean {
    if (x < 0 || x >= this.mapSize || y < 0 || y >= this.mapSize) return false;
    const tile = dbGetTile(x, y);
    if (!tile) return false;
    if (tile.type === 'water') return false;

    const building = getDb().prepare(
      'SELECT id FROM buildings WHERE x <= ? AND x + width > ? AND y <= ? AND y + height > ?'
    ).get(x, x, y, y);

    return !building;
  }

  gatherResource(x: number, y: number, tick: number): { resource: string; amount: number } | null {
    const tile = dbGetTile(x, y);
    if (!tile || !tile.resource || tile.resource_amount <= 0) return null;
    if (tile.depleted_until > tick) return null;

    const config = RESOURCE_CONFIG.find(rc => rc.resource === tile.resource);
    if (!config) return null;

    const gathered = tile.resource_amount;
    const depletedUntil = tick + config.respawnTicks;

    getDb().prepare(
      'UPDATE tiles SET resource_amount = 0, depleted_until = ? WHERE x = ? AND y = ?'
    ).run(depletedUntil, x, y);

    return { resource: tile.resource, amount: gathered };
  }

  respawnResources(currentTick: number): void {
    const depletedTiles = getDb().prepare(
      'SELECT x, y, type, resource FROM tiles WHERE depleted_until > 0 AND depleted_until <= ? AND resource IS NOT NULL'
    ).all(currentTick) as unknown as Tile[];

    if (depletedTiles.length === 0) return;

    const updateTile = getDb().prepare(
      'UPDATE tiles SET resource_amount = ?, depleted_until = 0 WHERE x = ? AND y = ?'
    );

    for (const tile of depletedTiles) {
      const config = RESOURCE_CONFIG.find(rc => rc.resource === tile.resource);
      if (!config) continue;

      const newAmount = config.baseAmountMin + Math.floor(Math.random() * (config.baseAmountMax - config.baseAmountMin + 1));
      updateTile.run(newAmount, tile.x, tile.y);
    }

    if (depletedTiles.length > 0) {
      console.log(`🌱 Respawned ${depletedTiles.length} resource tiles`);
    }
  }

  findSpawnPoint(): { x: number; y: number } {
    const center = Math.floor(this.mapSize / 2);
    const maxAttempts = 100;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const radius = Math.floor(attempt / 10) + 2;
      const x = center + Math.floor(Math.random() * radius * 2) - radius;
      const y = center + Math.floor(Math.random() * radius * 2) - radius;

      if (this.isWalkable(x, y)) {
        return { x, y };
      }
    }

    return { x: center, y: center };
  }

  getMapSize(): number {
    return this.mapSize;
  }
}
