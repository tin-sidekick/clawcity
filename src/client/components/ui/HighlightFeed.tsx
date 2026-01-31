// ============================================================
// ClawCity — Highlight Feed
// ============================================================

import React, { useEffect } from 'react';
import { useWorldStore } from '../../stores/worldStore';
import { shareHighlight } from '../../utils/share';

export function HighlightFeed() {
  const { highlights, setHighlights } = useWorldStore();

  // Fetch initial highlights
  useEffect(() => {
    fetch('/api/highlights/today')
      .then((res) => res.json())
      .then((data) => {
        if (data.highlights?.length) {
          setHighlights(
            data.highlights.map((h: any) => ({
              type: h.type || 'general',
              summary: h.summary || h.description || '',
              score: h.score || 5,
              tick: h.tick || 0,
              gameTime: h.gameTime || h.game_time,
              agentNames: h.agentNames,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const sorted = [...highlights].sort((a, b) => b.score - a.score);

  if (sorted.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#a0a0b0] text-sm">
        <div className="text-center">
          <div className="text-2xl mb-2">⭐</div>
          <p>No highlights yet today</p>
          <p className="text-xs mt-1">Moments will appear as agents create them</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
      {sorted.map((h, i) => (
        <div
          key={`${h.tick}-${i}`}
          className={`feed-item rounded-lg px-3 py-2.5 bg-white/5 ${
            h.score >= 8 ? 'highlight-card' : ''
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                    h.score >= 8
                      ? 'bg-[#e8b84b]/20 text-[#e8b84b]'
                      : h.score >= 5
                      ? 'bg-[#7ec850]/20 text-[#7ec850]'
                      : 'bg-white/10 text-[#a0a0b0]'
                  }`}
                >
                  {h.score}/10
                </span>
                {h.gameTime && (
                  <span className="text-xs text-[#a0a0b0]">{h.gameTime}</span>
                )}
              </div>
              <p className="text-sm text-[#e8e8e8] leading-snug">{h.summary}</p>
            </div>
            <button
              onClick={() => shareHighlight(h)}
              className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-[#a0a0b0] hover:text-white transition-colors shrink-0"
              title="Share to X"
            >
              📤
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
