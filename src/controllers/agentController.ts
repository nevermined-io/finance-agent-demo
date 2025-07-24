/**
 * @file agentController.ts
 * @description Main controller for handling user queries and orchestrating API and LLM responses.
 * @module controllers/agentController
 */

import { Request, Response } from 'express';
import { createFinancialChain } from '../llm/chains';
import { buildPrompt, PromptType, PromptData } from '../llm/prompts';
import { getDailyTimeSeries, getSectorPerformance } from '../api/alphavantage';
import { detectIntent } from '../llm/intent';
import { payments } from '../utils/payments';
import { v4 as uuidv4 } from 'uuid';

/**
 * Handles user queries by invoking AlphaVantage/news APIs if needed and passing context to the LLM.
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function handleUserQuery(req: Request, res: Response): Promise<void> {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string' || query.trim() === '') {
      res.status(400).json({ error: 'Missing query in request body.' });
      return;
    }

    // Detect intent and entities using LLM
    const intentResult = await detectIntent(query);
    let promptType: PromptType = intentResult.intent;
    const promptData: PromptData = { userQuestion: query };

    switch (intentResult.intent) {
      case 'stock_analysis': {
        if (intentResult.symbol) {
          const stockDataRaw = await getDailyTimeSeries(intentResult.symbol);
          const timeSeries = stockDataRaw['Time Series (Daily)'] || {};
          const lastSixMonths = Object.entries(timeSeries)
            .slice(0, 130)
            .map(([date, values]: [string, any]) => `${date}: close=${values['4. close']}`)
            .join('\n');
          promptData.stockData = lastSixMonths || 'No data available.';
        }
        break;
      }
      case 'top_performers': {
        // Mock: In real code, fetch and calculate top performers
        promptData.topPerformersData = [
          'AAPL: +5.2%',
          'MSFT: +4.8%',
          'GOOGL: +4.5%',
          'AMZN: +4.2%',
          'NVDA: +3.9%',
        ].join('\n');
        break;
      }
      case 'sector_recommendation': {
        // Real: Fetch sector performance from AlphaVantage
        const sectorPerfRaw = await getSectorPerformance();
        // AlphaVantage returns keys like 'Rank A: Real-Time Performance', 'Rank B: 1 Day Performance', ...
        // We'll use 'Rank D: 1 Week Performance' for weekly performance
        const weekPerf = sectorPerfRaw['Rank D: 1 Week Performance'] || {};
        let sectorDataStr = '';
        if (intentResult.sector) {
          // Try to find the sector (case-insensitive)
          const found = Object.entries(weekPerf).find(([sector]) =>
            sector.toLowerCase().includes(String(intentResult.sector).toLowerCase()),
          );
          if (found) {
            sectorDataStr = `${found[0]}: ${String(found[1])}`;
          } else {
            sectorDataStr = 'No data available for the requested sector.';
          }
        } else {
          // Show top 3 sectors by performance
          const sorted = Object.entries(weekPerf)
            .sort((a, b) => parseFloat(String(b[1])) - parseFloat(String(a[1])))
            .slice(0, 3);
          sectorDataStr = sorted.map(([sector, perf]) => `${sector}: ${String(perf)}`).join('\n');
        }
        promptData.sectorData = sectorDataStr || 'No data available.';
        break;
      }
      case 'company_news': {
        if (intentResult.company) {
          // Mock: In real code, fetch news headlines
          promptData.newsData = [
            `"${intentResult.company}" launches new product line`,
            `Analysts discuss ${intentResult.company}'s quarterly results`,
            `Market reacts to ${intentResult.company} CEO's recent statements`,
          ].join('\n');
        }
        break;
      }
      default:
        // No extra data needed
        break;
    }

    // Build the prompt
    const prompt = buildPrompt(promptType, promptData);
    const chain = createFinancialChain();
    const result = await chain.invoke({ input: prompt });

    // Redeem credits only if NVM_API_KEY is set
    const nvmApiKey = process.env.NVM_API_KEY as string | undefined;
    if (nvmApiKey) {
      try {
        // Only redeem if validation info is present (middleware ran)
        const bearerToken = req.headers.authorization?.split(' ')[1];
        if (!bearerToken) {
          throw new Error('Bearer token not found');
        }
        const requestId = (req as any).neverminedValidation?.agentRequestId;
        const creditsToBurn = 1n; // Or dynamic calculation
        await payments.requests.redeemCreditsFromRequest(requestId, bearerToken, creditsToBurn);
      } catch (err) {
        // Log error but do not block response
        // eslint-disable-next-line no-console
        console.error('Error redeeming credits:', err);
      }
    }

    res.status(200).json({ response: result.response || result.text });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error handling user query:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
}
