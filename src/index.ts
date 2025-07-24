/**
 * @file index.ts
 * @description Entry point for the Express server and agent initialization.
 * @module index
 */

import express, { Application, Request, Response } from 'express';
import agentRoutes from './routes/agentRoutes';

/**
 * Initializes and starts the Express server.
 */
const app: Application = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON requests
app.use(express.json());

// Register agent routes
app.use('/api/agent', agentRoutes);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// Start the server
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server is running on port ${PORT}`);
});
