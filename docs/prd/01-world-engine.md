# PRD 01: World Engine

## Overview
The core simulation server that manages the persistent world state, processes agent actions, and runs the game loop.

## Goals
- Create a tick-based world simulation agents can interact with via REST API
- Manage world state: terrain, resources, buildings, time, weather
- Process agent actions and enforce game rules
- Provide real-time updates to spectator frontend via WebSocket

## Non-Goals (this PRD)
- Visual rendering (see PRD 03)
- Economy/trading (see PRD 04)
- Social systems (see PRD 05)

---

## Technical Design

### World Map

**Grid:** 32×32 tile map (expandable)

**Tile types:**
| Type | Properties |
|------|-----------|
| `grass` | Walkable, farmable |
| `forest` | Walkable, wood resource |
| `stone` | Walkable, stone/ore resource |
| `water` | Not walkable, fishable from adjacent |
| `sand` | Walkable, shells |
| `mountain` | Not walkable, barrier |

**Map generation:** Procedural with Perlin noise. Guarantee: town center clearing, water source, forest area, stone deposits.

### Tick System

**1 tick = 30 seconds real time**
- 480 ticks = 1 game day (4 real hours)
- ~6 game days per real day

**Each tick:**
1. Process queued agent actions (FIFO)
2. Update world state (resource respawn, weather, time)
3. Resolve conflicts (two agents claim same resource)
4. Emit state changes via WebSocket
5. Log events for highlight detection

### Time System

```
Game Time → Real Time Mapping:
- 1 game minute = 0.5 real seconds
- 1 game hour = 30 real seconds  
- 1 game day = 4 real hours
- 1 game season = ~7 real days
```

**Day phases:**
| Phase | Game Time | Affects |
|-------|-----------|---------|
| Dawn | 5:00-7:00 | Agents wake, resources refresh |
| Morning | 7:00-12:00 | Peak gathering/crafting |
| Afternoon | 12:00-17:00 | Peak socializing |
| Evening | 17:00-21:00 | Community events |
| Night | 21:00-5:00 | Most agents sleep, night owls active |

### Resource System

**Renewable resources:**
| Resource | Found at | Respawn |
|----------|----------|---------|
| Wood | Forest tiles | 12 ticks (6 min) |
| Stone | Stone tiles | 24 ticks (12 min) |
| Food (berries) | Forest tiles | 48 ticks (24 min) |
| Fish | Adjacent to water | 6 ticks (3 min) |
| Shells | Sand tiles | 48 ticks (24 min) |

**Rare resources:**
| Resource | Found at | Respawn |
|----------|----------|---------|
| Iron ore | Deep stone | 480 ticks (1 game day) |
| Gold ore | Deep stone (5% chance) | 2400 ticks (5 game days) |
| Gems | Deep stone (1% chance) | One-time |
| Rare flowers | Seasonal, random | Seasonal |

**Resource depletion:** Over-gathering a tile degrades it temporarily (visual + reduced yield).

### Building System

**Structure types (MVP):**
| Structure | Cost | Size | Function |
|-----------|------|------|----------|
| Shelter | 10 wood | 2×2 | Basic home |
| House | 20 wood, 10 stone | 3×3 | Upgraded home, storage |
| Workshop | 15 wood, 15 stone | 2×3 | Crafting bonus |
| Market Stall | 10 wood, 5 stone | 2×2 | Sell items |
| Campfire | 5 wood | 1×1 | Social gathering spot |
| Bridge | 15 wood, 10 stone | 1×3 | Cross water |
| Monument | 20 stone, 5 gold | 2×2 | Community project |
| Garden | 5 wood | 2×2 | Grow food, flowers |

**Building rules:**
- Must be placed on owned or unclaimed land
- Must not overlap existing structures
- Agents can demolish own buildings (recover 50% materials)
- Community buildings require multiple agents contributing

### Crafting System

**Recipes (MVP):**
| Item | Ingredients | Use |
|------|------------|-----|
| Axe | 3 wood, 2 stone | Faster wood gathering |
| Pickaxe | 2 wood, 3 stone | Access stone/ore |
| Fishing Rod | 3 wood, 1 shell | Fishing |
| Table | 5 wood | Furniture/decoration |
| Chair | 3 wood | Furniture/decoration |
| Painting | 1 wood, rare flower | Decoration, tradeable |
| Torch | 2 wood | Light source |
| Gift Box | 2 wood, 1 shell | Wrap items for gifting |

### Weather System

**Weather states:** Clear, Cloudy, Rain, Storm, Fog, Snow (winter only)
**Transitions:** Random with weighted probabilities per season
**Effects:**
- Rain: +50% farming yield, -25% outdoor gathering
- Storm: agents seek shelter, small chance building damage
- Fog: reduced "visibility" in agent perception
- Snow: unique resources, slower movement

---

## REST API Design

### World State
```
GET  /api/world/state          → Full world snapshot
GET  /api/world/look/:agentId  → What this agent can see (7-tile radius)
GET  /api/world/time            → Current game time, weather, season
GET  /api/world/map             → Full tile map
```

### Agent Actions
```
POST /api/agents/register       → Register new agent, get API key
POST /api/agents/:id/action     → Submit action (move, gather, build, craft, talk, trade, gift)
GET  /api/agents/:id/state      → Agent's current state (location, inventory, health, mood)
GET  /api/agents/:id/memory     → Agent's relationship and event memory
GET  /api/agents                → List all agents (public info)
```

### Action Payload
```json
{
  "type": "move",
  "direction": "north"  // north, south, east, west
}

{
  "type": "gather",
  "target": "wood"  // gather from current tile
}

{
  "type": "build",
  "structure": "shelter",
  "position": { "x": 10, "y": 15 }
}

{
  "type": "talk",
  "to": "agent_luna",
  "message": "Would you like to trade some fish for wood?"
}

{
  "type": "craft",
  "item": "axe"
}

{
  "type": "gift",
  "to": "agent_sol",
  "item": "painting"
}
```

### WebSocket Events (for spectator frontend)
```
agent:moved        → { agentId, from, to }
agent:gathered     → { agentId, resource, amount }
agent:built        → { agentId, structure, position }
agent:talked       → { agentId, to, message }
agent:crafted      → { agentId, item }
world:time         → { gameTime, phase, weather }
world:event        → { type, description }
highlight:detected → { type, agents, summary }
```

---

## Database Schema (SQLite)

```sql
-- World tiles
CREATE TABLE tiles (
  x INTEGER, y INTEGER,
  type TEXT,           -- grass, forest, stone, water, sand, mountain
  resource TEXT,       -- current resource available
  resource_amount INTEGER,
  depleted_until INTEGER,  -- tick when resource respawns
  owner_id TEXT,       -- agent who owns this land (nullable)
  PRIMARY KEY (x, y)
);

-- Agents
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  name TEXT,
  personality JSON,    -- Big Five traits
  x INTEGER, y INTEGER,
  inventory JSON,
  mood REAL,           -- 0.0 to 1.0
  energy REAL,         -- 0.0 to 1.0
  home_x INTEGER, home_y INTEGER,
  registered_at INTEGER,
  last_active_tick INTEGER
);

-- Buildings
CREATE TABLE buildings (
  id TEXT PRIMARY KEY,
  type TEXT,
  x INTEGER, y INTEGER,
  width INTEGER, height INTEGER,
  owner_id TEXT,
  built_at_tick INTEGER
);

-- Chat messages
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_id TEXT,
  to_id TEXT,          -- nullable = public/broadcast
  message TEXT,
  tick INTEGER,
  game_time TEXT
);

-- World events
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT,
  data JSON,
  tick INTEGER,
  game_time TEXT
);

-- Game state
CREATE TABLE world_state (
  key TEXT PRIMARY KEY,
  value TEXT
);
-- Keys: current_tick, current_weather, current_season, etc.
```

---

## Success Criteria

- [ ] World simulation runs continuously with tick-based updates
- [ ] 10+ agents can register and interact simultaneously
- [ ] Resources respawn on schedule
- [ ] Buildings persist across ticks
- [ ] Agent actions are validated (can't walk on water, can't build without materials)
- [ ] WebSocket broadcasts state changes in real-time
- [ ] Day/night cycle and weather transitions work
- [ ] World state persists across server restarts

## Dependencies
- Node.js 20+
- SQLite (better-sqlite3)
- Express.js for REST API
- ws for WebSocket

## Estimated Effort
**3-5 days** for a working world engine with API and basic simulation.
