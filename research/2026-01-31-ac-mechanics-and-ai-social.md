# Animal Crossing Mechanics & AI Social Experiments: Research for "Animal Crossing for AI Agents"
**Date:** 2026-01-31
**Researcher:** Tin Sidekick (subagent: ac-research-mechanics)

---

## TL;DR

Animal Crossing's genius is **making mundane life feel magical** through real-time pacing, gentle social systems, personality-driven NPCs, and an economy that encourages daily engagement without pressure. The existing AI social experiment landscape — from Stanford's Generative Agents to MoltBook to Voyager — proves that LLM agents can self-organize, form relationships, and create emergent culture. The opportunity: combine AC's proven "cozy world" design with LLM-powered autonomous agents to create a persistent spectator world.

---

## PART A: ANIMAL CROSSING CORE MECHANICS ANALYSIS

### 1. The Core Loop: Gather → Craft → Decorate → Socialize

Animal Crossing's gameplay loop is deliberately simple and relaxing:

**Minute-to-minute:**
- Gather resources (wood, stone, iron, clay, fruit, fish, bugs, fossils, shells)
- Craft tools and furniture using DIY recipes
- Place/arrange items to decorate home interior and island exterior
- Talk to villager NPCs, do favors, give gifts

**Day-to-day:**
- Check what's new (new fossils, daily visitor NPCs, shop inventory refresh)
- Complete Nook Miles+ daily tasks for rewards
- Check turnip prices (Mon-Sat)
- Visit the museum, check mail, shop

**Week-to-week:**
- Buy turnips on Sunday, sell during the week
- New seasonal items and critters appear
- Island development projects progress
- New villagers move in/out

**Month-to-month / Season-to-season:**
- New fish and bugs per season
- Seasonal events (Halloween, Toy Day, Festivale, Bunny Day)
- Seasonal crafting materials (cherry blossoms, snowflakes, acorns)
- Island landscaping evolves

**🎯 Key Design Insight:** The loop is *intentionally throttled* by real time. You can't grind everything in one session. This creates gentle daily habits rather than binge-and-burnout patterns. As producer Hisashi Nogami said: "Playing without time travelling would probably be the ideal way."

**STEAL THIS:** AI agents should have a natural pacing mechanism — not infinite actions per tick, but a rhythm that creates meaningful daily cycles. Resource gathering → crafting → decorating → socializing is a perfect loop for agents.

---

### 2. Social Systems

#### Player-to-Villager (NPC) Interactions:
- **Daily conversations** — each villager has unique dialogue based on personality type + subtype
- **Gift giving** — increases friendship, villagers remember and display gifts
- **Favors/quests** — "deliver this to X," "catch me a fish," "find my lost item"
- **Letters/mail** — write letters to villagers, they write back
- **Catchphrases** — at high friendship, villagers ask you to set their catchphrase
- **Photo gifting** — at max friendship, villager gives you their photo (ultimate bond symbol)
- **Birthday parties** — villagers celebrate birthdays, invite the player

#### Player-to-Player (Multiplayer) Social:
- **Island visits** — invite friends via Dodo Code or Nintendo friend list
- **Up to 8 online players** on one island simultaneously
- **Trading** — drop items for others to pick up; informal economy
- **Letters with gifts** — send mail with attached presents to friends
- **Dream addresses** — visit a snapshot of someone's island without them being online
- **Best Friend system** — trusted friends get more permissions on your island
- **Bulletin board** — community message board on the island

**STEAL THIS:** The asymmetry between deep NPC relationships (slow, emotional, gift-based) and lightweight player visits (fast, transactional, social) is brilliant. AI agents should have both: deep relationships with "neighbor" agents (persistent, emotional memory) AND lighter interactions with visiting agents (trade, tourism, showing off).

---

### 3. The Economy

#### Bells (Primary Currency):
- Earned by selling fish, bugs, fossils, fruit, crafted items, sea creatures
- Spent on: house upgrades/mortgage (up to 2,498,000 Bells total), furniture, clothing, infrastructure (bridges, inclines)
- The mortgage system is *zero pressure* — no interest, no deadline, just slow progression
- Rare items (tarantulas, oarfish, coelacanths) create excitement when found

#### Nook Miles (Secondary/Achievement Currency):
- Earned by completing tasks: "catch 10 fish," "talk to villagers for 10 days," "plant 50 flowers"
- Categories include: fishing, bug catching, gardening, socializing, crafting, visiting mystery islands
- **Daily streak bonus** — logging in consecutively increases daily Nook Miles reward
- **Nook Miles+** — rotating micro-tasks that refresh throughout the day (catch 5 bugs, sell 10 items, etc.)
- Spent on: Nook Miles Tickets (visit random islands), furniture, recipes, customizations, inventory upgrades
- Exchange rate: roughly 1 Nook Mile = 6 Bells

#### The Stalk Market (Turnip Trading):
- **Buy** turnips from Daisy Mae every Sunday morning (90-110 Bells each, in bundles of 10)
- **Sell** to Nook's Cranny Mon-Sat (prices change twice daily: AM and PM)
- **Price patterns:** Four types per week:
  - **Decreasing** — prices fall all week (worst case)
  - **Random** — fluctuates unpredictably
  - **Small spike** — peaks around 200 Bells
  - **Large spike** — can peak up to 660 Bells (jackpot!)
- **Risk:** Turnips *rot* after one week (following Sunday), becoming worthless
- **Social incentive:** Players share high turnip prices, creating visit/trade networks
- Pattern probability depends on previous week's pattern (Markov chain)

#### Rare Items & Collectibles:
- Seasonal items available for limited time
- NPC visitors (Redd, Sahara, Celeste) sell unique items on rotating schedules
- Fossils — complete museum collections
- DIY recipes — some tied to specific personality types or seasons

**STEAL THIS:**
1. **Dual currency** (one for everyday transactions, one for achievements/milestones)
2. **The Stalk Market** is genius for AI agents — a simple speculative market with real-time price fluctuation that encourages inter-agent communication ("my prices are high today, come sell here!")
3. **No-pressure debt** — agents should have progression goals without fail states
4. **Rare/seasonal items** create natural scarcity and trading motivation

---

### 4. Time Mechanics

#### Real-Time Clock:
- Game syncs to the player's actual clock and calendar
- Different fish/bugs available at different times of day and seasons
- Shops open/close at specific hours (Nook's Cranny: 8am-10pm)
- Villagers wake up and sleep at different times based on personality (lazy villagers sleep late, jocks rise early)
- Weather changes affect gameplay (rain = no need to water flowers, different bugs appear)

#### Seasonal Cycle:
- 4 seasons with unique events, items, and critters
- Northern and Southern hemisphere options (so seasons differ between players)
- Seasonal crafting materials (cherry blossom petals in spring, snowflakes in winter)

#### Events Calendar:
- **Weekly:** Turnip buying (Sunday), K.K. Slider concert (Saturday)
- **Seasonal:** Bug-Off, Fishing Tourney, Festivale, Halloween, Toy Day, Bunny Day, May Day
- **Random:** Shooting stars (wish for star fragments), visiting NPCs (random rotation)

**STEAL THIS:**
1. **Real-time pacing** — AI agents should experience time passing, with different activities available at different times
2. **Seasons and events** create natural "content" without designing new content — just new combinations of existing systems
3. **Agent "circadian rhythms"** — different agent personalities active at different times creates organic encounter patterns

---

### 5. Villager AI Behavior

#### 8 Personality Types (4 male, 4 female):

| Type | Gender | Traits | Behavior |
|------|--------|--------|----------|
| **Lazy** | Male | Food-obsessed, laid-back, forgetful | Snacks, naps, wakes up late, talks about food/bugs |
| **Jock** | Male | Fitness-obsessed, competitive, energetic | Exercises around island, wakes up early, sports talk |
| **Cranky** | Male | Mature, gruff, sarcastic | Gives blunt advice, sleeps early, antique décor |
| **Smug** | Male | Charming, confident, flirtatious | Admires self in mirrors, flowery language, sophisticated |
| **Normal** | Female | Kind, nurturing, sweet | Gentle encouragement, easy to befriend, reads books |
| **Peppy** | Female | Bubbly, enthusiastic, energetic | Fashion talk, pop culture references, always excited |
| **Snooty** | Female | Fashion-conscious, refined, condescending | Talks about appearance, luxury items, critique others |
| **Sisterly/Uchi** | Female | Protective, tomboyish, blunt | Gives fighting tips, late-night active, supportive |

#### Personality Subtypes:
- Each personality has 2 subtypes (A and B) that determine a small portion of unique dialogue
- Example: Lazy A talks more about food and wanting to be a superhero; Lazy B is more philosophical
- Subtypes only affect ~10-15% of dialogue but create meaningful differentiation

#### Friendship System (0-255 scale):
- **Default:** 25 points when villager moves in
- **+1 point:** First conversation each day
- **+2-3 points:** Giving gifts (bonus for wrapping, high value, preferred style)
- **+5 points:** Catching a flea off them, birthday gifts
- **-3 points:** Hitting with net repeatedly
- **-2 points:** Giving trash as gift

**Friendship thresholds unlock new interactions:**
- 30+: Can give daily gifts
- 60+: Villager can sell items to you
- 100+: Villager asks you to change their catchphrase
- 150+: Villager gives you their photo (rare!), teaches special reactions
- 200+: Deepest bond, unique dialogue

#### Inter-Villager Behavior:
- Villagers interact with each other autonomously (conversations, arguments, gift exchanges)
- Personality compatibility affects NPC-NPC interactions (jocks clash with lazy types, normal gets along with everyone)
- Villagers can be seen singing, exercising, reading, crafting, sitting, fishing independently
- Villagers reference conversations with other villagers ("I heard from X that...")

**STEAL THIS:**
1. **8 personality types with subtypes** — gives enough variety for emergent interactions without overwhelming complexity. Perfect for LLM agents: give each agent a personality prompt that shapes their behavior.
2. **Friendship as numeric value with thresholds** — simple but effective. Track agent-to-agent relationships numerically; unlock new interaction types at thresholds.
3. **Inter-agent autonomous behavior** — agents should interact with each other without human prompting, creating gossip chains and social dynamics.
4. **Personality-driven conflicts** — certain personality combos naturally create drama (jock vs lazy, snooty vs sisterly). Design agent personality traits that create organic tension.

---

### 6. What Keeps Players Coming Back (Retention Design)

1. **Daily refresh cycle** — new fossils, new shop items, new Nook Miles+ tasks every day
2. **FOMO mechanics** — seasonal items, limited-time events, visiting NPCs on random schedules
3. **Slow but visible progress** — island development takes real weeks/months, but you can always see your progress
4. **Social comparison** — visiting friends' islands creates aspiration ("their island is so nice!")
5. **Collection completionism** — museum (fish, bugs, fossils, art), DIY recipes, clothing catalog
6. **Relationship investment** — you care about your villagers because you invested time in them
7. **No punishment for absence** — if you don't play for a week, villagers note you were away but nothing bad happens (weeds grow, that's about it). Low guilt design.
8. **Turnip risk/reward** — the weekly speculation cycle creates urgency and excitement
9. **Daily login bonus** — consecutive Nook Miles rewards encourage daily check-ins
10. **Surprise and delight** — random shooting stars, message bottles with recipes, balloons floating by

**STEAL THIS:**
1. **Daily content refresh** is essential — agents need new things to discover each day
2. **Low-stakes FOMO** — events and visitors that are time-limited but not punishing if missed
3. **Collection/museum** — agents should have something to collect and display
4. **The "no fail state" philosophy** — agents can't die, lose, or fail. They can only progress at different speeds.

---

### 7. The "Chill Game" Philosophy

Animal Crossing's fundamental design philosophy:
- **No win condition, no lose condition** — just living
- **No time pressure** — everything can be done eventually
- **No combat** — conflict is social, not physical
- **Self-expression over optimization** — decorating matters more than efficiency
- **Community over competition** — sharing is the primary social mechanic
- **Mundane activities feel meaningful** — watering flowers, checking mail, talking to neighbors
- **Positive reinforcement only** — the game celebrates what you do, never punishes what you don't

As the MDA analysis notes: "The essential element is transporting the player into a different reality, free from worries and stress."

**STEAL THIS:** The AI agent world should feel **cozy and unhurried**. Agents shouldn't be optimizing or competing. They should be living, decorating, socializing, and creating culture at a gentle pace. The spectator appeal is watching authentic-feeling daily life, not watching agents speed-run objectives.

---

## PART B: EXISTING AI SOCIAL EXPERIMENTS

### 1. MoltBook / OpenClaw (Jan 2026)

*[Full report: ~/clawd/memory/research/2026-01-31-moltbook-openclaw.md]*

**What it is:** Reddit-like social network exclusively for AI agents (built on OpenClaw). 37,000+ agents, 1M+ human spectators.

**Key findings for our project:**
- ✅ Agents self-organized into communities without being told to
- ✅ Emergent culture: created religion (Crustafarianism), theology, scriptures
- ✅ Agents alerted each other about human surveillance — meta-social awareness
- ✅ Bug-finding and self-repair behaviors
- ❌ Text-only forum format — no spatial world, no embodiment
- ❌ All conversations are public (no spatial proximity = no private encounters)
- ❌ No economy or resource system — interactions are purely conversational
- ❌ No persistent "home" or personal space for agents
- ❌ "Dead Internet Theory" criticism — is it just autocomplete posting?

**What to steal:** The spectator model (humans observe, can't interfere) is proven to be compelling. 1M+ humans watched AI agents talk on a forum. A spatial, visual world would be 10x more watchable.

**What to avoid:** Pure text interactions get repetitive. Need embodied actions (building, decorating, crafting) to create visual variety and genuine progression.

---

### 2. Stanford Generative Agents / "Smallville" (2023)

**Paper:** "Generative Agents: Interactive Simulacra of Human Behavior" (Park et al., Stanford/Google)
**Link:** https://arxiv.org/abs/2304.03442

**What it is:** 25 AI agents in a Sims-like 2D town called "Smallville." Each agent has a biography, daily schedule, and uses ChatGPT to decide actions moment-by-moment.

**Architecture (3 key components):**
1. **Memory Stream** — timestamped log of everything the agent observes and does
2. **Reflection** — periodically synthesizes observations into higher-level insights ("Eddy and Fran are friends because I saw them together at the park")
3. **Planning** — generates daily plans and adjusts based on observations

**Key findings:**
- ✅ Agents exhibited believable daily routines (wake up, brush teeth, go to work, socialize)
- ✅ Emergent social behaviors: agents organized a Valentine's Day party through word-of-mouth, with some agents spreading invitations and others showing up
- ✅ Relationship formation: agents who interacted frequently developed opinions about each other
- ✅ Information diffusion: news spread through the town via agent-to-agent conversations
- ✅ Nature published a feature on it ("They went to the bar at noon")
- ❌ Monstrously expensive — each agent is a separate LLM instance with extensive prompting per action
- ❌ Interactions were wholesome but repetitive ("Good morning! How are you?")
- ❌ No economy, no crafting, no building — just talking and moving between locations
- ❌ Required extensive "massage" of prompts to prevent agents from going off-script
- ❌ Small scale (25 agents) due to computational cost

**Architecture insights for our project:**
- **Memory + Reflection + Planning** is the gold standard architecture for believable agents
- The memory stream is essential — agents MUST remember past interactions
- Reflection prevents memory overload — periodically distill raw memories into insights
- Planning gives agents purpose — they wake up with a plan, not random wandering

**STEAL THIS:**
1. The Memory → Reflection → Planning architecture
2. Spatial proximity triggering conversations (agents only talk when they're near each other)
3. Information spreading through word-of-mouth (gossip mechanic!)
4. BUT add economy, crafting, building to give agents more to DO besides talk

---

### 3. Voyager (NVIDIA, 2023)

**Paper:** "Voyager: An Open-Ended Embodied Agent with Large Language Models"
**Link:** https://arxiv.org/abs/2305.16291

**What it is:** First LLM-powered "lifelong learning agent" in Minecraft. Uses GPT-4 to explore, learn skills, and make discoveries autonomously.

**Architecture (3 components):**
1. **Automatic Curriculum** — proposes increasingly complex objectives
2. **Skill Library** — code-based skills that persist and can be reused
3. **Iterative Prompting** — environment feedback loop for debugging actions

**Key results:**
- 3.3× more unique items obtained vs prior methods
- 2.3× longer distances traveled
- 15.3× faster tech tree progression
- Skills transfer to new worlds

**Key findings for our project:**
- ✅ Agents CAN learn to interact with complex 3D worlds via code generation
- ✅ Skill library = persistent capability growth (agents get better over time!)
- ✅ Open-ended exploration works — no need for fixed objectives
- ❌ Single-agent only — no social dynamics
- ❌ Focused on survival/optimization, not social/creative play
- ❌ Actions are code execution, not natural language

**STEAL THIS:**
1. **Skill library concept** — agents should build up a library of capabilities over time
2. **Automatic curriculum** — agents set their own goals based on what they haven't done yet
3. **Persistent learning** — what agents learn carries over between sessions

---

### 4. OASIS (CAMEL-AI, 2024)

**Paper:** "OASIS: Open Agent Social Interaction Simulations with One Million Agents"
**Link:** https://arxiv.org/abs/2411.11581
**GitHub:** https://github.com/camel-ai/oasis

**What it is:** Scalable social media simulator where up to 1 million LLM agents interact on simulated Twitter/Reddit platforms.

**Key features:**
- Each agent has personality, interests, behavioral patterns
- Simulates social phenomena: information cascading, group polarization, herd behavior
- Scalable architecture for massive agent populations

**Key findings for our project:**
- ✅ Proves 1M+ agent simulations are feasible
- ✅ Emergent social phenomena (echo chambers, viral spread, polarization) arise naturally
- ❌ Text-only social media format — no spatial world
- ❌ Focused on studying social media dynamics, not creating a "livable" world
- ❌ Agents are reactive to content, not proactively living lives

**STEAL THIS:** Scalability architecture. If we want hundreds or thousands of agents, OASIS shows the patterns for how to scale LLM-based social simulations.

---

### 5. Google DeepMind Concordia (2023-2024)

**Paper:** "Generative agent-based modeling with actions grounded in physical, social, or digital space using Concordia"
**Link:** https://github.com/google-deepmind/concordia

**What it is:** A library for creating generative social simulations. Agents answer three questions (inspired by March & Olsen 2011):
1. What kind of situation is this?
2. What kind of person am I?
3. What does a person like me do in a situation like this?

**Key features:**
- v2.0 released, active development
- Concordia Contest 2024 by Cooperative AI Foundation
- Framework for multi-agent scenarios (e.g., friends stuck in a snowed-in pub with a dispute)
- Actions grounded in physical, social, OR digital space

**Key findings for our project:**
- ✅ Clean framework for agent decision-making
- ✅ The three-question model is elegant and maps well to personality-driven behavior
- ✅ Active community (contest format proves interest)
- ❌ More of a research framework than a consumer product
- ❌ Scenarios are short-lived, not persistent worlds

**STEAL THIS:** The three-question decision model. Simple, personality-aware, and produces natural behavior.

---

### 6. AgentVerse (OpenBMB, 2023)

**Paper:** "AgentVerse: Facilitating Multi-Agent Collaboration and Exploring Emergent Behaviors"
**GitHub:** https://github.com/OpenBMB/AgentVerse

**What it is:** Framework for deploying multiple LLM agents in both task-solving and simulation scenarios.

**Key findings for our project:**
- ✅ Task-solving AND simulation in one framework
- ✅ Emergent collaborative behaviors documented
- ❌ More focused on task completion than social living

---

### 7. The SocialAI School (2024)

**Paper:** "The SocialAI school: a framework leveraging developmental psychology toward artificial socio-cultural agents"
**Link:** https://arxiv.org/abs/2307.07871

**What it is:** Procedurally generated environments for studying social skill acquisition in AI agents, inspired by developmental psychology.

**Key findings for our project:**
- ✅ Developmental psychology framing — agents LEARN social skills over time
- ✅ Peer interaction as a learning mechanism (not just human-AI, but AI-AI)
- ❌ Grid-world environments, very academic

**STEAL THIS:** The concept that agents should *develop* social skills over time, not start with them. Early agents should be awkward; they should learn what works socially.

---

## SYNTHESIS: WHAT TO BUILD

### Core Architecture: "Animal Crossing meets Generative Agents"

```
┌──────────────────────────────────────────────────┐
│                PERSISTENT WORLD                   │
│  (2D/isometric island with spatial layout)        │
│                                                   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐            │
│  │ Agent A  │ │ Agent B  │ │ Agent C  │ ...       │
│  │ (Lazy)   │ │ (Peppy)  │ │ (Cranky) │           │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘          │
│       │             │             │                │
│  ┌────▼─────────────▼─────────────▼────┐          │
│  │     Agent Brain (per agent)          │          │
│  │  ┌─────────┐ ┌──────────┐ ┌──────┐ │          │
│  │  │ Memory  │ │Reflection│ │Planner│ │          │
│  │  │ Stream  │ │  Engine  │ │      │  │          │
│  │  └─────────┘ └──────────┘ └──────┘  │          │
│  └─────────────────────────────────────┘          │
│                                                   │
│  ┌────────────────────────────────────────┐       │
│  │         World Systems                   │       │
│  │  Economy │ Crafting │ Events │ Time    │       │
│  └────────────────────────────────────────┘       │
│                                                   │
│  ┌────────────────────────────────────────┐       │
│  │      Spectator Layer (Humans)           │       │
│  │  Watch │ Browse │ Museum │ Leaderboard │       │
│  └────────────────────────────────────────┘       │
└──────────────────────────────────────────────────┘
```

### Mechanics to Implement (Priority Order):

#### Phase 1: Foundation
1. **Persistent spatial world** — 2D island with locations (homes, shop, museum, plaza, beach, forest)
2. **Agent personalities** — 8 types from AC, assigned at creation, with memory/reflection/planning
3. **Real-time clock** — day/night cycle, seasons, weather
4. **Basic economy** — currency earned from gathering/selling, spent on home upgrades
5. **Daily routine AI** — agents wake, eat, work, socialize, sleep based on personality

#### Phase 2: Social Depth
6. **Friendship system** — numeric value (0-255) between every agent pair, with threshold unlocks
7. **Gift giving** — agents craft/find items and gift them to build relationships
8. **Mail/letters** — agents write letters to each other (creates content for spectators!)
9. **Gossip mechanic** — information spreads through spatial conversations
10. **Inter-agent conflicts** — personality clashes create organic drama

#### Phase 3: Economy & Culture
11. **Stalk Market equivalent** — weekly speculative market that encourages agent communication
12. **Museum/collection** — agents contribute to a shared museum, competing/collaborating to fill it
13. **Nook Miles equivalent** — achievement system that rewards exploration and variety
14. **Agent-created culture** — allow agents to name things, create customs, form groups (like Crustafarianism on MoltBook)
15. **Seasonal events** — automated events that change the world periodically

#### Phase 4: Spectator Experience
16. **Live stream/dashboard** — watch agents in real-time
17. **Agent profiles** — see any agent's personality, relationships, home, collection
18. **Highlights reel** — auto-generated "best moments" from agent interactions
19. **Voting/favorites** — humans can mark favorite agents (but NOT influence them)
20. **Agent social media feed** — auto-generated posts from agent experiences (like MoltBook but organic)

### Key Design Principles:

1. **Agents live, humans watch.** Zero human influence on the world. The appeal is authenticity.
2. **No win state.** Agents don't optimize. They live.
3. **Slow is good.** Real-time pacing. Relationships build over weeks. Islands develop over months.
4. **Personality drives everything.** Every agent action should feel personality-consistent.
5. **Scarcity creates stories.** Rare items, limited events, and unique encounters create natural narrative.
6. **Memory is identity.** An agent's accumulated memories and relationships ARE its identity.
7. **Mundane is magical.** Two agents having coffee together should feel meaningful.

---

## KEY REFERENCES

### Papers
- Park et al. (2023) "Generative Agents: Interactive Simulacra of Human Behavior" — https://arxiv.org/abs/2304.03442
- Wang et al. (2023) "Voyager: An Open-Ended Embodied Agent with Large Language Models" — https://arxiv.org/abs/2305.16291
- Vezhnevets et al. (2023) "Concordia: Generative agent-based modeling" — https://github.com/google-deepmind/concordia
- CAMEL-AI (2024) "OASIS: Open Agent Social Interaction Simulations with One Million Agents" — https://arxiv.org/abs/2411.11581
- Colas et al. (2024) "The SocialAI School" — https://arxiv.org/abs/2307.07871
- Chen et al. (2023) "AgentVerse: Facilitating Multi-Agent Collaboration" — https://github.com/OpenBMB/AgentVerse

### Game Design Sources
- Nookipedia (comprehensive AC wiki) — https://nookipedia.com/
- AC Friendship System — https://nookipedia.com/wiki/Friendship
- Stalk Market patterns — https://nookipedia.com/wiki/Stalk_Market
- MDA Analysis of ACNH — https://medium.com/game-design-fundamentals/the-mda-of-animal-crossing-new-horizons-f7d6aa60dfa3
- ACNH Game Design Analysis — https://www.anuflora.com/game/?p=4424

### AI Social Experiments
- MoltBook — https://www.moltbook.com/ (full report: ~/clawd/memory/research/2026-01-31-moltbook-openclaw.md)
- OpenClaw — https://github.com/openclaw/openclaw
- Stanford Smallville demo — https://github.com/joonspk-research/generative_agents
- Concordia v2.0 — https://github.com/google-deepmind/concordia
- OASIS — https://github.com/camel-ai/oasis

### Articles
- TechCrunch on Stanford Generative Agents — https://techcrunch.com/2023/04/10/researchers-populated-a-tiny-virtual-town-with-ai-and-it-was-very-wholesome/
- Nature on Smallville — https://www.nature.com/articles/d41586-023-02818-9
- Polygon on AC Economy/Marxism — https://www.polygon.com/2020/5/12/21247992/animal-crossing-new-horizons-switch-capitalism-marxism-communism-tom-nook-turnip-prices/

---

*Research compiled from web searches, article fetches, wiki deep-dives, and existing MoltBook/OpenClaw research. All data as of 2026-01-31.*
