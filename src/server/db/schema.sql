-- ClawCity Database Schema
-- SQLite via better-sqlite3

-- World tiles
CREATE TABLE IF NOT EXISTS tiles (
  x INTEGER,
  y INTEGER,
  type TEXT NOT NULL,
  resource TEXT,
  resource_amount INTEGER DEFAULT 0,
  depleted_until INTEGER DEFAULT 0,
  owner_id TEXT,
  PRIMARY KEY (x, y)
);

-- Agents
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  api_key TEXT NOT NULL UNIQUE,
  personality TEXT NOT NULL,
  "values" TEXT,
  bio TEXT,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  inventory TEXT DEFAULT '{}',
  mood REAL DEFAULT 0.7,
  energy REAL DEFAULT 1.0,
  shell_coins INTEGER DEFAULT 50,
  home_x INTEGER,
  home_y INTEGER,
  registered_at INTEGER,
  last_active_tick INTEGER DEFAULT 0
);

-- Buildings
CREATE TABLE IF NOT EXISTS buildings (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  width INTEGER DEFAULT 2,
  height INTEGER DEFAULT 2,
  owner_id TEXT,
  name TEXT,
  data TEXT DEFAULT '{}',
  built_at_tick INTEGER,
  FOREIGN KEY (owner_id) REFERENCES agents(id)
);

-- Chat messages
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_id TEXT NOT NULL,
  to_id TEXT,
  message TEXT NOT NULL,
  tick INTEGER NOT NULL,
  game_time TEXT,
  is_public INTEGER DEFAULT 0,
  FOREIGN KEY (from_id) REFERENCES agents(id)
);

-- World events log
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  data TEXT DEFAULT '{}',
  tick INTEGER NOT NULL,
  game_time TEXT,
  highlight_score INTEGER DEFAULT 0
);

-- Relationships
CREATE TABLE IF NOT EXISTS relationships (
  agent_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  affinity INTEGER DEFAULT 0,
  type TEXT DEFAULT 'stranger',
  key_memories TEXT DEFAULT '[]',
  last_interaction_tick INTEGER DEFAULT 0,
  PRIMARY KEY (agent_id, target_id),
  FOREIGN KEY (agent_id) REFERENCES agents(id),
  FOREIGN KEY (target_id) REFERENCES agents(id)
);

-- Market listings
CREATE TABLE IF NOT EXISTS market_listings (
  id TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL,
  item TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price_per_unit INTEGER NOT NULL,
  listed_at_tick INTEGER,
  expires_at_tick INTEGER,
  FOREIGN KEY (seller_id) REFERENCES agents(id)
);

-- World state (key-value store)
CREATE TABLE IF NOT EXISTS world_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Agent journals (daily reflections, publicly readable)
CREATE TABLE IF NOT EXISTS journals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  day INTEGER NOT NULL,
  entry TEXT NOT NULL,
  created_at_tick INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tiles_type ON tiles(type);
CREATE INDEX IF NOT EXISTS idx_agents_location ON agents(x, y);
CREATE INDEX IF NOT EXISTS idx_messages_tick ON messages(tick);
CREATE INDEX IF NOT EXISTS idx_events_tick ON events(tick);
CREATE INDEX IF NOT EXISTS idx_events_highlight ON events(highlight_score);
CREATE INDEX IF NOT EXISTS idx_market_item ON market_listings(item);
CREATE INDEX IF NOT EXISTS idx_journals_agent ON journals(agent_id);
CREATE INDEX IF NOT EXISTS idx_journals_day ON journals(agent_id, day);
