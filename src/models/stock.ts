/**
 * @file stock.ts
 * @description TypeScript types and interfaces for stock data.
 * @module models/stock
 */

/**
 * Represents basic stock information.
 */
export interface StockInfo {
  symbol: string;
  name: string;
  sector?: string;
  industry?: string;
}

/**
 * Represents a single entry in a stock's time series.
 */
export interface StockTimeSeriesEntry {
  date: string; // ISO date string
  open: number;
  high: number;
  low: number;
  close: number;
  adjustedClose?: number;
  volume: number;
}

/**
 * Represents the time series data for a stock.
 */
export interface StockTimeSeries {
  symbol: string;
  data: StockTimeSeriesEntry[];
}

/**
 * Represents sector performance data.
 */
export interface SectorPerformance {
  sector: string;
  performance: number; // e.g., percentage change
}
