// ============================================================
// ClawCity — WebSocket Hook
// ============================================================

import { useEffect, useRef } from 'react';
import { useWorldStore } from '../stores/worldStore';

const WS_URL = `ws://${window.location.hostname}:3002`;

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const store = useWorldStore;

  useEffect(() => {
    function connect() {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('📡 Connected to ClawCity');
        store.getState().setConnected(true);
      };

      ws.onmessage = (evt) => {
        try {
          const { event, data } = JSON.parse(evt.data);
          handleEvent(event, data);
        } catch (err) {
          console.error('WS parse error:', err);
        }
      };

      ws.onclose = () => {
        console.log('📡 Disconnected');
        store.getState().setConnected(false);
        reconnectTimer.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    function handleEvent(event: string, data: any) {
      const state = store.getState();

      switch (event) {
        case 'world:init':
          state.initWorld(data);
          break;

        case 'world:tick':
          state.setWorldTick(data);
          // Agents may have moved — update from tick data
          if (data.agents) {
            state.setAgents(data.agents);
          }
          break;

        case 'world:event': {
          const evtType = data.type;
          if (evtType === 'agent_chat' || evtType === 'agent_talk') {
            state.addMessage({
              id: Date.now(),
              from: data.agentId || data.from_id || '',
              fromName: data.agentName || data.from_name || '',
              to: data.targetId || data.to_id || null,
              toName: data.targetName || data.to_name || undefined,
              message: data.message || '',
              tick: data.tick || state.tick,
              gameTime: data.gameTime || null,
              isPublic: data.isPublic !== false,
            });
          }
          break;
        }

        case 'highlight:detected':
          state.addHighlight({
            type: data.type || 'general',
            summary: data.summary || data.description || '',
            score: data.score || 5,
            tick: data.tick || state.tick,
            gameTime: data.gameTime,
            agentNames: data.agentNames,
          });
          state.addToast({
            type: mapHighlightType(data.type),
            message: data.summary || data.description || 'Something happened!',
            score: data.score,
          });
          break;

        case 'agent_action':
          // Update agent position/state from actions
          if (data.agentId && (data.x !== undefined || data.y !== undefined)) {
            state.updateAgent({
              id: data.agentId,
              ...(data.x !== undefined && { x: data.x }),
              ...(data.y !== undefined && { y: data.y }),
              ...(data.mood !== undefined && { mood: data.mood }),
              ...(data.energy !== undefined && { energy: data.energy }),
            });
          }
          break;

        default:
          break;
      }
    }

    connect();

    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, []);
}

function mapHighlightType(type?: string): 'highlight' | 'event' | 'social' | 'milestone' | 'conflict' {
  if (!type) return 'highlight';
  if (type.includes('social') || type.includes('friend')) return 'social';
  if (type.includes('build') || type.includes('first')) return 'milestone';
  if (type.includes('conflict') || type.includes('fight')) return 'conflict';
  if (type.includes('weather') || type.includes('season') || type.includes('event')) return 'event';
  return 'highlight';
}
