// ============================================================
// ClawCity — Shared Types
// ============================================================

// --- World ---

export type TileType = 'grass' | 'forest' | 'stone' | 'water' | 'sand';

export interface Tile {
  x: number;
  y: number;
  type: TileType;
  resource: string | null;
  resource_amount: number;
  depleted_until: number;
  owner_id: string | null;
}

// --- Agents ---

export interface BigFiveTraits {
  openness: number;       // 0-1
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

export interface Agent {
  id: string;
  name: string;
  api_key: string;
  personality: string;  // JSON string of BigFiveTraits
  values: string | null; // JSON string
  bio: string | null;
  x: number;
  y: number;
  inventory: string;     // JSON string
  mood: number;
  energy: number;
  shell_coins: number;
  home_x: number | null;
  home_y: number | null;
  registered_at: number | null;
  last_active_tick: number;
}

// --- Buildings ---

export type BuildingType =
  | 'house'
  | 'shop'
  | 'workshop'
  | 'farm'
  | 'tavern'
  | 'library'
  | 'town_hall'
  | 'market_stall';

export interface Building {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  owner_id: string | null;
  name: string | null;
  data: string;          // JSON string
  built_at_tick: number | null;
}

// --- Messages ---

export interface Message {
  id: number;
  from_id: string;
  to_id: string | null;
  message: string;
  tick: number;
  game_time: string | null;
  is_public: number;     // 0 or 1 (SQLite boolean)
}

// --- Events ---

export type EventType =
  | 'agent_join'
  | 'agent_move'
  | 'agent_chat'
  | 'agent_trade'
  | 'building_built'
  | 'resource_gathered'
  | 'market_listing'
  | 'market_sale'
  | 'weather_change'
  | 'day_change'
  | 'season_change';

export interface WorldEvent {
  id: number;
  type: string;
  data: string;          // JSON string
  tick: number;
  game_time: string | null;
  highlight_score: number;
}

// --- Relationships ---

export type RelationshipType =
  | 'stranger'
  | 'acquaintance'
  | 'friend'
  | 'close_friend'
  | 'rival'
  | 'enemy';

export interface Relationship {
  agent_id: string;
  target_id: string;
  affinity: number;
  type: string;
  key_memories: string;  // JSON string
  last_interaction_tick: number;
}

// --- Market ---

export interface MarketListing {
  id: string;
  seller_id: string;
  item: string;
  quantity: number;
  price_per_unit: number;
  listed_at_tick: number | null;
  expires_at_tick: number | null;
}

// --- World State ---

export interface WorldState {
  key: string;
  value: string;
}

// --- Actions ---

export type ActionType =
  | 'move'
  | 'gather'
  | 'chat'
  | 'talk'
  | 'build'
  | 'trade'
  | 'rest'
  | 'explore'
  | 'craft'
  | 'buy'
  | 'sell'
  | 'gift'
  | 'claim_land'
  | 'create_faction'
  | 'join_faction'
  | 'spread_gossip'
  | 'create_proposal'
  | 'vote_on_proposal'
  | 'create_community_project'
  | 'contribute_to_project';

export interface Action {
  type: ActionType;
  agent_id: string;
  params: Record<string, unknown>;
}

export interface MoveAction extends Action {
  type: 'move';
  params: { dx: number; dy: number };
}

export interface ChatAction extends Action {
  type: 'chat';
  params: { message: string; to_id?: string };
}

export interface GatherAction extends Action {
  type: 'gather';
  params: { x: number; y: number };
}

export interface BuildAction extends Action {
  type: 'build';
  params: { building_type: string; x: number; y: number; name?: string };
}

export interface TradeAction extends Action {
  type: 'trade';
  params: { target_id: string; offer: Record<string, number>; request: Record<string, number> };
}

export interface BuyAction extends Action {
  type: 'buy';
  params: { listing_id: string };
}

export interface SellAction extends Action {
  type: 'sell';
  params: { item: string; quantity: number; price_per_unit: number };
}

export interface ClaimLandAction extends Action {
  type: 'claim_land';
  params: { x: number; y: number };
}

export interface CreateFactionAction extends Action {
  type: 'create_faction';
  params: { name: string; description: string; rules?: string };
}

export interface JoinFactionAction extends Action {
  type: 'join_faction';
  params: { faction_id: string };
}

export interface SpreadGossipAction extends Action {
  type: 'spread_gossip';
  params: { subject_agent_id: string; claim: string; truth_score?: number };
}

export interface CreateProposalAction extends Action {
  type: 'create_proposal';
  params: { title: string; description: string; type?: string; data?: any };
}

export interface VoteOnProposalAction extends Action {
  type: 'vote_on_proposal';
  params: { proposal_id: string; vote: 'for' | 'against' };
}

export interface CreateCommunityProjectAction extends Action {
  type: 'create_community_project';
  params: { 
    name: string; 
    description: string; 
    target_resources: Record<string, number>;
    reward_building_type: string;
    reward_x: number;
    reward_y: number;
  };
}

export interface ContributeToProjectAction extends Action {
  type: 'contribute_to_project';
  params: { project_id: string; resources: Record<string, number> };
}

// --- WebSocket Events ---

export type WSEventType =
  | 'tick'
  | 'world_update'
  | 'agent_action'
  | 'chat_message'
  | 'event'
  | 'error'
  | 'connected'
  | 'agent_state';

export interface WSMessage {
  type: WSEventType;
  payload: unknown;
  tick?: number;
  timestamp?: number;
}

export interface WSTickPayload {
  tick: number;
  game_time: string;
  weather: string;
  season: string;
  day: number;
}

export interface WSWorldUpdatePayload {
  tiles: Tile[];
  agents: Partial<Agent>[];
  buildings: Building[];
  events: WorldEvent[];
}

// --- Economy Types ---

export interface EconomyStats {
  totalShellCoins: number;
  circulatingCoins: number;
  averageWealth: number;
  wealthDistribution: { bottom50: number; middle40: number; top10: number };
  marketVolume: number;
  activeTrades: number;
  inflation: number;
  gdp: number;
}

export interface Shop {
  id: string;
  buildingId: string;
  ownerId: string;
  ownerName: string;
  inventory: Record<string, number>;
  displayName: string;
  x: number;
  y: number;
}

// --- Social Types ---

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
  truth_score: number;
  created_at_tick: number;
  last_spread_tick: number;
  decay_factor: number;
}

export interface AgentReputation {
  honest: number;
  generous: number;
  aggressive: number;
  creative: number;
  reliable: number;
  judge_count: number;
}

// --- Governance Types ---

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
  data: string;
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
  powers: string;
}

export interface CommunityProject {
  id: string;
  name: string;
  description: string;
  initiator_id: string;
  target_resources: string;
  contributed_resources: string;
  contributors: string;
  reward_building_type: string;
  reward_x: number;
  reward_y: number;
  status: 'active' | 'completed' | 'failed';
  created_at_tick: number;
  deadline_tick: number | null;
}
