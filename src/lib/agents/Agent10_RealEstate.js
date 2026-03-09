import { generateObject } from 'ai';
import { getAgentModel } from '@/lib/ai-provider';
import { webSearchTool } from '@/lib/tools';
import { z } from 'zod';

export async function agent10_RealEstate(inputs, userAnswer = null) {
  const { address, zipcode, businessType } = inputs;
  console.log(`[Real Estate] Researching commercial rent near ${address || zipcode}...`);

  try {
    const { object } = await generateObject({
      model: getAgentModel('gpt-4.1-nano'),
      tools: { web_search: webSearchTool },
      maxSteps: 6,
      schema: z.object({
        name: z.string(),
        estimatedMonthlyRent: z.number().describe('Estimated monthly rent (USD) for a retail space in this area'),
        pricePerSqFtAnnual: z.number().describe('Average commercial retail rent per sq ft per year (USD)'),
        assumedSquareFootage: z.number().describe('Assumed square footage for this type of business (typically 800-2000 sqft)'),
        leaseType: z.string().describe('Common lease type in this area: "Triple Net (NNN)", "Gross Lease", "Modified Gross"'),
        additionalMonthlyCosts: z.object({
          utilities: z.number().describe('Estimated monthly utility costs (USD)'),
          insurance: z.number().describe('Estimated monthly business insurance (USD)'),
          propertyTaxPassthrough: z.number().describe('Estimated monthly property tax passthrough if NNN lease (USD)'),
          cam: z.number().describe('Common Area Maintenance monthly estimate (USD)'),
        }),
        totalMonthlyOccupancyCost: z.number().describe('Total monthly cost of occupying the space (rent + utilities + insurance + taxes + CAM)'),
        marketConditions: z.string().describe('Current retail real estate market conditions in this area: vacancy rates, demand trends'),
        impact: z.string().describe('How real estate costs affect break-even and pricing strategy'),
        reasoning: z.string().describe('Step-by-step derivation with specific data from search results. Show your math.'),
        sources: z.array(z.string()).describe('URLs from commercial real estate sites, LoopNet, CoStar, Zillow Commercial, local brokers'),
        clarificationQuestion: z.string().nullable().describe('If you cannot determine the general area or business space needs, ask. Otherwise null.'),
      }),
      prompt: `You are a commercial real estate analyst. Research ACTUAL retail rental costs near "${address}" in ZIP "${zipcode}" for a ${businessType || 'retail'} business.

CRITICAL ACCURACY RULES:
1. Search for REAL commercial rental listings and market data — do NOT guess or use national averages
2. If you can't find the exact address, find comparable retail spaces nearby
3. For university areas, commercial rent is typically HIGHER than suburban areas
4. Include ALL occupancy costs, not just base rent
5. Be specific about what square footage is realistic for this business type
6. If this is a prime location (near a university, downtown, high-traffic), acknowledge the premium

Search at least 3 times:
1. "commercial retail space for rent near ${address || zipcode}" or "retail lease ${zipcode}"
2. "average commercial rent per square foot ${zipcode}" or "retail rent prices ${zipcode} 2024 2025"
3. "${businessType} store lease cost ${zipcode}" or "small retail space rent Austin TX" (adjust city based on ZIP)

REALITY CHECK (Cognitive Anchors):
- **Square Footage**: A standard small retail/cafe is **800-2,000 sqft**. A kiosk is 100-300 sqft. If you recommend <500 sqft for a full business, justify it (e.g., container shop). **DO NOT confuse sqft with sq meters.**
- **Rent Rates**: 
  - University/Urban Prime: $40 - $100/sqft/year.
  - Suburban Retail: $20 - $40/sqft/year.
  - High-End Mall: $100 - $300/sqft/year.
- **Utilities**: Typically $0.50 - $1.50 per sqft per month.
- **Insurance**: $200 - $600/month for small retail.
- If the numbers you find seem too low/high, research more and verify.

Address: "${address}", ZIP: "${zipcode}", Business Type: "${businessType}"
CONTEXT: ${JSON.stringify(inputs)}
${userAnswer ? `\nUSER ANSWER TO YOUR PREVIOUS CLARIFICATION QUESTION:\n"${userAnswer}"\nHIGHEST PRIORITY: use this new information to finalize your analysis.` : ''}`,
    });
    return object;
  } catch (err) {
    console.error('[Real Estate Error]', err);
    return { name: 'Real Estate & Rent', estimatedMonthlyRent: 0, pricePerSqFtAnnual: 0, assumedSquareFootage: 1000, leaseType: 'Unknown', additionalMonthlyCosts: { utilities: 0, insurance: 0, propertyTaxPassthrough: 0, cam: 0 }, totalMonthlyOccupancyCost: 0, marketConditions: 'Error', impact: 'Failed', reasoning: 'LLM call failed', sources: [], clarificationQuestion: null };
  }
}
