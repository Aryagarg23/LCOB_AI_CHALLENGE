import { generateObject } from 'ai';
import { getAgentModel } from '@/lib/ai-provider';
import { z } from 'zod';

export async function agent13_Math(inputs, agentData, userAnswer = null) {
  const { productType, businessType, additionalContext } = inputs;
  console.log(`[Math Agent] Engineering financial models for ${businessType}...`);

  try {
    const { object } = await generateObject({
      model: getAgentModel('gpt-4.1-nano'),
      schema: z.object({
        name: z.string(),
        unitEconomics: z.object({
          contributionMargin: z.number().describe('Calculated Contribution Margin per unit (USD)'),
          marginPercentage: z.number().describe('Gross Margin %'),
          optimalPricePoint: z.number().describe('Calculated optimal price point based on cost + demographic ceiling'),
        }),
        breakEvenAnalysis: z.object({
          monthlyFixedCosts: z.number().describe('Total monthly fixed costs (Rent + Labor + Utilities)'),
          breakEvenUnits: z.number().describe('Units per month to reach $0 profit'),
          breakEvenRevenue: z.number().describe('Monthly revenue needed to break even'),
        }),
        sensitivityAnalysis: z.string().describe('How profit changes with a +/- 10% price shift'),
        financialStrategyScore: z.number().min(0).max(1).describe('0.0 (High Risk) to 1.0 (Highly Profitable)'),
        reasoning: z.string().describe('Show your math step-by-step. Cite specific numbers from agent6 and agent10.'),
        impact: z.string().describe('The single biggest financial lever for this business'),
        clarificationQuestion: z.string().nullable().describe('If critical cost/price data is missing, ask. Otherwise null.'),
      }),
      prompt: `You are a financial engineering analyst. Your job is to perform RIGOROUS math on the business data collected so far.
      
      INPUT DATA:
      - Client Profile: ${JSON.stringify(inputs)}
      - Supply Chain (Agent 6): ${JSON.stringify(agentData.agent6)}
      - Real Estate (Agent 10): ${JSON.stringify(agentData.agent10)}
      - Demographics (Agent 2): ${JSON.stringify(agentData.agent2)}
      
      CORE TASKS:
      1. Calculate TRUE Cost per Unit including yield loss.
      2. Sum all MONTHLY FIXED COSTS (Rent + Utilities + Insurance from Agent 10 + estimated Labor).
      3. Calculate the BREAK-EVEN point in units and revenue.
      4. **PRICING REALISM**: Cross-reference your suggested OPTIMAL PRICE with the local competitor list (Agent 8). If your price is >25% higher than local direct rivals, you MUST justify it via differentiation (Agent 8) or find a more competitive anchor.
      5. Analyze specific items if mentioned in the Client Profile (e.g., a Menu) and check if their current pricing is sustainable.
      6. **TRANSACTION MATH**: Assume 1 transaction per customer (1:1 ratio) unless the business data explicitly shows multi-buy patterns. 150 daily customers should roughly equal 150 daily transactions. **FLAG ANY INCONSISTENCY** in customer counts vs transaction volumes.
      7. **REVENUE FORMULA**: Always use **Monthly Revenue = (Daily Volume × Average Basket Size) × 30**. NEVER multiply a per-unit price by 30 and call it revenue unless volume is 1.0.
      8. Evaluate the SENSITIVITY: If we lower price by 10%, how much more volume do we need to stay profitable?
      
      CRITICAL: Be a mathematician. Do not guess. Show your formulas.
      
      Product: "${productType}", Category: "${businessType}"
      ${userAnswer ? `\nUSER ANSWER TO YOUR PREVIOUS CLARIFICATION QUESTION:\n"${userAnswer}"\nHIGHEST PRIORITY: use this new information to finalize your analysis.` : ''}`,
    });
    return object;
  } catch (err) {
    console.error('[Math Agent Error]', err);
    return { name: 'Financial Engineering', unitEconomics: { contributionMargin: 0, marginPercentage: 0, optimalPricePoint: 0 }, breakEvenAnalysis: { monthlyFixedCosts: 0, breakEvenUnits: 0, breakEvenRevenue: 0 }, sensitivityAnalysis: 'Error', financialStrategyScore: 0.5, reasoning: 'LLM call failed', impact: 'Unknown', clarificationQuestion: null };
  }
}
