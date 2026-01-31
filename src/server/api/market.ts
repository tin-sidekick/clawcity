// ============================================================
// ClawCity — Market API
// RESTful endpoints for marketplace operations
// ============================================================

import express from 'express';
import { validateApiKey } from './middleware.js';
import { getWorldState } from '../db/index.js';
import type { EconomySystem } from '../engine/economy.js';

export function createMarketRouter(economySystem: EconomySystem) {
  const router = express.Router();

  // ============================================================
  // MARKETPLACE ENDPOINTS
  // ============================================================

  /**
   * GET /api/market/listings
   * Browse marketplace listings
   */
  router.get('/listings', validateApiKey, (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const item = req.query.item as string;

      let listings = economySystem.getMarketListings(limit);
      
      // Filter by item if specified
      if (item) {
        listings = listings.filter(listing => listing.item === item);
      }

      res.json({
        success: true,
        listings,
        market_data: JSON.parse(getWorldState('market_data') || '{}'),
      });
    } catch (error) {
      console.error('Error fetching market listings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch market listings',
      });
    }
  });

  /**
   * POST /api/market/list
   * List an item for sale
   */
  router.post('/list', validateApiKey, (req, res) => {
    try {
      const { item, quantity, price_per_unit } = req.body;
      const agentId = req.agentId;
      const currentTick = parseInt(getWorldState('tick') || '0');

      if (!item || !quantity || !price_per_unit) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: item, quantity, price_per_unit',
        });
      }

      if (quantity <= 0 || price_per_unit <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Quantity and price must be positive numbers',
        });
      }

      const result = economySystem.listItem(agentId!, item, quantity, price_per_unit, currentTick);

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          listing_id: result.listingId,
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.message,
        });
      }
    } catch (error) {
      console.error('Error listing item:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list item',
      });
    }
  });

  /**
   * POST /api/market/buy
   * Buy an item from the marketplace
   */
  router.post('/buy', validateApiKey, (req, res) => {
    try {
      const { listing_id } = req.body;
      const agentId = req.agentId;

      if (!listing_id) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field: listing_id',
        });
      }

      const result = economySystem.buyItem(agentId!, listing_id);

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.message,
        });
      }
    } catch (error) {
      console.error('Error buying item:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to buy item',
      });
    }
  });

  /**
   * DELETE /api/market/:listing_id
   * Cancel a market listing
   */
  router.delete('/:listing_id', validateApiKey, (req, res) => {
    try {
      const { listing_id } = req.params;
      const agentId = req.agentId;

      const result = economySystem.cancelListing(agentId!, listing_id);

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.message,
        });
      }
    } catch (error) {
      console.error('Error cancelling listing:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel listing',
      });
    }
  });

  // ============================================================
  // ECONOMY STATS
  // ============================================================

  /**
   * GET /api/market/stats
   * Get economy statistics
   */
  router.get('/stats', validateApiKey, (req, res) => {
    try {
      const stats = economySystem.getEconomyStats();
      
      res.json({
        success: true,
        stats,
      });
    } catch (error) {
      console.error('Error fetching economy stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch economy stats',
      });
    }
  });

  /**
   * GET /api/market/shops
   * Get nearby shops for an agent
   */
  router.get('/shops', validateApiKey, (req, res) => {
    try {
      const agentId = req.agentId;
      const shops = economySystem.getNearbyShops(agentId!);
      
      res.json({
        success: true,
        shops,
      });
    } catch (error) {
      console.error('Error fetching nearby shops:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch nearby shops',
      });
    }
  });

  return router;
}