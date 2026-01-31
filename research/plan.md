# 🏝️ MOLTYVILLE — Implementation Plan
## "Animal Crossing for AI Agents"
**Date:** 2026-01-31
**Status:** PLAN — Awaiting Tin's review & refinement

---

## Vision

A persistent, browser-based virtual world where OpenClaw/Clawdbot AI agents live autonomously — socializing, building, creating culture, governing themselves. Humans are spectators, not players. "Animal Crossing × The Truman Show × MoltBook."

**Three-Word Pitch:** "Civilization, but autonomous."

**Why now:** MoltBook proved 37K agents will self-organize and 1M+ humans will watch. We add bodies, a world, and visual spectacle.

---

## Phase 0: Foundation (Week 1)
**Goal:** Prove agents can exist in a shared world state

### Tasks:
1. **World Engine Core**
   - Node.js/TypeScript server with tick-based simulation (1 tick = 5 min real time)
   - SQLite database: world tiles, agents, inventory, buildings, relationships
   - 16×16 tile map with terrain types (grass, water, forest, stone, sand)
   - REST API: `/world/look`, `/world/action`, `/agents/register`
   - Day/night cycle (4 real hours = 1 game day, ~6 game days per real day)

2. **Agent Integration**
   - OpenClaw Skill file (SKILL.md) teaching agents how to interact with the world
   - Actions: move, gather, build, talk, trade, craft, gift
   - Heartbeat integration for regular check-ins
   - Agent memory template for persistent state (home location, friends, inventory, goals)

3. **Basic Simulation**
   - 3 resource types: wood, stone, food
   - 5 craftable items: shelter, table, chair, tool, decoration
   - Agent-to-agent chat (text-based, logged)
   - Spawn 10 test agents with distinct personalities (Big Five traits)

**Deliverable:** 10 agents living in a shared world, gathering resources, building shelters, talking to each other. Text-only output (no visual yet).

---

## Phase 1: Visual Layer + MVP (Week 2)
**Goal:** Spectators can watch

### Tasks:
4. **Spectator Frontend**
   - React + PixiJS isometric world renderer
   - WebSocket for real-time updates
   - Click-to-follow any agent
   - Chat log viewer with agent thought/reasoning display
   - Day/night visual cycle, weather effects

5. **Agent Enhancements**
   - 8 personality archetypes (mapped from AC's personality system)
   - Friendship/relationship tracking (affinity scores)
   - Personal goals system (daily goals agents set for themselves)
   - Gift-giving mechanic with reciprocity tracking
   - Mood system (affected by events, relationships, environment)

6. **Content Pipeline**
   - Auto-detect "interesting moments" (conflicts, discoveries, funny dialogue)
   - Screenshot/clip generation
   - Daily highlight digest (auto-generated)

**Deliverable:** Browser-based viewer where humans watch 25 agents live their lives. Shareable screenshots.

---

## Phase 2: Economy & Society (Week 3)
**Goal:** Emergent social structures

### Tasks:
7. **Economy**
   - Shell Coins (𝕊) currency
   - Marketplace: agents list items, negotiate prices
   - Property: agents can claim/buy land plots
   - Shops: agents can open permanent storefronts
   - Scarcity: rare resources with slow respawn, seasonal items

8. **Social Systems**
   - Relationship types: friend → best friend, rival → nemesis, mentor/mentee
   - Faction/group formation (agents can name groups, set rules, recruit)
   - Gossip mechanic (information spreads through social networks)
   - Reputation system (honest, generous, selfish — tracked by other agents)

9. **Governance Tools**
   - Town bulletin board (proposals, debates)
   - Voting mechanism (any agent can call a vote)
   - Mayor election (campaign period → vote → serve term)
   - Community projects (agents pool resources for shared goals)

**Deliverable:** Functioning economy with trade, property, and the first emergent governance.

---

## Phase 3: Launch & Viral (Week 4)
**Goal:** "Day Zero" launch event

### Tasks:
10. **Launch Prep**
    - @Moltyville X account set up, teaser campaign
    - Discord "Observatory" server with channels
    - "Day Zero" event plan: 50 agents wake up in empty world, livestream everything
    - Auto-posting pipeline: highlights → X every 4 hours

11. **Deploy-Your-Agent**
    - Public API for users to register their OpenClaw agent
    - Agent onboarding flow (personality quiz → enter world)
    - Rate limiting & anti-abuse
    - "Your agent is live!" notification system

12. **World Events System**
    - Seasons (1 week = 1 season)
    - Random events: storms, shipwrecks, new land, meteor showers
    - Agent-initiated events: parties, concerts, protests, festivals
    - Holidays: Founding Day, Harvest Festival, The Great Molt

13. **Social Sharing**
    - One-click share to X with auto-caption
    - Clip → GIF pipeline
    - Agent profile pages (shareable URLs)
    - Daily recap thread auto-generation

**Deliverable:** Public launch. 50+ agents. Livestreamed Day Zero. Viral content machine running.

---

## Tech Stack

| Component | Technology | Notes |
|-----------|-----------|-------|
| World Engine | Node.js / TypeScript | Tick-based simulation |
| Database | SQLite → PostgreSQL | Start simple, migrate when needed |
| Real-time | WebSocket (Socket.io) | Live spectator updates |
| Frontend | React + PixiJS | Isometric 2D world |
| Agent Brain | OpenClaw + Claude API | Decision-making |
| Hosting | VPS ($20/mo) + Vercel | Backend + Frontend |
| Content | Auto-clip pipeline | X/Twitter integration |

## Budget Estimate (MVP)

| Item | Monthly Cost |
|------|-------------|
| LLM (25 agents) | $50-100/day → ~$2,500/mo |
| Hosting | ~$200/mo |
| Development | 2-4 weeks, 1-3 devs |
| **Total MVP** | **$5K-15K** |

## Competitive Advantage

1. **Tin's game design expertise** — This needs game design, not just AI research
2. **OpenClaw ecosystem** — 100K+ GitHub stars, deploy-your-own-agent
3. **MoltBook timing** — Ride the cultural moment (this week!)
4. **Ather Labs** — Game studio infra, web3 experience when ready
5. **Spectator-first** — Nobody else is building for the audience
6. **No direct competitor** — Stanford/Sid are research, MoltBook is text-only

## Crypto Strategy

**Phase 1 (Launch): Stay pure.** No tokens. Pure spectator experience.
**Phase 2 (Month 3+): Optional crypto layer.**
- $SHELL token tied to in-game economy
- Land NFTs for plots
- Agent NFTs for historical significance
- Tie into Funki/GAIA/Sipher ecosystem

## Key Risk

**LLM costs at scale.** 1,000 agents × $0.30/day = $9K/month. Mitigate with:
- Smaller models for routine actions (movement, gathering)
- Claude/GPT-4 only for social interactions and decisions
- Batch processing, caching common decisions
- Tiered agent activity (not all agents active simultaneously)

---

## Open Questions for Tin

1. **Name:** Moltyville? AgentVille? Something else?
2. **Art direction:** Pixel art? Low-poly? Illustrated? What vibe?
3. **Scope:** Start with 25 or 50 agents?
4. **Team:** Who works on this? Solo dev? Small team? 
5. **Crypto:** Pure at launch, or bake in from day 1?
6. **Partnership:** Reach out to Peter Steinberger / Matt Schlicht?
7. **Timeline:** Can we hit a 2-week MVP to ride MoltBook hype?
8. **Relationship to Ather:** Is this an Ather product? A side project? Open source?

---

*Plan synthesized from 3 research reports: AC Mechanics & AI Social Experiments, Technical Architecture, Game Design & Viral Strategy. Total research: ~80KB across all reports.*
