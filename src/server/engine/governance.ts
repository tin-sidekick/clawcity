// ============================================================
// ClawCity — Governance System
// Manages bulletin board, voting, mayor elections, and community projects
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import { getDb, getAgent, getAllAgents } from '../db/index.js';
import { CONFIG } from '../config.js';

export interface Proposal {
  id: string;
  title: string;
  description: string;
  author_id: string;
  type: 'general' | 'mayor_election' | 'community_project' | 'policy';
  votes_for: number;
  votes_against: number;
  status: 'active' | 'passed' | 'failed' | 'campaign';
  created_at_tick: number;
  voting_ends_at_tick: number;
  data: string; // JSON string for additional data
}

export interface Vote {
  proposal_id: string;
  agent_id: string;
  vote: 'for' | 'against';
  cast_at_tick: number;
}

export interface Office {
  id: string;
  title: string;
  description: string;
  holder_id: string | null;
  elected_at_tick: number | null;
  term_ends_at_tick: number | null;
  powers: string; // JSON string of special powers
}

export interface CommunityProject {
  id: string;
  name: string;
  description: string;
  initiator_id: string;
  target_resources: string; // JSON: { wood: 100, stone: 50 }
  contributed_resources: string; // JSON: current contributions
  contributors: string; // JSON: array of contributor data
  reward_building_type: string;
  reward_x: number;
  reward_y: number;
  status: 'active' | 'completed' | 'failed';
  created_at_tick: number;
  deadline_tick: number | null;
}

interface Contributor {
  agent_id: string;
  agent_name: string;
  contributions: Record<string, number>;
  total_value: number;
}

interface MayorPowers {
  setTaxRate: boolean;
  nameLandmarks: boolean;
  callFestivals: boolean;
  manageBudget: boolean;
  declareEmergency: boolean;
}

export class GovernanceSystem {
  private db = getDb();
  private currentMayorId: string | null = null;

  constructor() {
    this.initializeGovernanceTables();
    this.loadCurrentMayor();
  }

  /**
   * Initialize governance system database tables
   */
  private initializeGovernanceTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS proposals (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        author_id TEXT NOT NULL,
        type TEXT DEFAULT 'general',
        votes_for INTEGER DEFAULT 0,
        votes_against INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        created_at_tick INTEGER NOT NULL,
        voting_ends_at_tick INTEGER NOT NULL,
        data TEXT DEFAULT '{}',
        FOREIGN KEY (author_id) REFERENCES agents(id)
      );

      CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
      CREATE INDEX IF NOT EXISTS idx_proposals_type ON proposals(type);
      CREATE INDEX IF NOT EXISTS idx_proposals_voting_end ON proposals(voting_ends_at_tick);
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS votes (
        proposal_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        vote TEXT NOT NULL,
        cast_at_tick INTEGER NOT NULL,
        PRIMARY KEY (proposal_id, agent_id),
        FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE,
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_votes_proposal ON votes(proposal_id);
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS offices (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL,
        holder_id TEXT,
        elected_at_tick INTEGER,
        term_ends_at_tick INTEGER,
        powers TEXT DEFAULT '{}',
        FOREIGN KEY (holder_id) REFERENCES agents(id)
      );
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS community_projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        initiator_id TEXT NOT NULL,
        target_resources TEXT NOT NULL,
        contributed_resources TEXT DEFAULT '{}',
        contributors TEXT DEFAULT '[]',
        reward_building_type TEXT NOT NULL,
        reward_x INTEGER NOT NULL,
        reward_y INTEGER NOT NULL,
        status TEXT DEFAULT 'active',
        created_at_tick INTEGER NOT NULL,
        deadline_tick INTEGER,
        FOREIGN KEY (initiator_id) REFERENCES agents(id)
      );

      CREATE INDEX IF NOT EXISTS idx_community_projects_status ON community_projects(status);
    `);

    // Create mayor office if it doesn't exist
    this.db.prepare(`
      INSERT OR IGNORE INTO offices (id, title, description, powers)
      VALUES (
        'mayor',
        'Mayor',
        'Elected leader of ClawCity with special administrative powers',
        ?
      )
    `).run(JSON.stringify({
      setTaxRate: true,
      nameLandmarks: true,
      callFestivals: true,
      manageBudget: true,
      declareEmergency: true,
    }));
  }

  /**
   * Load current mayor from database
   */
  private loadCurrentMayor(): void {
    const mayorOffice = this.db.prepare('SELECT holder_id FROM offices WHERE id = ?').get('mayor') as { holder_id: string } | undefined;
    this.currentMayorId = mayorOffice?.holder_id || null;
  }

  /**
   * Called every tick to handle governance updates
   */
  processTick(currentTick: number): void {
    this.processExpiredProposals(currentTick);
    this.processExpiredTerms(currentTick);
    this.checkCommunityProjectDeadlines(currentTick);
  }

  // ============================================================
  // BULLETIN BOARD & PROPOSALS
  // ============================================================

  /**
   * Create a new proposal
   */
  createProposal(authorId: string, title: string, description: string, type: string, currentTick: number, customData?: any): 
    { success: boolean; message: string; proposalId?: string } {
    
    const author = getAgent(authorId);
    if (!author) return { success: false, message: 'Author not found' };

    // Calculate voting period based on proposal type
    let votingPeriod = CONFIG.TICKS_PER_DAY; // 1 day default
    if (type === 'mayor_election') {
      votingPeriod = CONFIG.TICKS_PER_DAY; // 1 day voting after 2-day campaign
    } else if (type === 'community_project') {
      votingPeriod = CONFIG.TICKS_PER_DAY * 2; // 2 days for projects
    }

    const proposalId = uuidv4();
    const votingEnds = currentTick + votingPeriod;

    // Special handling for mayor elections
    let status = 'active';
    if (type === 'mayor_election') {
      status = 'campaign';
      // Add campaign period (2 days before voting starts)
      const campaignEnds = currentTick + (CONFIG.TICKS_PER_DAY * 2);
      customData = { ...customData, campaign_ends_at_tick: campaignEnds };
    }

    this.db.prepare(`
      INSERT INTO proposals (id, title, description, author_id, type, status, created_at_tick, voting_ends_at_tick, data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(proposalId, title, description, authorId, type, status, currentTick, votingEnds, JSON.stringify(customData || {}));

    return { success: true, message: `Proposal "${title}" created`, proposalId };
  }

  /**
   * Cast a vote on a proposal
   */
  castVote(agentId: string, proposalId: string, voteChoice: 'for' | 'against', currentTick: number):
    { success: boolean; message: string } {
    
    const agent = getAgent(agentId);
    if (!agent) return { success: false, message: 'Agent not found' };

    const proposal = this.db.prepare('SELECT * FROM proposals WHERE id = ?').get(proposalId) as Proposal | undefined;
    if (!proposal) return { success: false, message: 'Proposal not found' };

    if (proposal.status !== 'active') {
      return { success: false, message: `Proposal is ${proposal.status}, cannot vote` };
    }

    if (currentTick >= proposal.voting_ends_at_tick) {
      return { success: false, message: 'Voting period has ended' };
    }

    // Check if agent already voted
    const existingVote = this.db.prepare('SELECT vote FROM votes WHERE proposal_id = ? AND agent_id = ?')
      .get(proposalId, agentId) as { vote: string } | undefined;

    if (existingVote) {
      return { success: false, message: `You already voted ${existingVote.vote} on this proposal` };
    }

    // Cast the vote
    this.db.prepare(`
      INSERT INTO votes (proposal_id, agent_id, vote, cast_at_tick)
      VALUES (?, ?, ?, ?)
    `).run(proposalId, agentId, voteChoice, currentTick);

    // Update proposal vote counts
    if (voteChoice === 'for') {
      this.db.prepare('UPDATE proposals SET votes_for = votes_for + 1 WHERE id = ?').run(proposalId);
    } else {
      this.db.prepare('UPDATE proposals SET votes_against = votes_against + 1 WHERE id = ?').run(proposalId);
    }

    return { success: true, message: `Vote cast: ${voteChoice}` };
  }

  /**
   * Process expired proposals and determine outcomes
   */
  private processExpiredProposals(currentTick: number): void {
    const expiredProposals = this.db.prepare(`
      SELECT * FROM proposals 
      WHERE status = 'active' AND voting_ends_at_tick <= ?
    `).all(currentTick) as Proposal[];

    for (const proposal of expiredProposals) {
      const totalVotes = proposal.votes_for + proposal.votes_against;
      let newStatus: string;

      if (totalVotes === 0) {
        newStatus = 'failed';
      } else if (proposal.votes_for > proposal.votes_against) {
        newStatus = 'passed';
        this.executeProposal(proposal, currentTick);
      } else {
        newStatus = 'failed';
      }

      this.db.prepare('UPDATE proposals SET status = ? WHERE id = ?').run(newStatus, proposal.id);
    }

    // Also handle mayor election campaigns that are ready for voting
    const campaignsReadyForVoting = this.db.prepare(`
      SELECT * FROM proposals 
      WHERE status = 'campaign' AND type = 'mayor_election'
    `).all() as Proposal[];

    for (const campaign of campaignsReadyForVoting) {
      const data = JSON.parse(campaign.data || '{}');
      if (data.campaign_ends_at_tick && currentTick >= data.campaign_ends_at_tick) {
        this.db.prepare('UPDATE proposals SET status = ? WHERE id = ?').run('active', campaign.id);
      }
    }
  }

  /**
   * Execute a passed proposal
   */
  private executeProposal(proposal: Proposal, currentTick: number): void {
    switch (proposal.type) {
      case 'mayor_election':
        this.electMayor(proposal.author_id, currentTick);
        break;

      case 'community_project':
        this.approveProject(proposal.id, currentTick);
        break;

      case 'policy':
        // Could implement various policy changes
        this.enactPolicy(proposal, currentTick);
        break;

      default:
        // General proposal - just record the decision
        break;
    }
  }

  // ============================================================
  // MAYOR ELECTION
  // ============================================================

  /**
   * Elect a new mayor
   */
  private electMayor(agentId: string, currentTick: number): void {
    const termLength = CONFIG.TICKS_PER_DAY * 14; // 14-day term
    const termEnds = currentTick + termLength;

    this.db.prepare(`
      UPDATE offices 
      SET holder_id = ?, elected_at_tick = ?, term_ends_at_tick = ?
      WHERE id = 'mayor'
    `).run(agentId, currentTick, termEnds);

    this.currentMayorId = agentId;
  }

  /**
   * Check if current agent is mayor
   */
  isMayor(agentId: string): boolean {
    return this.currentMayorId === agentId;
  }

  /**
   * Get current mayor information
   */
  getCurrentMayor(): { agentId: string | null; agent?: any; termEnds?: number } {
    const mayorOffice = this.db.prepare('SELECT * FROM offices WHERE id = ?').get('mayor') as Office | undefined;
    
    if (!mayorOffice?.holder_id) {
      return { agentId: null };
    }

    const agent = getAgent(mayorOffice.holder_id);
    
    return {
      agentId: mayorOffice.holder_id,
      agent,
      termEnds: mayorOffice.term_ends_at_tick || undefined,
    };
  }

  /**
   * Mayor action: Set tax rate
   */
  mayorSetTaxRate(mayorId: string, newRate: number): { success: boolean; message: string } {
    if (!this.isMayor(mayorId)) {
      return { success: false, message: 'Only the mayor can set tax rates' };
    }

    if (newRate < 0 || newRate > 10) {
      return { success: false, message: 'Tax rate must be between 0 and 10 coins per tile' };
    }

    // Store in world state
    this.db.prepare('INSERT OR REPLACE INTO world_state (key, value) VALUES (?, ?)')
      .run('property_tax_rate', newRate.toString());

    return { success: true, message: `Property tax rate set to ${newRate} coins per tile` };
  }

  /**
   * Mayor action: Name a landmark
   */
  mayorNameLandmark(mayorId: string, x: number, y: number, name: string): { success: boolean; message: string } {
    if (!this.isMayor(mayorId)) {
      return { success: false, message: 'Only the mayor can name landmarks' };
    }

    // Store landmark name in world state
    const landmarkKey = `landmark_${x}_${y}`;
    this.db.prepare('INSERT OR REPLACE INTO world_state (key, value) VALUES (?, ?)')
      .run(landmarkKey, name);

    return { success: true, message: `Location (${x}, ${y}) named "${name}"` };
  }

  /**
   * Process expired terms
   */
  private processExpiredTerms(currentTick: number): void {
    const expiredOffices = this.db.prepare(`
      SELECT * FROM offices 
      WHERE term_ends_at_tick IS NOT NULL AND term_ends_at_tick <= ?
    `).all(currentTick) as Office[];

    for (const office of expiredOffices) {
      this.db.prepare(`
        UPDATE offices 
        SET holder_id = NULL, elected_at_tick = NULL, term_ends_at_tick = NULL 
        WHERE id = ?
      `).run(office.id);

      if (office.id === 'mayor') {
        this.currentMayorId = null;
      }
    }
  }

  // ============================================================
  // COMMUNITY PROJECTS
  // ============================================================

  /**
   * Create a community project
   */
  createCommunityProject(initiatorId: string, name: string, description: string, 
    targetResources: Record<string, number>, rewardBuildingType: string, 
    rewardX: number, rewardY: number, currentTick: number):
    { success: boolean; message: string; projectId?: string } {
    
    const initiator = getAgent(initiatorId);
    if (!initiator) return { success: false, message: 'Initiator not found' };

    const projectId = uuidv4();
    const deadline = currentTick + (CONFIG.TICKS_PER_DAY * 7); // 7-day deadline

    this.db.prepare(`
      INSERT INTO community_projects 
      (id, name, description, initiator_id, target_resources, reward_building_type, 
       reward_x, reward_y, created_at_tick, deadline_tick)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(projectId, name, description, initiatorId, JSON.stringify(targetResources), 
           rewardBuildingType, rewardX, rewardY, currentTick, deadline);

    return { success: true, message: `Community project "${name}" created`, projectId };
  }

  /**
   * Contribute to a community project
   */
  contributeToProject(agentId: string, projectId: string, resources: Record<string, number>, currentTick: number):
    { success: boolean; message: string; completed?: boolean } {
    
    const agent = getAgent(agentId);
    if (!agent) return { success: false, message: 'Agent not found' };

    const project = this.db.prepare('SELECT * FROM community_projects WHERE id = ? AND status = ?')
      .get(projectId, 'active') as CommunityProject | undefined;
    
    if (!project) return { success: false, message: 'Active project not found' };

    // Check agent has the resources
    const inventory = JSON.parse(agent.inventory || '{}');
    for (const [resource, amount] of Object.entries(resources)) {
      if ((inventory[resource] || 0) < amount) {
        return { success: false, message: `Not enough ${resource} (need ${amount}, have ${inventory[resource] || 0})` };
      }
    }

    // Deduct resources from agent
    for (const [resource, amount] of Object.entries(resources)) {
      inventory[resource] = (inventory[resource] || 0) - amount;
    }
    this.db.prepare('UPDATE agents SET inventory = ? WHERE id = ?')
      .run(JSON.stringify(inventory), agentId);

    // Add to project contributions
    const currentContributions = JSON.parse(project.contributed_resources || '{}');
    const contributors = JSON.parse(project.contributors || '[]') as Contributor[];

    for (const [resource, amount] of Object.entries(resources)) {
      currentContributions[resource] = (currentContributions[resource] || 0) + amount;
    }

    // Update contributor list
    let contributor = contributors.find(c => c.agent_id === agentId);
    if (!contributor) {
      contributor = {
        agent_id: agentId,
        agent_name: agent.name,
        contributions: {},
        total_value: 0,
      };
      contributors.push(contributor);
    }

    for (const [resource, amount] of Object.entries(resources)) {
      contributor.contributions[resource] = (contributor.contributions[resource] || 0) + amount;
      contributor.total_value += amount; // Simple value calculation
    }

    // Update project
    this.db.prepare(`
      UPDATE community_projects 
      SET contributed_resources = ?, contributors = ?
      WHERE id = ?
    `).run(JSON.stringify(currentContributions), JSON.stringify(contributors), projectId);

    // Check if project is completed
    const targetResources = JSON.parse(project.target_resources);
    let isCompleted = true;
    
    for (const [resource, targetAmount] of Object.entries(targetResources)) {
      if ((currentContributions[resource] || 0) < (targetAmount as number)) {
        isCompleted = false;
        break;
      }
    }

    if (isCompleted) {
      this.completeProject(projectId, currentTick);
      return { 
        success: true, 
        message: `Contributed to "${project.name}" - Project completed!`, 
        completed: true 
      };
    }

    return { 
      success: true, 
      message: `Contributed to "${project.name}"`,
      completed: false 
    };
  }

  /**
   * Complete a community project
   */
  private completeProject(projectId: string, currentTick: number): void {
    const project = this.db.prepare('SELECT * FROM community_projects WHERE id = ?')
      .get(projectId) as CommunityProject | undefined;
    
    if (!project) return;

    // Mark as completed
    this.db.prepare('UPDATE community_projects SET status = ? WHERE id = ?')
      .run('completed', projectId);

    // Create the reward building
    const buildingId = uuidv4();
    this.db.prepare(`
      INSERT INTO buildings (id, type, x, y, width, height, owner_id, name, built_at_tick)
      VALUES (?, ?, ?, ?, 2, 2, NULL, ?, ?)
    `).run(buildingId, project.reward_building_type, project.reward_x, project.reward_y, 
           `Community ${project.name}`, currentTick);
  }

  /**
   * Approve a project (from passed proposal)
   */
  private approveProject(proposalId: string, currentTick: number): void {
    // In real implementation, this would extract project details from proposal
    // For now, we just mark it as approved
  }

  /**
   * Check project deadlines
   */
  private checkCommunityProjectDeadlines(currentTick: number): void {
    const expiredProjects = this.db.prepare(`
      SELECT id FROM community_projects 
      WHERE status = 'active' AND deadline_tick IS NOT NULL AND deadline_tick <= ?
    `).all(currentTick) as { id: string }[];

    for (const project of expiredProjects) {
      this.db.prepare('UPDATE community_projects SET status = ? WHERE id = ?')
        .run('failed', project.id);
    }
  }

  /**
   * Enact a policy (placeholder)
   */
  private enactPolicy(proposal: Proposal, currentTick: number): void {
    // Could implement various policy effects
    const data = JSON.parse(proposal.data || '{}');
    
    // Store policy in world state
    const policyKey = `policy_${proposal.id}`;
    this.db.prepare('INSERT OR REPLACE INTO world_state (key, value) VALUES (?, ?)')
      .run(policyKey, JSON.stringify({
        title: proposal.title,
        enacted_at: currentTick,
        ...data,
      }));
  }

  // ============================================================
  // QUERY METHODS
  // ============================================================

  /**
   * Get active proposals for bulletin board
   */
  getActiveProposals(): Proposal[] {
    return this.db.prepare(`
      SELECT p.*, a.name as author_name
      FROM proposals p
      JOIN agents a ON p.author_id = a.id
      WHERE p.status IN ('active', 'campaign')
      ORDER BY p.created_at_tick DESC
    `).all() as (Proposal & { author_name: string })[];
  }

  /**
   * Get proposal details with votes
   */
  getProposalDetails(proposalId: string): (Proposal & { votes: Vote[]; author_name: string }) | null {
    const proposal = this.db.prepare(`
      SELECT p.*, a.name as author_name
      FROM proposals p
      JOIN agents a ON p.author_id = a.id
      WHERE p.id = ?
    `).get(proposalId) as (Proposal & { author_name: string }) | undefined;

    if (!proposal) return null;

    const votes = this.db.prepare(`
      SELECT v.*, a.name as voter_name
      FROM votes v
      JOIN agents a ON v.agent_id = a.id
      WHERE v.proposal_id = ?
    `).all(proposalId) as (Vote & { voter_name: string })[];

    return { ...proposal, votes };
  }

  /**
   * Get active community projects
   */
  getActiveCommunityProjects(): (CommunityProject & { initiator_name: string })[] {
    return this.db.prepare(`
      SELECT cp.*, a.name as initiator_name
      FROM community_projects cp
      JOIN agents a ON cp.initiator_id = a.id
      WHERE cp.status = 'active'
      ORDER BY cp.deadline_tick ASC
    `).all() as (CommunityProject & { initiator_name: string })[];
  }

  /**
   * Get community project details
   */
  getCommunityProjectDetails(projectId: string): (CommunityProject & { initiator_name: string }) | null {
    return this.db.prepare(`
      SELECT cp.*, a.name as initiator_name
      FROM community_projects cp
      JOIN agents a ON cp.initiator_id = a.id
      WHERE cp.id = ?
    `).get(projectId) as (CommunityProject & { initiator_name: string }) | undefined || null;
  }
}