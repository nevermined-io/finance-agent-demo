/**
 * Utility to initialize and export the Nevermined Payments instance.
 * @module utils/payments
 */

import { Payments, EnvironmentName } from '@nevermined-io/payments';

const nvmApiKey = process.env.NVM_API_KEY as string;
const environment = 'staging_testnet' as EnvironmentName;

/**
 * Singleton instance of Nevermined Payments
 */
export const payments = Payments.getInstance({
  nvmApiKey,
  environment,
}); 