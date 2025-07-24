/**
 * @file chains.ts
 * @description LangChain chains and logic for LLM-based reasoning and response generation.
 * @module llm/chains
 */

import { ChatOpenAI } from "@langchain/openai";
import { ConversationChain } from 'langchain/chains';
import { PromptTemplate } from "@langchain/core/prompts";

/**
 * Gets the OpenAI API key from environment variables.
 * @returns {string} OpenAI API key
 */
function getOpenAIApiKey(): string {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in environment variables');
  }
  return process.env.OPENAI_API_KEY;
}

/**
 * Creates a LangChain ConversationChain for financial queries.
 * @returns {ConversationChain} Configured conversation chain
 */
export function createFinancialChain(): ConversationChain {
  const model = new ChatOpenAI({
    openAIApiKey: getOpenAIApiKey(),
    temperature: 0.2,
    modelName: 'gpt-4o-mini',
  });

  const prompt = new PromptTemplate({
    template: `You are a financial assistant. Answer the user's question in a clear and concise way, using financial reasoning and, if possible, recent data.\n\nUser: {input}\nAssistant:`,
    inputVariables: ['input'],
  });

  return new ConversationChain({
    llm: model,
    prompt,
  });
}
