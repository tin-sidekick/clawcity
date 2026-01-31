import { create } from 'zustand';

// Local types matching server shapes
export interface Tile {
  x: number;
  y: number;
  type: string;
  resource: string | null;
  resource_amount: number;
}

export interface AgentState {
  id: string;
  name: string;
  x: number;
  y: number;
  targetX?: number;
  targetY?: number;
  mood: number;
  energy?: number;
  bio?: string | null;
  lastMessage?: string;
  lastMessageTime?: number;
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

export interface GameTime {
  day: number;
  hour: number;
  minute: number;
  phase: string;
  gameTime: string;
}

export interface ChatMessage {
  id: string;
  from: string;
  fromName: string;
  message: string;
  timestamp: number;
  isPublic: boolean;
}

export interface Highlight {
  id: string;
  title: string;
  description: string;
  score: number;
  timestamp: number;
}

export interface FeedEvent {
  id: string;
  type: string;
  text: string;
  emoji: string;
  timestamp: number;
}

interface WorldStore {
  // World state
  tiles: Tile[];
  agents: AgentState[];
  buildings: BuildingState[];
  time: GameTime;
  weather: string;
  season: string;
  mapSize: number;
  tick: number;
  connected: boolean;

  // UI state
  selectedAgent: string | null;
  cameraPosition: [number, number, number];
  followMode: boolean;

  // Feed
  highlights: Highlight[];
  messages: ChatMessage[];
  feed: FeedEvent[];

  // Actions
  setSelectedAgent: (id: string | null) => void;
  toggleFollowMode: () => void;
  setConnected: (v: boolean) => void;

  // Data loading
  loadInitialState: () => Promise<void>;

  // WebSocket event handlers
  handleWorldInit: (data: any) => void;
  handleWorldTick: (data: any) => void;
  handleAgentMoved: (data: any) => void;
  handleAgentTalked: (data: any) => void;
  handleAgentBuilt: (data: any) => void;
  handleAgentGathered: (data: any) => void;
  handleHighlight: (data: any) => void;
  handleWorldEvent: (data: any) => void;
  addFeedEvent: (type: string, text: string, emoji: string) => void;
}

const DEFAULT_TIME: GameTime = {
  day: 1, hour: 8, minute: 0, phase: 'morning',
  gameTime: 'Day 1, 8:00 AM',
};

export const useWorldStore = create<WorldStore>((set, get) => ({
  tiles: [],
  agents: [],
  buildings: [],
  time: DEFAULT_TIME,
  weather: 'clear',
  season: 'spring',
  mapSize: 32,
  tick: 0,
  connected: false,

  selectedAgent: null,
  cameraPosition: [16, 20, 16],
  followMode: false,

  highlights: [],
  messages: [],
  feed: [],

  setSelectedAgent: (id) => set({ selectedAgent: id, followMode: false }),
  toggleFollowMode: () => set((s) => ({ followMode: !s.followMode })),
  setConnected: (v) => set({ connected: v }),

  loadInitialState: async () => {
    try {
      const res = await fetch('/api/world/state');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();

      set({
        tiles: data.tiles || [],
        agents: (data.agents || []).map((a: any) => ({
          id: a.id, name: a.name, x: a.x, y: a.y,
          mood: a.mood ?? 0.5, energy: a.energy, bio: a.bio,
        })),
        buildings: data.buildings || [],
        time: data.time || DEFAULT_TIME,
        weather: data.weather || 'clear',
        season: data.season || 'spring',
        mapSize: data.mapSize || 32,
        tick: data.tick || 0,
      });
    } catch (err) {
      console.error('Failed to load initial state:', err);
    }
  },

  handleWorldInit: (data) => {
    set({
      agents: (data.agents || []).map((a: any) => ({
        id: a.id, name: a.name, x: a.x, y: a.y,
        mood: a.mood ?? 0.5, energy: a.energy,
      })),
      buildings: data.buildings || [],
      weather: data.weather || 'clear',
      season: data.season || 'spring',
      mapSize: data.mapSize || 32,
      tick: data.tick || 0,
    });

    // Add recent events to feed
    if (data.recentEvents) {
      const events: FeedEvent[] = data.recentEvents.map((e: any, i: number) => ({
        id: `init-${i}`,
        type: e.type,
        text: summarizeEvent(e),
        emoji: eventEmoji(e.type),
        timestamp: Date.now() - (data.recentEvents.length - i) * 1000,
      }));
      set({ feed: events.slice(-30) });
    }
  },

  handleWorldTick: (data) => {
    const hour = data.hour ?? 8;
    const minute = data.minute ?? 0;
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;

    set({
      tick: data.tick,
      weather: data.weather || get().weather,
      season: data.season || get().season,
      time: {
        day: data.day || get().time.day,
        hour,
        minute,
        phase: data.phase || get().time.phase,
        gameTime: `Day ${data.day}, ${displayHour}:${String(minute).padStart(2, '0')} ${period}`,
      },
    });
  },

  handleAgentMoved: (data) => {
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === data.agent_id
          ? { ...a, targetX: data.x, targetY: data.y }
          : a
      ),
    }));
  },

  handleAgentTalked: (data) => {
    const state = get();
    const agent = state.agents.find((a) => a.id === data.from_id);
    const msg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      from: data.from_id,
      fromName: agent?.name || data.from_name || 'Unknown',
      message: data.message,
      timestamp: Date.now(),
      isPublic: data.is_public !== false,
    };

    set((s) => ({
      messages: [...s.messages.slice(-100), msg],
      agents: s.agents.map((a) =>
        a.id === data.from_id
          ? { ...a, lastMessage: data.message, lastMessageTime: Date.now() }
          : a
      ),
    }));

    get().addFeedEvent('chat', `${msg.fromName}: "${data.message}"`, '💬');
  },

  handleAgentBuilt: (data) => {
    const building: BuildingState = {
      id: data.id || `bld-${Date.now()}`,
      type: data.building_type || data.type,
      x: data.x,
      y: data.y,
      width: data.width || 1,
      height: data.height || 1,
      owner_id: data.agent_id,
      name: data.name || null,
    };
    set((s) => ({ buildings: [...s.buildings, building] }));
    get().addFeedEvent('build', `New ${building.type} built at (${data.x}, ${data.y})`, '🏗️');
  },

  handleAgentGathered: (data) => {
    get().addFeedEvent('gather', `${data.agent_name || 'Agent'} gathered ${data.resource || 'resources'}`, '⛏️');
  },

  handleHighlight: (data) => {
    const hl: Highlight = {
      id: `hl-${Date.now()}`,
      title: data.title || 'Highlight',
      description: data.description || '',
      score: data.score || 0,
      timestamp: Date.now(),
    };
    set((s) => ({
      highlights: [...s.highlights.slice(-20), hl],
    }));
    get().addFeedEvent('highlight', `🔥 ${hl.title}`, '🔥');
  },

  handleWorldEvent: (data) => {
    get().addFeedEvent(data.type || 'event', summarizeEvent(data), eventEmoji(data.type));
  },

  addFeedEvent: (type, text, emoji) => {
    const evt: FeedEvent = {
      id: `feed-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type, text, emoji,
      timestamp: Date.now(),
    };
    set((s) => ({ feed: [...s.feed.slice(-50), evt] }));
  },
}));

function summarizeEvent(e: any): string {
  try {
    const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data || e;
    switch (e.type) {
      case 'agent_chat': return `${data.from_name || 'Agent'}: "${data.message || ''}"`;
      case 'agent_move': return `${data.agent_name || 'Agent'} moved to (${data.x}, ${data.y})`;
      case 'building_built': return `New ${data.building_type || 'building'} built`;
      case 'resource_gathered': return `${data.agent_name || 'Agent'} gathered ${data.resource || 'resources'}`;
      case 'weather_change': return `Weather changed to ${data.weather || 'unknown'}`;
      case 'day_change': return `Day ${data.day || '?'} begins`;
      case 'season_change': return `Season changed to ${data.season || 'unknown'}`;
      default: return e.type || 'Something happened';
    }
  } catch {
    return e.type || 'Event';
  }
}

function eventEmoji(type: string): string {
  const map: Record<string, string> = {
    agent_chat: '💬', agent_move: '🚶', building_built: '🏗️',
    resource_gathered: '⛏️', weather_change: '🌤️', day_change: '🌅',
    season_change: '🍂', agent_trade: '🤝', market_sale: '💰',
    highlight: '🔥',
  };
  return map[type] || '📌';
}
