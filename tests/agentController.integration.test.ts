/**
 * @file agentController.integration.test.ts
 * @description Integration tests for the agent controller with AlphaVantage and LLM mocks.
 * @module tests/agentController.integration.test
 */

import dotenv from 'dotenv';
dotenv.config();

import request from 'supertest';
import express, { Application } from 'express';
import agentRoutes from '../src/routes/agentRoutes';
import type { IntentResult } from '../src/llm/intent';

// Mock Nevermined authentication middleware (integration only)
jest.mock('../src/middleware/auth', () => ({
  neverminedAuth: (req: any, res: any, next: any) => {
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

// Mock AlphaVantage, LLM chain, and intent detection
const mockGetDailyTimeSeries = jest.fn();
const mockGetSectorPerformance = jest.fn();
const mockCall = jest.fn(async (args) => {
  const prompt = args?.prompt || args?.input;
  return { response: `Mocked response for: ${prompt}` };
});
// Fix: update mockDetectIntent to always return the correct type
const mockDetectIntent = jest.fn<Promise<import('../src/llm/intent').IntentResult>, any[]>();

jest.mock('../src/api/alphavantage', () => ({
  getDailyTimeSeries: (...args: any[]) => mockGetDailyTimeSeries(...args),
  getSectorPerformance: (...args: any[]) => mockGetSectorPerformance(...args),
}));
jest.mock('../src/llm/chains', () => ({
  createFinancialChain: () => ({
    invoke: mockCall,
  }),
}));
jest.mock('../src/llm/intent', () => ({
  detectIntent: (...args: any[]) => mockDetectIntent(...args),
}));

function createTestApp(): Application {
  const app = express();
  app.use(express.json());
  app.use('/api/agent', agentRoutes);
  return app;
}

describe('AgentController Integration with AlphaVantage and LLM (intent via LLM)', () => {
  beforeEach(() => {
    mockGetDailyTimeSeries.mockReset();
    mockGetSectorPerformance.mockReset();
    mockCall.mockClear();
    mockDetectIntent.mockReset();
  });

  it('should return 401 if Authorization header is missing', async () => {
    mockDetectIntent.mockResolvedValue({ intent: 'default', symbol: null, sector: null, company: null });
    const app = createTestApp();
    const res = await request(app)
      .post('/api/agent/query')
      .send({ query: 'Analyze the behavior of AAPL in the last 6 months.' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Missing Bearer token');
  });

  it('should return 402 if token is invalid or insufficient credits', async () => {
    mockDetectIntent.mockResolvedValue({ intent: 'default', symbol: null, sector: null, company: null });
    const app = createTestApp();
    const res = await request(app)
      .post('/api/agent/query')
      .set('Authorization', 'Bearer invalid-token')
      .send({ query: 'Analyze the behavior of AAPL in the last 6 months.' });
    expect(res.status).toBe(402);
    expect(res.body.error).toBe('Insufficient credits or invalid request.');
  });

  it('should include AlphaVantage data in the prompt for a valid stock symbol', async () => {
    mockDetectIntent.mockResolvedValue({ intent: 'stock_analysis', symbol: 'AAPL', sector: null, company: null });
    mockGetDailyTimeSeries.mockResolvedValue({
      'Time Series (Daily)': {
        '2024-07-22': { '4. close': '200.00' },
        '2024-07-21': { '4. close': '198.00' },
        '2024-07-20': { '4. close': '197.00' },
      },
    });
    const app = createTestApp();
    const res = await request(app)
      .post('/api/agent/query')
      .set('Authorization', 'Bearer valid-token')
      .send({ query: 'Analyze the behavior of AAPL in the last 6 months.' });
    expect(res.status).toBe(200);
    expect(mockGetDailyTimeSeries).toHaveBeenCalledWith('AAPL');
    expect(mockCall).toHaveBeenCalled();
    expect(res.body.response).toContain('2024-07-22: close=200.00');
    expect(res.body.response).toContain('Mocked response for:');
  });

  it('should handle AlphaVantage returning no data', async () => {
    mockDetectIntent.mockResolvedValue({ intent: 'stock_analysis', symbol: 'MSFT', sector: null, company: null });
    mockGetDailyTimeSeries.mockResolvedValue({});
    const app = createTestApp();
    const res = await request(app)
      .post('/api/agent/query')
      .set('Authorization', 'Bearer valid-token')
      .send({ query: 'Analyze the behavior of MSFT in the last 6 months.' });
    expect(res.status).toBe(200);
    expect(mockGetDailyTimeSeries).toHaveBeenCalledWith('MSFT');
    expect(mockCall).toHaveBeenCalled();
    expect(res.body.response).toContain('No data available.');
  });

  it('should include top performers data in the prompt for a top performers query', async () => {
    mockDetectIntent.mockResolvedValue({ intent: 'top_performers', symbol: null, sector: null, company: null });
    const app = createTestApp();
    const res = await request(app)
      .post('/api/agent/query')
      .set('Authorization', 'Bearer valid-token')
      .send({ query: 'Show me the 5 best performing stocks this week.' });
    expect(res.status).toBe(200);
    expect(res.body.response).toContain('AAPL: +5.2%');
    expect(res.body.response).toContain('MSFT: +4.8%');
    expect(res.body.response).toContain('GOOGL: +4.5%');
    expect(res.body.response).toContain('top performers');
  });

  it('should include sector data in the prompt for a sector recommendation query', async () => {
    mockDetectIntent.mockResolvedValue({ intent: 'sector_recommendation', symbol: null, sector: null, company: null });
    mockGetSectorPerformance.mockResolvedValue({
      'Rank D: 1 Week Performance': {
        'Technology': '12.00',
        'Healthcare': '10.00',
        'Finance': '8.00',
      }
    });
    const app = createTestApp();
    const res = await request(app)
      .post('/api/agent/query')
      .set('Authorization', 'Bearer valid-token')
      .send({ query: 'Recommend me 3 low risk stocks in the technology sector.' });
    expect(res.status).toBe(200);
    expect(res.body.response).toContain('Technology: 12.00');
  });

  it('should include news data in the prompt for a company news query', async () => {
    mockDetectIntent.mockResolvedValue({ intent: 'company_news', symbol: null, sector: null, company: 'Microsoft' });
    const app = createTestApp();
    const res = await request(app)
      .post('/api/agent/query')
      .set('Authorization', 'Bearer valid-token')
      .send({ query: 'news about Microsoft' });
    expect(res.status).toBe(200);
    expect(res.body.response).toContain('Microsoft');
    expect(res.body.response).toContain('launches new product line');
    expect(res.body.response).toContain('news headlines');
  });

  it('should use default intent if nothing matches', async () => {
    mockDetectIntent.mockResolvedValue({ intent: 'default', symbol: null, sector: null, company: null });
    const app = createTestApp();
    const res = await request(app)
      .post('/api/agent/query')
      .set('Authorization', 'Bearer valid-token')
      .send({ query: 'Tell me a joke.' });
    expect(res.status).toBe(200);
    expect(res.body.response).toContain('Mocked response for:');
    expect(res.body.response).toContain('Tell me a joke.');
  });
}); 