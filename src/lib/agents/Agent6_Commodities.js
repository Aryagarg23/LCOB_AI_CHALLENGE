import { generateObject } from 'ai';
import { getAgentModel } from '@/lib/ai-provider';
import { webSearchTool } from '@/lib/tools';
import { z } from 'zod';

export async function agent6_Commodities(productType, businessType, businessAgeMonths = undefined, userAnswer = null) {
  console.log(`[Commodities] Tracking supply chain costs for ${businessType || productType}...`);

  try {
    const isPreLaunch = businessAgeMonths !== undefined && Number(businessAgeMonths) <= 0;
    const { object } = await generateObject({
      model: getAgentModel('gpt-4.1-nano'),
      tools: { webSearch: webSearchTool },
      maxSteps: 4,
      schema: z.object({
        name: z.string(),
        marginalCostFloor: z.number().describe('Estimated per-unit Marginal Cost (USD) to produce/deliver the primary product'),
        costBreakdown: z.array(z.object({
          component: z.string(),
          cost: z.number(),
          note: z.string(),
        })).describe('Itemized cost components with real numbers'),
        trend: z.string().describe('Current commodity/supply cost trend'),
        impact: z.string().describe('How this sets the absolute minimum viable price'),
        reasoning: z.string().describe('Detailed per-unit cost derivation citing specific prices found via search'),
        sources: z.array(z.string()).describe('URLs from commodity trackers, USDA, suppliers, industry sites'),
        clarificationQuestion: z.string().nullable().describe(isPreLaunch ? 'If raw material types are unknown, ask what specific materials they PLAN to use for this new business. Otherwise null.' : 'If raw material costs are unknown for this product, ask. Otherwise null.'),
      }),
      prompt: `You are a supply chain cost analyst. Estimate the REAL per-unit Marginal Cost to produce "${productType}" for a ${businessType || 'retail'} business.

CRITICAL ACCURACY RULES:
1. Search for ACTUAL wholesale/commodity prices — NOT retail prices. For agriculture, search USDA crop budgets, extension service data, or commodity market prices.
2. For cotton: raw cotton lint trades at ~$0.60-0.85/lb on commodity markets. Cotton farming costs are typically $300-600/acre. Do NOT confuse retail fabric prices with raw commodity prices.
3. For food businesses: search for wholesale ingredient costs, NOT menu prices.
4. For manufacturing: search for raw material costs, NOT finished product prices.
5. Break down ALL major cost components: raw materials, labor, energy, transport, packaging.
6. If you can't find exact prices, state that clearly in your reasoning rather than making up numbers.

Search at least twice:
1. "wholesale cost ${productType} 2024" or "USDA ${productType} production costs" or "${productType} commodity price"
2. "${businessType} cost per unit" or "${productType} manufacturing costs"

Business Type: "${businessType}", Product: "${productType}"
${isPreLaunch ? 'Context: THIS IS A PRE-LAUNCH / NEW BUSINESS. Focus on estimating setup and projected operational costs.' : ''}
${userAnswer ? `\nUSER ANSWER TO YOUR PREVIOUS CLARIFICATION QUESTION:\n"${userAnswer}"\nHIGHEST PRIORITY: use this new information to finalize your analysis.` : ''}`,
    });
    return object;
  } catch (err) {
    console.error('[Commodities Error]', err);
    return { name: 'Supply Chain', marginalCostFloor: 0, costBreakdown: [], trend: 'Error', impact: 'Failed', reasoning: 'LLM call failed', sources: [], clarificationQuestion: null };
  }
}
