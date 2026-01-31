import type { Request, Response, NextFunction } from 'express';
import { getAgentByApiKey } from '../db/index.js';
import type { Agent } from '../../shared/types.js';

// Extend Express Request to include agent
declare global {
  namespace Express {
    interface Request {
      agent?: Agent;
    }
  }
}

// --- Rate Limiting ---

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimits = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 10; // 10 requests per minute

function checkRateLimit(apiKey: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(apiKey);

  if (!entry || now > entry.resetAt) {
    rateLimits.set(apiKey, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  entry.count++;
  return entry.count <= RATE_LIMIT_MAX;
}

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimits) {
    if (now > entry.resetAt) {
      rateLimits.delete(key);
    }
  }
}, 5 * 60_000);

// --- Auth Middleware ---

export function authenticateAgent(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const apiKey = authHeader?.replace('Bearer ', '');

  if (!apiKey) {
    res.status(401).json({ error: 'Missing API key', code: 'AUTH_MISSING' });
    return;
  }

  // Rate limit check
  if (!checkRateLimit(apiKey)) {
    res.status(429).json({ error: 'Rate limit exceeded. Max 10 requests per minute.', code: 'RATE_LIMIT' });
    return;
  }

  const agent = getAgentByApiKey(apiKey);
  if (!agent) {
    res.status(401).json({ error: 'Invalid API key', code: 'AUTH_INVALID' });
    return;
  }

  if (req.params.id && agent.id !== req.params.id) {
    res.status(403).json({ error: 'Not your agent', code: 'AUTH_FORBIDDEN' });
    return;
  }

  req.agent = agent;
  next();
}
