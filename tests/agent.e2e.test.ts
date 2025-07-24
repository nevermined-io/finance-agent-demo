/**
 * @file agentController.e2e.test.ts
 * @description End-to-end tests for the agent controller using real APIs (OpenAI, AlphaVantage).
 * @module tests/agentController.e2e.test
 */

import dotenv from 'dotenv';
dotenv.config();

import request from 'supertest';
import express, { Application } from 'express';
import agentRoutes from '../src/routes/agentRoutes';
import { Payments, EnvironmentName } from '@nevermined-io/payments';
import http from 'http';

function createTestApp(): Application {
  const app = express();
  app.use(express.json());
  app.use('/api/agent', agentRoutes);
  return app;
}

const subscriberApiKey = process.env.NVM_API_KEY_SUBSCRIBER as string;
const agentId = process.env.AGENT_ID as string;
const planId = process.env.PLAN_ID as string;
const environment = 'staging_testnet' as EnvironmentName;

let paymentsSubscriber: Payments;
let validAccessToken: string;

/**
 * Express server instance for E2E tests.
 * @type {http.Server}
 */
let server: http.Server;

/**
 * Base URL for Supertest requests (must match the absolute URL registered in Payments).
 * @type {string}
 */
const baseUrl = 'http://localhost:3001';

beforeAll(async () => {
  const app = createTestApp();
  await new Promise<void>((resolve) => {
    server = app.listen(3001, () => resolve());
  });

  paymentsSubscriber = Payments.getInstance({ nvmApiKey: subscriberApiKey, environment });
});

beforeEach(async () => {
  // 1. Check plan balance
  const balanceResult = await paymentsSubscriber.plans.getPlanBalance(planId);
  if (balanceResult.balance === BigInt(0) || balanceResult.isSubscriber === false) {
    // 2. Order the plan if needed
    await paymentsSubscriber.plans.orderPlan(planId);
  }
  // Get access token before each request
  const accessParams = await paymentsSubscriber.agents.getAgentAccessToken(planId, agentId);
  validAccessToken = accessParams.accessToken;
});

afterAll((done) => {
  server.close(done);
});

describe('AgentController E2E (real APIs)', () => {
  jest.setTimeout(30000); // LLMs and APIs can be slow

  it('should return 401 if Authorization header is missing', async () => {
    const res = await request(baseUrl).post('/api/agent/query').send({
      query:
        'Analyze the behavior of AAPL in the last 6 months and tell me if it is a good time to buy.',
    });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Missing Bearer token');
  });

  it('should return 401 if token is invalid or insufficient credits', async () => {
    const res = await request(baseUrl)
      .post('/api/agent/query')
      .set('Authorization', 'Bearer invalid-token')
      .send({
        query:
          'Analyze the behavior of AAPL in the last 6 months and tell me if it is a good time to buy.',
      });
    expect([401, 402]).toContain(res.status);
    expect(res.body.error).toBe('Unauthorized or invalid request.');
  });

  it('should analyze a stock (AAPL) and mention AAPL in the response', async () => {
    const res = await request(baseUrl)
      .post('/api/agent/query')
      .set('Authorization', `Bearer ${validAccessToken}`)
      .send({
        query:
          'Analyze the behavior of AAPL in the last 6 months and tell me if it is a good time to buy.',
      });
    expect(res.status).toBe(200);
    expect(res.body.response).toMatch(/AAPL/i);
    expect(res.body.response).toMatch(/buy|hold|sell|recommend/i);
  });

  it('should return top performers and mention at least one known stock', async () => {
    const res = await request(baseUrl)
      .post('/api/agent/query')
      .set('Authorization', `Bearer ${validAccessToken}`)
      .send({ query: 'Show me the 5 best performing stocks this week.' });
    expect(res.status).toBe(200);
    expect(res.body.response).toMatch(/AAPL|MSFT|GOOGL|AMZN|NVDA/i);
    expect(res.body.response).toMatch(/top|best|perform/i);
  });

  it('should recommend low risk stocks in the technology sector', async () => {
    const res = await request(baseUrl)
      .post('/api/agent/query')
      .set('Authorization', `Bearer ${validAccessToken}`)
      .send({ query: 'Recommend me 3 low risk stocks in the technology sector.' });
    expect(res.status).toBe(200);
    expect(res.body.response).toMatch(/AAPL|MSFT|ADBE|technology|sector/i);
    expect(res.body.response).toMatch(/risk|recommend/i);
  });

  it('should summarize news about Microsoft', async () => {
    const res = await request(baseUrl)
      .post('/api/agent/query')
      .set('Authorization', `Bearer ${validAccessToken}`)
      .send({ query: 'news about Microsoft' });
    expect(res.status).toBe(200);
    expect(res.body.response).toMatch(/Microsoft/i);
    expect(res.body.response).toMatch(/news|headline|result|product|CEO|analyst/i);
  });

  it('should handle a generic query and return a response', async () => {
    const res = await request(baseUrl)
      .post('/api/agent/query')
      .set('Authorization', `Bearer ${validAccessToken}`)
      .send({ query: 'Tell me a joke.' });
    expect(res.status).toBe(200);
    expect(typeof res.body.response).toBe('string');
    expect(res.body.response.length).toBeGreaterThan(10);
  });
});
