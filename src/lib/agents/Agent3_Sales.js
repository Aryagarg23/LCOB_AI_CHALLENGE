import { generateObject, tool } from 'ai';
import { getAgentModel } from '@/lib/ai-provider';
import { webSearchTool } from '@/lib/tools';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const executeNodeScript = tool({
  description: 'Executes a Node.js script to analyze CSV data files. Use fs module with exact file paths. Console.log results as JSON.',
  parameters: z.object({
    scriptCode: z.string().describe('Complete Node.js code. Must console.log() results as JSON.')
  }).strict(),
  execute: async ({ scriptCode }) => {
    try {
      const tmpPath = path.join(process.cwd(), '.tmp_eval_script.js');
      fs.writeFileSync(tmpPath, `const fs = require('fs');\n` + scriptCode);
      const output = execSync(`node ${tmpPath}`, { encoding: 'utf-8', timeout: 15000 });
      fs.unlinkSync(tmpPath);
      return output;
    } catch (error) {
      return `Script Error: ${error.message}`;
    }
  }
});

export async function agent3_SalesHistorian(inputs, isExistingBusiness = true, userAnswer = null) {
  const { businessAgeMonths, productType, businessType, additionalContext } = inputs;
  console.log(`[Sales Data] Processing internal business data...`);

  let dataDir = path.join(process.cwd(), 'public', 'data').replace(/\\/g, '/');

  try {
    const isPreLaunch = !isExistingBusiness;
    const { object } = await generateObject({
      model: getAgentModel('gpt-4.1-nano'),
      tools: { web_search: webSearchTool, runAnalysis: executeNodeScript },
      maxSteps: 5,
      schema: z.object({
        name: z.string(),
        priceElasticityDemand: z.number().describe('Price Elasticity of Demand from transaction data'),
        fixedOverheadAssumption: z.number().describe('Weekly fixed overhead from employee/operational data (USD)'),
        avgTransactionValue: z.number().describe('Average transaction value from the data'),
        recommendation: z.string().describe('Strategic recommendation based on data patterns'),
        impact: z.string().describe('How PED constrains or enables pricing flexibility'),
        reasoning: z.string().describe('Step-by-step methodology of calculations'),
        sources: z.array(z.string()).describe('Data files and web sources used'),
        clarificationQuestion: z.string().nullable().describe(isPreLaunch ? 'Since this is a PRE-LAUNCH business with no data, ask what their PROJECTED revenue breakdown or target margins are instead. Otherwise null.' : 'If the data is insufficient, ask about revenue breakdown, top-selling products, or seasonal patterns. Otherwise null.'),
      }),
      prompt: `You are a data science analyst for a ${businessType || 'retail'} business. Analyze internal databases:
1. ${dataDir}/employee_data.csv — Employee roles, hourly rates, weekly hours
2. ${dataDir}/customer_transactions.csv — 5000+ transactions with prices, quantities, categories

Use 'runAnalysis' tool to write Node.js that:
1. Reads employee CSV → calculates total weekly labor overhead
2. Reads transactions CSV → estimates Price Elasticity of Demand for "${productType}" (or closest category match)
3. Console.log JSON: { weeklyOverhead, elasticity, avgPrice, totalTransactions }

Parse CSVs via string split. Business Type: "${businessType}", Age: ${businessAgeMonths} months, Product: "${productType}"
CONTEXT: ${JSON.stringify(inputs)}
${isPreLaunch ? 'Context: THIS IS A PRE-LAUNCH / NEW BUSINESS. You are estimating theoretical/projected elasticity.' : ''}
${userAnswer ? `\nUSER ANSWER TO YOUR PREVIOUS CLARIFICATION QUESTION:\n"${userAnswer}"\nHIGHEST PRIORITY: use this new information to finalize your analysis.` : ''}`,
    });
    return object;
  } catch (err) {
    console.error('[Sales Data Error]', err);
    return { name: 'Sales Analysis', priceElasticityDemand: 1.0, fixedOverheadAssumption: 0, avgTransactionValue: 0, recommendation: 'Error', impact: 'Failed', reasoning: 'LLM call failed', sources: [], clarificationQuestion: null };
  }
}
