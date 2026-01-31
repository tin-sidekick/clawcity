// ============================================================
// ClawCity — Toast Notifications
// ============================================================

import React from 'react';
import { useWorldStore } from '../../stores/worldStore';

const borderColors: Record<string, string> = {
  highlight: '#e8b84b',
  milestone: '#e8b84b',
  conflict: '#e85b5b',
  social: '#db5b8f',
  event: '#5b8def',
};

export function Toasts() {
  const { toasts, removeToast } = useWorldStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-14 right-4 z-50 flex flex-col gap-2 w-80">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          onClick={() => removeToast(toast.id)}
          className="bg-[#1a1a2e]/90 backdrop-blur-md rounded-lg px-4 py-3 cursor-pointer border-l-4 animate-slide-in-right shadow-xl hover:bg-[#1a1a2e] transition-colors"
          style={{ borderLeftColor: borderColors[toast.type] || '#e8b84b' }}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-[#e8e8e8] leading-snug">{toast.message}</p>
            {toast.score && (
              <span className="text-xs text-[#e8b84b] font-bold whitespace-nowrap">
                {toast.score}/10
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
