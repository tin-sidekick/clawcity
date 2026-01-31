import { Router, type Request, type Response } from 'express';
import { getAllTiles, getAllAgents, getAllBuildings, getWorldState, getRecentEvents } from '../db/index.js';
import { CONFIG } from '../config.js';

export function createWorldRouter(): Router {
  const router = Router();

  // GET /api/world/state — Full world snapshot
  router.get('/state', (_req: Request, res: Response) => {
    try {
      const tiles = getAllTiles();
      const agents = getAllAgents().map(a => ({
        id: a.id,
        name: a.name,
        x: a.x,
        y: a.y,
        mood: a.mood,
        bio: a.bio,
      }));
      const buildings = getAllBuildings();
      const tick = parseInt(getWorldState('tick') || '0', 10);
      const weather = getWorldState('weather') || 'clear';
      const season = getWorldState('season') || 'spring';
      const time = computeGameTime(tick);

      res.json({
        tick,
        time,
        weather,
        season,
        tiles,
        agents,
        buildings,
        mapSize: CONFIG.MAP_SIZE,
      });
    } catch (err) {
      console.error('Error fetching world state:', err);
      res.status(500).json({ error: 'Failed to fetch world state', code: 'INTERNAL' });
    }
  });

  // GET /api/world/time — Current game time
  router.get('/time', (_req: Request, res: Response) => {
    try {
      const tick = parseInt(getWorldState('tick') || '0', 10);
      const weather = getWorldState('weather') || 'clear';
      const season = getWorldState('season') || 'spring';
      const time = computeGameTime(tick);

      res.json({ tick, ...time, weather, season });
    } catch (err) {
      console.error('Error fetching time:', err);
      res.status(500).json({ error: 'Failed to fetch time', code: 'INTERNAL' });
    }
  });

  // GET /api/world/map — Full tile map
  router.get('/map', (_req: Request, res: Response) => {
    try {
      const tiles = getAllTiles();
      res.json({ mapSize: CONFIG.MAP_SIZE, tiles });
    } catch (err) {
      console.error('Error fetching map:', err);
      res.status(500).json({ error: 'Failed to fetch map', code: 'INTERNAL' });
    }
  });

  // GET /api/world/stats — World statistics
  router.get('/stats', (_req: Request, res: Response) => {
    try {
      const agents = getAllAgents();
      const buildings = getAllBuildings();
      const totalCoins = agents.reduce((sum, a) => sum + a.shell_coins, 0);
      const topAgents = agents
        .map(a => ({ id: a.id, name: a.name, shellCoins: a.shell_coins }))
        .sort((a, b) => b.shellCoins - a.shellCoins)
        .slice(0, 10);

      res.json({
        population: agents.length,
        totalBuildings: buildings.length,
        totalCoins,
        topAgents,
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
      res.status(500).json({ error: 'Failed to fetch stats', code: 'INTERNAL' });
    }
  });

  return router;
}

// --- Helpers ---

export function computeGameTime(tick: number): { day: number; hour: number; minute: number; phase: string; gameTime: string } {
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

  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const gameTime = `Day ${day}, ${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;

  return { day, hour, minute, phase, gameTime };
}
