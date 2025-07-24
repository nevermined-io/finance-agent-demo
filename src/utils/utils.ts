/**
 * @file dateUtils.ts
 * @description Utility functions for date manipulation and formatting.
 * @module utils/dateUtils
 */

/**
 * Returns the ISO string for the date N months ago from today.
 * @param {number} months - Number of months to subtract
 * @returns {string} ISO date string
 */
export function getDateMonthsAgo(months: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date.toISOString().split('T')[0];
}

/**
 * Formats a date as YYYY-MM-DD.
 * @param {Date} date - Date object
 * @returns {string} Formatted date string
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Returns a random bigint with the specified number of bits.
 * @param {number} bits - Number of bits for the random bigint
 * @returns {bigint} Random bigint
 */
export const getRandomBigInt = (bits = 128): bigint => {
  const bytes = Math.ceil(bits / 8);
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);

  let result = 0n;
  for (const byte of array) {
    result = (result << 8n) | BigInt(byte);
  }

  return result;
};
