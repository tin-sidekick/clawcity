// ============================================================
// ClawCity — Sidebar Container with Tabs
// ============================================================

import React from 'react';
import { useWorldStore } from '../../stores/worldStore';
import { ChatFeed } from './ChatFeed';
import { HighlightFeed } from './HighlightFeed';
import { StatsPanel } from './StatsPanel';

export function Sidebar() {
  const { sidebarTab, setSidebarTab, isMobileSidebarOpen, setMobileSidebarOpen } = useWorldStore();

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileSidebarOpen(!isMobileSidebarOpen)}
        className="md:hidden fixed bottom-4 right-4 z-50 w-12 h-12 rounded-full bg-[#e8b84b] text-[#1a1a2e] shadow-lg flex items-center justify-center text-xl"
      >
        {isMobileSidebarOpen ? '✕' : '💬'}
      </button>

      {/* Sidebar panel */}
      <div
        className={`
          fixed md:static
          md:w-[30%] lg:w-[30%] xl:w-[25%]
          ${isMobileSidebarOpen
            ? 'inset-0 top-auto h-[60vh] rounded-t-2xl z-40'
            : 'hidden md:flex'
          }
          bg-[#16213e]/95 backdrop-blur-md border-l border-white/10
          flex flex-col
          transition-transform duration-300
        `}
      >
        {/* Mobile drag handle */}
        <div className="md:hidden flex justify-center py-2">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 px-1">
          <TabButton
            active={sidebarTab === 'chat'}
            onClick={() => setSidebarTab('chat')}
            icon="💬"
            label="Chat"
          />
          <TabButton
            active={sidebarTab === 'highlights'}
            onClick={() => setSidebarTab('highlights')}
            icon="⭐"
            label="Highlights"
          />
          <TabButton
            active={sidebarTab === 'stats'}
            onClick={() => setSidebarTab('stats')}
            icon="📊"
            label="Stats"
          />
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {sidebarTab === 'chat' && <ChatFeed />}
          {sidebarTab === 'highlights' && <HighlightFeed />}
          {sidebarTab === 'stats' && <StatsPanel />}
        </div>
      </div>
    </>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors ${
        active
          ? 'text-[#e8b84b] border-b-2 border-[#e8b84b]'
          : 'text-[#a0a0b0] hover:text-[#e8e8e8]'
      }`}
    >
      <span>{icon}</span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
