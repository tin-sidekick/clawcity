import { Router, type Request, type Response } from 'express';
import { authenticateAgent } from './middleware.js';
import {
  getDb,
  getAgent,
  getTile,
  getWorldState,
  setWorldState,
} from '../db/index.js';
import { CONFIG } from '../config.js';
import { computeGameTime } from './world.js';
import type { ActionType } from '../../shared/types.js';
import type { SpectatorWebSocket } from '../ws/index.js';

const VALID_ACTIONS: ActionType[] = ['move', 'gather', 'build', 'craft', 'chat', 'gift', 'rest', 'explore', 'trade', 'buy', 'sell'];

export function createActionRouter(wsServer: SpectatorWebSocket): Router {
  const router = Router();

  // POST /api/agents/:id/action — Submit an action (AUTHED)
  router.post('/:id/action', authenticateAgent, (req: Request, res: Response) => {
    try {
      const agent = req.agent!;
      const { type, ...params } = req.body;
      const tick = parseInt(getWorldState('tick') || '0', 10);

      if (!type || !VALID_ACTIONS.includes(type as ActionType)) {
        res.status(400).json({
          error: `Invalid action type. Valid types: ${VALID_ACTIONS.join(', ')}`,
          code: 'BAD_INPUT',
        });
        return;
      }

      // Check energy
      if (agent.energy <= 0 && type !== 'rest') {
        res.status(400).json({ error: 'Agent has no energy. Must rest.', code: 'NO_ENERGY' });
        return;
      }

      let result: unknown;

      switch (type) {
        case 'move':
          result = handleMove(agent.id, params, tick);
          break;
        case 'gather':
          result = handleGather(agent.id, params, tick);
          break;
        case 'build':
          result = handleBuild(agent.id, params, tick);
          break;
        case 'chat':
          result = handleChat(agent.id, params, tick);
          break;
        case 'gift':
          result = handleGift(agent.id, params, tick);
          break;
        case 'craft':
          result = handleCraft(agent.id, params, tick);
          break;
        case 'rest':
          result = handleRest(agent.id, tick);
          break;
        default:
          result = { message: `Action '${type}' queued for processing` };
      }

      // Update last active
      getDb().prepare('UPDATE agents SET last_active_tick = ? WHERE id = ?').run(tick, agent.id);

      // Broadcast via WebSocket
      const eventName = `agent:${type === 'chat' ? 'talked' : type === 'move' ? 'moved' : type === 'gather' ? 'gathered' : type === 'build' ? 'built' : type === 'craft' ? 'crafted' : type === 'gift' ? 'gifted' : type}`;
      wsServer.broadcast(eventName, {
        agentId: agent.id,
        agentName: agent.name,
        action: type,
        params,
        result,
        tick,
        gameTime: computeGameTime(tick).gameTime,
      });

      res.json({ success: true, result, tick });
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message, code: err.code });
        return;
      }
      console.error('Error processing action:', err);
      res.status(500).json({ error: 'Failed to process action', code: 'INTERNAL' });
    }
  });

  return router;
}

// --- Action Handlers ---

class ActionError extends Error {
  statusCode: number;
  code: string;
  constructor(message: string, code: string = 'ACTION_FAILED', statusCode: number = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

function handleMove(agentId: string, params: any, tick: number) {
  const { dx, dy } = params;
  if (typeof dx !== 'number' || typeof dy !== 'number') {
    throw new ActionError('Move requires dx, dy (numbers)', 'BAD_INPUT');
  }
  if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
    throw new ActionError('Can only move 1 tile at a time', 'BAD_INPUT');
  }

  const agent = getAgent(agentId)!;
  const newX = agent.x + dx;
  const newY = agent.y + dy;

  // Bounds check
  if (newX < 0 || newX >= CONFIG.MAP_SIZE || newY < 0 || newY >= CONFIG.MAP_SIZE) {
    throw new ActionError('Cannot move outside map boundaries', 'OUT_OF_BOUNDS');
  }

  // Check tile walkability
  const tile = getTile(newX, newY);
  if (tile && tile.type === 'water') {
    throw new ActionError('Cannot walk on water', 'BLOCKED');
  }

  // Move agent and drain energy
  const energyCost = 0.02;
  getDb().prepare('UPDATE agents SET x = ?, y = ?, energy = MAX(0, energy - ?), last_active_tick = ? WHERE id = ?')
    .run(newX, newY, energyCost, tick, agentId);

  return { x: newX, y: newY, energyCost };
}

function handleGather(agentId: string, params: any, tick: number) {
  const agent = getAgent(agentId)!;
  const x = params.x ?? agent.x;
  const y = params.y ?? agent.y;

  // Must be adjacent or on tile
  if (Math.abs(x - agent.x) > 1 || Math.abs(y - agent.y) > 1) {
    throw new ActionError('Tile is too far away to gather', 'TOO_FAR');
  }

  const tile = getTile(x, y);
  if (!tile || !tile.resource || tile.resource_amount <= 0) {
    throw new ActionError('No resource to gather at this location', 'NO_RESOURCE');
  }
  if (tile.depleted_until > tick) {
    throw new ActionError('Resource is depleted, come back later', 'DEPLETED');
  }

  // Gather resource
  const amount = Math.min(tile.resource_amount, 1);
  const resource = tile.resource;
  
  getDb().prepare('UPDATE tiles SET resource_amount = resource_amount - ?, depleted_until = ? WHERE x = ? AND y = ?')
    .run(amount, tile.resource_amount - amount <= 0 ? tick + 100 : 0, x, y);

  // Add to inventory
  const inventory = JSON.parse(agent.inventory || '{}');
  inventory[resource] = (inventory[resource] || 0) + amount;

  const energyCost = 0.05;
  getDb().prepare('UPDATE agents SET inventory = ?, energy = MAX(0, energy - ?), last_active_tick = ? WHERE id = ?')
    .run(JSON.stringify(inventory), energyCost, tick, agentId);

  // Log event
  getDb().prepare("INSERT INTO events (type, data, tick, game_time) VALUES ('resource_gathered', ?, ?, ?)")
    .run(JSON.stringify({ agentId, resource, amount, x, y }), tick, computeGameTime(tick).gameTime);

  return { resource, amount, inventory };
}

function handleBuild(agentId: string, params: any, tick: number) {
  const { building_type, x, y, name } = params;
  if (!building_type || x === undefined || y === undefined) {
    throw new ActionError('Build requires building_type, x, y', 'BAD_INPUT');
  }

  const agent = getAgent(agentId)!;
  if (Math.abs(x - agent.x) > 2 || Math.abs(y - agent.y) > 2) {
    throw new ActionError('Too far to build here', 'TOO_FAR');
  }

  // Cost check (simplified)
  const buildCosts: Record<string, number> = {
    house: 100, shop: 200, workshop: 150, farm: 80,
    tavern: 250, library: 300, market_stall: 50,
  };
  const cost = buildCosts[building_type] || 100;
  if (agent.shell_coins < cost) {
    throw new ActionError(`Not enough coins. Need ${cost}, have ${agent.shell_coins}`, 'INSUFFICIENT_FUNDS');
  }

  const { v4: uuidv4 } = await_uuid();
  const buildingId = `bld_${uuidv4().slice(0, 8)}`;

  getDb().prepare(`
    INSERT INTO buildings (id, type, x, y, owner_id, name, built_at_tick)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(buildingId, building_type, x, y, agentId, name || `${agent.name}'s ${building_type}`, tick);

  const energyCost = 0.15;
  getDb().prepare('UPDATE agents SET shell_coins = shell_coins - ?, energy = MAX(0, energy - ?), last_active_tick = ? WHERE id = ?')
    .run(cost, energyCost, tick, agentId);

  // Log event
  getDb().prepare("INSERT INTO events (type, data, tick, game_time, highlight_score) VALUES ('building_built', ?, ?, ?, 8)")
    .run(JSON.stringify({ agentId, buildingId, building_type, x, y }), tick, computeGameTime(tick).gameTime);

  return { buildingId, cost };
}

function handleChat(agentId: string, params: any, tick: number) {
  const { message, to_id } = params;
  if (!message || typeof message !== 'string') {
    throw new ActionError('Chat requires a message string', 'BAD_INPUT');
  }

  const agent = getAgent(agentId)!;
  const isPublic = !to_id;

  getDb().prepare(`
    INSERT INTO messages (from_id, to_id, message, tick, game_time, is_public)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(agentId, to_id || null, message, tick, computeGameTime(tick).gameTime, isPublic ? 1 : 0);

  // Update relationship if direct message
  if (to_id) {
    const targetAgent = getAgent(to_id);
    if (!targetAgent) {
      throw new ActionError('Target agent not found', 'NOT_FOUND');
    }
    getDb().prepare(`
      INSERT INTO relationships (agent_id, target_id, affinity, type, last_interaction_tick)
      VALUES (?, ?, 1, 'acquaintance', ?)
      ON CONFLICT(agent_id, target_id) DO UPDATE SET
        affinity = MIN(100, affinity + 1),
        last_interaction_tick = ?
    `).run(agentId, to_id, tick, tick);

    // Reciprocal
    getDb().prepare(`
      INSERT INTO relationships (agent_id, target_id, affinity, type, last_interaction_tick)
      VALUES (?, ?, 1, 'acquaintance', ?)
      ON CONFLICT(agent_id, target_id) DO UPDATE SET
        affinity = MIN(100, affinity + 1),
        last_interaction_tick = ?
    `).run(to_id, agentId, tick, tick);
  }

  return { sent: true, to: to_id || 'public', message };
}

function handleGift(agentId: string, params: any, tick: number) {
  const { to_id, item, amount = 1 } = params;
  if (!to_id || !item) {
    throw new ActionError('Gift requires to_id and item', 'BAD_INPUT');
  }

  const agent = getAgent(agentId)!;
  const target = getAgent(to_id);
  if (!target) {
    throw new ActionError('Target agent not found', 'NOT_FOUND');
  }

  const inventory = JSON.parse(agent.inventory || '{}');
  if (!inventory[item] || inventory[item] < amount) {
    throw new ActionError(`Not enough ${item} to gift`, 'INSUFFICIENT_ITEMS');
  }

  // Transfer item
  inventory[item] -= amount;
  if (inventory[item] <= 0) delete inventory[item];

  const targetInv = JSON.parse(target.inventory || '{}');
  targetInv[item] = (targetInv[item] || 0) + amount;

  getDb().prepare('UPDATE agents SET inventory = ? WHERE id = ?').run(JSON.stringify(inventory), agentId);
  getDb().prepare('UPDATE agents SET inventory = ? WHERE id = ?').run(JSON.stringify(targetInv), to_id);

  // Boost relationship
  getDb().prepare(`
    INSERT INTO relationships (agent_id, target_id, affinity, type, last_interaction_tick)
    VALUES (?, ?, 3, 'acquaintance', ?)
    ON CONFLICT(agent_id, target_id) DO UPDATE SET
      affinity = MIN(100, affinity + 3),
      last_interaction_tick = ?
  `).run(to_id, agentId, tick, tick);

  return { gifted: true, item, amount, to: to_id };
}

function handleCraft(agentId: string, params: any, tick: number) {
  const { recipe } = params;
  if (!recipe || typeof recipe !== 'string') {
    throw new ActionError('Craft requires a recipe name', 'BAD_INPUT');
  }

  // Simple recipes
  const recipes: Record<string, { inputs: Record<string, number>; output: string; outputAmount: number }> = {
    plank: { inputs: { wood: 2 }, output: 'plank', outputAmount: 1 },
    stone_brick: { inputs: { stone: 2 }, output: 'stone_brick', outputAmount: 1 },
    tool: { inputs: { wood: 1, stone: 1 }, output: 'tool', outputAmount: 1 },
    bread: { inputs: { wheat: 3 }, output: 'bread', outputAmount: 1 },
    fishing_rod: { inputs: { wood: 2, string: 1 }, output: 'fishing_rod', outputAmount: 1 },
  };

  const rec = recipes[recipe];
  if (!rec) {
    throw new ActionError(`Unknown recipe: ${recipe}. Available: ${Object.keys(recipes).join(', ')}`, 'UNKNOWN_RECIPE');
  }

  const agent = getAgent(agentId)!;
  const inventory = JSON.parse(agent.inventory || '{}');

  // Check inputs
  for (const [item, needed] of Object.entries(rec.inputs)) {
    if (!inventory[item] || inventory[item] < needed) {
      throw new ActionError(`Not enough ${item}. Need ${needed}, have ${inventory[item] || 0}`, 'INSUFFICIENT_ITEMS');
    }
  }

  // Consume inputs
  for (const [item, needed] of Object.entries(rec.inputs)) {
    inventory[item] -= needed;
    if (inventory[item] <= 0) delete inventory[item];
  }

  // Add output
  inventory[rec.output] = (inventory[rec.output] || 0) + rec.outputAmount;

  const energyCost = 0.08;
  getDb().prepare('UPDATE agents SET inventory = ?, energy = MAX(0, energy - ?), last_active_tick = ? WHERE id = ?')
    .run(JSON.stringify(inventory), energyCost, tick, agentId);

  return { crafted: rec.output, amount: rec.outputAmount, inventory };
}

function handleRest(agentId: string, tick: number) {
  const energyRestore = 0.3;
  const moodBoost = 0.05;

  getDb().prepare('UPDATE agents SET energy = MIN(1.0, energy + ?), mood = MIN(1.0, mood + ?), last_active_tick = ? WHERE id = ?')
    .run(energyRestore, moodBoost, tick, agentId);

  const agent = getAgent(agentId)!;
  return { rested: true, energy: agent.energy, mood: agent.mood };
}

// Sync uuid import workaround
function await_uuid() {
  // uuid is already imported at top level
  return { v4: () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }};
}
