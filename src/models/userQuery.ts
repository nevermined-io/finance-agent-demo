/**
 * @file userQuery.ts
 * @description TypeScript types and interfaces for user queries.
 * @module models/userQuery
 */

/**
 * Represents a user query to the agent.
 */
export interface UserQuery {
  query: string;
  userId?: string;
  timestamp?: string;
}

/**
 * Represents the agent's response to a user query.
 */
export interface AgentResponse {
  response: string;
  data?: any; // Optional: can include structured data (e.g., stock info, news)
}
