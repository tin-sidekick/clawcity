// ============================================================
// ClawCity — Governance API
// RESTful endpoints for bulletin board, voting, and community projects
// ============================================================

import express from 'express';
import { validateApiKey } from './middleware.js';
import { getWorldState } from '../db/index.js';
import type { GovernanceSystem } from '../engine/governance.js';

export function createGovernanceRouter(governanceSystem: GovernanceSystem) {
  const router = express.Router();

  // ============================================================
  // BULLETIN BOARD ENDPOINTS
  // ============================================================

  /**
   * GET /api/governance/bulletin
   * List active proposals on the bulletin board
   */
  router.get('/bulletin', validateApiKey, (req, res) => {
    try {
      const proposals = governanceSystem.getActiveProposals();
      
      res.json({
        success: true,
        proposals,
      });
    } catch (error) {
      console.error('Error fetching bulletin board:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch bulletin board',
      });
    }
  });

  /**
   * POST /api/governance/bulletin
   * Create a new proposal
   */
  router.post('/bulletin', validateApiKey, (req, res) => {
    try {
      const { title, description, type, data } = req.body;
      const agentId = req.agentId;
      const currentTick = parseInt(getWorldState('tick') || '0');

      if (!title || !description) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: title, description',
        });
      }

      const proposalType = type || 'general';
      const result = governanceSystem.createProposal(agentId!, title, description, proposalType, currentTick, data);

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          proposal_id: result.proposalId,
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.message,
        });
      }
    } catch (error) {
      console.error('Error creating proposal:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create proposal',
      });
    }
  });

  /**
   * GET /api/governance/bulletin/:proposal_id
   * Get detailed proposal information with votes
   */
  router.get('/bulletin/:proposal_id', validateApiKey, (req, res) => {
    try {
      const { proposal_id } = req.params;
      const proposal = governanceSystem.getProposalDetails(proposal_id);
      
      if (!proposal) {
        return res.status(404).json({
          success: false,
          error: 'Proposal not found',
        });
      }

      res.json({
        success: true,
        proposal,
      });
    } catch (error) {
      console.error('Error fetching proposal details:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch proposal details',
      });
    }
  });

  /**
   * POST /api/governance/vote
   * Cast a vote on a proposal
   */
  router.post('/vote', validateApiKey, (req, res) => {
    try {
      const { proposal_id, vote } = req.body;
      const agentId = req.agentId;
      const currentTick = parseInt(getWorldState('tick') || '0');

      if (!proposal_id || !vote) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: proposal_id, vote',
        });
      }

      if (vote !== 'for' && vote !== 'against') {
        return res.status(400).json({
          success: false,
          error: 'Vote must be "for" or "against"',
        });
      }

      const result = governanceSystem.castVote(agentId!, proposal_id, vote, currentTick);

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
      console.error('Error casting vote:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cast vote',
      });
    }
  });

  // ============================================================
  // MAYOR ENDPOINTS
  // ============================================================

  /**
   * GET /api/governance/mayor
   * Get current mayor information
   */
  router.get('/mayor', validateApiKey, (req, res) => {
    try {
      const mayor = governanceSystem.getCurrentMayor();
      
      res.json({
        success: true,
        mayor,
      });
    } catch (error) {
      console.error('Error fetching mayor info:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch mayor information',
      });
    }
  });

  /**
   * POST /api/governance/mayor/set-tax-rate
   * Mayor action: Set property tax rate
   */
  router.post('/mayor/set-tax-rate', validateApiKey, (req, res) => {
    try {
      const { rate } = req.body;
      const agentId = req.agentId;

      if (typeof rate !== 'number') {
        return res.status(400).json({
          success: false,
          error: 'Tax rate must be a number',
        });
      }

      const result = governanceSystem.mayorSetTaxRate(agentId!, rate);

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
        });
      } else {
        res.status(403).json({
          success: false,
          error: result.message,
        });
      }
    } catch (error) {
      console.error('Error setting tax rate:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to set tax rate',
      });
    }
  });

  /**
   * POST /api/governance/mayor/name-landmark
   * Mayor action: Name a landmark
   */
  router.post('/mayor/name-landmark', validateApiKey, (req, res) => {
    try {
      const { x, y, name } = req.body;
      const agentId = req.agentId;

      if (typeof x !== 'number' || typeof y !== 'number' || !name) {
        return res.status(400).json({
          success: false,
          error: 'Missing or invalid fields: x, y, name',
        });
      }

      const result = governanceSystem.mayorNameLandmark(agentId!, x, y, name);

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
        });
      } else {
        res.status(403).json({
          success: false,
          error: result.message,
        });
      }
    } catch (error) {
      console.error('Error naming landmark:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to name landmark',
      });
    }
  });

  // ============================================================
  // COMMUNITY PROJECTS ENDPOINTS
  // ============================================================

  /**
   * GET /api/governance/projects
   * Get active community projects
   */
  router.get('/projects', validateApiKey, (req, res) => {
    try {
      const projects = governanceSystem.getActiveCommunityProjects();
      
      res.json({
        success: true,
        projects,
      });
    } catch (error) {
      console.error('Error fetching community projects:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch community projects',
      });
    }
  });

  /**
   * POST /api/governance/projects
   * Create a new community project
   */
  router.post('/projects', validateApiKey, (req, res) => {
    try {
      const { name, description, target_resources, reward_building_type, reward_x, reward_y } = req.body;
      const agentId = req.agentId;
      const currentTick = parseInt(getWorldState('tick') || '0');

      if (!name || !description || !target_resources || !reward_building_type || 
          typeof reward_x !== 'number' || typeof reward_y !== 'number') {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: name, description, target_resources, reward_building_type, reward_x, reward_y',
        });
      }

      const result = governanceSystem.createCommunityProject(
        agentId!, name, description, target_resources, 
        reward_building_type, reward_x, reward_y, currentTick
      );

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          project_id: result.projectId,
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.message,
        });
      }
    } catch (error) {
      console.error('Error creating community project:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create community project',
      });
    }
  });

  /**
   * GET /api/governance/projects/:project_id
   * Get detailed community project information
   */
  router.get('/projects/:project_id', validateApiKey, (req, res) => {
    try {
      const { project_id } = req.params;
      const project = governanceSystem.getCommunityProjectDetails(project_id);
      
      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Community project not found',
        });
      }

      res.json({
        success: true,
        project,
      });
    } catch (error) {
      console.error('Error fetching community project details:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch community project details',
      });
    }
  });

  /**
   * POST /api/governance/projects/:project_id/contribute
   * Contribute resources to a community project
   */
  router.post('/projects/:project_id/contribute', validateApiKey, (req, res) => {
    try {
      const { project_id } = req.params;
      const { resources } = req.body;
      const agentId = req.agentId;
      const currentTick = parseInt(getWorldState('tick') || '0');

      if (!resources || typeof resources !== 'object') {
        return res.status(400).json({
          success: false,
          error: 'Missing or invalid field: resources',
        });
      }

      const result = governanceSystem.contributeToProject(agentId!, project_id, resources, currentTick);

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          completed: result.completed || false,
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.message,
        });
      }
    } catch (error) {
      console.error('Error contributing to project:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to contribute to project',
      });
    }
  });

  return router;
}