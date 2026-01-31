// ============================================================
// ClawCity — Unified World State Store (Zustand)
// Merged from worldStore.ts + useWorldStore.ts
// ============================================================

import { create } from 'zustand';
import type {
  AgentState,
  BuildingState,
  TileState,
  ChatMessage,
  Highlight,
  Toast,
  WorldTickData,
} from '../types';

// Re-export types that some components import from this module
export type { AgentState, BuildingState, Toast, ChatMessage, Highlight };
export type Tile = TileState;

export interface GameTime {
  day: number;
  hour: number;
  minute: number;
  phase: string;
  gameTime: string;
}

export interface FeedEvent {
  id: string;
  type: string;
  text: string;
  emoji: string;
  timestamp: number;
}

interface WorldStore {
  // World time — top-level for easy destructuring
  tick: number;
  day: number;
  hour: number;
  minute: number;
  phase: string;
  weather: string;
  season: string;
  mapSize: number;

  // Computed time object (for components that read time.gameTime etc.)
  time: GameTime;

  // Entities
  tiles: TileState[];
  agents: AgentState[];
  buildings: BuildingState[];

  // Messages, feed & highlights
  messages: ChatMessage[];
  highlights: Highlight[];
  feed: FeedEvent[];
  toasts: Toast[];

  // UI state — dual field names kept for compatibility
  selectedAgent: string | null;
  selectedAgentId: string | null;   // alias for selectedAgent
  followMode: boolean;
  followingAgentId: string | null;  // selectedAgent when followMode, else null
  cameraPosition: [number, number, number];
  sidebarTab: 'chat' | 'highlights' | 'stats';
  isMobileSidebarOpen: boolean;

  // Connection
  connected: boolean;

  // --- Actions ---

  // Selection & follow (both name variants work)
  setSelectedAgent: (id: string | null) => void;
  selectAgent: (id: string | null) => void;
  toggleFollowMode: () => void;
  followAgent: (id: string | null) => void;

  // Connection
  setConnected: (v: boolean) => void;

  // UI
  setSidebarTab: (tab: 'chat' | 'highlights' | 'stats') => void;
  setMobileSidebarOpen: (open: boolean) => void;

  // Toasts
  addToast: (toast: Omit<Toast, 'id' | 'createdAt'>) => void;
  removeToast: (id: string) => void;

  // Entity setters
  setAgents: (agents: AgentState[]) => void;
  updateAgent: (agent: Partial<AgentState> & { id: string }) => void;
  setBuildings: (buildings: BuildingState[]) => void;
  setTiles: (tiles: TileState[]) => void;

  // Messages
  addMessage: (msg: ChatMessage) => void;
  setMessages: (msgs: ChatMessage[]) => void;

  // Highlights
  addHighlight: (h: Highlight) => void;
  setHighlights: (hs: Highlight[]) => void;

  // Feed
  addFeedEvent: (type: string, text: string, emoji: string) => void;

  // World tick / init (called by WebSocket hook)
  setWorldTick: (data: WorldTickData) => void;
  initWorld: (data: {
    tick: number;
    weather: string;
    season: string;
    mapSize: number;
    agents: AgentState[];
    buildings: BuildingState[];
    recentEvents?: unknown[];
  }) => void;

  // Legacy WebSocket event handlers (kept for compat)
  handleWorldInit: (data: any) => void;
  handleWorldTick: (data: any) => void;
  handleAgentMoved: (data: any) => void;
  handleAgentTalked: (data: any) => void;
  handleAgentBuilt: (data: any) => void;
  handleAgentGathered: (data: any) => void;
  handleHighlight: (data: any) => void;
  handleWorldEvent: (data: any) => void;

  // REST fallback
  loadInitialState: () => Promise<void>;
}

// Helper: build a GameTime from components
function makeGameTime(day: number, hour: number, minute: number, phase: string): GameTime {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return {
    day,
    hour,
    minute,
    phase,
    gameTime: `Day ${day}, ${displayHour}:${String(minute).padStart(2, '0')} ${period}`,
  };
}

function resolvePhase(hour: number): string {
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
}

let toastCounter = 0;

export const useWorldStore = create<WorldStore>((set, get) => ({
  // World time
  tick: 0,
  day: 1,
  hour: 8,
  minute: 0,
  phase: 'morning',
  weather: 'clear',
  season: 'spring',
  mapSize: 32,

  time: makeGameTime(1, 8, 0, 'morning'),

  // Entities
  tiles: [],
  agents: [],
  buildings: [],

  // Messages & highlights
  messages: [],
  highlights: [],
  feed: [],
  toasts: [],

  // UI state (dual fields kept in sync)
  selectedAgent: null,
  selectedAgentId: null,
  followMode: false,
  followingAgentId: null,
  cameraPosition: [16, 20, 16],
  sidebarTab: 'chat',
  isMobileSidebarOpen: false,

  connected: false,

  // --- Actions ---

  setSelectedAgent: (id) =>
    set({ selectedAgent: id, selectedAgentId: id, followMode: false, followingAgentId: null }),

  selectAgent: (id) =>
    set({ selectedAgent: id, selectedAgentId: id, followMode: false, followingAgentId: null }),

  toggleFollowMode: () =>
    set((s) => {
      const newFollow = !s.followMode;
      return {
        followMode: newFollow,
        followingAgentId: newFollow ? s.selectedAgent : null,
      };
    }),

  followAgent: (id) =>
    set({
      selectedAgent: id,
      selectedAgentId: id,
      followMode: id !== null,
      followingAgentId: id,
    }),

  setConnected: (v) => set({ connected: v }),
  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  setMobileSidebarOpen: (open) => set({ isMobileSidebarOpen: open }),

  // Toasts
  addToast: (toast) => {
    const id = `toast-${++toastCounter}`;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id, createdAt: Date.now() }].slice(-3),
    }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 5000);
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  // Entity setters
  setAgents: (agents) => set({ agents }),
  updateAgent: (partial) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === partial.id ? { ...a, ...partial } : a
      ),
    })),
  setBuildings: (buildings) => set({ buildings }),
  setTiles: (tiles) => set({ tiles }),

  // Messages
  addMessage: (msg) =>
    set((state) => ({ messages: [...state.messages.slice(-199), msg] })),
  setMessages: (msgs) => set({ messages: msgs }),

  // Highlights
  addHighlight: (h) =>
    set((state) => ({ highlights: [h, ...state.highlights].slice(0, 100) })),
  setHighlights: (hs) => set({
    highlights: hs.map((h: any) => ({
      id: h.id ?? `hl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: h.type || 'general',
      summary: h.summary || h.title || h.description || '',
      title: h.title || h.summary || '',
      description: h.description || h.summary || '',
      score: h.score || 0,
      tick: h.tick || 0,
      timestamp: h.timestamp || Date.now(),
    })),
  }),

  // Feed
  addFeedEvent: (type, text, emoji) => {
    const evt: FeedEvent = {
      id: `feed-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      text,
      emoji,
      timestamp: Date.now(),
    };
    set((s) => ({ feed: [...s.feed.slice(-50), evt] }));
  },

  // World tick (called by WebSocket)
  setWorldTick: (data) => {
    const phase = resolvePhase(data.hour);
    set({
      tick: data.tick,
      day: data.day,
      hour: data.hour,
      minute: data.minute,
      phase: data.phase || phase,
      weather: data.weather,
      season: data.season,
      time: makeGameTime(data.day, data.hour, data.minute, data.phase || phase),
    });
  },

  // World init (called by WebSocket on connect)
  initWorld: (data) => {
    const ticksPerDay = 480;
    const day = Math.floor(data.tick / ticksPerDay) + 1;
    const tickInDay = data.tick % ticksPerDay;
    const minutesInDay = (tickInDay / ticksPerDay) * 24 * 60;
    const hour = Math.floor(minutesInDay / 60);
    const minute = Math.floor(minutesInDay % 60);
    const phase = resolvePhase(hour);

    set({
      tick: data.tick,
      day,
      hour,
      minute,
      phase,
      weather: data.weather,
      season: data.season,
      mapSize: data.mapSize,
      agents: data.agents,
      buildings: data.buildings,
      connected: true,
      time: makeGameTime(day, hour, minute, phase),
    });

    // Add recent events to feed
    if (data.recentEvents) {
      const events: FeedEvent[] = (data.recentEvents as any[]).map((e: any, i: number) => ({
        id: `init-${i}`,
        type: e.type || 'event',
        text: summarizeEvent(e),
        emoji: eventEmoji(e.type),
        timestamp: Date.now() - ((data.recentEvents as any[]).length - i) * 1000,
      }));
      set({ feed: events.slice(-30) });
    }
  },

  // Legacy WebSocket event handlers
  handleWorldInit: (data) => {
    get().initWorld(data);
  },

  handleWorldTick: (data) => {
    const hour = data.hour ?? 8;
    const minute = data.minute ?? 0;
    const phase = data.phase || resolvePhase(hour);
    const day = data.day || get().day;
    set({
      tick: data.tick,
      day,
      hour,
      minute,
      phase,
      weather: data.weather || get().weather,
      season: data.season || get().season,
      time: makeGameTime(day, hour, minute, phase),
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
      id: Date.now(),
      from: data.from_id,
      fromName: agent?.name || data.from_name || 'Unknown',
      message: data.message,
      to: data.to_id || null,
      tick: state.tick,
      gameTime: null,
      isPublic: data.is_public !== false,
    };
    set((s) => ({
      messages: [...s.messages.slice(-199), msg],
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
    get().addHighlight({
      type: data.type || 'general',
      summary: data.title || data.description || 'Highlight',
      score: data.score || 0,
      tick: get().tick,
    });
    get().addFeedEvent('highlight', `🔥 ${data.title || 'Highlight'}`, '🔥');
  },

  handleWorldEvent: (data) => {
    get().addFeedEvent(data.type || 'event', summarizeEvent(data), eventEmoji(data.type));
  },

  // REST fallback
  loadInitialState: async () => {
    try {
      const res = await fetch('/api/world/state');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();

      const agents = (data.agents || []).map((a: any) => ({
        id: a.id,
        name: a.name,
        x: a.x,
        y: a.y,
        mood: a.mood ?? 0.5,
        energy: a.energy ?? 1,
        bio: a.bio,
      }));

      set({
        tiles: data.tiles || [],
        agents,
        buildings: data.buildings || [],
        weather: data.weather || 'clear',
        season: data.season || 'spring',
        mapSize: data.mapSize || 32,
        tick: data.tick || 0,
      });
    } catch (err) {
      console.error('Failed to load initial state:', err);
    }
  },
}));

// --- Helpers ---

function summarizeEvent(e: any): string {
  try {
    const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data || e;
    switch (e.type) {
      case 'agent_chat':
        return `${data.from_name || 'Agent'}: "${data.message || ''}"`;
      case 'agent_move':
        return `${data.agent_name || 'Agent'} moved to (${data.x}, ${data.y})`;
      case 'building_built':
        return `New ${data.building_type || 'building'} built`;
      case 'resource_gathered':
        return `${data.agent_name || 'Agent'} gathered ${data.resource || 'resources'}`;
      case 'weather_change':
        return `Weather changed to ${data.weather || 'unknown'}`;
      case 'day_change':
        return `Day ${data.day || '?'} begins`;
      case 'season_change':
        return `Season changed to ${data.season || 'unknown'}`;
      default:
        return e.type || 'Something happened';
    }
  } catch {
    return e.type || 'Event';
  }
}

function eventEmoji(type: string): string {
  const map: Record<string, string> = {
    agent_chat: '💬',
    agent_move: '🚶',
    building_built: '🏗️',
    resource_gathered: '⛏️',
    weather_change: '🌤️',
    day_change: '🌅',
    season_change: '🍂',
    agent_trade: '🤝',
    market_sale: '💰',
    highlight: '🔥',
  };
  return map[type] || '📌';
}
