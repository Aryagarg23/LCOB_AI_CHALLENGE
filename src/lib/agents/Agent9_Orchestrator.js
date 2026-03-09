import { generateText, generateObject } from 'ai';
import { getAgentModel } from '@/lib/ai-provider';
import { z } from 'zod';

export async function agent9_Orchestrator(inputs, agentData) {
  console.log('[Orchestrator] Synthesizing all research findings...');

  const contextData = `
  CLIENT PROFILE:
  - Business Name: ${inputs.businessName}
  - Business Type: ${inputs.businessType || 'Retail'}
  - ZIP Code: ${inputs.zipcode}
  - Address: ${inputs.address}
  - Brand Positioning: ${inputs.aesthetic}
  - Primary Product/Service: ${inputs.productType}
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
      }),
      prompt: `You are a senior economist validating research data before generating a client report.

CRITICAL VALIDATION CHECKS:
1. Cross-examine all 8 research domains for contradictions and inconsistencies
2. CHECK IF COMPETITOR NAMES AND PRICES LOOK REAL — if they seem generic or made up (e.g. "Sunny Cotton Farms", "Cotton Global LLC"), flag them as potentially fabricated
3. CHECK IF PRICES ARE REALISTIC for this industry — e.g. raw agricultural commodities sell for cents/lb, not $20+/lb. Flag any pricing that seems off by orders of magnitude
4. CHECK IF DEMOGRAPHIC DATA IS ACTUALLY FILLED IN — if any fields say "Data Not provided" or "Unknown", note this
5. Verify the marginal cost calculation makes sense for this industry

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
    ].filter(s => s && s.startsWith('http'));

    const uniqueSources = [...new Set(allSources)];
    const sourcesSection = uniqueSources.length > 0
      ? uniqueSources.map((url, i) => `${i + 1}. [${url}](${url})`).join('\n')
      : 'No external sources were available during this analysis.';

    console.log('[Orchestrator] Generating comprehensive report...');

    const { text } = await generateText({
      model: getAgentModel('gpt-4.1-nano'),
      prompt: `You are a senior business strategy consultant at Praxis Economics. Generate a comprehensive, professional report for a ${inputs.businessType} client.

CRITICAL FORMATTING RULES:
- DO NOT use LaTeX notation (no \\frac{}{}, \\boxed{}, \\times, \\alpha, or dollar signs for math)
- For formulas, use PLAIN TEXT: **P = MC × (1 + M_base + α × S)** — write it exactly like that with Unicode symbols
- For calculations, show them in tables or as bold text: **$0.38 × 6 = $2.28**
- Use ×, ÷, ≈, →, ≥, ≤ Unicode symbols — NOT LaTeX commands
- All dollar amounts use the $ symbol directly: **$0.38/lb**, not \\$0.38

CRITICAL DATA QUALITY RULES:
- If a competitor name looks like it might be fabricated (you can't verify it from the research data), say "Competitor data requires verification" and present what you have honestly
- If demographic data is missing, SAY SO explicitly — do not fill in fake numbers
- If the research agents returned questionable data, CALL IT OUT in the report as a limitation
- NEVER present fabricated competitor names as real businesses
- Be HONEST about what the data shows — if the analysis reveals this business idea is risky or poorly suited, SAY THAT DIRECTLY
- If the price data seems unrealistic for the industry (e.g. raw commodities priced at retail levels), note the discrepancy
- DISTINGUISH between wholesale/commodity prices and retail prices clearly

DATA QUALITY ISSUES FOUND BY VALIDATOR:
${reasoning.dataQualityIssues?.join('\n- ') || 'None flagged'}

VALIDATED DATA:
${contextData}

VALIDATION RESULTS:
- Contradictions: ${reasoning.contradictionAnalysis}
- Spatial Mismatch: ${reasoning.spatialMismatchDetected}
- Pivot: ${reasoning.recommendedPivot || 'None needed'}
- Pricing Math: ${reasoning.pricingMathValidation}
- Break-Even: ${reasoning.breakEvenAnalysis}
- Key Risks: ${reasoning.keyRisks?.join(', ')}

Generate a comprehensive Markdown report (minimum 2000 words). Use markdown tables, bold text, and clear structure.

REQUIRED STRUCTURE:

# [Generate a catchy, specific, and professional title for this report — e.g., "Vintage Clothing in Brooklyn: Market Saturation & Pricing Strategy" or "High-End Coffee in Austin: Margin Analysis & Supply Reality"]

## Executive Summary
4-5 paragraphs: key findings, recommended pricing, strategic verdict, market viability. Be HONEST about risks and viability — do not sugarcoat a bad idea.

## 1. Strategic Viability Assessment
✅ VIABLE / ⚠️ VIABLE WITH CONDITIONS / ❌ NOT VIABLE
Be brutally honest. Consider: Does this product/service have demand here? Is the market saturated? Does the owner have the right skills? Is the capital sufficient?

## 2. Market Demographics & Local Economics
| Metric | Value | Source |
|--------|-------|--------|
Include actual data from the research. If data is missing, write "Not available — further research needed" rather than leaving blank or making up numbers.

## 3. Competitive Landscape
| Competitor | Price Range | Strengths | Weaknesses |
|------------|-------------|-----------|------------|
Only include competitors that were ACTUALLY found via web search with real URLs. If competitors are uncertain, note this explicitly.

## 4. Brand Perception & Social Sentiment
Honest assessment. For a pre-launch business, explicitly state "No existing brand presence — positioning opportunity."

## 5. Cost Structure & Supply Chain
| Cost Component | Per-Unit Cost | Notes |
|----------------|---------------|-------|
Use REAL commodity/wholesale prices found via search. Show total marginal cost clearly.

## 6. Pricing Model & Recommendation
Show formula in plain bold text: **P = MC × (1 + M_base + α × S)**

| Parameter | Value | Explanation |
|-----------|-------|-------------|
| MC | $X.XX | Marginal cost per unit |
| M_base | X.X | Base markup |
| α | X.X | Sentiment coefficient |
| S | X.X | Sentiment score |
| **Final Price** | **$X.XX** | Calculated result |

Plug in REAL numbers. If the formula gives an unrealistic price, explain why and suggest adjustments.

## 7. Break-Even Analysis
**Break-Even Volume = Fixed Overhead ÷ (Price − Marginal Cost)**
Show calculation with real numbers. Is this achievable?

## 8. Macroeconomic Context
Current rates, inflation, spending outlook with cited data.

## 9. Risk Factors & Mitigation
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
Be honest about risks. For inexperienced operators, high capital requirements, or difficult markets, say so clearly.

## 10. Honest Assessment & Recommendations
Give the client your REAL opinion. Would YOU invest in this? What would you tell a friend? Include specific action items.

## Sources & Methodology
${sourcesSection}

FINAL INSTRUCTIONS:
- Write professionally but HONESTLY — a good consultant tells the truth, not what the client wants to hear
- Bold key numbers and recommendations
- Use ✅ ⚠️ ❌ indicators where appropriate
- Address the client's core question: "${inputs.coreQuestion || 'optimal pricing and market strategy'}"
- NO LaTeX. NO \\boxed{}. NO \\frac{}. Only plain markdown formatting.`,
    });

    return text;
  } catch (err) {
    console.error('[Orchestrator Error]', err);
    return `# Error Generating Report\n\n${err.message}`;
  }
}
