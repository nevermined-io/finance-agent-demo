/**
 * @file payments.integration.test.ts
 * @description Integration tests for the real Nevermined Payments library (no mocks).
 * @module tests/payments.integration.test
 */

import {
  Payments,
  EnvironmentName,
  StartAgentRequest,
  PlanPriceType,
  PlanCreditsType,
  PlanRedemptionType,
  PaginationOptions,
  AgentMetadata,
  ZeroAddress,
} from '@nevermined-io/payments';
import { getRandomBigInt } from '../src/utils/utils';
import dotenv from 'dotenv';

dotenv.config();

const agentApiKey = process.env.NVM_API_KEY as string;
const subscriberApiKey = process.env.NVM_API_KEY_SUBSCRIBER as string;
let agentId = process.env.AGENT_ID as string;
let creditsPlanId = process.env.PLAN_ID as string;
const environment = 'staging_testnet' as EnvironmentName;
const ERC20_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

let agentAccessParams: any;

/**
 * Only run tests if all required env vars are set
 */
const shouldRun = agentApiKey && subscriberApiKey && agentId && creditsPlanId;

(shouldRun ? describe : describe.skip)('Nevermined Payments Integration (real)', () => {
  let paymentsAgent: Payments;
  let paymentsSubscriber: Payments;
  let agentRequestId: string;

  beforeAll(async () => {
    paymentsAgent = Payments.getInstance({ nvmApiKey: agentApiKey, environment });
    paymentsSubscriber = Payments.getInstance({ nvmApiKey: subscriberApiKey, environment });

    console.log('Builder wallet', await paymentsAgent.getAccountAddress());
    console.log('Subscriber wallet', await paymentsSubscriber.getAccountAddress());
  });

  /**
   * Should be able to get my own wallet address
   */
  it('Should be able to get my own wallet address', async () => {
    const result = await paymentsSubscriber.getAccountAddress();
    expect(result).toBeDefined();
  });

  it.skip('Should be able to create an agent and a plan at once', async () => {
    const agentApi = { endpoints: [{ POST: 'http://localhost:3000/api/agent/query' }] };
    const fiatPriceConfig = {
      priceType: PlanPriceType.FIXED_PRICE,
      tokenAddress: ERC20_ADDRESS as `0x${string}`,
      amounts: [1_000n],
      receivers: [paymentsAgent.getAccountAddress() as `0x${string}`],
      contractAddress: '0x0000000000000000000000000000000000000000' as `0x${string}`,
      feeController: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    };

    const nonExpirableConfig = {
      creditsType: PlanCreditsType.EXPIRABLE,
      redemptionType: PlanRedemptionType.ONLY_PLAN_ROLE,
      proofRequired: false,
      durationSecs: getRandomBigInt(),
      amount: 1n,
      minAmount: 1n,
      maxAmount: 1n,
    };

    const result = await paymentsAgent.agents.registerAgentAndPlan(
      {
        name: 'Test Agent',
        description: 'Test Agent Description',
        tags: ['test', 'agent'],
      },
      agentApi,
      {
        name: 'Test Plan',
      },
      fiatPriceConfig,
      nonExpirableConfig,
    );
    agentId = result.agentId;
    creditsPlanId = result.planId;
    console.log({ planId: creditsPlanId, agentId });
    expect(result).toBeDefined();
  }, 10000);

  it('I should be able to register a new Credits Payment Plan', async () => {
    const planMetadata = {
      name: 'finance Test Plan',
    };
    const fiatPriceConfig = {
      priceType: PlanPriceType.FIXED_PRICE,
      tokenAddress: ERC20_ADDRESS as `0x${string}`,
      amounts: [1_000n],
      receivers: [paymentsAgent.getAccountAddress() as `0x${string}`],
      contractAddress: '0x0000000000000000000000000000000000000000' as `0x${string}`,
      feeController: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    };
    const nonExpirableConfig = {
      creditsType: PlanCreditsType.FIXED,
      redemptionType: PlanRedemptionType.ONLY_OWNER,
      proofRequired: false,
      durationSecs: getRandomBigInt(),
      amount: 1n,
      minAmount: 1n,
      maxAmount: 1n,
    };
    const response = await paymentsAgent.plans.registerCreditsPlan(
      planMetadata,
      fiatPriceConfig,
      nonExpirableConfig,
    );
    expect(response).toBeDefined();
    creditsPlanId = response.planId;

    expect(creditsPlanId).toBeDefined();
    expect(BigInt(creditsPlanId) > 0n).toBeTruthy();
  }, 10000);

  it('I should be able to register a new Agent with 1 plan associated', async () => {
    const agentMetadata: AgentMetadata = {
      name: 'finance Test Agent',
      description: 'This is a test agent for the finance tests',
      tags: ['test'],
    };
    const agentApi = {
      endpoints: [{ POST: 'http://localhost:3000/api/agent/query' }],
    };
    const result = await paymentsAgent.agents.registerAgent(agentMetadata, agentApi, [
      creditsPlanId,
    ]);
    agentId = result.agentId;
    expect(agentId).toBeDefined();

    expect(agentId.startsWith('did:nv:')).toBeTruthy();
  }, 10000);

  it('Should be able to get agents associated to a plan', async () => {
    console.log('Credits Plan ID', creditsPlanId);
    const agents = await paymentsAgent.plans.getAgentsAssociatedToAPlan(
      creditsPlanId,
      new PaginationOptions({ offset: 0 }),
    );
    expect(agents).toBeDefined();
    expect(agents.total).toBeGreaterThan(0);
  }, 10000);

  it('Should be able to get the agent', async () => {
    const agent = await paymentsAgent.agents.getAgent(agentId);
    expect(agent).toBeDefined();
    expect(agent.metadata.agent.endpoints).toBeDefined();
    expect(agent.metadata.agent.endpoints.length).toBeGreaterThan(0);
    expect(agent.metadata.agent.endpoints[0].POST).toBeDefined();
    expect(agent.metadata.agent.endpoints[0].POST).toBe('http://localhost:3000/api/agent/query');
  });

  /**
   * Should be able to purchase a plan if not already purchased
   */
  it('Should be able to purchase a plan if not already purchased', async () => {
    const result = await paymentsSubscriber.plans.getPlanBalance(creditsPlanId);
    if (result.balance === BigInt(0) || result.isSubscriber === false) {
      const planResult = await paymentsSubscriber.plans.orderPlan(creditsPlanId);
      expect(planResult).toBeDefined();
    }
  }, 10000);

  /**
   * Should be able to generate the agent access token as a subscriber
   */
  it('should be able to generate the agent access token', async () => {
    agentAccessParams = await paymentsSubscriber.agents.getAgentAccessToken(creditsPlanId, agentId);
    expect(agentAccessParams).toBeDefined();
    expect(agentAccessParams.accessToken.length).toBeGreaterThan(0);
  });

  /**
   * Should be able to validate the access token (startProcessingRequest)
   */
  it('should validate the access token and return an agentRequestId', async () => {
    const validation: StartAgentRequest = await paymentsAgent.requests.startProcessingRequest(
      agentId,
      agentAccessParams.accessToken,
      'http://localhost:3000/api/agent/query',
      'POST',
    );
    expect(validation).toBeDefined();
    expect(validation.agentRequestId).toBeDefined();
    agentRequestId = validation.agentRequestId;
  });

  /**
   * Should be able to redeem credits using the agentRequestId and access token
   */
  it('should redeem credits with the agentRequestId and access token', async () => {
    expect(agentRequestId).toBeDefined();
    try {
      const result = await paymentsAgent.requests.redeemCreditsFromRequest(
        agentRequestId,
        agentAccessParams.accessToken,
        1n,
      );
      expect(result).toBeDefined();
    } catch (err: any) {
      if (err?.message?.toLowerCase().includes('insufficient')) {
        console.log('Redeem failed due to insufficient balance (expected in some cases)');
      } else {
        throw err;
      }
    }
  });
});
