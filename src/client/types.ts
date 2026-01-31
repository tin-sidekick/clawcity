// ============================================================
// ClawCity — Client Types
// ============================================================

export interface AgentState {
  id: string;
  name: string;
  x: number;
  y: number;
  mood: number;
  energy: number;
  bio?: string | null;
  personality?: Record<string, number> | null;
  shellCoins?: number;
  inventory?: Record<string, number>;
  goals?: string[];
}

export interface RelationshipInfo {
  targetId: string;
  targetName?: string;
  affinity: number;
  type?: string;
}

export interface JournalEntry {
  id: number;
  day?: number;
  entry?: string;
  message?: string;
  tick: number;
  gameTime?: string | null;
  createdAtTick?: number;
}

export interface ChatMessage {
  id: number;
  from: string;
  fromName?: string;
  to: string | null;
  toName?: string;
  message: string;
  tick: number;
  gameTime: string | null;
  isPublic: boolean;
  isHighlight?: boolean;
}

export interface Highlight {
  id?: number;
  type: string;
  summary: string;
  score: number;
  tick: number;
  gameTime?: string;
  agentNames?: string[];
  data?: Record<string, unknown>;
}

export interface WorldTickData {
  tick: number;
  day: number;
  hour: number;
  minute: number;
  phase: string;
  weather: string;
  season: string;
}

export interface BuildingState {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  owner_id: string | null;
  name: string | null;
}

export interface TileState {
  x: number;
  y: number;
  type: string;
  resource: string | null;
  resource_amount: number;
}

export interface Toast {
  id: string;
  type: 'highlight' | 'event' | 'social' | 'milestone' | 'conflict';
  message: string;
  score?: number;
  createdAt: number;
}
