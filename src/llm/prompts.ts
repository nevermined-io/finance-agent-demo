/**
 * @file prompts.ts
 * @description Prompt templates for LangChain LLM chains.
 * @module llm/prompts
 */

/**
 * Types of supported prompt scenarios.
 */
export type PromptType =
  | 'stock_analysis'
  | 'top_performers'
  | 'sector_recommendation'
  | 'company_news'
  | 'default';

/**
 * Data required for each prompt type.
 */
export interface PromptData {
  stockData?: string;
  topPerformersData?: string;
  sectorData?: string;
  newsData?: string;
  userQuestion: string;
}

/**
 * Builds a prompt for the LLM based on the type and available data.
 * @param {PromptType} type - The type of prompt to build
 * @param {PromptData} data - The data to include in the prompt
 * @returns {string} The constructed prompt
 */
export function buildPrompt(type: PromptType, data: PromptData): string {
  switch (type) {
    case 'stock_analysis':
      return `You are a financial advisor. Analyze the following stock data and answer the user's question.\n\nStock data:\n${data.stockData || 'No data available.'}\n\nUser question:\n"${data.userQuestion}"\n\nYour answer (be concise, use the data, and provide a recommendation if possible):`;
    case 'top_performers':
      return `You are a financial advisor. Here is the top performers data for various stocks this week:\n${data.topPerformersData || 'No data available.'}\n\nUser question:\n"${data.userQuestion}"\n\nYour answer (list the top performers and briefly explain why they performed well):`;
    case 'sector_recommendation':
      return `You are a financial advisor. Here is the risk and performance data for technology sector stocks:\n${data.sectorData || 'No data available.'}\n\nUser question:\n"${data.userQuestion}"\n\nYour answer (list the stocks and justify your choices based on the data):`;
    case 'company_news':
      return `You are a financial advisor. Here are the latest news headlines about the company:\n${data.newsData || 'No news available.'}\n\nUser question:\n"${data.userQuestion}"\n\nYour answer (summarize the news and mention any relevant trends or events):`;
    default:
      return `You are a financial advisor. Answer the user's question as best as you can.\n\nUser question:\n"${data.userQuestion}"\n\nYour answer:`;
  }
}
