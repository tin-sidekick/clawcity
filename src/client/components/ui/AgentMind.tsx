// ============================================================
// ClawCity — Agent Mind View (Follow Mode Overlay)
// ============================================================

import React from 'react';
import { useWorldStore } from '../../stores/worldStore';
import { useAgentProfile } from '../../hooks/useAgentProfile';
import { agentColor, moodInfo, itemEmoji, relationshipEmoji } from '../../utils/helpers';

export function AgentMind() {
  const { followingAgentId, agents, messages, followAgent } = useWorldStore();
  const { journal } = useAgentProfile(followingAgentId);

  const agent = agents.find((a) => a.id === followingAgentId);
  if (!followingAgentId || !agent) return null;

  const color = agentColor(agent.name);
  const mood = moodInfo(agent.mood);
  const inventory = agent.inventory || {};
  const inventoryItems = Object.entries(inventory).filter(([, qty]) => qty > 0);

  // Recent messages from this agent
  const recentMessages = messages
    .filter((m) => m.from === agent.id)
    .slice(-3);

  // Nearby agents
  const nearbyAgents = agents
    .filter((a) => a.id !== agent.id)
    .map((a) => ({
      ...a,
      distance: Math.sqrt(Math.pow(a.x - agent.x, 2) + Math.pow(a.y - agent.y, 2)),
    }))
    .filter((a) => a.distance <= 7)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5);

  return (
    <div className="fixed bottom-0 left-0 right-0 md:right-auto md:w-96 z-40 bg-[#1a1a2e]/90 backdrop-blur-lg border-t md:border-r border-white/10 animate-slide-in-up">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: color }}
          >
            {agent.name.charAt(0)}
          </div>
          <span className="font-semibold text-[#e8e8e8] text-sm">
            {agent.name}'s Mind
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-[#e8b84b]/20 text-[#e8b84b]">
            Following
          </span>
        </div>
        <button
          onClick={() => followAgent(null)}
          className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-[#a0a0b0] hover:text-white transition-colors"
        >
          Unfollow
        </button>
      </div>

      <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
        {/* Thinking Bubble */}
        {recentMessages.length > 0 && (
          <div className="bg-white/5 rounded-xl px-3 py-2 relative">
            <div className="text-xs text-[#a0a0b0] mb-1">💭 Thinking...</div>
            <p className="text-sm text-[#e8e8e8] italic">
              "{recentMessages[recentMessages.length - 1].message}"
            </p>
          </div>
        )}

        {/* Current Activity & Mood */}
        <div className="flex items-center gap-4 text-sm">
          <div>
            <span className="text-[#a0a0b0]">Feeling: </span>
            <span>{mood.emoji} {mood.label}</span>
          </div>
          <div>
            <span className="text-[#a0a0b0]">Energy: </span>
            <span>⚡ {Math.round((agent.energy ?? 0) * 100)}%</span>
          </div>
        </div>

        {/* Nearby Agents (Relationship Radar) */}
        {nearbyAgents.length > 0 && (
          <div>
            <div className="text-xs text-[#a0a0b0] mb-1.5">👥 Nearby</div>
            <div className="flex flex-wrap gap-2">
              {nearbyAgents.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-1 bg-white/5 rounded-full px-2 py-1 text-xs"
                >
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                    style={{ backgroundColor: agentColor(a.name) }}
                  >
                    {a.name.charAt(0)}
                  </div>
                  <span className="text-[#e8e8e8]">{a.name}</span>
                  <span className="text-[#a0a0b0]">({Math.round(a.distance)})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Inventory */}
        {inventoryItems.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {inventoryItems.slice(0, 6).map(([item, qty]) => (
              <span
                key={item}
                className="text-xs bg-white/5 rounded px-1.5 py-0.5"
              >
                {itemEmoji(item)} {qty}
              </span>
            ))}
          </div>
        )}

        {/* Latest Journal */}
        {journal.length > 0 && (
          <div className="text-xs text-[#a0a0b0] bg-white/5 rounded-lg px-3 py-2">
            📔 {journal[0].entry || journal[0].message}
          </div>
        )}
      </div>
    </div>
  );
}
