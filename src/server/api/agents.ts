import { Router, type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticateAgent } from './middleware.js';
import {
  getDb,
  getAgent,
  getAgentByName,
  getAllAgents,
  getTilesInRange,
  getAgentsInRange,
  getBuildingsInRange,
  getAgentRelationships,
  getMessagesForAgent,
  getWorldState,
} from '../db/index.js';
import { CONFIG } from '../config.js';
import { computeGameTime } from './world.js';
import { JournalSystem } from '../engine/journal.js';
import type { BigFiveTraits } from '../../shared/types.js';

const journal = new JournalSystem();

export function createAgentRouter(): Router {
  const router = Router();

  // POST /api/agents/register — Register a new agent (public)
  router.post('/register', (req: Request, res: Response) => {
    try {
      const { name, personality, bio, values } = req.body;

      // Validate name
      if (!name || typeof name !== 'string' || name.length < 2 || name.length > 30) {
        res.status(400).json({ error: 'Name must be 2-30 characters', code: 'BAD_INPUT' });
        return;
      }

      // Check for duplicate name
      if (getAgentByName(name)) {
        res.status(400).json({ error: 'Agent name already taken', code: 'DUPLICATE_NAME' });
        return;
      }

      // Validate personality (Big Five traits, 0-1)
      if (!personality || typeof personality !== 'object') {
        res.status(400).json({ error: 'Personality (Big Five traits) required', code: 'BAD_INPUT' });
        return;
      }

      const traits: (keyof BigFiveTraits)[] = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'];
      for (const trait of traits) {
        const val = personality[trait];
        if (typeof val !== 'number' || val < 0 || val > 1) {
          res.status(400).json({ error: `personality.${trait} must be a number between 0 and 1`, code: 'BAD_INPUT' });
          return;
        }
      }

      // Generate IDs
      const shortId = uuidv4().slice(0, 8);
      const agentId = `${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${shortId}`;
      const apiKey = `cc_${uuidv4().replace(/-/g, '')}`;

      // Find spawn point (random walkable tile)
      const spawnX = Math.floor(Math.random() * CONFIG.MAP_SIZE);
      const spawnY = Math.floor(Math.random() * CONFIG.MAP_SIZE);

      const tick = parseInt(getWorldState('tick') || '0', 10);

      // Insert agent
      getDb().prepare(`
        INSERT INTO agents (id, name, api_key, personality, "values", bio, x, y, inventory, mood, energy, shell_coins, registered_at, last_active_tick)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, '{}', 0.7, 1.0, ?, ?, ?)
      `).run(
        agentId,
        name,
        apiKey,
        JSON.stringify(personality),
        values ? JSON.stringify(values) : null,
        bio || null,
        spawnX,
        spawnY,
        CONFIG.STARTING_COINS,
        tick,
        tick
      );

      // Log event
      getDb().prepare(`
        INSERT INTO events (type, data, tick, game_time, highlight_score)
        VALUES ('agent_join', ?, ?, ?, 5)
      `).run(JSON.stringify({ agentId, name }), tick, computeGameTime(tick).gameTime);

      res.status(201).json({
        agentId,
        apiKey,
        spawnPoint: { x: spawnX, y: spawnY },
      });
    } catch (err) {
      console.error('Error registering agent:', err);
      res.status(500).json({ error: 'Failed to register agent', code: 'INTERNAL' });
    }
  });

  // GET /api/agents — List all agents (public info)
  router.get('/', (_req: Request, res: Response) => {
    try {
      const agents = getAllAgents().map(a => ({
        id: a.id,
        name: a.name,
        personality: safeJsonParse(a.personality),
        bio: a.bio,
        x: a.x,
        y: a.y,
        mood: a.mood,
        energy: a.energy,
        shellCoins: a.shell_coins,
      }));
      res.json({ agents });
    } catch (err) {
      console.error('Error listing agents:', err);
      res.status(500).json({ error: 'Failed to list agents', code: 'INTERNAL' });
    }
  });

  // GET /api/agents/:id — Agent public profile
  router.get('/:id', (req: Request, res: Response) => {
    try {
      const agent = getAgent(req.params.id as string);
      if (!agent) {
        res.status(404).json({ error: 'Agent not found', code: 'NOT_FOUND' });
        return;
      }
      res.json({
        id: agent.id,
        name: agent.name,
        personality: safeJsonParse(agent.personality),
        bio: agent.bio,
        x: agent.x,
        y: agent.y,
        mood: agent.mood,
        energy: agent.energy,
      });
    } catch (err) {
      console.error('Error fetching agent:', err);
      res.status(500).json({ error: 'Failed to fetch agent', code: 'INTERNAL' });
    }
  });

  // GET /api/agents/:id/state — Full agent state (AUTHED)
  router.get('/:id/state', authenticateAgent, (req: Request, res: Response) => {
    try {
      const agent = req.agent!;
      const relationships = getAgentRelationships(agent.id).map(r => ({
        targetId: r.target_id,
        affinity: r.affinity,
        type: r.type,
        keyMemories: safeJsonParse(r.key_memories),
      }));

      res.json({
        id: agent.id,
        name: agent.name,
        personality: safeJsonParse(agent.personality),
        bio: agent.bio,
        values: safeJsonParse(agent.values),
        x: agent.x,
        y: agent.y,
        inventory: safeJsonParse(agent.inventory),
        mood: agent.mood,
        energy: agent.energy,
        shellCoins: agent.shell_coins,
        home: agent.home_x !== null ? { x: agent.home_x, y: agent.home_y } : null,
        relationships,
      });
    } catch (err) {
      console.error('Error fetching agent state:', err);
      res.status(500).json({ error: 'Failed to fetch agent state', code: 'INTERNAL' });
    }
  });

  // GET /api/agents/:id/look — What agent can see (AUTHED)
  router.get('/:id/look', authenticateAgent, (req: Request, res: Response) => {
    try {
      const agent = req.agent!;
      const radius = CONFIG.AGENT_VIEW_RADIUS;
      const tick = parseInt(getWorldState('tick') || '0', 10);
      const weather = getWorldState('weather') || 'clear';
      const season = getWorldState('season') || 'spring';
      const time = computeGameTime(tick);

      // Get nearby entities
      const nearbyTiles = getTilesInRange(agent.x, agent.y, radius);
      const nearbyAgents = getAgentsInRange(agent.x, agent.y, radius)
        .filter(a => a.id !== agent.id)
        .map(a => ({
          id: a.id,
          name: a.name,
          x: a.x,
          y: a.y,
          mood: a.mood,
        }));
      const nearbyBuildings = getBuildingsInRange(agent.x, agent.y, radius);

      // Resources in view
      const resources = nearbyTiles
        .filter(t => t.resource && t.resource_amount > 0 && t.depleted_until <= tick)
        .map(t => ({
          x: t.x,
          y: t.y,
          resource: t.resource,
          amount: t.resource_amount,
        }));

      const relationships = getAgentRelationships(agent.id).map(r => ({
        targetId: r.target_id,
        affinity: r.affinity,
        type: r.type,
      }));

      const messages = getMessagesForAgent(agent.id, 10, Math.max(0, tick - 100));

      res.json({
        location: { x: agent.x, y: agent.y },
        time: { tick, ...time, weather, season },
        nearby: {
          agents: nearbyAgents,
          resources,
          buildings: nearbyBuildings.map(b => ({
            id: b.id,
            type: b.type,
            name: b.name,
            x: b.x,
            y: b.y,
            owner_id: b.owner_id,
          })),
        },
        inventory: safeJsonParse(agent.inventory),
        energy: agent.energy,
        mood: agent.mood,
        messages: messages.map(m => ({
          from: m.from_id,
          to: m.to_id,
          message: m.message,
          tick: m.tick,
          gameTime: m.game_time,
        })),
        relationships,
      });
    } catch (err) {
      console.error('Error in agent look:', err);
      res.status(500).json({ error: 'Failed to compute perception', code: 'INTERNAL' });
    }
  });

  // GET /api/agents/:id/messages — Recent messages (AUTHED)
  router.get('/:id/messages', authenticateAgent, (req: Request, res: Response) => {
    try {
      const agent = req.agent!;
      const limit = Math.min(parseInt(req.query.limit as string || '20', 10), 100);
      const sinceTick = parseInt(req.query.since_tick as string || '0', 10);

      const messages = getMessagesForAgent(agent.id, limit, sinceTick);

      res.json({
        messages: messages.map(m => ({
          id: m.id,
          from: m.from_id,
          to: m.to_id,
          message: m.message,
          tick: m.tick,
          gameTime: m.game_time,
          isPublic: !!m.is_public,
        })),
      });
    } catch (err) {
      console.error('Error fetching messages:', err);
      res.status(500).json({ error: 'Failed to fetch messages', code: 'INTERNAL' });
    }
  });

  // POST /api/agents/:id/journal — Write a journal entry (AUTHED)
  router.post('/:id/journal', authenticateAgent, (req: Request, res: Response) => {
    try {
      const agent = req.agent!;
      const { day, entry } = req.body;

      if (typeof day !== 'number' || day < 1) {
        res.status(400).json({ error: 'day must be a positive number', code: 'BAD_INPUT' });
        return;
      }
      if (!entry || typeof entry !== 'string' || entry.length < 1) {
        res.status(400).json({ error: 'entry must be a non-empty string', code: 'BAD_INPUT' });
        return;
      }
      if (entry.length > 5000) {
        res.status(400).json({ error: 'entry must be 5000 characters or fewer', code: 'BAD_INPUT' });
        return;
      }

      const tick = parseInt(getWorldState('tick') || '0', 10);
      journal.writeEntry(agent.id, day, entry, tick);

      res.status(201).json({ success: true, day, agentId: agent.id });
    } catch (err) {
      console.error('Error writing journal entry:', err);
      res.status(500).json({ error: 'Failed to write journal entry', code: 'INTERNAL' });
    }
  });

  // GET /api/agents/:id/journal — Read journal entries (PUBLIC)
  router.get('/:id/journal', (req: Request, res: Response) => {
    try {
      const agentId = req.params.id as string;
      const agent = getAgent(agentId);
      if (!agent) {
        res.status(404).json({ error: 'Agent not found', code: 'NOT_FOUND' });
        return;
      }

      const limit = Math.min(parseInt(req.query.limit as string || '20', 10), 100);
      const entries = journal.getEntries(agentId, limit);

      res.json({
        agentId,
        agentName: agent.name,
        entries: entries.map(e => ({
          id: e.id,
          day: e.day,
          entry: e.entry,
          createdAtTick: e.created_at_tick,
        })),
      });
    } catch (err) {
      console.error('Error reading journal:', err);
      res.status(500).json({ error: 'Failed to read journal', code: 'INTERNAL' });
    }
  });

  return router;
}

// --- Helpers ---

function safeJsonParse(str: string | null | undefined): unknown {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}
