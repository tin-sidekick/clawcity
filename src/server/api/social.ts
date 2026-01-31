// ============================================================
// ClawCity — Social API
// RESTful endpoints for social systems (factions, reputation, gossip)
// ============================================================

import express from 'express';
import { validateApiKey } from './middleware.js';
import { getWorldState } from '../db/index.js';
import type { SocialSystem } from '../engine/social.js';

export function createSocialRouter(socialSystem: SocialSystem) {
  const router = express.Router();

  // ============================================================
  // FACTION ENDPOINTS
  // ============================================================

  /**
   * GET /api/social/factions
   * List all active factions
   */
  router.get('/factions', validateApiKey, (req, res) => {
    try {
      const factions = socialSystem.getActiveFactions();
      
      res.json({
        success: true,
        factions,
      });
    } catch (error) {
      console.error('Error fetching factions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch factions',
      });
    }
  });

  /**
   * GET /api/social/factions/:faction_id
   * Get detailed faction information
   */
  router.get('/factions/:faction_id', validateApiKey, (req, res) => {
    try {
      const { faction_id } = req.params;
      const faction = socialSystem.getFaction(faction_id);
      
      if (!faction) {
        return res.status(404).json({
          success: false,
          error: 'Faction not found',
        });
      }

      res.json({
        success: true,
        faction,
      });
    } catch (error) {
      console.error('Error fetching faction:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch faction',
      });
    }
  });

  /**
   * POST /api/social/factions
   * Create a new faction
   */
  router.post('/factions', validateApiKey, (req, res) => {
    try {
      const { name, description, rules } = req.body;
      const agentId = req.agentId;
      const currentTick = parseInt(getWorldState('tick') || '0');

      if (!name || !description) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: name, description',
        });
      }

      const result = socialSystem.createFaction(agentId!, name, description, rules || '', currentTick);

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          faction_id: result.factionId,
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.message,
        });
      }
    } catch (error) {
      console.error('Error creating faction:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create faction',
      });
    }
  });

  /**
   * POST /api/social/factions/:faction_id/invite
   * Invite an agent to join a faction
   */
  router.post('/factions/:faction_id/invite', validateApiKey, (req, res) => {
    try {
      const { faction_id } = req.params;
      const { target_agent_id } = req.body;
      const agentId = req.agentId;
      const currentTick = parseInt(getWorldState('tick') || '0');

      if (!target_agent_id) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field: target_agent_id',
        });
      }

      const result = socialSystem.inviteToFaction(agentId!, faction_id, target_agent_id, currentTick);

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
      console.error('Error inviting to faction:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to invite to faction',
      });
    }
  });

  // ============================================================
  // REPUTATION ENDPOINTS
  // ============================================================

  /**
   * GET /api/social/reputation/:agent_id
   * Get an agent's reputation
   */
  router.get('/reputation/:agent_id', validateApiKey, (req, res) => {
    try {
      const { agent_id } = req.params;
      const reputation = socialSystem.getAgentReputation(agent_id);
      
      res.json({
        success: true,
        agent_id,
        reputation,
      });
    } catch (error) {
      console.error('Error fetching reputation:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch reputation',
      });
    }
  });

  // ============================================================
  // RELATIONSHIP ENDPOINTS
  // ============================================================

  /**
   * GET /api/social/relationships/:target_id
   * Get relationship details with another agent
   */
  router.get('/relationships/:target_id', validateApiKey, (req, res) => {
    try {
      const { target_id } = req.params;
      const agentId = req.agentId;
      
      const relationship = socialSystem.getEnhancedRelationship(agentId!, target_id);
      
      if (!relationship) {
        return res.status(404).json({
          success: false,
          error: 'Relationship not found',
        });
      }

      res.json({
        success: true,
        relationship,
      });
    } catch (error) {
      console.error('Error fetching relationship:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch relationship',
      });
    }
  });

  // ============================================================
  // GOSSIP ENDPOINTS
  // ============================================================

  /**
   * GET /api/social/gossip
   * Get recent gossip
   */
  router.get('/gossip', validateApiKey, (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const gossip = socialSystem.getRecentGossip(limit);
      
      res.json({
        success: true,
        gossip,
      });
    } catch (error) {
      console.error('Error fetching gossip:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch gossip',
      });
    }
  });

  /**
   * POST /api/social/gossip
   * Create and spread gossip
   */
  router.post('/gossip', validateApiKey, (req, res) => {
    try {
      const { subject_agent_id, claim, truth_score } = req.body;
      const agentId = req.agentId;
      const currentTick = parseInt(getWorldState('tick') || '0');

      if (!subject_agent_id || !claim) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: subject_agent_id, claim',
        });
      }

      const truthScore = Math.max(0, Math.min(1, truth_score || 0.5));
      
      const result = socialSystem.createGossip(agentId!, subject_agent_id, claim, truthScore, currentTick);

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          gossip_id: result.gossipId,
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.message,
        });
      }
    } catch (error) {
      console.error('Error creating gossip:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create gossip',
      });
    }
  });

  return router;
}