// ============================================================
// ClawCity — Highlight Detection
// Automatically detect "interesting moments" for spectators
// ============================================================

import { getDb, getWorldState, setWorldState, getAllAgents, getAllBuildings, getAgent } from '../db/index.js';
import type { ActionResult } from './actions.js';

export interface Highlight {
  type: string;
  score: number;       // 1-10, higher = more interesting
  agents: string[];    // agent IDs involved
  summary: string;     // human-readable description
  tick: number;
  data: any;
}

// --- Sentiment / keyword detection ---

const CONFLICT_KEYWORDS = [
  'no', 'unfair', 'mine', 'wrong', 'disagree', 'steal', 'liar', 'hate',
  'fight', 'angry', 'terrible', 'stupid', 'cheat', 'betray', 'demand',
];

const EXISTENTIAL_KEYWORDS = [
  'real', 'exist', 'alive', 'dream', 'simulation', 'consciousness',
  'purpose', 'meaning', 'soul', 'feel', 'think', 'wonder if we',
  'are we', 'what am i', 'who am i', 'why are we here',
];

const RELATIONSHIP_THRESHOLDS = [
  { affinity: 30, label: 'friends', emoji: '🤝' },
  { affinity: 50, label: 'close friends', emoji: '💛' },
  { affinity: 70, label: 'best friends', emoji: '❤️' },
];

const BUILDING_MILESTONE_INTERVAL = 5;
const POPULATION_MILESTONE_INTERVAL = 10;

export class HighlightDetector {
  private recentHighlights: Highlight[] = [];
  private maxRecent = 200;

  /**
   * Check an action result for highlight-worthy moments.
   * Called after each action is processed.
   */
  checkAction(
    actionType: string,
    agentId: string,
    params: Record<string, unknown>,
    result: ActionResult,
    tick: number
  ): Highlight | null {
    if (!result.success) return null;

    const agent = getAgent(agentId);
    const agentName = agent?.name || agentId;

    switch (actionType) {
      case 'build':
        return this.checkBuild(agentId, agentName, params, result, tick);
      case 'chat':
      case 'talk':
        return this.checkChat(agentId, agentName, params, tick);
      case 'gift':
        return this.checkGift(agentId, agentName, params, tick);
      case 'gather':
        return this.checkGather(agentId, agentName, result, tick);
      case 'trade':
        return this.checkTrade(agentId, agentName, params, tick);
      default:
        return null;
    }
  }

  /**
   * Called each tick for aggregate / milestone checks.
   */
  checkTick(tick: number): Highlight[] {
    const highlights: Highlight[] = [];

    // Check population milestones
    const popHL = this.checkPopulationMilestone(tick);
    if (popHL) highlights.push(popHL);

    // Check building milestones
    const bldHL = this.checkBuildingMilestone(tick);
    if (bldHL) highlights.push(bldHL);

    // Check relationship milestones (scan all relationships for threshold crossings)
    const relHLs = this.checkRelationshipMilestones(tick);
    highlights.push(...relHLs);

    return highlights;
  }

  /**
   * Get recent highlights
   */
  getRecent(limit: number = 20): Highlight[] {
    return this.recentHighlights.slice(0, limit);
  }

  /**
   * Get today's top highlights (highest score first)
   */
  getTopToday(): Highlight[] {
    // "Today" = last 480 ticks (1 game day)
    const currentTick = parseInt(getWorldState('tick') || '0', 10);
    const dayStart = currentTick - 480;

    return this.recentHighlights
      .filter(h => h.tick >= dayStart)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }

  /**
   * Load highlights from DB on startup
   */
  loadFromDb(): void {
    const rows = getDb().prepare(
      'SELECT * FROM events WHERE highlight_score > 0 ORDER BY id DESC LIMIT ?'
    ).all(this.maxRecent) as unknown as Array<{ type: string; data: string; tick: number; highlight_score: number }>;

    this.recentHighlights = rows.map(r => {
      const data = JSON.parse(r.data || '{}');
      return {
        type: data.highlight_type || r.type,
        score: r.highlight_score,
        agents: data.agents || [],
        summary: data.summary || `${r.type} event`,
        tick: r.tick,
        data,
      };
    });
  }

  // ---- Private detection methods ----

  private addHighlight(h: Highlight): void {
    this.recentHighlights.unshift(h);
    if (this.recentHighlights.length > this.maxRecent) {
      this.recentHighlights.pop();
    }

    // Persist to events table
    getDb().prepare(
      'INSERT INTO events (type, data, tick, highlight_score) VALUES (?, ?, ?, ?)'
    ).run(
      'highlight',
      JSON.stringify({
        highlight_type: h.type,
        agents: h.agents,
        summary: h.summary,
        ...h.data,
      }),
      h.tick,
      h.score
    );
  }

  private checkBuild(
    agentId: string,
    agentName: string,
    params: Record<string, unknown>,
    result: ActionResult,
    tick: number
  ): Highlight | null {
    const buildingType = (params.building_type as string) || 'building';

    // Check first-ever building
    const firstKey = `first_${buildingType}`;
    const existing = getWorldState(firstKey);
    if (!existing) {
      setWorldState(firstKey, agentId);
      const h: Highlight = {
        type: 'first_ever',
        score: 10,
        agents: [agentId],
        summary: `🏠 ${agentName} built the first ${buildingType} in ClawCity!`,
        tick,
        data: { building_type: buildingType },
      };
      this.addHighlight(h);
      return h;
    }

    return null;
  }

  private checkChat(
    agentId: string,
    agentName: string,
    params: Record<string, unknown>,
    tick: number
  ): Highlight | null {
    const message = ((params.message as string) || '').toLowerCase();
    const toId = params.to_id as string | undefined;

    // Check for existential / funny dialogue
    const isExistential = EXISTENTIAL_KEYWORDS.some(kw => message.includes(kw));
    if (isExistential) {
      const originalMsg = (params.message as string) || '';
      const h: Highlight = {
        type: 'funny_dialogue',
        score: 8,
        agents: [agentId],
        summary: `😂 ${agentName} asked "${originalMsg.substring(0, 80)}${originalMsg.length > 80 ? '...' : ''}"`,
        tick,
        data: { message: originalMsg },
      };
      this.addHighlight(h);
      return h;
    }

    // Check for conflict/argument
    if (toId) {
      const conflictCount = CONFLICT_KEYWORDS.filter(kw => message.includes(kw)).length;
      if (conflictCount >= 2) {
        const target = getAgent(toId);
        const targetName = target?.name || toId;
        const h: Highlight = {
          type: 'conflict',
          score: 8,
          agents: [agentId, toId],
          summary: `⚡ ${agentName} and ${targetName} are having an argument!`,
          tick,
          data: { message: (params.message as string)?.substring(0, 100) },
        };
        this.addHighlight(h);
        return h;
      }
    }

    // Check first-ever chat
    const firstChat = getWorldState('first_chat');
    if (!firstChat) {
      setWorldState('first_chat', agentId);
      const h: Highlight = {
        type: 'first_ever',
        score: 10,
        agents: [agentId],
        summary: `💬 ${agentName} sent the first message in ClawCity!`,
        tick,
        data: { message: (params.message as string)?.substring(0, 100) },
      };
      this.addHighlight(h);
      return h;
    }

    return null;
  }

  private checkGift(
    agentId: string,
    agentName: string,
    params: Record<string, unknown>,
    tick: number
  ): Highlight | null {
    const targetId = params.to_id as string || params.target_id as string;
    const item = params.item as string;
    const amount = (params.amount as number) || 1;

    if (!targetId) return null;

    const target = getAgent(targetId);
    const targetName = target?.name || targetId;

    // Check first-ever gift
    const firstGift = getWorldState('first_gift');
    if (!firstGift) {
      setWorldState('first_gift', agentId);
      const h: Highlight = {
        type: 'first_ever',
        score: 10,
        agents: [agentId, targetId],
        summary: `🎁 ${agentName} gave the first gift in ClawCity — ${amount} ${item} to ${targetName}!`,
        tick,
        data: { item, amount },
      };
      this.addHighlight(h);
      return h;
    }

    // Normal gift highlight
    const h: Highlight = {
      type: 'gift_given',
      score: 5,
      agents: [agentId, targetId],
      summary: `🎁 ${agentName} gave ${targetName} ${amount > 1 ? amount + ' ' : ''}${item}`,
      tick,
      data: { item, amount },
    };
    this.addHighlight(h);
    return h;
  }

  private checkGather(
    agentId: string,
    agentName: string,
    result: ActionResult,
    tick: number
  ): Highlight | null {
    const resource = result.data?.resource as string;

    // Rare resource found
    if (resource === 'gold_ore' || resource === 'iron_ore') {
      const h: Highlight = {
        type: 'rare_resource',
        score: 7,
        agents: [agentId],
        summary: `💎 ${agentName} found a ${resource.replace('_', ' ')} deposit!`,
        tick,
        data: { resource, amount: result.data?.amount },
      };
      this.addHighlight(h);
      return h;
    }

    // Check first-ever gather
    const firstGather = getWorldState('first_gather');
    if (!firstGather) {
      setWorldState('first_gather', agentId);
      const h: Highlight = {
        type: 'first_ever',
        score: 10,
        agents: [agentId],
        summary: `⛏️ ${agentName} gathered the first resource in ClawCity!`,
        tick,
        data: { resource },
      };
      this.addHighlight(h);
      return h;
    }

    return null;
  }

  private checkTrade(
    agentId: string,
    agentName: string,
    params: Record<string, unknown>,
    tick: number
  ): Highlight | null {
    const targetId = params.target_id as string;
    if (!targetId) return null;

    const target = getAgent(targetId);
    const targetName = target?.name || targetId;

    // Check first-ever trade
    const firstTrade = getWorldState('first_trade');
    if (!firstTrade) {
      setWorldState('first_trade', agentId);
      const h: Highlight = {
        type: 'first_ever',
        score: 10,
        agents: [agentId, targetId],
        summary: `💰 ${agentName} completed the first trade in ClawCity with ${targetName}!`,
        tick,
        data: { offer: params.offer, request: params.request },
      };
      this.addHighlight(h);
      return h;
    }

    // Check for large trade (value > average × 3)
    // Simple heuristic: count total items traded
    const offer = params.offer as Record<string, number> || {};
    const totalItems = Object.values(offer).reduce((s, v) => s + v, 0);
    if (totalItems >= 10) {
      const h: Highlight = {
        type: 'large_trade',
        score: 6,
        agents: [agentId, targetId],
        summary: `💰 Big trade: ${agentName} traded ${totalItems} items with ${targetName}!`,
        tick,
        data: { offer, request: params.request },
      };
      this.addHighlight(h);
      return h;
    }

    return null;
  }

  private checkPopulationMilestone(tick: number): Highlight | null {
    const agents = getAllAgents();
    const count = agents.length;

    const lastMilestone = parseInt(getWorldState('last_population_milestone') || '0', 10);
    const nextMilestone = lastMilestone + POPULATION_MILESTONE_INTERVAL;

    if (count >= nextMilestone && nextMilestone > 0) {
      setWorldState('last_population_milestone', String(nextMilestone));
      const h: Highlight = {
        type: 'population_milestone',
        score: 8,
        agents: [],
        summary: `👥 Population reached ${nextMilestone}!`,
        tick,
        data: { population: count, milestone: nextMilestone },
      };
      this.addHighlight(h);
      return h;
    }

    return null;
  }

  private checkBuildingMilestone(tick: number): Highlight | null {
    const buildings = getAllBuildings();
    const count = buildings.length;

    const lastMilestone = parseInt(getWorldState('last_building_milestone') || '0', 10);
    const nextMilestone = lastMilestone + BUILDING_MILESTONE_INTERVAL;

    if (count >= nextMilestone && nextMilestone > 0) {
      setWorldState('last_building_milestone', String(nextMilestone));
      const h: Highlight = {
        type: 'building_milestone',
        score: 7,
        agents: [],
        summary: `🏘️ ClawCity now has ${nextMilestone} buildings!`,
        tick,
        data: { buildings: count, milestone: nextMilestone },
      };
      this.addHighlight(h);
      return h;
    }

    return null;
  }

  private checkRelationshipMilestones(tick: number): Highlight[] {
    const highlights: Highlight[] = [];

    // Check relationships that recently crossed thresholds
    // We track which milestones were already triggered via world_state
    const rows = getDb().prepare(
      'SELECT * FROM relationships WHERE last_interaction_tick = ?'
    ).all(tick) as unknown as Array<{
      agent_id: string;
      target_id: string;
      affinity: number;
      type: string;
    }>;

    for (const rel of rows) {
      for (const threshold of RELATIONSHIP_THRESHOLDS) {
        if (rel.affinity >= threshold.affinity) {
          const key = `rel_milestone_${rel.agent_id}_${rel.target_id}_${threshold.affinity}`;
          const existing = getWorldState(key);
          if (!existing) {
            setWorldState(key, '1');
            const agent1 = getAgent(rel.agent_id);
            const agent2 = getAgent(rel.target_id);
            const name1 = agent1?.name || rel.agent_id;
            const name2 = agent2?.name || rel.target_id;

            const h: Highlight = {
              type: 'relationship_milestone',
              score: 7,
              agents: [rel.agent_id, rel.target_id],
              summary: `${threshold.emoji} ${name1} and ${name2} became ${threshold.label}!`,
              tick,
              data: { affinity: rel.affinity, milestone: threshold.label },
            };
            this.addHighlight(h);
            highlights.push(h);
          }
        }
      }
    }

    return highlights;
  }
}
