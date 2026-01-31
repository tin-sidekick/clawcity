// ============================================================
// ClawCity — Spectator API Endpoints
// Highlights, world events, economy & social stats
// ============================================================

import { Router, type Request, type Response } from 'express';
import { getDb, getAllAgents, getAllBuildings, getWorldState } from '../db/index.js';
import type { HighlightDetector } from '../engine/highlights.js';
import type { WorldEventSystem } from '../engine/world-events.js';

export function createSpectatorRouter(
  highlightDetector: HighlightDetector,
  worldEventSystem: WorldEventSystem
): Router {
  const router = Router();

  // GET /api/highlights/recent?limit=20 — Recent highlights
  router.get('/highlights/recent', (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string || '20', 10), 100);
      const highlights = highlightDetector.getRecent(limit);
      res.json({ highlights });
    } catch (err) {
      console.error('Error fetching highlights:', err);
      res.status(500).json({ error: 'Failed to fetch highlights', code: 'INTERNAL' });
    }
  });

  // GET /api/highlights/today — Today's top highlights
  router.get('/highlights/today', (_req: Request, res: Response) => {
    try {
      const highlights = highlightDetector.getTopToday();
      res.json({ highlights });
    } catch (err) {
      console.error('Error fetching today highlights:', err);
      res.status(500).json({ error: 'Failed to fetch highlights', code: 'INTERNAL' });
    }
  });

  // GET /api/events/recent?limit=10 — Recent world events
  router.get('/events/recent', (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string || '10', 10), 50);
      const events = worldEventSystem.getRecentEvents(limit);
      const activeEvents = worldEventSystem.getActiveEvents();
      res.json({ events, activeEvents });
    } catch (err) {
      console.error('Error fetching events:', err);
      res.status(500).json({ error: 'Failed to fetch events', code: 'INTERNAL' });
    }
  });

  // GET /api/agents/:id/journal — Agent's journal entries (messages from agent)
  router.get('/agents/:id/journal', (req: Request, res: Response) => {
    try {
      const agentId = req.params.id as string;
      const limit = Math.min(parseInt(req.query.limit as string || '20', 10), 100);

      // Get agent's public messages and thoughts as "journal"
      const entries = getDb().prepare(
        'SELECT id, message, tick, game_time FROM messages WHERE from_id = ? AND is_public = 1 ORDER BY id DESC LIMIT ?'
      ).all(agentId, limit) as unknown as Array<{
        id: number;
        message: string;
        tick: number;
        game_time: string | null;
      }>;

      res.json({
        agentId,
        entries: entries.map(e => ({
          id: e.id,
          message: e.message,
          tick: e.tick,
          gameTime: e.game_time,
        })),
      });
    } catch (err) {
      console.error('Error fetching journal:', err);
      res.status(500).json({ error: 'Failed to fetch journal', code: 'INTERNAL' });
    }
  });

  // GET /api/stats/economy — Economy statistics
  router.get('/stats/economy', (_req: Request, res: Response) => {
    try {
      const agents = getAllAgents();
      const totalCoins = agents.reduce((sum, a) => sum + a.shell_coins, 0);

      // Find richest agent
      const richest = agents.reduce((best, a) =>
        a.shell_coins > (best?.shell_coins || 0) ? a : best
      , agents[0]);

      // Average prices from market listings
      const avgPrices: Record<string, number> = {};
      const priceRows = getDb().prepare(
        'SELECT item, AVG(price_per_unit) as avg_price FROM market_listings GROUP BY item'
      ).all() as unknown as Array<{ item: string; avg_price: number }>;
      for (const row of priceRows) {
        avgPrices[row.item] = Math.round(row.avg_price * 100) / 100;
      }

      // Trades in last 24h (480 ticks)
      const currentTick = parseInt(getWorldState('tick') || '0', 10);
      const dayAgo = Math.max(0, currentTick - 480);
      const tradeCount = getDb().prepare(
        "SELECT COUNT(*) as count FROM events WHERE type IN ('agent_trade', 'market_sale') AND tick >= ?"
      ).get(dayAgo) as unknown as { count: number };

      // Aggregate inventory resources across all agents
      const resourceTotals: Record<string, number> = {};
      for (const agent of agents) {
        const inv = JSON.parse(agent.inventory || '{}');
        for (const [item, qty] of Object.entries(inv)) {
          resourceTotals[item] = (resourceTotals[item] || 0) + (qty as number);
        }
      }

      res.json({
        totalCoins,
        avgPrice: avgPrices,
        richestAgent: richest ? { id: richest.id, name: richest.name, coins: richest.shell_coins } : null,
        trades24h: tradeCount.count,
        totalResources: resourceTotals,
        population: agents.length,
      });
    } catch (err) {
      console.error('Error fetching economy stats:', err);
      res.status(500).json({ error: 'Failed to fetch economy stats', code: 'INTERNAL' });
    }
  });

  // GET /api/stats/social — Social statistics
  router.get('/stats/social', (_req: Request, res: Response) => {
    try {
      const totalRel = getDb().prepare(
        'SELECT COUNT(*) as count FROM relationships'
      ).get() as unknown as { count: number };

      const friendships = getDb().prepare(
        "SELECT COUNT(*) as count FROM relationships WHERE affinity >= 30"
      ).get() as unknown as { count: number };

      const rivalries = getDb().prepare(
        "SELECT COUNT(*) as count FROM relationships WHERE affinity < -10"
      ).get() as unknown as { count: number };

      const closeFriends = getDb().prepare(
        "SELECT COUNT(*) as count FROM relationships WHERE affinity >= 50"
      ).get() as unknown as { count: number };

      const bestFriends = getDb().prepare(
        "SELECT COUNT(*) as count FROM relationships WHERE affinity >= 70"
      ).get() as unknown as { count: number };

      // Top relationships
      const topPairs = getDb().prepare(
        `SELECT r.agent_id, r.target_id, r.affinity, a1.name as agent_name, a2.name as target_name
         FROM relationships r
         JOIN agents a1 ON a1.id = r.agent_id
         JOIN agents a2 ON a2.id = r.target_id
         ORDER BY r.affinity DESC LIMIT 10`
      ).all() as unknown as Array<{
        agent_id: string;
        target_id: string;
        affinity: number;
        agent_name: string;
        target_name: string;
      }>;

      // Message count
      const totalMessages = getDb().prepare(
        'SELECT COUNT(*) as count FROM messages'
      ).get() as unknown as { count: number };

      res.json({
        totalRelationships: totalRel.count,
        friendships: friendships.count,
        closeFriendships: closeFriends.count,
        bestFriendships: bestFriends.count,
        rivalries: rivalries.count,
        totalMessages: totalMessages.count,
        topRelationships: topPairs.map(p => ({
          agents: [p.agent_name, p.target_name],
          affinity: p.affinity,
        })),
        groups: 0, // Groups not yet implemented
      });
    } catch (err) {
      console.error('Error fetching social stats:', err);
      res.status(500).json({ error: 'Failed to fetch social stats', code: 'INTERNAL' });
    }
  });

  return router;
}
