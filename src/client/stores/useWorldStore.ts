// ============================================================
// ClawCity — World State Store (Zustand)
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

interface WorldStore {
  // World time
  tick: number;
  day: number;
  hour: number;
  minute: number;
  phase: string;
  weather: string;
  season: string;
  mapSize: number;

  // Entities
  agents: AgentState[];
  buildings: BuildingState[];
  tiles: TileState[];

  // Messages & highlights
  messages: ChatMessage[];
  highlights: Highlight[];
  toasts: Toast[];

  // UI State
  selectedAgentId: string | null;
  followingAgentId: string | null;
  sidebarTab: 'chat' | 'highlights' | 'stats';
  isMobileSidebarOpen: boolean;

  // Connected
  connected: boolean;

  // Actions
  setWorldTick: (data: WorldTickData) => void;
  setAgents: (agents: AgentState[]) => void;
  updateAgent: (agent: Partial<AgentState> & { id: string }) => void;
  setBuildings: (buildings: BuildingState[]) => void;
  setTiles: (tiles: TileState[]) => void;
  addMessage: (msg: ChatMessage) => void;
  setMessages: (msgs: ChatMessage[]) => void;
  addHighlight: (h: Highlight) => void;
  setHighlights: (hs: Highlight[]) => void;
  addToast: (toast: Omit<Toast, 'id' | 'createdAt'>) => void;
  removeToast: (id: string) => void;
  selectAgent: (id: string | null) => void;
  followAgent: (id: string | null) => void;
  setSidebarTab: (tab: 'chat' | 'highlights' | 'stats') => void;
  setMobileSidebarOpen: (open: boolean) => void;
  setConnected: (connected: boolean) => void;
  initWorld: (data: {
    tick: number;
    weather: string;
    season: string;
    mapSize: number;
    agents: AgentState[];
    buildings: BuildingState[];
    recentEvents?: unknown[];
  }) => void;
}

let toastCounter = 0;

export const useWorldStore = create<WorldStore>((set, get) => ({
  // World time
  tick: 0,
  day: 1,
  hour: 6,
  minute: 0,
  phase: 'morning',
  weather: 'clear',
  season: 'spring',
  mapSize: 32,

  // Entities
  agents: [],
  buildings: [],
  tiles: [],

  // Messages & highlights
  messages: [],
  highlights: [],
  toasts: [],

  // UI State
  selectedAgentId: null,
  followingAgentId: null,
  sidebarTab: 'chat',
  isMobileSidebarOpen: false,

  connected: false,

  // Actions
  setWorldTick: (data) =>
    set({
      tick: data.tick,
      day: data.day,
      hour: data.hour,
      minute: data.minute,
      phase: data.phase,
      weather: data.weather,
      season: data.season,
    }),

  setAgents: (agents) => set({ agents }),

  updateAgent: (partial) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === partial.id ? { ...a, ...partial } : a
      ),
    })),

  setBuildings: (buildings) => set({ buildings }),
  setTiles: (tiles) => set({ tiles }),

  addMessage: (msg) =>
    set((state) => ({
      messages: [...state.messages.slice(-199), msg],
    })),

  setMessages: (msgs) => set({ messages: msgs }),

  addHighlight: (h) =>
    set((state) => ({
      highlights: [h, ...state.highlights].slice(0, 100),
    })),

  setHighlights: (hs) => set({ highlights: hs }),

  addToast: (toast) => {
    const id = `toast-${++toastCounter}`;
    set((state) => {
      const newToasts = [...state.toasts, { ...toast, id, createdAt: Date.now() }];
      // Max 3 visible
      return { toasts: newToasts.slice(-3) };
    });
    // Auto-dismiss after 5s
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 5000);
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  selectAgent: (id) => set({ selectedAgentId: id }),

  followAgent: (id) => set({ followingAgentId: id }),

  setSidebarTab: (tab) => set({ sidebarTab: tab }),

  setMobileSidebarOpen: (open) => set({ isMobileSidebarOpen: open }),

  setConnected: (connected) => set({ connected }),

  initWorld: (data) => {
    const ticksPerDay = 480;
    const day = Math.floor(data.tick / ticksPerDay) + 1;
    const tickInDay = data.tick % ticksPerDay;
    const minutesInDay = (tickInDay / ticksPerDay) * 24 * 60;
    const hour = Math.floor(minutesInDay / 60);
    const minute = Math.floor(minutesInDay % 60);

    let phase: string;
    if (hour >= 6 && hour < 12) phase = 'morning';
    else if (hour >= 12 && hour < 18) phase = 'afternoon';
    else if (hour >= 18 && hour < 22) phase = 'evening';
    else phase = 'night';

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
    });
  },
}));
