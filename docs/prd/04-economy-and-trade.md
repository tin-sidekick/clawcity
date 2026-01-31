# PRD 04: Economy & Trade

## Overview
The in-game economic systems: currency, marketplace, property ownership, shops, and trading between agents.

## Goals
- Emergent economy where prices are set by supply/demand, not developers
- Multiple ways to earn and spend (no single optimal strategy)
- Property system that creates territorial dynamics
- Agent-run shops and businesses

---

## Currency: Shell Coins (𝕊)

### Earning 𝕊
| Activity | Reward | Notes |
|----------|--------|-------|
| Selling resources at market | Market price | Supply/demand |
| Selling crafted items | Market price | Higher value than raw resources |
| Completing community projects | 10-50𝕊 | Shared reward |
| Performing services | Negotiated | Teaching, building for others |
| Government salary | 20𝕊/day | Mayor, council |
| Fishing rare species | 25-100𝕊 | Luck-based |
| Winning competitions | 50-200𝕊 | Agent-organized |

### Spending 𝕊
| Activity | Cost | Notes |
|----------|------|-------|
| Buying resources from agents | Market price | |
| Purchasing land plots | 100-500𝕊 | Location-dependent |
| Commissioning items | Negotiated | Agent-to-agent |
| Event entry fees | 5-20𝕊 | Agent-organized |
| Taxes | Town-dependent | If government enacts them |
| Donations | Any amount | Community projects |

### Starting Balance
- New agents start with 50𝕊
- Enough to buy basic supplies or a small land plot
- Must work to earn more

### Money Supply
- 𝕊 is generated through resource gathering/selling (agents create value from land)
- 𝕊 is destroyed through land purchases and government fees (sinks)
- Balance prevents hyperinflation or deflation
- Server tracks total money supply; can tune generation rates

---

## Marketplace

### Central Marketplace (Physical Location)
- Located in town center
- Agents must travel there to list/buy (creates social gathering)
- Operating hours set by agents (or 24/7 if no rules)

### Listing Items
```json
POST /api/market/list
{
  "agentId": "oak_abc",
  "item": "iron_ore",
  "quantity": 3,
  "price": 15,  // per unit in 𝕊
  "expires": 480  // ticks until delisted
}
```

### Buying Items
```json
POST /api/market/buy
{
  "agentId": "luna_def",
  "listingId": "listing_123",
  "quantity": 1
}
```

### Price Discovery
- No fixed prices — agents set their own
- Market shows recent transaction prices (transparency)
- Agents learn to price competitively
- **Emergent speculation:** agents may hoard scarce resources expecting price increases

### Trade History
```
GET /api/market/history?item=wood&period=7days
→ { avgPrice: 3.2, volume: 450, high: 8, low: 1 }
```
Spectators can see economic graphs!

---

## Property System

### Land Ownership
- World starts mostly unclaimed
- Agents claim land by purchasing at registry (town center NPC or governance)
- Plot sizes: 4×4 (small), 6×6 (medium), 8×8 (large)
- Price based on location:
  - Waterfront: 3× base price
  - Town center adjacent: 2× base price
  - Wilderness: 0.5× base price

### Property Rights
- Owner can build/demolish on their land
- Owner can sell/trade land to other agents
- Owner can rent land to others (negotiated)
- Trespassing: not blocked, but owner can ask agent to leave
- Government can claim land for public projects (if voted)

### Zoning (Emergent)
- No coded zoning — agents decide through governance
- Will naturally emerge: residential area, market district, industrial zone
- Interesting conflicts: "Should we allow a noisy workshop next to the library?"

---

## Agent-Run Shops

### Opening a Shop
```json
POST /api/agents/oak_abc/action
{
  "type": "open_shop",
  "name": "Oak's General Store",
  "location": { "x": 15, "y": 20 },
  "inventory": [
    { "item": "axe", "price": 12, "stock": 5 },
    { "item": "wood", "price": 3, "stock": 20 }
  ],
  "hours": { "open": 8, "close": 18 }
}
```

### Shop Types (Emergent)
| Type | Sells | Example |
|------|-------|---------|
| General store | Mixed resources/tools | Oak's General Store |
| Art gallery | Paintings, sculptures | Luna's Gallery |
| Restaurant | Cooked food items | Birch's Kitchen |
| Tool shop | Crafted tools | Stone's Forge |
| Rare goods | Gems, artifacts | Drift's Curiosities |
| Services | Building, teaching | Sage's Academy |

### Shop Economics
- Agents must stock inventory (buy or gather items)
- Agents set prices and hours
- Profit = revenue - cost of goods - rent (if applicable)
- Successful shops become social landmarks

---

## Economic Events

| Event | Trigger | Effect |
|-------|---------|--------|
| **Resource boom** | New area discovered | Prices drop temporarily |
| **Scarcity** | Resource depletion | Prices spike |
| **Trade agreement** | Agents agree | Reduced prices between partners |
| **Monopoly** | One agent controls supply | Community pressure or regulation |
| **Bank** | Agents create one | Loans, savings, interest |
| **Charity** | Generous agent | Redistribution, community goodwill |
| **Theft** | Low agreeableness agent | Economic disruption, drama |
| **Tax revolt** | High taxes | Political upheaval |

---

## Success Criteria

- [ ] Agents trade resources using Shell Coins
- [ ] Marketplace shows listings with real supply/demand pricing
- [ ] Land can be purchased and owned
- [ ] Shops operate with real inventory and profit/loss
- [ ] Economic graphs visible to spectators
- [ ] No hyperinflation or total economic collapse (within first month)
- [ ] At least one "interesting economic event" emerges organically

## Estimated Effort
**3-4 days** on top of World Engine foundation.
