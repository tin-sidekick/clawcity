import React, { useEffect, useRef } from 'react';
import World from './components/World';
import { useWorldStore } from './stores/worldStore';
import { useWebSocket } from './hooks/useWebSocket';
import { useWorldState } from './hooks/useWorldState';

// Weather icons
const WEATHER_ICONS: Record<string, string> = {
  clear: '☀️', sunny: '☀️', rain: '🌧️', storm: '⛈️',
  fog: '🌫️', cloudy: '☁️', snow: '❄️', windy: '💨',
};

const SEASON_ICONS: Record<string, string> = {
  spring: '🌸', summer: '☀️', autumn: '🍂', fall: '🍂', winter: '❄️',
};

function Header() {
  const time = useWorldStore((s) => s.time);
  const weather = useWorldStore((s) => s.weather);
  const season = useWorldStore((s) => s.season);
  const agents = useWorldStore((s) => s.agents);
  const connected = useWorldStore((s) => s.connected);

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-[#16213e] border-b border-[#2a3a5c]">
      <div className="flex items-center gap-3">
        <span className="text-xl font-bold">🏝️ ClawCity</span>
        <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
      </div>
      <div className="flex items-center gap-6 text-sm text-[#a0a0b0]">
        <span>{SEASON_ICONS[season] || '🌍'} {season}</span>
        <span className="text-[#e8b84b] font-semibold">{time.gameTime}</span>
        <span>{WEATHER_ICONS[weather] || '🌤️'} {weather}</span>
        <span>👥 {agents.length}</span>
      </div>
    </div>
  );
}

function LiveFeed() {
  const feed = useWorldStore((s) => s.feed);
  const messages = useWorldStore((s) => s.messages);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [feed, messages]);

  // Interleave feed + messages by timestamp
  const allItems = [
    ...feed.map((f) => ({ ...f, kind: 'event' as const })),
    ...messages.map((m) => ({
      id: m.id,
      type: 'chat',
      text: `${m.fromName}: ${m.message}`,
      emoji: '💬',
      timestamp: m.timestamp,
      kind: 'chat' as const,
    })),
  ]
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-40);

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 text-xs font-semibold text-[#e8b84b] border-b border-[#2a3a5c] uppercase tracking-wider">
        📋 Live Feed
      </div>
      <div ref={feedRef} className="flex-1 overflow-y-auto px-3 py-1 space-y-1">
        {allItems.length === 0 && (
          <div className="text-center text-[#555] text-xs mt-8">
            Waiting for events...
          </div>
        )}
        {allItems.map((item) => (
          <div
            key={item.id}
            className={`feed-item text-xs py-1 px-2 rounded ${
              item.kind === 'chat'
                ? 'bg-[#1a2744] border-l-2 border-[#4a9bd9]'
                : 'bg-[#1a1a2e]'
            }`}
          >
            <span className="mr-1">{item.emoji}</span>
            <span className="text-[#c8c8d8]">{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Highlights() {
  const highlights = useWorldStore((s) => s.highlights);

  if (highlights.length === 0) return null;

  return (
    <div className="border-t border-[#2a3a5c]">
      <div className="px-3 py-2 text-xs font-semibold text-[#e8b84b] uppercase tracking-wider">
        🔥 Highlights
      </div>
      <div className="px-3 pb-2 space-y-2 max-h-[200px] overflow-y-auto">
        {highlights.slice(-5).reverse().map((hl) => (
          <div key={hl.id} className="highlight-card bg-[#2a1a1a] border border-[#4a2a2a] rounded-lg p-2">
            <div className="text-xs font-semibold text-[#ff9966]">{hl.title}</div>
            {hl.description && (
              <div className="text-xs text-[#a0a0b0] mt-1">{hl.description}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AgentPanel() {
  const selectedAgent = useWorldStore((s) => s.selectedAgent);
  const agents = useWorldStore((s) => s.agents);
  const setSelectedAgent = useWorldStore((s) => s.setSelectedAgent);
  const followMode = useWorldStore((s) => s.followMode);
  const toggleFollowMode = useWorldStore((s) => s.toggleFollowMode);

  const agent = selectedAgent ? agents.find((a) => a.id === selectedAgent) : null;

  if (!agent) {
    const tick = useWorldStore.getState().tick;
    const buildings = useWorldStore.getState().buildings;
    return (
      <div className="flex items-center justify-between px-4 py-2 bg-[#16213e] border-t border-[#2a3a5c] text-xs text-[#a0a0b0]">
        <span>Tick: {tick}</span>
        <span>🏗️ {buildings.length} buildings</span>
        <span>Click an agent to inspect</span>
      </div>
    );
  }

  const moodPct = Math.round(agent.mood * 100);
  const energyPct = agent.energy !== undefined ? Math.round(agent.energy * 100) : '?';

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-[#16213e] border-t border-[#2a3a5c] text-xs">
      <div className="flex items-center gap-2">
        <span className="font-bold text-[#e8b84b]">{agent.name}</span>
        <span className="text-[#666]">({agent.x}, {agent.y})</span>
      </div>
      <div className="text-[#a0a0b0]">
        Mood: <span className={moodPct > 50 ? 'text-green-400' : 'text-red-400'}>{moodPct}%</span>
      </div>
      <div className="text-[#a0a0b0]">
        Energy: <span className="text-blue-400">{energyPct}%</span>
      </div>
      {agent.bio && (
        <div className="text-[#777] truncate max-w-[200px]">{agent.bio}</div>
      )}
      <div className="ml-auto flex gap-2">
        <button
          onClick={toggleFollowMode}
          className={`px-2 py-0.5 rounded text-xs ${
            followMode ? 'bg-[#e8b84b] text-black' : 'bg-[#2a3a5c] text-[#a0a0b0]'
          }`}
        >
          {followMode ? '📍 Following' : '📍 Follow'}
        </button>
        <button
          onClick={() => setSelectedAgent(null)}
          className="px-2 py-0.5 rounded bg-[#2a3a5c] text-[#a0a0b0] hover:bg-[#3a4a6c]"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export default function App() {
  useWebSocket();
  useWorldState();

  return (
    <div className="flex flex-col h-screen w-screen bg-[#1a1a2e] text-[#e8e8e8]">
      <Header />
      <div className="flex flex-1 min-h-0">
        {/* 3D Canvas */}
        <div className="flex-[7] min-w-0">
          <World />
        </div>
        {/* Sidebar */}
        <div className="flex-[3] min-w-[280px] max-w-[380px] bg-[#16213e] border-l border-[#2a3a5c] flex flex-col">
          <div className="flex-1 min-h-0 overflow-hidden">
            <LiveFeed />
          </div>
          <Highlights />
        </div>
      </div>
      <AgentPanel />
    </div>
  );
}
