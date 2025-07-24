/**
 * @file intent.ts
 * @description LLM-based intent detection and entity extraction for user queries.
 * @module llm/intent
 */

import { ChatOpenAI } from "@langchain/openai";

/**
 * Represents the result of intent detection.
 */
export interface IntentResult {
  intent: 'stock_analysis' | 'top_performers' | 'sector_recommendation' | 'company_news' | 'default';
  symbol: string | null;
  sector: string | null;
  company: string | null;
}

/**
 * Builds the prompt for intent detection.
 * @param {string} userQuestion - The user's question
 * @returns {string} The prompt for the LLM
 */
function buildIntentPrompt(userQuestion: string): string {
  return `You are an intent classifier for a financial assistant.\nGiven the user's question, classify it into one of the following intents:\n- stock_analysis (analyze a specific stock)\n- top_performers (ask for best performing stocks)\n- sector_recommendation (ask for recommendations in a sector)\n- company_news (ask for news about a company)\n- default (none of the above)\n\nAlso, extract any relevant entities (stock symbol, sector, company name).\n\nRespond in the following JSON format:\n{\n  "intent": "<intent>",\n  "symbol": "<symbol or null>",\n  "sector": "<sector or null>",\n  "company": "<company or null>"\n}\n\nUser question:\n"${userQuestion}"`;
}

/**
 * Uses the LLM to detect the intent and extract entities from a user query.
 * @param {string} userQuestion - The user's question
 * @returns {Promise<IntentResult>} The detected intent and entities
 */
export async function detectIntent(userQuestion: string): Promise<IntentResult> {
  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    temperature: 0,
    modelName: 'gpt-4o-mini',
  });
  const prompt = buildIntentPrompt(userQuestion);
  const response = await model.invoke(prompt);
  // Try to parse the JSON from the LLM response
  try {
    const match = response.content.toString().match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
  } catch (e) {
    // fallback
  }
  // Fallback: return default intent
  return {
    intent: 'default',
    symbol: null,
    sector: null,
    company: null,
  };
} 