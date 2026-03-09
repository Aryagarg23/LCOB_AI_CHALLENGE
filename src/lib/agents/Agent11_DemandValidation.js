import { generateObject } from 'ai';
import { getAgentModel } from '@/lib/ai-provider';
import { webSearchTool } from '@/lib/tools';
import { z } from 'zod';

export async function agent11_DemandValidation(inputs, userAnswer = null) {
  const { productType, businessType, zipcode, businessName, isExistingBusiness } = inputs;
  console.log(`[Demand Validation] Validating market demand for ${productType} in ${zipcode}...`);

  try {
    const isPreLaunch = !isExistingBusiness;
    const { object } = await generateObject({
      model: getAgentModel('gpt-4.1-nano'),
      tools: { web_search: webSearchTool },
      maxSteps: 8,
      schema: z.object({
        name: z.string(),
        demandLevel: z.string().describe('"High", "Moderate", "Low", or "Unvalidated" — based on EVIDENCE, not assumptions'),
        secondaryMarketData: z.object({
          platformsChecked: z.array(z.string()).describe('Platforms searched (Depop, Poshmark, eBay, Facebook Marketplace, etc.)'),
          activeListings: z.string().describe('Approximate number of active listings found for this product type in this area'),
          priceRange: z.string().describe('Price range of completed/active sales found'),
          sellThroughRate: z.string().describe('Estimated sell-through rate or sales velocity if available'),
        }),
        googleTrendsInsight: z.string().describe('Search interest trend for this product/business type — rising, stable, declining'),
        seasonality: z.object({
          isHighlySeasonal: z.boolean(),
          peakMonths: z.string().describe('Peak demand months if seasonal'),
          troughMonths: z.string().describe('Low demand months if seasonal'),
          revenueConcentration: z.string().describe('What % of annual revenue likely concentrates in peak season'),
        }),
        targetCustomerProfile: z.string().describe('Who is the actual buyer? Demographics, behavior, frequency of purchase'),
        estimatedDailyCustomers: z.number().describe('Realistic estimate of daily customers for this type of business in this location'),
        estimatedDailySales: z.number().describe('Realistic estimate of daily unit sales'),
        averageBasketSize: z.number().describe('Expected average transaction value (USD)'),
        willingnessToPay: z.string().describe('Evidence-based assessment of what customers actually pay, from marketplace data'),
        demandRisks: z.array(z.string()).describe('Key risks to demand: substitutes, trends dying, oversaturation, etc.'),
        impact: z.string().describe('How validated (or unvalidated) demand affects the business case'),
        reasoning: z.string().describe('Step-by-step analysis citing SPECIFIC marketplace data, search results, and trends'),
        sources: z.array(z.string()).describe('URLs from marketplaces, Google Trends, Reddit, industry reports'),
        clarificationQuestion: z.string().nullable().describe(isPreLaunch ? 'Ask what early demand signals they have seen (e.g., interest from friends, social media engagement, waitlist signups). Otherwise null.' : 'Ask about their current daily foot traffic or sales volume. Otherwise null.'),
      }),
      prompt: `You are a market demand validation analyst. Research whether customers will support the pricing strategy for "${productType}" in ZIP "${zipcode}".

CLIENT CONTEXT: ${JSON.stringify(inputs)}

CRITICAL NARRATIVE RULES:
1. If this is an EXISTING business ("${businessName}"), demand is already established. Your job is NOT to "validate" baseline demand, but to analyze "demand resilience" and "loyalty proxies" (e.g., repeat review volume, local foot traffic density).
2. If this is a PRE-LAUNCH business, you must "validate interest" using transaction proxies and marketplace volume.
3. AVOID REPETITION: Use varied terms like "verified demand", "observed purchasing behavior", "transaction proxies", and "customer sentiment volume".

SEARCH STRATEGY (Adapt based on category: "${businessType}"):
1. Research the primary marketplace for this category (e.g., eBay/Poshmark for retail, Yelp for food, Thumbtack/Angie for services).
2. "site:[appropriate platform] ${productType} ${zipcode}" or local Facebook Marketplace activity.
3. "${productType} sales trends 2024 2025" or "demand for ${businessType}"
4. Search for local reviews of similar businesses to gauge "proxy demand" (high review volume = high demand).
5. Search Google Trends for the category in this region.

UNIT ECONOMICS BENCHMARKS:
- Small Retail: 20-80 customers/day.
- Restaurant/Cafe: 100-300 customers/day.
- Specialty Service: 5-15 appointments/day.
- Thrift/Resale: 30-100 customers/day.

SEASONALITY:
- Analyze peak and off-peak months for "${productType}" in "${zipcode}".
- Estimate what % of annual revenue concentrates in the peak season.

Product: "${productType}", Category: "${businessType}", Location: ${zipcode}
CONTEXT: ${JSON.stringify(inputs)}
${isPreLaunch ? 'Context: PRE-LAUNCH. Validate interest through external evidence.' : `Context: EXISTING business "${businessName}". Analyze demand resilience and growth potential.`}
${userAnswer ? `\nUSER ANSWER TO YOUR PREVIOUS CLARIFICATION QUESTION:\n"${userAnswer}"\nHIGHEST PRIORITY: use this new information to finalize your analysis.` : ''}`,
    });
    return object;
  } catch (err) {
    console.error('[Demand Validation Error]', err);
    return { name: 'Demand Validation', demandLevel: 'Unvalidated', secondaryMarketData: { platformsChecked: [], activeListings: 'Error', priceRange: 'Unknown', sellThroughRate: 'Unknown' }, googleTrendsInsight: 'Error', seasonality: { isHighlySeasonal: false, peakMonths: 'Unknown', troughMonths: 'Unknown', revenueConcentration: 'Unknown' }, targetCustomerProfile: 'Error', estimatedDailyCustomers: 0, estimatedDailySales: 0, averageBasketSize: 0, willingnessToPay: 'Error', demandRisks: [], impact: 'Failed', reasoning: 'LLM call failed', sources: [], clarificationQuestion: null };
  }
}
