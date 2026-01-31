// ============================================================
// ClawCity — Main Application
// ============================================================

import React from 'react';
import World from './components/World';
import { WorldStats } from './components/ui/WorldStats';
import { Sidebar } from './components/ui/Sidebar';
import { AgentProfile } from './components/ui/AgentProfile';
import { AgentMind } from './components/ui/AgentMind';
import { Toasts } from './components/ui/Toasts';
import { useWebSocket } from './hooks/useWebSocket';
import { useWorldState } from './hooks/useWorldState';

export default function App() {
  // Load initial world state via REST
  useWorldState();
  // Connect to WebSocket for real-time updates
  useWebSocket();

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#1a1a2e] text-[#e8e8e8]">
      {/* Top stats bar */}
      <WorldStats />

      {/* Main content: Canvas + Sidebar */}
      <div className="flex-1 flex pt-10 min-h-0">
        {/* 3D World — takes 70% on desktop */}
        <div className="flex-[7] min-w-0 relative">
          <World />
        </div>

        {/* Sidebar with tabs (chat, highlights, stats) — 30% on desktop */}
        <Sidebar />
      </div>

      {/* Overlay panels */}
      <AgentProfile />
      <AgentMind />
      <Toasts />
    </div>
  );
}
