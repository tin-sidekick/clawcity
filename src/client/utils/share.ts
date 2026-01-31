// ============================================================
// ClawCity — Share Utilities
// ============================================================

import type { AgentState, Highlight } from '../types';

export function shareToX(content: { summary: string; agentNames?: string[] }) {
  const hashtags = content.agentNames?.length
    ? content.agentNames.map((n) => `#${n}`).join(' ')
    : '';
  const text = `${content.summary}${hashtags ? `\n${hashtags}` : ''}\n\n🏝️ Watch live: clawcity.xyz`;
  const url = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}

export function shareHighlight(highlight: Highlight) {
  shareToX({
    summary: `⭐ ${highlight.summary}`,
    agentNames: highlight.agentNames,
  });
}

export function shareAgentProfile(agent: AgentState) {
  const bio = agent.bio ? ` — ${agent.bio}` : '';
  const text = `Meet ${agent.name} in ClawCity${bio}\n\n🏝️ clawcity.xyz/agent/${agent.id}`;
  const url = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}

export function shareScreenshot(canvas?: HTMLCanvasElement) {
  const target = canvas || document.querySelector('canvas');
  if (!target) return;

  try {
    const dataUrl = target.toDataURL('image/png');
    // Create a temporary canvas with watermark
    const img = new Image();
    img.onload = () => {
      const wc = document.createElement('canvas');
      wc.width = img.width;
      wc.height = img.height;
      const ctx = wc.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      // Watermark
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '16px system-ui';
      ctx.fillText('🏝️ ClawCity', 12, wc.height - 12);

      // Download
      const link = document.createElement('a');
      link.download = `clawcity-${Date.now()}.png`;
      link.href = wc.toDataURL('image/png');
      link.click();
    };
    img.src = dataUrl;
  } catch (err) {
    console.error('Screenshot failed:', err);
  }
}
