import { streamText, generateObject } from 'ai';
import { getAgentModel } from '@/lib/ai-provider';
import { z } from 'zod';

export async function agent9_Orchestrator(inputs, agentData, onStream) {
  console.log('[Orchestrator] Synthesizing all research findings...');

  const contextData = `
  CLIENT PROFILE:
  - Business Name: ${inputs.businessName}
  - Business Type: ${inputs.businessType || 'Retail'}
  - ZIP Code: ${inputs.zipcode}
  - Address: ${inputs.address}
  - Brand Positioning: ${inputs.aesthetic}
  - Primary Product/Service: ${inputs.productType}
  - Is Existing Business: ${inputs.isExistingBusiness ? 'YES — this is an established, operating business' : 'NO — this is a pre-launch / planned business'}
  - Business Age: ${inputs.businessAgeMonths} months
  - Core Question: ${inputs.coreQuestion || 'Optimal pricing and go-to-market strategy'}
  - Known Competitors: ${inputs.knownCompetitors || 'None mentioned'}
  - Customer Feedback: "${inputs.recentReviews || 'None'}"
  - Additional Context: ${inputs.additionalContext || 'None'}

  RESEARCH FINDINGS:
  1. BRAND & AESTHETICS: ${JSON.stringify(agentData.agent1, null, 2)}
  2. LOCAL DEMOGRAPHICS: ${JSON.stringify(agentData.agent2, null, 2)}
  3. INTERNAL DATA & ELASTICITY: ${JSON.stringify(agentData.agent3, null, 2)}
  4. SOCIAL SENTIMENT: ${JSON.stringify(agentData.agent4, null, 2)}
  5. MACROECONOMICS: ${JSON.stringify(agentData.agent5, null, 2)}
  6. SUPPLY CHAIN COSTS: ${JSON.stringify(agentData.agent6, null, 2)}
  7. LOCATION & MOBILITY: ${JSON.stringify(agentData.agent7, null, 2)}
  8. COMPETITIVE LANDSCAPE: ${JSON.stringify(agentData.agent8, null, 2)}
  9. REAL ESTATE & RENT: ${JSON.stringify(agentData.agent10, null, 2)}
  10. DEMAND VALIDATION: ${JSON.stringify(agentData.agent11, null, 2)}
  11. LEGAL & REGULATORY: ${JSON.stringify(agentData.agent12, null, 2)}
  12. FINANCIAL ENGINEERING: ${JSON.stringify(agentData.agent13, null, 2)}
  `;

  try {
    console.log('[Orchestrator] Running CoT validation...');
    const { object: reasoning } = await generateObject({
      model: getAgentModel('gpt-4.1-nano'),
      schema: z.object({
        contradictionAnalysis: z.string(),
        spatialMismatchDetected: z.boolean(),
        recommendedPivot: z.string().nullable(),
        pricingMathValidation: z.string(),
        breakEvenAnalysis: z.string(),
        keyRisks: z.array(z.string()),
        dataQualityIssues: z.array(z.string()).describe('List any data that looks fabricated, contradictory, or unrealistic'),
        costRealism: z.string().describe('Are the cost estimates realistic? Compare agent6 supply chain costs with agent10 real estate costs. Is total overhead plausible?'),
        demandValidated: z.boolean().describe('Did agent11 find actual evidence of demand, or is demand assumed?'),
        financialStrategyScore: z.number().describe('Copy the score from Agent 13 if it looks realistic.'),
      }),
      prompt: `You are a senior economist validating research data before generating a client report.

CRITICAL VALIDATION CHECKS:
1. Cross-examine all 11 research domains for contradictions and inconsistencies
2. CHECK IF COMPETITOR NAMES AND PRICES LOOK REAL — if they seem generic or made up, flag them
3. CHECK IF PRICES ARE REALISTIC for this industry — flag any pricing that seems off by orders of magnitude
4. CHECK TOTAL MONTHLY COSTS: Add up rent (agent10) + labor (agent3) + supply costs (agent6) + utilities + misc. Does the total make sense?
5. CHECK IF DEMAND IS VALIDATED: Did agent11 find real marketplace evidence or just assumptions?
6. CHECK LEGAL RISKS: Are there trademark or licensing issues that could block the business (agent12)?
7. Verify the break-even makes sense given REALISTIC total overhead.
8. **TRANSACTION CONSISTENCY**: Flag if "daily customers" (Agent 11) is significantly different from "daily transactions" (Agent 13). They should be nearly 1:1.
9. **PRICING REALISM**: Ensure recommended pricing is not >25% above the local competitor average (Agent 8) unless justified by high-end branding (Agent 1).

COST REALITY CHECK:
- Take monthly rent from agent10 (NOT from agent3 which only estimates labor)
- Add labor costs from agent3
- Add utility and insurance estimates from agent10
- Total monthly overhead should typically be $8,000-25,000 for a small retail store
- If total overhead seems below $5,000 for a retail storefront, flag it as suspicious
- Check if the variable cost per unit is realistic for the business's industry. Flag if the costs seem suspiciously low.

DATA TO VALIDATE:
${contextData}`,
    });

    const allSources = [
      ...(agentData.agent1?.sources || []),
      ...(agentData.agent2?.sources || []),
      ...(agentData.agent3?.sources || []),
      ...(agentData.agent4?.sources || []),
      ...(agentData.agent5?.sources || []),
      ...(agentData.agent6?.sources || []),
      ...(agentData.agent7?.sources || []),
      ...(agentData.agent8?.sources || []),
      ...(agentData.agent10?.sources || []),
      ...(agentData.agent11?.sources || []),
      ...(agentData.agent12?.sources || []),
    ].filter(s => s && s.startsWith('http'));

    const uniqueSources = [...new Set(allSources)];
    const sourcesSection = uniqueSources.length > 0
      ? uniqueSources.map((url, i) => `${i + 1}. [${url}](${url})`).join('\n')
      : 'No external sources were available during this analysis.';

    console.log('[Orchestrator] Generating comprehensive streaming report...');

    let fullText = '';
    const { textStream } = streamText({
      model: getAgentModel('gpt-5-mini'),
      prompt: `You are a senior business strategy consultant at Praxis Economics. Generate a comprehensive, professional report for a ${inputs.businessType} client.

CRITICAL FORMATTING RULES:
- DO NOT use LaTeX notation (no \\frac{}{}, \\boxed{}, \\times, \\alpha, or dollar signs for math)
- For formulas, use PLAIN TEXT: **Price = Cost × Markup** — write it exactly like that with Unicode symbols
- For calculations, show them in tables or as bold text: **$5.00 × 4 = $20.00**
- Use ×, ÷, ≈, →, ≥, ≤ Unicode symbols — NOT LaTeX commands
- All dollar amounts use the $ symbol directly: **$5.00/unit**, not \\$5.00
- DO NOT mention "Agent" or "agent" in the report. Instead, refer to the source of the data.
- Write in a clear, concise, and direct style.
- **CRITICAL LINK RULE**: You MUST natively embed the provided source URLs directly into the sentences of the report as Markdown links (e.g., \`[according to local demographic data](http://...)\`). Do NOT just list them at the bottom. Use the sources provided in the VALIDATED DATA section.

CRITICAL DATA QUALITY RULES:
- If a competitor name looks fabricated, say "Competitor data requires verification"
- If demographic data is missing, SAY SO explicitly
- This report analyzes the data quality issues found by the validator
- Be HONEST — if the analysis reveals this is risky or poorly suited, SAY THAT DIRECTLY
- DISTINGUISH between wholesale and retail prices clearly

DATA QUALITY ISSUES FOUND BY VALIDATOR:
${reasoning.dataQualityIssues?.join('\n- ') || 'None flagged'}

COST REALISM CHECK: ${reasoning.costRealism}
DEMAND VALIDATED: ${reasoning.demandValidated ? 'YES — evidence found' : 'NO — demand is assumed, not proven'}

VALIDATED DATA:
${contextData}

VALIDATION RESULTS:
- Contradictions: ${reasoning.contradictionAnalysis}
- Spatial Mismatch: ${reasoning.spatialMismatchDetected}
- Pivot: ${reasoning.recommendedPivot || 'None needed'}
- Pricing Math: ${reasoning.pricingMathValidation}
- Break-Even: ${reasoning.breakEvenAnalysis}
- Key Risks: ${reasoning.keyRisks?.join(', ')}

Generate a comprehensive Markdown report (minimum 3000 words). Use markdown tables, bold text, and clear structure.

REQUIRED STRUCTURE:

# Strategic Market Analysis for ${inputs.businessName}: ${inputs.businessType} Outlook & Pricing Strategy

## Executive Summary
This report analyzes the market positioning, cost structures, and strategic outlook for ${inputs.businessName}. We evaluate key findings, recommended pricing, and strategic verdicts based on current market viability. Be HONEST about risks. This is the section an investor reads first.

## 1. Strategic Viability Assessment
✅ VIABLE / ⚠️ VIABLE WITH CONDITIONS / ❌ NOT VIABLE
BRUTAL HONESTY RULE:
- If this is an EXISTING business, frames demand as "Existing product-market fit" and analyze risks to that fit (e.g., price sensitivity, competitive entry).
- If this is a PRE-LAUNCH business, frames demand as "Market interest validation" and use proxies.
- DO NOT say "demand is unvalidated" for a business that has been open for months — instead, analyze "demand resilience".

## 2. Market Demographics & Local Economics
| Metric | Value | Source |
|--------|-------|--------|
Include actual demographic and economic data. If data is missing, say "Not available" — do not fabricate.

## 3. Demand Validation & Market Evidence
Based on demand validation analysis:
- **Evidence Analysis**: Use terms like "verified demand", "observed purchasing behavior", or "transaction proxies" to avoid repeating "demand validation".
- What evidence exists that customers ACTUALLY buy this product?
- Regional marketplace data (e.g., eBay/Poshmark for retail, Yelp for food, LinkedIn/G2 for services)
- Search trends (rising, stable, declining)

REVENUE MATH RULES:
- **Daily Revenue = Daily Volume × Average Basket Size** (e.g., 150 customers × $12 basket = $1,800/day)
- **Monthly Revenue = Daily Revenue × 30**
- NEVER multiply a "daily total" by 30 if that total already represents a basket size (e.g., if one drink is $4.50, and you sell 100/day, revenue is $450/day, not $4,500/day).
- Show the math clearly.

## 4. Seasonality & Revenue Concentration
- Is demand seasonal? What are peak vs trough months?
- What % of revenue concentrates in peak season?
- How will the business survive off-peak months?

## 5. Competitive Landscape
| Competitor | Type | Price Range | Strengths | Weaknesses |
Include BOTH direct and indirect competitors. Do NOT say "no competitors." Include big box stores, online alternatives, nearby options.

### Differentiation Analysis
What SPECIFIC advantage does this business have? Is it defensible?

## 6. Brand Perception & Social Sentiment
Honest assessment from social media analysis. For pre-launch, state "No existing brand presence."

## 7. Cost Structure & Supply Chain
Based on supply chain and cost analysis. MUST include:
| Cost Component | Per-Unit Cost | Notes |
- Raw acquisition cost per item
- Yield rate (% of inventory that's actually sellable)
- True cost per SELLABLE unit (acquisition ÷ yield rate)
- Labor cost per unit (sorting, cleaning, prep)
- Industry typical markup range
- Total marginal cost per sellable unit

## 8. Real Estate & Occupancy Costs
THIS IS CRITICAL. Based on real estate and occupancy cost analysis:
| Expense | Monthly Cost | Notes |
|---------|-------------|-------|
| Base Rent | $X,XXX | Based on $/sqft research |
| Utilities | $XXX | |
| Insurance | $XXX | |
| CAM / Property Tax | $XXX | |
| **Total Occupancy** | **$X,XXX** | |

## 9. Pricing Model & Recommendation
IMPORTANT: Use STANDARD INDUSTRY PRICING, not invented formulas.

**Price = True Cost Per Sellable Unit × Industry Markup**

Show the calculation with REAL numbers from the research:
| Parameter | Value | Source |
|-----------|-------|--------|
| Acquisition Cost | $X.XX | Supply chain research |
| Yield Rate | XX% | Industry standard |
| True Cost/Unit | $X.XX | Acquisition ÷ Yield |
| Labor/Unit | $X.XX | Cost analysis |
| Total Unit Cost | $X.XX | Sum |
| Industry Markup | X.Xx | Supply chain research |
| **Recommended Price** | **$XX.XX** | Cost × Markup |

Compare recommended price to: competitor prices, willingness-to-pay, and demographic ceiling.

## 10. Quantitative Strategy Analytics
Based on the quantitative financial model:
- **Unit Economics**: Contribution margin and gross margin targets.
- **Break-Even Point**: See Section 11 for detailed analysis.
- **Profit Sensitivity**: IMPACT of price changes on volume requirements.
- **Financial Strategy Score**: ${reasoning.financialStrategyScore || 'Calculating...'}
- **Math Logic**: ${reasoning.pricingMathValidation}

## 11. Realistic Break-Even Analysis
A realistic break-even analysis requires accounting for all fixed and variable costs.

### Fixed Costs
| Expense | Monthly Cost | Notes |
|----------------|--------------|-------|
| Rent + Occupancy | $X,XXX | From real estate analysis |
| Labor (staff) | $X,XXX | From internal data analysis |
| Marketing | $XXX | Estimated |
| Utilities | $XXX | From real estate analysis |
| Insurance | $XXX | From real estate analysis |
| Miscellaneous | $XXX | Estimated |
| **Total Monthly Fixed Costs** | **$XX,XXX** | |

### Variable Costs
| Cost Component | Per-Unit Cost | Notes |
|----------------|---------------|-------|
| Total Unit Cost | $X.XX | From cost structure analysis (section 7) |

### Break-Even Calculation
**Break-Even Units (Monthly) = Total Monthly Fixed Costs ÷ (Price per Unit - Variable Cost per Unit)**

Show the math clearly. Is this volume ACHIEVABLE given estimated daily customers?
- Required daily sales = Break-even units ÷ 30 days
- Compare to estimated daily traffic and transaction volume.
- If break-even requires more sales than realistic traffic supports, FLAG THIS.

## 12. Legal & Regulatory Requirements
Based on legal and regulatory analysis:
- Required licenses and permits (with costs)
- Trademark/IP risks (especially for branded merchandise)
- Zoning compliance
- Insurance requirements
- Estimated first-year compliance costs

## 13. Macroeconomic Context
Current rates, inflation, spending outlook from macroeconomic analysis.

## 14. Risk Factors & Mitigation
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
Must include risks from ALL domains. Be specific:
- Demand risk (if unvalidated)
- Rent/cost risk
- Competition risk
- Legal/trademark risk
- Inventory risk (unsold items, dead stock)
- Seasonality risk
- Operational risk

## 15. Unit Economics Summary
| Metric | Value |
|--------|-------|
| Cost per sellable unit | $X.XX |
| Recommended retail price | $XX.XX |
| Gross margin per unit | $X.XX (XX%) |
| Monthly overhead | $X,XXX |
| Break-even units/month | XXX |
| Required daily sales | XX |
| Estimated daily transactions | XX |
| **Monthly revenue at target** | **$X,XXX** (Break-even units/month × Recommended retail price) |
| **Monthly profit at target** | **$X,XXX** (Monthly Revenue at target - Monthly overhead) |

## 16. Honest Assessment & Recommendations
Give your REAL opinion:
- Would YOU invest in this with your own money?
- What are the 3 things that must be true for this to work?
- What would you tell a friend considering this business?
- Specific, actionable next steps
- What should the owner validate BEFORE spending money?

## Sources & Methodology
${sourcesSection}

FINAL INSTRUCTIONS:
- Write professionally but HONESTLY — a good consultant tells hard truths
- Bold key numbers and recommendations
- Use ✅ ⚠️ ❌ indicators
- Address: "${inputs.coreQuestion || 'optimal pricing and market strategy'}"
- NO LaTeX. NO \\boxed{}. NO \\frac{}. Only plain markdown
- If a section lacks data, say "DATA GAP: [what's missing]" — do not fabricate`,
    });

    for await (const chunk of textStream) {
      fullText += chunk;
      if (onStream) {
        onStream(chunk);
      }
    }

    return fullText;
  } catch (err) {
    console.error('[Orchestrator Error]', err);
    return `# Error Generating Report\n\n${err.message}`;
  }
}
