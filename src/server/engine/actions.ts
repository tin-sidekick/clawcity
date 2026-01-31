// ============================================================
// ClawCity — Action Queue
// Validates and executes agent actions each tick
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import { getDb, getAgent, getAgentsInRange } from '../db/index.js';
import { CONFIG } from '../config.js';
import { MapManager } from './map.js';
import { RECIPES, canCraft, deductMaterials, addToInventory, removeFromInventory } from './crafting.js';
import type { Action, ActionType, Agent } from '../../shared/types.js';

// --- Energy costs per action ---
const ENERGY_COSTS: Record<string, number> = {
  move: 0.005,
  gather: 0.02,
  build: 0.05,
  craft: 0.03,
  talk: 0,
  chat: 0,      // alias for talk
  gift: 0,
  rest: -0.1,   // Rest restores energy
  explore: 0.01,
};

export interface ActionResult {
  agentId: string;
  action: ActionType;
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

interface QueuedAction {
  agentId: string;
  action: Action;
  timestamp: number;
  tick: number;
}

export class ActionQueue {
  private queue: QueuedAction[] = [];
  private mapManager: MapManager;
  private actionsThisTick: Map<string, number> = new Map(); // agentId -> count

  constructor(mapManager: MapManager) {
    this.mapManager = mapManager;
  }

  /**
   * Add an action to the queue
   */
  enqueue(agentId: string, action: Action): { queued: boolean; reason?: string } {
    const validation = this.validateAction(agentId, action);
    if (!validation.valid) {
      return { queued: false, reason: validation.reason };
    }

    this.queue.push({
      agentId,
      action,
      timestamp: Date.now(),
      tick: 0, // Will be set during processing
    });

    return { queued: true };
  }

  /**
   * Process all queued actions for the current tick
   */
  processAll(currentTick: number): ActionResult[] {
    const results: ActionResult[] = [];
    this.actionsThisTick.clear();

    // Process in FIFO order
    const toProcess = [...this.queue];
    this.queue = [];

    for (const queued of toProcess) {
      // Check per-tick action limit
      const count = this.actionsThisTick.get(queued.agentId) || 0;
      if (count >= CONFIG.MAX_ACTIONS_PER_TICK) {
        results.push({
          agentId: queued.agentId,
          action: queued.action.type,
          success: false,
          message: `Max ${CONFIG.MAX_ACTIONS_PER_TICK} actions per tick exceeded`,
        });
        continue;
      }

      // Re-validate at execution time (state may have changed)
      const validation = this.validateAction(queued.agentId, queued.action);
      if (!validation.valid) {
        results.push({
          agentId: queued.agentId,
          action: queued.action.type,
          success: false,
          message: validation.reason || 'Validation failed',
        });
        continue;
      }

      // Execute the action
      const result = this.executeAction(queued.agentId, queued.action, currentTick);
      results.push(result);

      if (result.success) {
        this.actionsThisTick.set(queued.agentId, count + 1);
      }
    }

    return results;
  }

  /**
   * Validate an action before queueing or executing
   */
  validateAction(agentId: string, action: Action): { valid: boolean; reason?: string } {
    const agent = getAgent(agentId);
    if (!agent) return { valid: false, reason: 'Agent not found' };

    // Check energy for physical actions
    const energyCost = ENERGY_COSTS[action.type] ?? 0;
    if (energyCost > 0 && agent.energy < energyCost) {
      return { valid: false, reason: `Not enough energy (need ${energyCost}, have ${agent.energy.toFixed(3)})` };
    }

    const params = action.params || {};

    switch (action.type) {
      case 'move': {
        const dx = (params.dx as number) || 0;
        const dy = (params.dy as number) || 0;

        // Only allow 1-tile moves
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
          return { valid: false, reason: 'Can only move 1 tile at a time' };
        }
        if (dx === 0 && dy === 0) {
          return { valid: false, reason: 'No movement specified' };
        }

        const newX = agent.x + dx;
        const newY = agent.y + dy;
        if (!this.mapManager.isWalkable(newX, newY)) {
          return { valid: false, reason: `Tile (${newX}, ${newY}) is not walkable` };
        }
        break;
      }

      case 'gather': {
        const gx = (params.x as number) ?? agent.x;
        const gy = (params.y as number) ?? agent.y;

        // Must be on or adjacent to the tile
        if (Math.abs(gx - agent.x) > 1 || Math.abs(gy - agent.y) > 1) {
          return { valid: false, reason: 'Too far to gather (must be adjacent)' };
        }

        const tile = this.mapManager.getTile(gx, gy);
        if (!tile || !tile.resource || tile.resource_amount <= 0) {
          return { valid: false, reason: 'No resource to gather at this tile' };
        }
        break;
      }

      case 'build': {
        const buildType = params.building_type as string;
        if (!buildType) return { valid: false, reason: 'No building type specified' };

        const recipe = RECIPES[buildType];
        if (!recipe || !recipe.isBuilding) {
          return { valid: false, reason: `Unknown building type: ${buildType}` };
        }

        const inventory = JSON.parse(agent.inventory || '{}');
        const craftCheck = canCraft(inventory, buildType);
        if (!craftCheck.canCraft) {
          return { valid: false, reason: `Missing materials: ${JSON.stringify(craftCheck.missing)}` };
        }

        // Check build location
        const bx = (params.x as number) ?? agent.x;
        const by = (params.y as number) ?? agent.y;

        // Must be near agent
        if (Math.abs(bx - agent.x) > 2 || Math.abs(by - agent.y) > 2) {
          return { valid: false, reason: 'Too far to build (must be within 2 tiles)' };
        }

        // Check all tiles the building would occupy
        const w = recipe.width || 2;
        const h = recipe.height || 2;
        for (let dy = 0; dy < h; dy++) {
          for (let dx = 0; dx < w; dx++) {
            if (!this.mapManager.isWalkable(bx + dx, by + dy)) {
              return { valid: false, reason: `Tile (${bx + dx}, ${by + dy}) is not buildable` };
            }
          }
        }
        break;
      }

      case 'craft': {
        const item = params.item as string || params.recipe as string;
        if (!item) return { valid: false, reason: 'No item specified' };

        const recipe = RECIPES[item];
        if (!recipe) return { valid: false, reason: `Unknown recipe: ${item}` };
        if (recipe.isBuilding) return { valid: false, reason: 'Use build action for buildings' };

        const inv = JSON.parse(agent.inventory || '{}');
        const check = canCraft(inv, item);
        if (!check.canCraft) {
          return { valid: false, reason: `Missing materials: ${JSON.stringify(check.missing)}` };
        }
        break;
      }

      case 'talk':
      case 'chat': {
        const message = params.message as string;
        if (!message) return { valid: false, reason: 'No message provided' };

        const toId = params.to_id as string;
        if (toId) {
          const target = getAgent(toId);
          if (!target) return { valid: false, reason: `Target agent ${toId} not found` };

          // Check proximity (within 3 tiles)
          const dist = Math.abs(target.x - agent.x) + Math.abs(target.y - agent.y);
          if (dist > 3) {
            return { valid: false, reason: `Target too far (distance ${dist}, max 3)` };
          }
        }
        break;
      }

      case 'gift': {
        const targetId = params.target_id as string;
        const item = params.item as string;
        const amount = (params.amount as number) || 1;

        if (!targetId) return { valid: false, reason: 'No target specified' };
        if (!item) return { valid: false, reason: 'No item specified' };

        const target = getAgent(targetId);
        if (!target) return { valid: false, reason: `Target agent ${targetId} not found` };

        // Check proximity
        const dist = Math.abs(target.x - agent.x) + Math.abs(target.y - agent.y);
        if (dist > 3) {
          return { valid: false, reason: `Target too far (distance ${dist}, max 3)` };
        }

        // Check inventory
        const inv = JSON.parse(agent.inventory || '{}');
        if ((inv[item] || 0) < amount) {
          return { valid: false, reason: `Not enough ${item} (have ${inv[item] || 0}, need ${amount})` };
        }
        break;
      }

      default:
        // Allow unknown action types to pass through (future-proofing)
        break;
    }

    return { valid: true };
  }

  /**
   * Execute a validated action
   */
  private executeAction(agentId: string, action: Action, currentTick: number): ActionResult {
    const agent = getAgent(agentId)!;
    const params = action.params || {};
    const energyCost = ENERGY_COSTS[action.type] ?? 0;

    // Deduct energy
    if (energyCost !== 0) {
      const newEnergy = Math.max(0, Math.min(1, agent.energy - energyCost));
      getDb().prepare('UPDATE agents SET energy = ?, last_active_tick = ? WHERE id = ?')
        .run(newEnergy, currentTick, agentId);
    } else {
      getDb().prepare('UPDATE agents SET last_active_tick = ? WHERE id = ?')
        .run(currentTick, agentId);
    }

    switch (action.type) {
      case 'move':
        return this.executeMove(agent, params, currentTick);
      case 'gather':
        return this.executeGather(agent, params, currentTick);
      case 'build':
        return this.executeBuild(agent, params, currentTick);
      case 'craft':
        return this.executeCraft(agent, params, currentTick);
      case 'talk':
      case 'chat':
        return this.executeTalk(agent, params, currentTick);
      case 'gift':
        return this.executeGift(agent, params, currentTick);
      default:
        return { agentId, action: action.type, success: false, message: `Unknown action: ${action.type}` };
    }
  }

  private executeMove(agent: Agent, params: Record<string, unknown>, tick: number): ActionResult {
    const dx = (params.dx as number) || 0;
    const dy = (params.dy as number) || 0;
    const newX = agent.x + dx;
    const newY = agent.y + dy;

    getDb().prepare('UPDATE agents SET x = ?, y = ? WHERE id = ?')
      .run(newX, newY, agent.id);

    // Log event
    this.logEvent('agent_move', { agent_id: agent.id, from: { x: agent.x, y: agent.y }, to: { x: newX, y: newY } }, tick);

    return {
      agentId: agent.id,
      action: 'move',
      success: true,
      message: `Moved to (${newX}, ${newY})`,
      data: { x: newX, y: newY },
    };
  }

  private executeGather(agent: Agent, params: Record<string, unknown>, tick: number): ActionResult {
    const gx = (params.x as number) ?? agent.x;
    const gy = (params.y as number) ?? agent.y;

    const result = this.mapManager.gatherResource(gx, gy, tick);
    if (!result) {
      return { agentId: agent.id, action: 'gather', success: false, message: 'No resource available' };
    }

    // Add to inventory
    const inventory = JSON.parse(agent.inventory || '{}');
    const newInventory = addToInventory(inventory, result.resource, result.amount);
    getDb().prepare('UPDATE agents SET inventory = ? WHERE id = ?')
      .run(JSON.stringify(newInventory), agent.id);

    // Log event
    this.logEvent('resource_gathered', {
      agent_id: agent.id,
      resource: result.resource,
      amount: result.amount,
      x: gx,
      y: gy,
    }, tick, 1);

    return {
      agentId: agent.id,
      action: 'gather',
      success: true,
      message: `Gathered ${result.amount} ${result.resource}`,
      data: { resource: result.resource, amount: result.amount },
    };
  }

  private executeBuild(agent: Agent, params: Record<string, unknown>, tick: number): ActionResult {
    const buildType = params.building_type as string;
    const bx = (params.x as number) ?? agent.x;
    const by = (params.y as number) ?? agent.y;
    const name = (params.name as string) || `${agent.name}'s ${buildType}`;

    const recipe = RECIPES[buildType]!;

    // Deduct materials
    const inventory = JSON.parse(agent.inventory || '{}');
    const newInventory = deductMaterials(inventory, buildType);
    getDb().prepare('UPDATE agents SET inventory = ? WHERE id = ?')
      .run(JSON.stringify(newInventory), agent.id);

    // Place building
    const buildingId = uuidv4();
    getDb().prepare(
      'INSERT INTO buildings (id, type, x, y, width, height, owner_id, name, data, built_at_tick) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(buildingId, buildType, bx, by, recipe.width || 2, recipe.height || 2, agent.id, name, '{}', tick);

    // If it's a home, set agent's home
    if (buildType === 'shelter' || buildType === 'house') {
      getDb().prepare('UPDATE agents SET home_x = ?, home_y = ? WHERE id = ?')
        .run(bx, by, agent.id);
    }

    // Log event
    this.logEvent('building_built', {
      agent_id: agent.id,
      building_id: buildingId,
      type: buildType,
      x: bx,
      y: by,
      name,
    }, tick, 2);

    return {
      agentId: agent.id,
      action: 'build',
      success: true,
      message: `Built ${buildType} at (${bx}, ${by})`,
      data: { building_id: buildingId, type: buildType, x: bx, y: by },
    };
  }

  private executeCraft(agent: Agent, params: Record<string, unknown>, tick: number): ActionResult {
    const item = (params.item as string) || (params.recipe as string);

    // Deduct materials
    const inventory = JSON.parse(agent.inventory || '{}');
    const afterDeduct = deductMaterials(inventory, item);

    // Add crafted item
    const newInventory = addToInventory(afterDeduct, item, 1);
    getDb().prepare('UPDATE agents SET inventory = ? WHERE id = ?')
      .run(JSON.stringify(newInventory), agent.id);

    return {
      agentId: agent.id,
      action: 'craft',
      success: true,
      message: `Crafted ${item}`,
      data: { item, inventory: newInventory },
    };
  }

  private executeTalk(agent: Agent, params: Record<string, unknown>, tick: number): ActionResult {
    const message = params.message as string;
    const toId = (params.to_id as string) || null;
    const isPublic = toId ? 0 : 1;

    getDb().prepare(
      'INSERT INTO messages (from_id, to_id, message, tick, is_public) VALUES (?, ?, ?, ?, ?)'
    ).run(agent.id, toId, message, tick, isPublic);

    if (toId) {
      this.logEvent('agent_chat', {
        from: agent.id,
        to: toId,
        message: message.substring(0, 100),
      }, tick);
    }

    return {
      agentId: agent.id,
      action: 'chat',
      success: true,
      message: toId ? `Sent message to ${toId}` : 'Sent public message',
      data: { to_id: toId, is_public: isPublic },
    };
  }

  private executeGift(agent: Agent, params: Record<string, unknown>, tick: number): ActionResult {
    const targetId = params.target_id as string;
    const item = params.item as string;
    const amount = (params.amount as number) || 1;

    // Remove from giver
    const giverInv = JSON.parse(agent.inventory || '{}');
    const newGiverInv = removeFromInventory(giverInv, item, amount);
    if (!newGiverInv) {
      return { agentId: agent.id, action: 'gift', success: false, message: `Not enough ${item}` };
    }

    // Add to receiver
    const target = getAgent(targetId)!;
    const targetInv = JSON.parse(target.inventory || '{}');
    const newTargetInv = addToInventory(targetInv, item, amount);

    getDb().prepare('UPDATE agents SET inventory = ? WHERE id = ?')
      .run(JSON.stringify(newGiverInv), agent.id);
    getDb().prepare('UPDATE agents SET inventory = ? WHERE id = ?')
      .run(JSON.stringify(newTargetInv), targetId);

    // Update relationship
    getDb().prepare(`
      INSERT INTO relationships (agent_id, target_id, affinity, type, last_interaction_tick)
      VALUES (?, ?, 5, 'acquaintance', ?)
      ON CONFLICT(agent_id, target_id) DO UPDATE SET
        affinity = MIN(100, affinity + 5),
        last_interaction_tick = ?
    `).run(targetId, agent.id, tick, tick);

    this.logEvent('agent_trade', {
      from: agent.id,
      to: targetId,
      item,
      amount,
      type: 'gift',
    }, tick, 1);

    return {
      agentId: agent.id,
      action: 'gift',
      success: true,
      message: `Gave ${amount} ${item} to ${target.name}`,
      data: { target_id: targetId, item, amount },
    };
  }

  private logEvent(type: string, data: unknown, tick: number, highlightScore: number = 0): void {
    getDb().prepare(
      'INSERT INTO events (type, data, tick, highlight_score) VALUES (?, ?, ?, ?)'
    ).run(type, JSON.stringify(data), tick, highlightScore);
  }

  /**
   * Get current queue length
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Clear all queued actions (emergency)
   */
  clear(): void {
    this.queue = [];
  }
}
