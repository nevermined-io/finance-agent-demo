/**
 * Middleware to validate Nevermined access token and user credits.
 * @module middleware/auth
 */

import { Request, Response, NextFunction } from 'express';
import { payments } from '../utils/payments';

const agentId = process.env.AGENT_ID as string;
const nvmApiKey = process.env.NVM_API_KEY as string | undefined;

/**
 * Middleware to protect endpoints using Nevermined Payments.
 * If NVM_API_KEY is not set, skips access control.
 * @param req Express request
 * @param res Express response
 * @param next Next function
 */
export async function neverminedAuth(req: Request, res: Response, next: NextFunction) {
  if (!nvmApiKey) {
    // Skip access control if NVM_API_KEY is not set
    return next();
  }
  try {
    const bearerToken = req.headers.authorization?.split(' ')[1];
    if (!bearerToken) {
      return res.status(401).json({ error: 'Missing Bearer token' });
    }

    // Build absolute URL for Payments validation
    const protocol = req.protocol;
    const host = req.get('host');
    const urlRequested = `${protocol}://${host}${req.originalUrl}`;
    const httpMethodRequested = req.method;

    const validation = await payments.requests.startProcessingRequest(
      agentId,
      bearerToken,
      urlRequested,
      httpMethodRequested,
    );

    if (!validation?.balance?.isSubscriber) {
      return res.status(402).json({ error: 'Insufficient credits or invalid request.' });
    }

    // Attach validation info to request for later use (e.g., messageId)
    (req as any).neverminedValidation = validation;

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized or invalid request.' });
  }
}
