/**
 * @file agentController.test.ts
 * @description Unit and integration tests for the agent controller.
 * @module tests/agentController.test
 */

import dotenv from 'dotenv';
dotenv.config();

import request from 'supertest';
import express, { Application } from 'express';
import agentRoutes from '../src/routes/agentRoutes';

// Mock Nevermined authentication middleware
jest.mock('../src/middleware/auth', () => ({
  neverminedAuth: (req: any, res: any, next: any) => {
    // Simulate valid token and credits
    if (req.headers.authorization === 'Bearer valid-token') {
      req.neverminedValidation = { messageId: 'mock-message-id' };
      return next();
    }
    if (!req.headers.authorization) {
      return res.status(401).json({ error: 'Missing Bearer token' });
    }
    return res.status(402).json({ error: 'Insufficient credits or invalid request.' });
  }
}));

// LangChain chain mock
const mockCall = jest.fn(async (args) => {
  const prompt = args?.prompt || args?.input;
  if (prompt && prompt.includes('fail')) throw new Error('LLM error');
  if (prompt && prompt.includes('text_only')) return { text: 'Alternative text response' };
  return { response: `Mocked response for: ${prompt}` };
});

jest.mock('../src/llm/chains', () => {
  return {
    createFinancialChain: jest.fn(() => ({
      invoke: mockCall,
    })),
  };
});

/**
 * Sets up a test Express app with the agent routes.
 * @returns {Application} Express app instance
 */
function createTestApp(): Application {
  const app = express();
  app.use(express.json());
  app.use('/api/agent', agentRoutes);
  return app;
}

describe('POST /api/agent/query', () => {
  beforeEach(() => {
    mockCall.mockClear();
  });

  it('should return 401 if Authorization header is missing', async () => {
    const app = createTestApp();
    const res = await request(app)
      .post('/api/agent/query')
      .send({ query: 'What is the stock price of AAPL?' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Missing Bearer token');
  });

  it('should return 402 if token is invalid or insufficient credits', async () => {
    const app = createTestApp();
    const res = await request(app)
      .post('/api/agent/query')
      .set('Authorization', 'Bearer invalid-token')
      .send({ query: 'What is the stock price of AAPL?' });
    expect(res.status).toBe(402);
    expect(res.body.error).toBe('Insufficient credits or invalid request.');
  });

  it('should return 400 if query is missing', async () => {
    const app = createTestApp();
    const res = await request(app)
      .post('/api/agent/query')
      .set('Authorization', 'Bearer valid-token')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Missing query in request body.');
  });

  it('should return 200 and a mocked response for a valid query', async () => {
    const app = createTestApp();
    const res = await request(app)
      .post('/api/agent/query')
      .set('Authorization', 'Bearer valid-token')
      .send({ query: 'What is the stock price of AAPL?' });
    expect(res.status).toBe(200);
    expect(res.body.response).toContain('Mocked response for:');
    expect(res.body.response).toContain('What is the stock price of AAPL?');
  });

  it('should handle LLM errors gracefully', async () => {
    const app = createTestApp();
    const res = await request(app)
      .post('/api/agent/query')
      .set('Authorization', 'Bearer valid-token')
      .send({ query: 'fail' });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal server error.');
  });

  it('should return 400 if query is an empty string', async () => {
    const app = createTestApp();
    const res = await request(app)
      .post('/api/agent/query')
      .set('Authorization', 'Bearer valid-token')
      .send({ query: '' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Missing query in request body.');
  });

  it('should return 400 if query is only whitespace', async () => {
    const app = createTestApp();
    const res = await request(app)
      .post('/api/agent/query')
      .set('Authorization', 'Bearer valid-token')
      .send({ query: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Missing query in request body.');
  });

  it('should return 200 for a query with special characters', async () => {
    const app = createTestApp();
    const specialQuery = '!@#$%^&*()_+-=[]{}|;:",.<>/?';
    const res = await request(app)
      .post('/api/agent/query')
      .set('Authorization', 'Bearer valid-token')
      .send({ query: specialQuery });
    expect(res.status).toBe(200);
    expect(res.body.response).toContain('Mocked response for:');
    expect(res.body.response).toContain(specialQuery);
  });

  it('should return 200 for a very long query', async () => {
    const app = createTestApp();
    const longQuery = 'A'.repeat(1200);
    const res = await request(app)
      .post('/api/agent/query')
      .set('Authorization', 'Bearer valid-token')
      .send({ query: longQuery });
    expect(res.status).toBe(200);
    expect(res.body.response).toContain('Mocked response for:');
    expect(res.body.response).toContain(longQuery);
  });

  it('should return the text field if response is missing but text is present', async () => {
    const app = createTestApp();
    const res = await request(app)
      .post('/api/agent/query')
      .set('Authorization', 'Bearer valid-token')
      .send({ query: 'text_only' });
    expect(res.status).toBe(200);
    expect(res.body.response).toBe('Alternative text response');
  });
});
