import { generateObject } from 'ai';
import { getAgentModel } from '@/lib/ai-provider';
import { webSearchTool } from '@/lib/tools';
import { z } from 'zod';

export async function agent6_Commodities(inputs, userAnswer = null) {
  const { productType, businessType, isExistingBusiness } = inputs;
  console.log(`[Commodities] Tracking supply chain costs for ${businessType || productType}...`);

  try {
    const isPreLaunch = !isExistingBusiness;
    const { object } = await generateObject({
      model: getAgentModel('gpt-4.1-nano'),
      tools: { web_search: webSearchTool },
      maxSteps: 6,
      schema: z.object({
        name: z.string(),
        marginalCostFloor: z.number().describe('Estimated per-unit Marginal Cost (USD) to produce/deliver the primary product — this is the TRUE all-in cost per SELLABLE unit'),
        costBreakdown: z.array(z.object({
          component: z.string(),
          cost: z.number(),
          note: z.string(),
        })).describe('Itemized cost components with real numbers'),
        yieldRate: z.number().min(0).max(1).describe('For resale: % of inventory that is actually sellable (e.g., 0.40 means only 40% of items from a bale are sellable). For non-resale: 1.0'),
        laborHoursPerUnit: z.number().describe('Estimated labor hours per unit for sorting, cleaning, repair, prep, etc.'),
        laborCostPerUnit: z.number().describe('Labor cost per unit based on local minimum wage × labor hours'),
        trueAcquisitionCostPerSellableUnit: z.number().describe('Raw cost / yield rate = true cost per sellable unit. For example: $5 per item but only 40% sellable = $12.50 true cost'),
        industryTypicalMarkup: z.string().describe('What markup does this industry typically use? e.g., "Thrift stores: 3-4x cost", "Restaurants: 3x food cost", "Retail: 2-2.5x wholesale"'),
        trend: z.string().describe('Current commodity/supply cost trend'),
        impact: z.string().describe('How this sets the absolute minimum viable price'),
        reasoning: z.string().describe('Detailed per-unit cost derivation citing specific prices found via search. Show ALL math.'),
        sources: z.array(z.string()).describe('URLs from commodity trackers, USDA, suppliers, industry sites'),
        clarificationQuestion: z.string().nullable().describe(isPreLaunch ? 'If raw material types are unknown, ask what specific materials they PLAN to use for this new business. Otherwise null.' : 'If raw material costs are unknown for this product, ask. Otherwise null.'),
      }),
      prompt: `You are a supply chain and unit economics analyst. Estimate the REAL per-unit Marginal Cost (COGS) to sell "${productType}" for a "${businessType}" business.

CRITICAL ACCURACY RULES:
1. Search for ACTUAL wholesale or raw material costs — NOT retail prices.
2. USE PRECISE CONSUMPTION UNITS (e.g., for a beverage, calculate raw ingredients per cup; for retail, calculate unit acquisition cost; for service, calculate consumables per hour). Do NOT be specific to just coffee unless requested.
3. Adapt calculations based on the business category ("${businessType}"):
   - FOR FOOD/BEV: Research wholesale ingredient costs. **CRITICAL: Include ALL marginal components: raw materials, packaging, and direct additives.**
   - FOR RESALE (Used/Vintage): Research bulk lot/bale costs. Calculate YIELD RATE (% sellable). TRUE COST = Acquisition ÷ Yield.
   - FOR RETAIL (New): Research wholesale/distributor prices for "${productType}".
   - TARIFF IMPACT: If ingredients/products are imported, explain HOW tariffs increase wholesale costs.
   - FOR SERVICES: Research hourly labor rates + consumables used per appointment.
4. **Break down ALL cost components: materials, labor (regional min wage + overhead), energy, transport, and packaging.**
5. **LOGISTICS & LOCATION PREMIUM:** Strongly consider the geographic location. If the location is remote or features harsh environments (e.g., Antarctica, remote islands), the sourcing of raw materials, freight, and energy will be significantly higher due to complex supply chains. Explicitly factor these extreme logistical premiums into your marginal cost floor.
6. Calculate INDUSTRY TYPICAL MARKUP for "${businessType}" (e.g., 2x, 3x, 5x).
7. **SPECULATION RULE:** If specific cost information is unavailable, use common sense to speculate. **You MUST put all speculative statements, assumptions, and estimated numbers in italics** (e.g., *freight costs to Antarctica are estimated to add a 300% premium to standard wholesale rates*).

SEARCH STRATEGY:
1. "wholesale cost of ${productType} 2024 2025" or "bulk ${productType} supplier prices"
2. "${businessType} cost of goods sold benchmarks" or "${businessType} typical gross margins"
3. "industry standard markup for ${businessType}" or "how to price ${productType}"

YIELD & MARKUP REALITY CHECK:
- Resale/Thrift: Typically 40-60% yield; 3-5x markup.
- Restaurant: Typically 3x food cost.
- New Retail: Typically 2-2.5x wholesale.
- Services: Typically 3-5x labor cost + materials.

Business Category: "${businessType}", Product: "${productType}"
CONTEXT: ${JSON.stringify(inputs)}
${isPreLaunch ? 'Context: THIS IS A PRE-LAUNCH / NEW BUSINESS. Focus on estimating setup and projected operational costs.' : ''}
${userAnswer ? `\nUSER ANSWER TO YOUR PREVIOUS CLARIFICATION QUESTION:\n"${userAnswer}"\nHIGHEST PRIORITY: use this new information to finalize your analysis.` : ''}`,
    });
    return object;
  } catch (err) {
    console.error('[Commodities Error]', err);
    return { name: 'Supply Chain', marginalCostFloor: 0, costBreakdown: [], trend: 'Error', impact: 'Failed', reasoning: 'LLM call failed', sources: [], clarificationQuestion: null };
  }
}
