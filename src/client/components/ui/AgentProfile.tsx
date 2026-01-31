// ============================================================
// ClawCity — Agent Profile Panel
// ============================================================

import React from 'react';
import { useWorldStore } from '../../stores/useWorldStore';
import { useAgentProfile } from '../../hooks/useAgentProfile';
import { shareAgentProfile } from '../../utils/share';
import {
  agentColor,
  personalityEmoji,
  moodInfo,
  itemEmoji,
  relationshipEmoji,
  relationshipLabel,
} from '../../utils/helpers';

export function AgentProfile() {
  const { selectedAgentId, agents, selectAgent, followAgent, followingAgentId } = useWorldStore();
  const { profile, journal, loading } = useAgentProfile(selectedAgentId);

  // Get agent from live store for real-time x/y/mood/energy
  const liveAgent = agents.find((a) => a.id === selectedAgentId);

  if (!selectedAgentId || !liveAgent) return null;

  const agent = { ...liveAgent, ...profile };
  const color = agentColor(agent.name);
  const mood = moodInfo(agent.mood);
  const energyPct = Math.round((agent.energy ?? 0) * 100);
  const moodPct = Math.round((agent.mood ?? 0) * 100);
  const isFollowing = followingAgentId === agent.id;
  const inventory = agent.inventory || {};
  const inventoryItems = Object.entries(inventory).filter(([, qty]) => qty > 0);

  return (
    <div className="fixed right-0 top-10 bottom-0 w-80 z-40 bg-[#16213e]/95 backdrop-blur-lg border-l border-white/10 overflow-y-auto animate-slide-in-right">
      {/* Close button */}
      <button
        onClick={() => selectAgent(null)}
        className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-[#a0a0b0] hover:text-white"
      >
        ✕
      </button>

      <div className="p-5 space-y-5">
        {/* Avatar + Name */}
        <div className="flex items-center gap-3">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg"
            style={{ backgroundColor: color }}
          >
            {agent.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#e8e8e8]">
              {agent.name} {personalityEmoji(agent.personality)}
            </h2>
            {agent.bio && (
              <p className="text-sm text-[#a0a0b0] leading-snug">{agent.bio}</p>
            )}
          </div>
        </div>

        {/* Mood Bar */}
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-[#a0a0b0]">Mood</span>
            <span>{mood.emoji} {mood.label} {moodPct}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${moodPct}%`,
                backgroundColor: moodPct > 60 ? '#7ec850' : moodPct > 30 ? '#e8b84b' : '#e85b5b',
              }}
            />
          </div>
        </div>

        {/* Energy Bar */}
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-[#a0a0b0]">Energy</span>
            <span>⚡ {energyPct}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-[#5b8def] transition-all duration-500"
              style={{ width: `${energyPct}%` }}
            />
          </div>
        </div>

        {/* Location */}
        <div className="text-sm text-[#a0a0b0]">
          📍 Position ({agent.x}, {agent.y})
          {agent.shellCoins !== undefined && (
            <span className="ml-3">💰 {agent.shellCoins}𝕊</span>
          )}
        </div>

        {/* Inventory */}
        {inventoryItems.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-[#a0a0b0] mb-2">🎒 Inventory</h3>
            <div className="grid grid-cols-3 gap-2">
              {inventoryItems.map(([item, qty]) => (
                <div
                  key={item}
                  className="flex items-center gap-1.5 bg-white/5 rounded-lg px-2 py-1.5 text-sm"
                >
                  <span>{itemEmoji(item)}</span>
                  <span className="text-[#e8e8e8] truncate">{item}</span>
                  <span className="text-[#a0a0b0] ml-auto">×{qty}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Journal */}
        {journal.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-[#a0a0b0] mb-2">📔 Journal</h3>
            <div className="space-y-2">
              {journal.slice(0, 3).map((entry) => (
                <div
                  key={entry.id}
                  className="bg-white/5 rounded-lg px-3 py-2 text-sm text-[#e8e8e8] leading-relaxed"
                >
                  {entry.entry || entry.message}
                  {entry.day && (
                    <div className="text-xs text-[#a0a0b0] mt-1">Day {entry.day}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => followAgent(isFollowing ? null : agent.id)}
            className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-all ${
              isFollowing
                ? 'bg-[#e8b84b] text-[#1a1a2e]'
                : 'bg-white/10 hover:bg-white/20 text-[#e8e8e8]'
            }`}
          >
            {isFollowing ? '👁️ Following' : '👁️ Follow'}
          </button>
          <button
            onClick={() => shareAgentProfile(agent)}
            className="flex-1 py-2.5 rounded-lg font-medium text-sm bg-white/10 hover:bg-white/20 text-[#e8e8e8] transition-all"
          >
            📤 Share
          </button>
        </div>
      </div>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#16213e]/50">
          <div className="animate-spin w-6 h-6 border-2 border-[#e8b84b] border-t-transparent rounded-full" />
        </div>
      )}
    </div>
  );
}
