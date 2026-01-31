// ============================================================
// ClawCity — Real-time Chat Feed
// ============================================================

import React, { useEffect, useRef } from 'react';
import { useWorldStore } from '../../stores/worldStore';
import { agentColor } from '../../utils/helpers';

export function ChatFeed() {
  const { messages, agents, selectAgent } = useWorldStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Build name lookup
  const nameMap = new Map(agents.map((a) => [a.id, a.name]));

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#a0a0b0] text-sm">
        <div className="text-center">
          <div className="text-2xl mb-2">💬</div>
          <p>Waiting for agents to chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
      {messages.map((msg) => {
        const fromName = msg.fromName || nameMap.get(msg.from) || msg.from.slice(0, 8);
        const toName = msg.toName || (msg.to ? nameMap.get(msg.to) : null);
        const color = agentColor(fromName);

        return (
          <div
            key={msg.id}
            className={`feed-item rounded-lg px-3 py-2 text-sm ${
              msg.isHighlight
                ? 'bg-[#e8b84b]/10 border border-[#e8b84b]/30'
                : msg.isPublic
                ? 'bg-white/5'
                : 'bg-[#5b8def]/10 border-l-2 border-[#5b8def]/30'
            }`}
          >
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <button
                onClick={() => selectAgent(msg.from)}
                className="font-semibold hover:underline cursor-pointer"
                style={{ color }}
              >
                {fromName}
              </button>
              {toName && (
                <>
                  <span className="text-[#a0a0b0] text-xs">→</span>
                  <button
                    onClick={() => msg.to && selectAgent(msg.to)}
                    className="font-semibold text-[#a0a0b0] hover:underline cursor-pointer text-xs"
                  >
                    {toName}
                  </button>
                </>
              )}
              {msg.gameTime && (
                <span className="text-[10px] text-[#a0a0b0] ml-auto">{msg.gameTime}</span>
              )}
            </div>
            <p className="text-[#e8e8e8] mt-0.5 leading-snug">{msg.message}</p>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
