// ============================================================
// ClawCity — Economy System
// Manages marketplace, property, shops, scarcity, and trading
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import { getDb, getAgent, getAllAgents } from '../db/index.js';
import { CONFIG } from '../config.js';
import type { MarketListing, Agent, Tile } from '../../shared/types.js';

interface PropertyTax {
  agentId: string;
  tileCount: number;
  taxOwed: number;
}

interface SeasonalResource {
  resource: string;
  seasons: string[];
  rarity: number; // 0-1, 1 being very rare
}

interface ShopData {
  inventory: Record<string, number>;
  autoRestock: boolean;
  displayName: string;
}

interface EconomyStats {
  totalShellCoins: number;
  circulatingCoins: number;
  averageWealth: number;
  wealthDistribution: { bottom50: number; middle40: number; top10: number };
  marketVolume: number;
  activeTrades: number;
  inflation: number;
  gdp: number;
}

const SEASONAL_RESOURCES: SeasonalResource[] = [
  { resource: 'berries', seasons: ['spring', 'summer'], rarity: 0.1 },
  { resource: 'mushrooms', seasons: ['autumn'], rarity: 0.2 },
  { resource: 'ice_crystals', seasons: ['winter'], rarity: 0.05 },
  { resource: 'spring_water', seasons: ['spring'], rarity: 0.15 },
  { resource: 'golden_ore', seasons: ['all'], rarity: 0.01 }, // Very rare
  { resource: 'ancient_rune', seasons: ['all'], rarity: 0.005 }, // Ultra rare
];

const PROPERTY_TAX_RATE = 2; // 2 shell_coins per owned tile per tick
const RENT_PERCENTAGE = 0.1; // 10% of building income goes to landowner

export class EconomySystem {
  private db = getDb();

  constructor() {
    this.initializeSeasonalResources();
  }

  /**
   * Called every tick to handle economy-related updates
   */
  processTick(currentTick: number, season: string): void {
    this.collectPropertyTax(currentTick);
    this.processRentPayments(currentTick);
    this.expireMarketListings(currentTick);
    this.updateResourceScarcity(currentTick, season);
    this.calculateMarketPrices(currentTick);
  }

  // ============================================================
  // MARKETPLACE
  // ============================================================

  /**
   * List an item for sale on the marketplace
   */
  listItem(sellerId: string, item: string, quantity: number, pricePerUnit: number, currentTick: number): 
    { success: boolean; message: string; listingId?: string } {
    
    const seller = getAgent(sellerId);
    if (!seller) return { success: false, message: 'Seller not found' };

    const inventory = JSON.parse(seller.inventory || '{}');
    if ((inventory[item] || 0) < quantity) {
      return { success: false, message: `Not enough ${item} to sell` };
    }

    // Remove items from inventory immediately
    inventory[item] = (inventory[item] || 0) - quantity;
    this.db.prepare('UPDATE agents SET inventory = ? WHERE id = ?')
      .run(JSON.stringify(inventory), sellerId);

    // Create market listing
    const listingId = uuidv4();
    const expiresAt = currentTick + (CONFIG.TICKS_PER_DAY * 3); // 3 days

    this.db.prepare(`
      INSERT INTO market_listings (id, seller_id, item, quantity, price_per_unit, listed_at_tick, expires_at_tick)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(listingId, sellerId, item, quantity, pricePerUnit, currentTick, expiresAt);

    return { success: true, message: `Listed ${quantity} ${item} for ${pricePerUnit} coins each`, listingId };
  }

  /**
   * Buy an item from the marketplace
   */
  buyItem(buyerId: string, listingId: string): { success: boolean; message: string; data?: any } {
    const buyer = getAgent(buyerId);
    if (!buyer) return { success: false, message: 'Buyer not found' };

    const listing = this.db.prepare('SELECT * FROM market_listings WHERE id = ?').get(listingId) as MarketListing | undefined;
    if (!listing) return { success: false, message: 'Listing not found' };

    const totalCost = listing.quantity * listing.price_per_unit;
    if (buyer.shell_coins < totalCost) {
      return { success: false, message: `Not enough coins (need ${totalCost}, have ${buyer.shell_coins})` };
    }

    const seller = getAgent(listing.seller_id);
    if (!seller) return { success: false, message: 'Seller not found' };

    // Transfer money
    this.db.prepare('UPDATE agents SET shell_coins = shell_coins - ? WHERE id = ?')
      .run(totalCost, buyerId);
    this.db.prepare('UPDATE agents SET shell_coins = shell_coins + ? WHERE id = ?')
      .run(totalCost, listing.seller_id);

    // Transfer item
    const buyerInventory = JSON.parse(buyer.inventory || '{}');
    buyerInventory[listing.item] = (buyerInventory[listing.item] || 0) + listing.quantity;
    this.db.prepare('UPDATE agents SET inventory = ? WHERE id = ?')
      .run(JSON.stringify(buyerInventory), buyerId);

    // Remove listing
    this.db.prepare('DELETE FROM market_listings WHERE id = ?').run(listingId);

    return { 
      success: true, 
      message: `Bought ${listing.quantity} ${listing.item} for ${totalCost} coins`,
      data: { item: listing.item, quantity: listing.quantity, totalCost }
    };
  }

  /**
   * Cancel a market listing
   */
  cancelListing(sellerId: string, listingId: string): { success: boolean; message: string } {
    const listing = this.db.prepare('SELECT * FROM market_listings WHERE id = ? AND seller_id = ?')
      .get(listingId, sellerId) as MarketListing | undefined;
    
    if (!listing) return { success: false, message: 'Listing not found or not owned by you' };

    // Return items to seller
    const seller = getAgent(sellerId);
    if (seller) {
      const inventory = JSON.parse(seller.inventory || '{}');
      inventory[listing.item] = (inventory[listing.item] || 0) + listing.quantity;
      this.db.prepare('UPDATE agents SET inventory = ? WHERE id = ?')
        .run(JSON.stringify(inventory), sellerId);
    }

    // Remove listing
    this.db.prepare('DELETE FROM market_listings WHERE id = ?').run(listingId);

    return { success: true, message: `Cancelled listing for ${listing.quantity} ${listing.item}` };
  }

  // ============================================================
  // PROPERTY SYSTEM
  // ============================================================

  /**
   * Agent claims/buys a land tile
   */
  claimLand(agentId: string, x: number, y: number, currentTick: number): { success: boolean; message: string; cost?: number } {
    const agent = getAgent(agentId);
    if (!agent) return { success: false, message: 'Agent not found' };

    const tile = this.db.prepare('SELECT * FROM tiles WHERE x = ? AND y = ?').get(x, y) as Tile | undefined;
    if (!tile) return { success: false, message: 'Tile not found' };

    if (tile.owner_id) {
      if (tile.owner_id === agentId) {
        return { success: false, message: 'You already own this tile' };
      }
      // Can buy from another agent for premium price
      const cost = 100; // Premium cost for owned land
      if (agent.shell_coins < cost) {
        return { success: false, message: `Not enough coins (need ${cost}, have ${agent.shell_coins})` };
      }

      // Transfer payment to current owner
      this.db.prepare('UPDATE agents SET shell_coins = shell_coins + ? WHERE id = ?')
        .run(cost, tile.owner_id);
      this.db.prepare('UPDATE agents SET shell_coins = shell_coins - ? WHERE id = ?')
        .run(cost, agentId);

      // Transfer ownership
      this.db.prepare('UPDATE tiles SET owner_id = ? WHERE x = ? AND y = ?')
        .run(agentId, x, y);

      return { success: true, message: `Bought land at (${x}, ${y}) for ${cost} coins`, cost };
    } else {
      // Free land claim
      const distance = Math.abs(x - agent.x) + Math.abs(y - agent.y);
      if (distance > 3) {
        return { success: false, message: 'Too far to claim (must be within 3 tiles)' };
      }

      this.db.prepare('UPDATE tiles SET owner_id = ? WHERE x = ? AND y = ?')
        .run(agentId, x, y);

      return { success: true, message: `Claimed land at (${x}, ${y})`, cost: 0 };
    }
  }

  /**
   * Collect property tax from all landowners
   */
  private collectPropertyTax(currentTick: number): void {
    const landowners = this.db.prepare(`
      SELECT owner_id, COUNT(*) as tile_count 
      FROM tiles 
      WHERE owner_id IS NOT NULL 
      GROUP BY owner_id
    `).all() as { owner_id: string; tile_count: number }[];

    for (const { owner_id, tile_count } of landowners) {
      const taxOwed = tile_count * PROPERTY_TAX_RATE;
      const agent = getAgent(owner_id);
      
      if (agent && agent.shell_coins >= taxOwed) {
        this.db.prepare('UPDATE agents SET shell_coins = shell_coins - ? WHERE id = ?')
          .run(taxOwed, owner_id);
      } else if (agent) {
        // Can't afford tax - lose a random tile
        const ownedTiles = this.db.prepare('SELECT x, y FROM tiles WHERE owner_id = ?').all(owner_id) as Tile[];
        if (ownedTiles.length > 0) {
          const randomTile = ownedTiles[Math.floor(Math.random() * ownedTiles.length)];
          this.db.prepare('UPDATE tiles SET owner_id = NULL WHERE x = ? AND y = ?')
            .run(randomTile.x, randomTile.y);
        }
      }
    }
  }

  /**
   * Process rent payments for buildings on owned land
   */
  private processRentPayments(currentTick: number): void {
    const rentSituations = this.db.prepare(`
      SELECT b.owner_id as building_owner, t.owner_id as land_owner, b.type, b.x, b.y
      FROM buildings b
      JOIN tiles t ON b.x = t.x AND b.y = t.y
      WHERE t.owner_id IS NOT NULL AND t.owner_id != b.owner_id
    `).all() as { building_owner: string; land_owner: string; type: string; x: number; y: number }[];

    for (const situation of rentSituations) {
      const rentAmount = 10; // Base rent per tick
      const buildingOwner = getAgent(situation.building_owner);
      
      if (buildingOwner && buildingOwner.shell_coins >= rentAmount) {
        this.db.prepare('UPDATE agents SET shell_coins = shell_coins - ? WHERE id = ?')
          .run(rentAmount, situation.building_owner);
        this.db.prepare('UPDATE agents SET shell_coins = shell_coins + ? WHERE id = ?')
          .run(rentAmount, situation.land_owner);
      }
    }
  }

  // ============================================================
  // SHOPS & MARKETPLACE INTEGRATION
  // ============================================================

  /**
   * Get nearby shops for an agent
   */
  getNearbyShops(agentId: string): any[] {
    const agent = getAgent(agentId);
    if (!agent) return [];

    const shops = this.db.prepare(`
      SELECT b.*, a.name as owner_name
      FROM buildings b
      JOIN agents a ON b.owner_id = a.id
      WHERE b.type = 'market_stall'
      AND ABS(b.x - ?) <= 3 AND ABS(b.y - ?) <= 3
    `).all(agent.x, agent.y);

    return shops.map(shop => ({
      ...shop,
      inventory: this.getShopInventory(shop.id),
    }));
  }

  /**
   * Get shop inventory
   */
  private getShopInventory(buildingId: string): Record<string, number> {
    const building = this.db.prepare('SELECT data FROM buildings WHERE id = ?').get(buildingId) as { data: string } | undefined;
    if (!building) return {};
    
    const data = JSON.parse(building.data || '{}') as ShopData;
    return data.inventory || {};
  }

  // ============================================================
  // SCARCITY & SEASONAL RESOURCES
  // ============================================================

  /**
   * Initialize seasonal resource configuration
   */
  private initializeSeasonalResources(): void {
    // This could be expanded to read from a configuration file
  }

  /**
   * Update resource scarcity based on season and random events
   */
  private updateResourceScarcity(currentTick: number, season: string): void {
    for (const seasonalResource of SEASONAL_RESOURCES) {
      const isAvailable = seasonalResource.seasons.includes(season) || seasonalResource.seasons.includes('all');
      const spawnChance = isAvailable ? seasonalResource.rarity : seasonalResource.rarity * 0.1; // 10% in off-season

      // Random chance to spawn rare resource
      if (Math.random() < spawnChance) {
        this.spawnRareResource(seasonalResource.resource);
      }
    }
  }

  /**
   * Spawn a rare resource on the map
   */
  private spawnRareResource(resource: string): void {
    // Find empty tiles to spawn resources
    const emptyTiles = this.db.prepare(`
      SELECT x, y FROM tiles 
      WHERE resource IS NULL OR resource_amount = 0 
      ORDER BY RANDOM() 
      LIMIT 1
    `).all() as Tile[];

    if (emptyTiles.length > 0) {
      const tile = emptyTiles[0];
      this.db.prepare('UPDATE tiles SET resource = ?, resource_amount = ? WHERE x = ? AND y = ?')
        .run(resource, Math.floor(Math.random() * 10) + 5, tile.x, tile.y);
    }
  }

  // ============================================================
  // MARKET OPERATIONS
  // ============================================================

  /**
   * Expire old market listings
   */
  private expireMarketListings(currentTick: number): void {
    const expiredListings = this.db.prepare('SELECT * FROM market_listings WHERE expires_at_tick <= ?')
      .all(currentTick) as MarketListing[];

    for (const listing of expiredListings) {
      // Return items to seller
      const seller = getAgent(listing.seller_id);
      if (seller) {
        const inventory = JSON.parse(seller.inventory || '{}');
        inventory[listing.item] = (inventory[listing.item] || 0) + listing.quantity;
        this.db.prepare('UPDATE agents SET inventory = ? WHERE id = ?')
          .run(JSON.stringify(inventory), listing.seller_id);
      }

      // Remove expired listing
      this.db.prepare('DELETE FROM market_listings WHERE id = ?').run(listing.id);
    }
  }

  /**
   * Calculate dynamic market prices based on supply and demand
   */
  private calculateMarketPrices(currentTick: number): void {
    // This would implement supply/demand price calculations
    // For now, we'll store basic market data
    const marketData = {
      lastUpdate: currentTick,
      totalListings: this.db.prepare('SELECT COUNT(*) as count FROM market_listings').get()?.count || 0,
      uniqueItems: this.db.prepare('SELECT COUNT(DISTINCT item) as count FROM market_listings').get()?.count || 0,
    };
    
    // Store in world_state for access by other systems
    this.db.prepare('INSERT OR REPLACE INTO world_state (key, value) VALUES (?, ?)')
      .run('market_data', JSON.stringify(marketData));
  }

  // ============================================================
  // ECONOMY STATISTICS
  // ============================================================

  /**
   * Get comprehensive economy statistics
   */
  getEconomyStats(): EconomyStats {
    const agents = getAllAgents();
    const coinTotals = agents.map(a => a.shell_coins).sort((a, b) => a - b);
    const totalCoins = coinTotals.reduce((sum, coins) => sum + coins, 0);
    const averageWealth = totalCoins / agents.length;

    // Calculate wealth distribution
    const bottom50Index = Math.floor(agents.length * 0.5);
    const top10Index = Math.floor(agents.length * 0.9);
    
    const bottom50Wealth = coinTotals.slice(0, bottom50Index).reduce((sum, coins) => sum + coins, 0);
    const middle40Wealth = coinTotals.slice(bottom50Index, top10Index).reduce((sum, coins) => sum + coins, 0);
    const top10Wealth = coinTotals.slice(top10Index).reduce((sum, coins) => sum + coins, 0);

    const marketListings = this.db.prepare('SELECT COUNT(*) as count FROM market_listings').get()?.count || 0;

    return {
      totalShellCoins: totalCoins,
      circulatingCoins: totalCoins,
      averageWealth,
      wealthDistribution: {
        bottom50: (bottom50Wealth / totalCoins) * 100,
        middle40: (middle40Wealth / totalCoins) * 100,
        top10: (top10Wealth / totalCoins) * 100,
      },
      marketVolume: marketListings,
      activeTrades: marketListings,
      inflation: 0, // Would need historical data
      gdp: totalCoins * 0.1, // Simplified GDP calculation
    };
  }

  /**
   * Get all market listings
   */
  getMarketListings(limit: number = 50): MarketListing[] {
    return this.db.prepare(`
      SELECT ml.*, a.name as seller_name
      FROM market_listings ml
      JOIN agents a ON ml.seller_id = a.id
      ORDER BY ml.listed_at_tick DESC
      LIMIT ?
    `).all(limit) as MarketListing[];
  }
}