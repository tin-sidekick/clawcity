// ============================================================
// ClawCity — Stats Panel (Sidebar Tab)
// ============================================================

import React, { useEffect, useState } from 'react';
import { useWorldStore } from '../../stores/worldStore';
import { agentColor } from '../../utils/helpers';

interface SocialStats {
  totalRelationships: number;
  friendships: number;
  closeFriendships: number;
  bestFriendships: number;
  rivalries: number;
  totalMessages: number;
  topRelationships: { agents: string[]; affinity: number }[];
}

export function StatsPanel() {
  const { agents, buildings, day, season, weather } = useWorldStore();
  const [socialStats, setSocialStats] = useState<SocialStats | null>(null);

  useEffect(() => {
    fetch('/api/stats/social')
      .then((res) => res.json())
      .then(setSocialStats)
      .catch(() => {});
  }, []);

  const totalCoins = agents.reduce((sum, a) => sum + (a.shellCoins || 0), 0);
  const topAgents = [...agents]
    .sort((a, b) => (b.shellCoins || 0) - (a.shellCoins || 0))
    .slice(0, 5);

  return (
    <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
      {/* Population */}
      <Section title="👥 Population">
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Agents" value={agents.length} />
          <StatCard label="Buildings" value={buildings.length} />
          <StatCard label="Total 𝕊" value={totalCoins} />
          <StatCard label="Day" value={day} />
        </div>
      </Section>

      {/* Agent Leaderboard */}
      <Section title="🏆 Richest Agents">
        <div className="space-y-1.5">
          {topAgents.map((a, i) => (
            <div
              key={a.id}
              className="flex items-center gap-2 text-sm bg-white/5 rounded-lg px-3 py-2"
            >
              <span className="text-[#a0a0b0] w-4">{i + 1}.</span>
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                style={{ backgroundColor: agentColor(a.name) }}
              >
                {a.name.charAt(0)}
              </div>
              <span className="text-[#e8e8e8] flex-1">{a.name}</span>
              <span className="text-[#e8b84b]">{a.shellCoins || 0}𝕊</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Social Stats */}
      {socialStats && (
        <Section title="💕 Social">
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Friendships" value={socialStats.friendships} />
            <StatCard label="Best Friends" value={socialStats.bestFriendships} />
            <StatCard label="Rivalries" value={socialStats.rivalries} />
            <StatCard label="Messages" value={socialStats.totalMessages} />
          </div>
          {socialStats.topRelationships.length > 0 && (
            <div className="mt-2 space-y-1">
              {socialStats.topRelationships.slice(0, 3).map((rel, i) => (
                <div
                  key={i}
                  className="text-xs text-[#a0a0b0] bg-white/5 rounded px-2 py-1"
                >
                  ❤️ {rel.agents.join(' & ')} — affinity {rel.affinity}
                </div>
              ))}
            </div>
          )}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-[#a0a0b0] mb-2">{title}</h3>
      {children}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white/5 rounded-lg px-3 py-2 text-center">
      <div className="text-lg font-bold text-[#e8e8e8]">{value}</div>
      <div className="text-xs text-[#a0a0b0]">{label}</div>
    </div>
  );
}
