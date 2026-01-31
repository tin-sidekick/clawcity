// ============================================================
// ClawCity — Agent Profile Data Fetching Hook
// ============================================================

import { useState, useEffect } from 'react';
import type { AgentState, JournalEntry, RelationshipInfo } from '../types';

interface AgentProfile extends AgentState {
  personality?: Record<string, number> | null;
  shellCoins?: number;
  inventory?: Record<string, number>;
}

interface UseAgentProfileResult {
  profile: AgentProfile | null;
  journal: JournalEntry[];
  relationships: RelationshipInfo[];
  loading: boolean;
}

export function useAgentProfile(agentId: string | null): UseAgentProfileResult {
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [relationships, setRelationships] = useState<RelationshipInfo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!agentId) {
      setProfile(null);
      setJournal([]);
      setRelationships([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function fetchProfile() {
      try {
        // Fetch agent profile
        const [profileRes, journalRes] = await Promise.all([
          fetch(`/api/agents/${agentId}`),
          fetch(`/api/agents/${agentId}/journal?limit=5`),
        ]);

        if (cancelled) return;

        if (profileRes.ok) {
          const data = await profileRes.json();
          setProfile(data);
        }

        if (journalRes.ok) {
          const data = await journalRes.json();
          setJournal(data.entries || []);
        }
      } catch (err) {
        console.error('Error fetching agent profile:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchProfile();
    return () => { cancelled = true; };
  }, [agentId]);

  return { profile, journal, relationships, loading };
}
