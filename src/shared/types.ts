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
  | 'build'
  | 'trade'
  | 'rest'
  | 'explore'
  | 'craft'
  | 'buy'
  | 'sell'
  | 'gift';

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
