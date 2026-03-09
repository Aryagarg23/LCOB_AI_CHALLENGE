import { generateObject } from 'ai';
import { getAgentModel } from '@/lib/ai-provider';
import { webSearchTool } from '@/lib/tools';
import { z } from 'zod';

export async function agent8_CompetitorAI(inputs, userAnswer = null) {
  const { zipcode, productType, businessType, businessName, isExistingBusiness } = inputs;
  console.log(`[Competitors] Mapping competitive landscape for ${businessType} in ${zipcode}...`);

  try {
    const isPreLaunch = !isExistingBusiness;
    const { object } = await generateObject({
      model: getAgentModel('gpt-4.1-nano'),
      tools: { web_search: webSearchTool },
      maxSteps: 12,
      schema: z.object({
        name: z.string(),
        avgCompetitorPrice: z.number().describe('Average price charged by local competitors for comparable products/services'),
        competitors: z.array(z.object({
          name: z.string(),
          priceRange: z.string(),
          strengths: z.string(),
          weaknesses: z.string(),
          sourceUrl: z.string().describe('URL where this competitor was found — MUST be a real URL'),
          type: z.string().describe('"Direct" (same product/service) or "Indirect" (substitute/alternative)'),
        })).describe('ALL competitors found — both direct and indirect'),
        indirectCompetitors: z.string().describe('List indirect competitors: big box stores, online alternatives, chain outlets, or other substitutes customers might choose instead'),
        marketSaturation: z.string().describe('Low / Medium / High — how crowded is this market?'),
        strategyMode: z.string().describe('Recommended strategy: "Undercut", "Differentiate", "Premium Niche", "Blue Ocean"'),
        differentiationAnalysis: z.string().describe('What SPECIFIC, defensible advantage does this business have? If none, say so honestly.'),
        impact: z.string().describe('How competition constrains or enables pricing'),
        reasoning: z.string().describe('Detailed competitive analysis citing specific search results and URLs'),
        sources: z.array(z.string()).describe('URLs of competitor websites, reviews, directories where you ACTUALLY found them'),
        clarificationQuestion: z.string().nullable().describe(isPreLaunch ? 'Since this is PRE-LAUNCH, ask who they consider their aspirational competitors or role models. Otherwise null.' : 'If you cannot find their specific business or direct local competitors, ask who their main competitors are. Otherwise null.'),
      }),
      prompt: `You are a competitive intelligence analyst. Research the REAL competitive landscape for "${businessType}" businesses near ZIP "${zipcode}" selling "${productType}".

CRITICAL ACCURACY RULES:
1. ONLY report competitors you ACTUALLY find via web search with real URLs. Do NOT invent business names.
2. If you search and find no specific competitors, say "No specific local competitors found via web search"
3. The client's business is called "${businessName}" — DO NOT list it as a competitor. Find DIFFERENT businesses selling similar products nearby.
4. For each competitor you DO find, include the URL where you found them
5. If this is a commodity business (farming, mining, etc.), note that competition is price-based at commodity exchanges, not local retail. Report WHOLESALE prices, not retail.

SEARCH STRATEGY (Adapt based on category: "${businessType}"):
1. "${businessType} near ${zipcode}" or "${businessType} ${zipcode} Yelp/Google Maps"
2. "best ${productType} stores near ${zipcode}" or "${productType} retailers ${zipcode}"
3. "${productType} reviews ${zipcode}" 
4. INDIRECT COMPETITORS: "substitutes for ${productType}" or "national chains selling ${productType}"
5. Research the 5 most popular local/independent brands AND any nearby national chains. DO NOT settle for just big box stores. Find the direct neighbors.

DIFFERENTIATION ANALYSIS:
- What would make customers choose THIS business over alternatives?
- Is the differentiation defensible (hard to copy) or superficial?
- Would a rational customer switch from their current option? Why?

Product: "${productType}", Category: "${businessType}", Location: ${zipcode}, Client: "${businessName}"
CONTEXT: ${JSON.stringify(inputs)}
${isPreLaunch ? 'Context: PRE-LAUNCH business. Focus on the market they are about to enter.' : `Context: EXISTING business "${businessName}". Find their actual local competition.`}
${userAnswer ? `\nUSER ANSWER TO YOUR PREVIOUS CLARIFICATION QUESTION:\n"${userAnswer}"\nHIGHEST PRIORITY: use this new information to finalize your analysis.` : ''}`,
    });
    return object;
  } catch (err) {
    console.error('[Competitors Error]', err);
    return { name: 'Competitive Landscape', avgCompetitorPrice: 0, competitors: [], marketSaturation: 'Unknown', strategyMode: 'Error', impact: 'Failed', reasoning: 'LLM call failed', sources: [], clarificationQuestion: null };
  }
}
