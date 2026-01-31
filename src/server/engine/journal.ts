// ============================================================
// ClawCity — Agent Journal System
// ============================================================
// Agents write daily journal entries reflecting on their experiences.
// Journals are publicly readable — spectators can peek into an agent's inner life.

import { getDb } from '../db/index.js';

export interface JournalEntry {
  id: number;
  agent_id: string;
  day: number;
  entry: string;
  created_at_tick: number;
}

// Ensure the journals table exists
export function initJournalTable(): void {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS journals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id TEXT NOT NULL,
      day INTEGER NOT NULL,
      entry TEXT NOT NULL,
      created_at_tick INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    )
  `);
  getDb().exec(`
    CREATE INDEX IF NOT EXISTS idx_journals_agent ON journals(agent_id);
  `);
  getDb().exec(`
    CREATE INDEX IF NOT EXISTS idx_journals_day ON journals(agent_id, day);
  `);
}

export class JournalSystem {
  constructor() {
    initJournalTable();
  }

  /**
   * Write a journal entry for the given agent and day.
   * One entry per agent per day — overwrites if already exists.
   */
  writeEntry(agentId: string, day: number, entry: string, tick: number = 0): void {
    // Check if entry already exists for this agent+day
    const existing = getDb().prepare(
      'SELECT id FROM journals WHERE agent_id = ? AND day = ?'
    ).get(agentId, day) as { id: number } | undefined;

    if (existing) {
      // Update existing entry
      getDb().prepare(
        'UPDATE journals SET entry = ?, created_at_tick = ? WHERE id = ?'
      ).run(entry, tick, existing.id);
    } else {
      // Insert new entry
      getDb().prepare(
        'INSERT INTO journals (agent_id, day, entry, created_at_tick) VALUES (?, ?, ?, ?)'
      ).run(agentId, day, entry, tick);
    }
  }

  /**
   * Get journal entries for an agent, most recent first.
   */
  getEntries(agentId: string, limit: number = 20): JournalEntry[] {
    return getDb().prepare(
      'SELECT * FROM journals WHERE agent_id = ? ORDER BY day DESC LIMIT ?'
    ).all(agentId, limit) as unknown as JournalEntry[];
  }

  /**
   * Get the latest journal entry for an agent.
   */
  getLatestEntry(agentId: string): JournalEntry | null {
    const row = getDb().prepare(
      'SELECT * FROM journals WHERE agent_id = ? ORDER BY day DESC LIMIT 1'
    ).get(agentId);
    return (row as unknown as JournalEntry) || null;
  }

  /**
   * Get a specific day's entry for an agent.
   */
  getEntryForDay(agentId: string, day: number): JournalEntry | null {
    const row = getDb().prepare(
      'SELECT * FROM journals WHERE agent_id = ? AND day = ?'
    ).get(agentId, day);
    return (row as unknown as JournalEntry) || null;
  }
}
