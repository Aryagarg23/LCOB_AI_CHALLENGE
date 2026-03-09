import { generateObject } from 'ai';
import { getAgentModel } from '@/lib/ai-provider';
import { webSearchTool } from '@/lib/tools';
import { z } from 'zod';

export async function agent12_Legal(inputs, userAnswer = null) {
  const { businessType, productType, zipcode, businessName, isExistingBusiness } = inputs;
  console.log(`[Legal] Checking regulations for ${businessType}...`);

  try {
    const isPreLaunch = !isExistingBusiness;
    const { object } = await generateObject({
      model: getAgentModel('gpt-4.1-nano'),
      tools: { web_search: webSearchTool },
      maxSteps: 6,
      schema: z.object({
        name: z.string(),
        requiredLicenses: z.array(z.object({
          license: z.string().describe('Name of the license or permit'),
          issuingAuthority: z.string().describe('Who issues it (city, state, federal)'),
          estimatedCost: z.string().describe('Approximate cost to obtain'),
          timeToObtain: z.string().describe('How long it typically takes'),
        })).describe('All licenses and permits needed to operate this business legally'),
        zoningCompliance: z.string().describe('Is this business type allowed at this location? Any zoning restrictions?'),
        trademarkIPRisks: z.array(z.string()).describe('Any trademark, IP, or branding risks — e.g., reselling university-branded merchandise, franchise restrictions'),
        insuranceRequirements: z.array(z.string()).describe('Required insurance types: general liability, workers comp, product liability, etc.'),
        industrySpecificRegulations: z.array(z.string()).describe('Industry-specific rules: health codes for food, fire codes for retail, ADA compliance, etc.'),
        resaleRegulations: z.string().describe('For resale/thrift businesses: secondhand dealer license requirements, reporting obligations, holding periods for merchandise'),
        estimatedComplianceCost: z.number().describe('Total estimated first-year cost of all licenses, permits, insurance, and compliance (USD)'),
        legalRiskLevel: z.string().describe('"Low", "Medium", or "High" — overall legal/regulatory risk assessment'),
        impact: z.string().describe('How legal/regulatory factors affect startup costs and ongoing operations'),
        reasoning: z.string().describe('Detailed analysis citing specific regulations, ordinances, and requirements found via search'),
        sources: z.array(z.string()).describe('URLs from city/state government sites, SBA, legal resources'),
        clarificationQuestion: z.string().nullable().describe('If the business type is ambiguous or straddles multiple regulatory categories, ask for clarification. Otherwise null.'),
      }),
      prompt: `You are a business regulatory analyst. Research ALL legal requirements to operate a "${businessType}" selling "${productType}" in ZIP "${zipcode}".

CRITICAL: Be thorough. Missing a required permit can shut down a business.

SEARCH STRATEGY (Adapt based on category: "${businessType}"):
1. "${businessType} business license ${zipcode}" or "retail/service permit [city name from ZIP]"
2. "Specific license for ${productType} [state]" (e.g., Food Handler, Secondhand Dealer, Liquor License, Health Permit).
3. "Zoning regulations for ${businessType} in ${zipcode}" or "[city] municipal code business"
4. "Trademark and IP risks for reselling/selling ${productType}"

KEY AREAS TO INVESTIGATE:
- LICENSES: Sales tax permits, city licenses, industry-specific professional certifications.
- ZONING: Is this business type allowed at the specific ZIP/Location? Buffer zone requirements (e.g., schools)?
- IP RISKS: Trademark infringement risks for the product line (especially branded goods).
- INSURANCE: General liability codes for "${businessType}".
- EMPLOYMENT: Local minimum wage and labor laws for this area.

Product: "${productType}", Category: "${businessType}", Location: ${zipcode}, Business: "${businessName}"
CONTEXT: ${JSON.stringify(inputs)}
${isPreLaunch ? 'Context: PRE-LAUNCH. List everything they need BEFORE opening.' : 'Context: EXISTING business. Check if they likely have all required licenses.'}
${userAnswer ? `\nUSER ANSWER TO YOUR PREVIOUS CLARIFICATION QUESTION:\n"${userAnswer}"\nHIGHEST PRIORITY: use this new information to finalize your analysis.` : ''}`,
    });
    return object;
  } catch (err) {
    console.error('[Legal Error]', err);
    return { name: 'Legal & Regulatory', requiredLicenses: [], zoningCompliance: 'Error', trademarkIPRisks: [], insuranceRequirements: [], industrySpecificRegulations: [], resaleRegulations: 'Error', estimatedComplianceCost: 0, legalRiskLevel: 'Unknown', impact: 'Failed', reasoning: 'LLM call failed', sources: [], clarificationQuestion: null };
  }
}
