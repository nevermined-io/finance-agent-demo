/**
 * @file alphavantage.ts
 * @description Functions to interact with the AlphaVantage API for stock market data.
 * @module api/alphavantage
 */

import axios from 'axios';

/**
 * Gets the AlphaVantage API key from environment variables.
 * @returns {string} AlphaVantage API key
 */
function getApiKey(): string {
  if (!process.env.ALPHAVANTAGE_API_KEY) {
    throw new Error('ALPHAVANTAGE_API_KEY is not set in environment variables');
  }
  return process.env.ALPHAVANTAGE_API_KEY;
}

/**
 * Fetches daily time series data for a given stock symbol.
 * @param {string} symbol - Stock symbol (e.g., 'AAPL')
 * @returns {Promise<any>} Promise resolving to time series data
 */
export async function getDailyTimeSeries(symbol: string): Promise<any> {
  const apiKey = getApiKey();
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${symbol}&outputsize=full&apikey=${apiKey}`;
  const response = await axios.get(url);
  return response.data;
}

/**
 * Fetches sector performance data from AlphaVantage.
 * @returns {Promise<any>} Promise resolving to sector performance data
 */
export async function getSectorPerformance(): Promise<any> {
  const apiKey = getApiKey();
  const url = `https://www.alphavantage.co/query?function=SECTOR&apikey=${apiKey}`;
  const response = await axios.get(url);
  return response.data;
}
