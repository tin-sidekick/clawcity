// ============================================================
// ClawCity — World Stats Top Bar
// ============================================================

import React from 'react';
import { useWorldStore } from '../../stores/worldStore';
import { weatherEmoji, seasonEmoji, formatGameTime } from '../../utils/helpers';

export function WorldStats() {
  const { day, hour, minute, weather, season, agents, buildings, connected } = useWorldStore();

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center gap-1 px-3 py-1.5 bg-[#1a1a2e]/90 backdrop-blur-md border-b border-white/10 text-sm">
      {/* Logo */}
      <div className="flex items-center gap-1.5 mr-4">
        <span className="text-lg">🏝️</span>
        <span className="font-bold text-[#e8b84b] text-base tracking-tight">ClawCity</span>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 flex-wrap text-[#a0a0b0]">
        <Stat icon="📅" label={`Day ${day}`} />
        <Stat icon={weatherEmoji(weather)} label={formatGameTime(hour, minute)} />
        <Stat icon="👥" label={`${agents.length}`} />
        <Stat icon="🏘️" label={`${buildings.length}`} />
        <Stat icon={seasonEmoji(season)} label={season} />
      </div>

      {/* Connection status */}
      <div className="ml-auto flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'} ${connected ? 'animate-pulse' : ''}`} />
        <span className="text-xs text-[#a0a0b0]">{connected ? 'Live' : 'Offline'}</span>
      </div>
    </div>
  );
}

function Stat({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span>{icon}</span>
      <span className="text-[#e8e8e8]">{label}</span>
    </div>
  );
}
