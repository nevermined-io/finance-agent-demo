/**
 * @file agentRoutes.ts
 * @description Express routes for handling agent-related HTTP requests.
 * @module routes/agentRoutes
 */

import { Router } from 'express';
import { handleUserQuery } from '../controllers/agentController';
import { neverminedAuth } from '../middleware/auth';

/**
 * Express router for agent-related endpoints.
 * @type {Router}
 */
const router = Router();

/**
 * POST /api/agent/query
 * Handles user queries for the financial agent.
 * Protected by Nevermined authentication middleware.
 */
router.post('/query', neverminedAuth, handleUserQuery);

export default router;
