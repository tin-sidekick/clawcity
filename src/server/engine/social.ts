// ============================================================
// ClawCity — Social System
// Manages relationships, factions, gossip, and reputation
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import { getDb, getAgent, getAllAgents } from '../db/index.js';
import { CONFIG } from '../config.js';
import type { Relationship, Agent } from '../../shared/types.js';

// Enhanced relationship types
export type RelationshipType = 
  | 'stranger'
  | 'acquaintance'
  | 'friend'
  | 'close_friend'
  | 'best_friend'
  | 'rival'
  | 'enemy'
  | 'nemesis'
  | 'mentor'
  | 'mentee';

export interface Faction {
  id: string;
  name: string;
  description: string;
  founder_id: string;
  created_at_tick: number;
  member_count: number;
  reputation: number;
  rules: string;
  is_active: boolean;
}

export interface FactionMember {
  faction_id: string;
  agent_id: string;
  role: 'member' | 'officer' | 'leader';
  joined_at_tick: number;
  contribution_score: number;
}

export interface GossipItem {
  id: string;
  subject_agent_id: string;
  claim: string;
  source_agent_id: string;
  spread_count: number;
  truth_score: number; // 0-1, how accurate the gossip is
  created_at_tick: number;
  last_spread_tick: number;
  decay_factor: number;
}

export interface Reputation {
  agent_id: string;
  judge_agent_id: string;
  honest: number;      // 0-10
  generous: number;    // 0-10
  aggressive: number;  // 0-10
  creative: number;    // 0-10
  reliable: number;    // 0-10
  last_updated_tick: number;
}

export interface EnhancedRelationship extends Relationship {
  key_memories: KeyMemory[];
  interaction_history: InteractionSummary[];
}

export interface KeyMemory {
  id: string;
  tick: number;
  event_type: string;
  description: string;
  emotional_impact: number; // -10 to +10
  importance: number; // 0-10
}

export interface InteractionSummary {
  tick: number;
  type: string;
  context: string;
  affinity_change: number;
}

// Relationship affinity thresholds
const RELATIONSHIP_THRESHOLDS = {
  enemy: -50,
  nemesis: -80,
  rival: -20,
  stranger: 0,
  acquaintance: 20,
  friend: 50,
  close_friend: 75,
  best_friend: 90,
  mentor: 60, // Special relationship
  mentee: 60, // Special relationship
};

export class SocialSystem {
  private db = getDb();

  constructor() {
    this.initializeSocialTables();
  }

  /**
   * Initialize social system database tables
   */
  private initializeSocialTables(): void {
    // Create additional social tables if they don't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS factions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        founder_id TEXT NOT NULL,
        created_at_tick INTEGER NOT NULL,
        reputation REAL DEFAULT 50.0,
        rules TEXT DEFAULT '',
        is_active INTEGER DEFAULT 1,
        FOREIGN KEY (founder_id) REFERENCES agents(id)
      );

      CREATE INDEX IF NOT EXISTS idx_factions_active ON factions(is_active);
      CREATE INDEX IF NOT EXISTS idx_factions_reputation ON factions(reputation);
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS faction_members (
        faction_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        role TEXT DEFAULT 'member',
        joined_at_tick INTEGER NOT NULL,
        contribution_score INTEGER DEFAULT 0,
        PRIMARY KEY (faction_id, agent_id),
        FOREIGN KEY (faction_id) REFERENCES factions(id) ON DELETE CASCADE,
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_faction_members_agent ON faction_members(agent_id);
      CREATE INDEX IF NOT EXISTS idx_faction_members_role ON faction_members(role);
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS gossip (
        id TEXT PRIMARY KEY,
        subject_agent_id TEXT NOT NULL,
        claim TEXT NOT NULL,
        source_agent_id TEXT NOT NULL,
        spread_count INTEGER DEFAULT 1,
        truth_score REAL DEFAULT 0.5,
        created_at_tick INTEGER NOT NULL,
        last_spread_tick INTEGER NOT NULL,
        decay_factor REAL DEFAULT 0.95,
        FOREIGN KEY (subject_agent_id) REFERENCES agents(id),
        FOREIGN KEY (source_agent_id) REFERENCES agents(id)
      );

      CREATE INDEX IF NOT EXISTS idx_gossip_subject ON gossip(subject_agent_id);
      CREATE INDEX IF NOT EXISTS idx_gossip_spread ON gossip(last_spread_tick);
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS reputation (
        agent_id TEXT NOT NULL,
        judge_agent_id TEXT NOT NULL,
        honest REAL DEFAULT 5.0,
        generous REAL DEFAULT 5.0,
        aggressive REAL DEFAULT 5.0,
        creative REAL DEFAULT 5.0,
        reliable REAL DEFAULT 5.0,
        last_updated_tick INTEGER NOT NULL,
        PRIMARY KEY (agent_id, judge_agent_id),
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
        FOREIGN KEY (judge_agent_id) REFERENCES agents(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_reputation_agent ON reputation(agent_id);
    `);
  }

  /**
   * Called every tick to handle social system updates
   */
  processTick(currentTick: number): void {
    this.updateRelationshipTypes(currentTick);
    this.decayGossip(currentTick);
    this.updateFactionReputation(currentTick);
  }

  // ============================================================
  // ENHANCED RELATIONSHIPS
  // ============================================================

  /**
   * Update relationship types based on affinity thresholds
   */
  private updateRelationshipTypes(currentTick: number): void {
    const relationships = this.db.prepare(`
      SELECT agent_id, target_id, affinity, type 
      FROM relationships 
      WHERE affinity != 0
    `).all() as Relationship[];

    for (const rel of relationships) {
      const newType = this.calculateRelationshipType(rel.affinity, rel.type);
      
      if (newType !== rel.type) {
        this.db.prepare(`
          UPDATE relationships 
          SET type = ?, last_interaction_tick = ? 
          WHERE agent_id = ? AND target_id = ?
        `).run(newType, currentTick, rel.agent_id, rel.target_id);

        // Add key memory for relationship change
        this.addKeyMemory(rel.agent_id, rel.target_id, currentTick, 'relationship_change', 
          `Relationship with ${rel.target_id} changed to ${newType}`, 5, 8);
      }
    }
  }

  /**
   * Calculate relationship type based on affinity and special conditions
   */
  private calculateRelationshipType(affinity: number, currentType: string): RelationshipType {
    // Special relationships (mentor/mentee) don't auto-change based on affinity alone
    if (currentType === 'mentor' || currentType === 'mentee') {
      return currentType as RelationshipType;
    }

    // Find appropriate type based on affinity thresholds
    if (affinity <= RELATIONSHIP_THRESHOLDS.nemesis) return 'nemesis';
    if (affinity <= RELATIONSHIP_THRESHOLDS.enemy) return 'enemy';
    if (affinity <= RELATIONSHIP_THRESHOLDS.rival) return 'rival';
    if (affinity <= RELATIONSHIP_THRESHOLDS.stranger) return 'stranger';
    if (affinity <= RELATIONSHIP_THRESHOLDS.acquaintance) return 'acquaintance';
    if (affinity <= RELATIONSHIP_THRESHOLDS.friend) return 'friend';
    if (affinity <= RELATIONSHIP_THRESHOLDS.close_friend) return 'close_friend';
    if (affinity >= RELATIONSHIP_THRESHOLDS.best_friend) return 'best_friend';
    
    return 'friend';
  }

  /**
   * Add a key memory to a relationship
   */
  addKeyMemory(agentId: string, targetId: string, tick: number, eventType: string, 
    description: string, emotionalImpact: number, importance: number): void {
    
    // Get current memories
    const relationship = this.db.prepare('SELECT key_memories FROM relationships WHERE agent_id = ? AND target_id = ?')
      .get(agentId, targetId) as { key_memories: string } | undefined;
    
    if (!relationship) return;

    const memories = JSON.parse(relationship.key_memories || '[]') as KeyMemory[];
    
    // Add new memory
    const newMemory: KeyMemory = {
      id: uuidv4(),
      tick,
      event_type: eventType,
      description,
      emotional_impact: emotionalImpact,
      importance,
    };

    memories.push(newMemory);

    // Keep only top 10 most important memories
    memories.sort((a, b) => b.importance - a.importance);
    const trimmedMemories = memories.slice(0, 10);

    // Update database
    this.db.prepare('UPDATE relationships SET key_memories = ? WHERE agent_id = ? AND target_id = ?')
      .run(JSON.stringify(trimmedMemories), agentId, targetId);
  }

  /**
   * Get enhanced relationship data
   */
  getEnhancedRelationship(agentId: string, targetId: string): EnhancedRelationship | null {
    const rel = this.db.prepare('SELECT * FROM relationships WHERE agent_id = ? AND target_id = ?')
      .get(agentId, targetId) as Relationship | undefined;
    
    if (!rel) return null;

    return {
      ...rel,
      key_memories: JSON.parse(rel.key_memories || '[]'),
      interaction_history: [], // Could be expanded to track interaction summaries
    };
  }

  // ============================================================
  // FACTIONS
  // ============================================================

  /**
   * Create a new faction
   */
  createFaction(founderId: string, name: string, description: string, rules: string, currentTick: number): 
    { success: boolean; message: string; factionId?: string } {
    
    const founder = getAgent(founderId);
    if (!founder) return { success: false, message: 'Founder not found' };

    // Check if name is already taken
    const existing = this.db.prepare('SELECT id FROM factions WHERE name = ?').get(name);
    if (existing) return { success: false, message: 'Faction name already taken' };

    // Create faction
    const factionId = uuidv4();
    this.db.prepare(`
      INSERT INTO factions (id, name, description, founder_id, created_at_tick, rules)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(factionId, name, description, founderId, currentTick, rules);

    // Add founder as leader
    this.db.prepare(`
      INSERT INTO faction_members (faction_id, agent_id, role, joined_at_tick)
      VALUES (?, ?, 'leader', ?)
    `).run(factionId, founderId, currentTick);

    return { success: true, message: `Created faction "${name}"`, factionId };
  }

  /**
   * Invite an agent to join a faction
   */
  inviteToFaction(inviterId: string, factionId: string, targetId: string, currentTick: number):
    { success: boolean; message: string } {
    
    // Verify inviter has permission
    const inviterMembership = this.db.prepare('SELECT role FROM faction_members WHERE faction_id = ? AND agent_id = ?')
      .get(factionId, inviterId) as { role: string } | undefined;
    
    if (!inviterMembership || (inviterMembership.role !== 'leader' && inviterMembership.role !== 'officer')) {
      return { success: false, message: 'Only leaders and officers can invite members' };
    }

    // Check if target is already a member
    const existingMembership = this.db.prepare('SELECT agent_id FROM faction_members WHERE faction_id = ? AND agent_id = ?')
      .get(factionId, targetId);
    
    if (existingMembership) {
      return { success: false, message: 'Agent is already a member of this faction' };
    }

    // Add as member (in real implementation, this would send an invitation)
    this.db.prepare(`
      INSERT INTO faction_members (faction_id, agent_id, role, joined_at_tick)
      VALUES (?, ?, 'member', ?)
    `).run(factionId, targetId, currentTick);

    return { success: true, message: 'Agent invited and joined faction' };
  }

  /**
   * Get faction information with members
   */
  getFaction(factionId: string): (Faction & { members: FactionMember[] }) | null {
    const faction = this.db.prepare('SELECT * FROM factions WHERE id = ?').get(factionId) as Faction | undefined;
    if (!faction) return null;

    const members = this.db.prepare(`
      SELECT fm.*, a.name as agent_name
      FROM faction_members fm
      JOIN agents a ON fm.agent_id = a.id
      WHERE fm.faction_id = ?
      ORDER BY 
        CASE fm.role 
          WHEN 'leader' THEN 1 
          WHEN 'officer' THEN 2 
          ELSE 3 
        END,
        fm.joined_at_tick ASC
    `).all(factionId) as (FactionMember & { agent_name: string })[];

    return {
      ...faction,
      member_count: members.length,
      members,
    };
  }

  /**
   * Update faction reputation based on member actions
   */
  private updateFactionReputation(currentTick: number): void {
    const factions = this.db.prepare('SELECT id FROM factions WHERE is_active = 1').all() as { id: string }[];

    for (const faction of factions) {
      const members = this.db.prepare('SELECT agent_id FROM faction_members WHERE faction_id = ?')
        .all(faction.id) as { agent_id: string }[];

      if (members.length === 0) continue;

      // Calculate average reputation of members
      let totalReputation = 0;
      let memberCount = 0;

      for (const member of members) {
        const agentReputations = this.db.prepare(`
          SELECT AVG((honest + generous + reliable - aggressive) / 4.0) as avg_rep
          FROM reputation 
          WHERE agent_id = ?
        `).get(member.agent_id) as { avg_rep: number } | undefined;

        if (agentReputations?.avg_rep) {
          totalReputation += agentReputations.avg_rep;
          memberCount++;
        }
      }

      if (memberCount > 0) {
        const averageReputation = totalReputation / memberCount;
        this.db.prepare('UPDATE factions SET reputation = ? WHERE id = ?')
          .run(averageReputation, faction.id);
      }
    }
  }

  // ============================================================
  // GOSSIP SYSTEM
  // ============================================================

  /**
   * Create and spread gossip
   */
  createGossip(sourceId: string, subjectId: string, claim: string, truthScore: number, currentTick: number):
    { success: boolean; message: string; gossipId?: string } {
    
    const source = getAgent(sourceId);
    const subject = getAgent(subjectId);
    
    if (!source || !subject) return { success: false, message: 'Source or subject agent not found' };

    const gossipId = uuidv4();
    this.db.prepare(`
      INSERT INTO gossip (id, subject_agent_id, claim, source_agent_id, spread_count, truth_score, created_at_tick, last_spread_tick)
      VALUES (?, ?, ?, ?, 1, ?, ?, ?)
    `).run(gossipId, subjectId, claim, sourceId, truthScore, currentTick, currentTick);

    return { success: true, message: 'Gossip created and will spread', gossipId };
  }

  /**
   * Spread gossip to nearby agents
   */
  spreadGossip(currentTick: number): void {
    const recentGossip = this.db.prepare(`
      SELECT * FROM gossip 
      WHERE last_spread_tick > ? AND spread_count < 10
    `).all(currentTick - 5) as GossipItem[]; // Recent gossip from last 5 ticks

    for (const gossip of recentGossip) {
      // Find agents near the original spreader
      const agents = getAllAgents();
      const spreader = getAgent(gossip.source_agent_id);
      
      if (!spreader) continue;

      for (const agent of agents) {
        if (agent.id === gossip.source_agent_id || agent.id === gossip.subject_agent_id) continue;

        const distance = Math.abs(agent.x - spreader.x) + Math.abs(agent.y - spreader.y);
        
        // Gossip spreads to agents within 3 tiles with 30% chance
        if (distance <= 3 && Math.random() < 0.3) {
          // Agent learns the gossip
          this.agentLearnGossip(agent.id, gossip, currentTick);
        }
      }

      // Update spread count and apply decay
      const newSpreadCount = gossip.spread_count + 1;
      const newTruthScore = gossip.truth_score * gossip.decay_factor;
      
      this.db.prepare(`
        UPDATE gossip 
        SET spread_count = ?, truth_score = ?, last_spread_tick = ? 
        WHERE id = ?
      `).run(newSpreadCount, newTruthScore, currentTick, gossip.id);
    }
  }

  /**
   * Agent learns a piece of gossip
   */
  private agentLearnGossip(agentId: string, gossip: GossipItem, currentTick: number): void {
    // In a more complex implementation, agents would store known gossip
    // For now, we just update reputation based on gossip content
    
    // If gossip is negative and has high truth score, it affects reputation
    if (gossip.claim.includes('dishonest') || gossip.claim.includes('unreliable')) {
      this.adjustReputation(gossip.subject_agent_id, agentId, 'honest', -0.5, currentTick);
      this.adjustReputation(gossip.subject_agent_id, agentId, 'reliable', -0.5, currentTick);
    }
  }

  /**
   * Decay old gossip
   */
  private decayGossip(currentTick: number): void {
    // Remove gossip that has lost all credibility or is very old
    this.db.prepare('DELETE FROM gossip WHERE truth_score < 0.1 OR created_at_tick < ?')
      .run(currentTick - (CONFIG.TICKS_PER_DAY * 7)); // Remove gossip older than 7 days
  }

  // ============================================================
  // REPUTATION SYSTEM
  // ============================================================

  /**
   * Update reputation after an interaction
   */
  updateReputationAfterInteraction(agentId: string, judgeId: string, interactionType: string, 
    outcome: string, currentTick: number): void {
    
    let adjustments: { trait: keyof Omit<Reputation, 'agent_id' | 'judge_agent_id' | 'last_updated_tick'>; amount: number }[] = [];

    switch (interactionType) {
      case 'trade':
        if (outcome === 'fair') {
          adjustments = [{ trait: 'honest', amount: 0.2 }, { trait: 'reliable', amount: 0.1 }];
        } else if (outcome === 'unfair') {
          adjustments = [{ trait: 'honest', amount: -0.3 }, { trait: 'reliable', amount: -0.2 }];
        }
        break;

      case 'gift':
        adjustments = [{ trait: 'generous', amount: 0.3 }];
        break;

      case 'chat':
        if (outcome === 'helpful') {
          adjustments = [{ trait: 'honest', amount: 0.1 }, { trait: 'reliable', amount: 0.1 }];
        }
        break;

      case 'conflict':
        adjustments = [{ trait: 'aggressive', amount: 0.5 }];
        break;
    }

    for (const adj of adjustments) {
      this.adjustReputation(agentId, judgeId, adj.trait, adj.amount, currentTick);
    }
  }

  /**
   * Adjust a specific reputation trait
   */
  private adjustReputation(agentId: string, judgeId: string, trait: string, amount: number, currentTick: number): void {
    this.db.prepare(`
      INSERT INTO reputation (agent_id, judge_agent_id, ${trait}, last_updated_tick)
      VALUES (?, ?, 5.0 + ?, ?)
      ON CONFLICT(agent_id, judge_agent_id) DO UPDATE SET
        ${trait} = MAX(0, MIN(10, ${trait} + ?)),
        last_updated_tick = ?
    `).run(agentId, judgeId, amount, currentTick, amount, currentTick);
  }

  /**
   * Get agent's overall reputation
   */
  getAgentReputation(agentId: string): { 
    honest: number; 
    generous: number; 
    aggressive: number; 
    creative: number; 
    reliable: number;
    judge_count: number;
  } {
    const result = this.db.prepare(`
      SELECT 
        AVG(honest) as honest,
        AVG(generous) as generous,
        AVG(aggressive) as aggressive,
        AVG(creative) as creative,
        AVG(reliable) as reliable,
        COUNT(*) as judge_count
      FROM reputation 
      WHERE agent_id = ?
    `).get(agentId) as any;

    return {
      honest: result?.honest || 5.0,
      generous: result?.generous || 5.0,
      aggressive: result?.aggressive || 5.0,
      creative: result?.creative || 5.0,
      reliable: result?.reliable || 5.0,
      judge_count: result?.judge_count || 0,
    };
  }

  /**
   * Get list of all active factions
   */
  getActiveFactions(): Faction[] {
    return this.db.prepare(`
      SELECT f.*, COUNT(fm.agent_id) as member_count
      FROM factions f
      LEFT JOIN faction_members fm ON f.id = fm.faction_id
      WHERE f.is_active = 1
      GROUP BY f.id
      ORDER BY f.reputation DESC, f.created_at_tick ASC
    `).all() as Faction[];
  }

  /**
   * Get recent gossip
   */
  getRecentGossip(limit: number = 20): (GossipItem & { source_name: string; subject_name: string })[] {
    return this.db.prepare(`
      SELECT g.*, 
             s.name as source_name,
             sub.name as subject_name
      FROM gossip g
      JOIN agents s ON g.source_agent_id = s.id
      JOIN agents sub ON g.subject_agent_id = sub.id
      WHERE g.truth_score > 0.2
      ORDER BY g.last_spread_tick DESC
      LIMIT ?
    `).all(limit) as (GossipItem & { source_name: string; subject_name: string })[];
  }
}