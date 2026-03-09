import { agent1_Vision } from '@/lib/agents/Agent1_Vision';
import { agent2_Demographics } from '@/lib/agents/Agent2_Demographics';
import { agent3_SalesHistorian } from '@/lib/agents/Agent3_Sales';
import { agent4_Sentiment } from '@/lib/agents/Agent4_Sentiment';
import { agent5_MacroFed } from '@/lib/agents/Agent5_Macro';
import { agent6_Commodities } from '@/lib/agents/Agent6_Commodities';
import { agent7_UrbanMobility } from '@/lib/agents/Agent7_Mobility';
import { agent8_CompetitorAI } from '@/lib/agents/Agent8_Competitor';
import { agent9_Orchestrator } from '@/lib/agents/Agent9_Orchestrator';
import { agent10_RealEstate } from '@/lib/agents/Agent10_RealEstate';
import { agent11_DemandValidation } from '@/lib/agents/Agent11_DemandValidation';
import { agent12_Legal } from '@/lib/agents/Agent12_Legal';
import { agent13_Math } from '@/lib/agents/Agent13_Math';

import { pendingAnswers } from '@/lib/pendingAnswers';

export async function POST(req) {
  try {
    const inputs = await req.json();
    const sessionId = inputs.sessionId || Date.now().toString();
    console.log('[API] Starting parallel analysis', { sessionId, inputs: Object.keys(inputs) });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data) => {
          try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)); } catch (_) {}
        };

        try {
          const agentResults = {};
          const AGENT_LABELS = {
            agent1: 'Brand & Visual Identity',
            agent2: 'Local Demographics',
            agent3: 'Internal Data Analysis',
            agent4: 'Social Sentiment',
            agent5: 'Macroeconomic Indicators',
            agent6: 'Supply Chain Costs',
            agent7: 'Location & Mobility',
            agent8: 'Competitive Landscape',
            agent10: 'Real Estate & Rent',
            agent11: 'Demand Validation',
            agent12: 'Legal & Regulatory',
            agent13: 'Financial Engineering (Math)',
          };

          // Helper: run an agent, handle clarification
          const runAgent = async (key, fn, args) => {
            send({ type: 'agent_start', agent: key, label: AGENT_LABELS[key] });
            try {
              let result = await fn(...args);

              // Check for clarification question
              if (result.clarificationQuestion) {
                send({
                  type: 'agent_question',
                  agent: key,
                  label: AGENT_LABELS[key],
                  question: result.clarificationQuestion,
                });

                // Pause and wait for answer from global pendingAnswers map
                const answer = await new Promise((resolve) => {
                  if (!pendingAnswers.has(sessionId)) pendingAnswers.set(sessionId, {});
                  pendingAnswers.get(sessionId)[key] = resolve;
                });

                send({ type: 'progress', step: 'update', label: `Re-running ${AGENT_LABELS[key]} with your answer...` });

                // Re-run the agent, appending the user's answer as the last argument
                const updatedArgs = [...args, answer];
                const secondResult = await fn(...updatedArgs);
                result = secondResult;
                result.userAnswerProvided = answer; // track for debugging/report
              }

              agentResults[key] = result;
              send({ type: 'agent_done', agent: key, label: AGENT_LABELS[key], data: result });
            } catch (err) {
              console.error(`[${key} Error]`, err.message);
              send({ type: 'agent_done', agent: key, label: AGENT_LABELS[key], data: { name: AGENT_LABELS[key], error: err.message } });
              agentResults[key] = { name: AGENT_LABELS[key], error: err.message };
            }
          };

          // BATCH 1: Vision + Demographics + Macro + Real Estate + Legal (independent)
          send({ type: 'progress', step: 1, total: 5, label: 'Launching research batch 1: Brand, Demographics, Macro, Real Estate, Legal...' });
          await Promise.all([
            runAgent('agent1', agent1_Vision, [inputs, inputs.imageUrls?.[0] || null]),
            runAgent('agent2', agent2_Demographics, [inputs]),
            runAgent('agent5', agent5_MacroFed, [inputs]),
            runAgent('agent10', agent10_RealEstate, [inputs]),
            runAgent('agent12', agent12_Legal, [inputs]),
          ]);

          // BATCH 2: Sales + Sentiment + Mobility + Demand Validation
          send({ type: 'progress', step: 2, total: 5, label: 'Launching batch 2: Sales Data, Sentiment, Location, Demand Validation...' });
          await Promise.all([
            runAgent('agent3', agent3_SalesHistorian, [inputs, inputs.isExistingBusiness]),
            runAgent('agent4', agent4_Sentiment, [inputs]),
            runAgent('agent7', agent7_UrbanMobility, [inputs]),
            runAgent('agent11', agent11_DemandValidation, [inputs]),
          ]);

          // BATCH 3: Commodities + Competitors (market-facing, benefit from all context)
          send({ type: 'progress', step: 3, total: 5, label: 'Launching batch 3: Supply Chain Costs, Competitive Intelligence...' });
          await Promise.all([
            runAgent('agent6', agent6_Commodities, [inputs]),
            runAgent('agent8', agent8_CompetitorAI, [inputs]),
          ]);

          // BATCH 4: Financial Engineering (Math Agent)
          send({ type: 'progress', step: 4, total: 5, label: 'Running Quant Analysis: Financial Engineering & Math...' });
          await runAgent('agent13', agent13_Math, [inputs, agentResults]);

          // BATCH 5: Orchestrator synthesizes everything
          send({ type: 'progress', step: 5, total: 5, label: 'Running CoT validation and checking data realism...' });
          
          send({ type: 'report_start', label: 'Synthesizing all research domains into comprehensive strategy report...' });
          
          let finalReport = await agent9_Orchestrator(inputs, agentResults, (chunk) => {
            send({ type: 'report_chunk', chunk });
          });

          // Prepend uploaded images
          if (inputs.imageUrls?.length > 0) {
            const imageSection = inputs.imageUrls.map(url => `![Uploaded Business Photo](${url})`).join('\n\n');
            finalReport = imageSection + '\n\n---\n\n' + finalReport;
          }
          // Prepend Setting the Scene
          if (inputs.settingTheScene) {
            finalReport = `## Setting the Scene\n\n${inputs.settingTheScene}\n\n---\n\n` + finalReport;
          }

          send({ type: 'complete', data: agentResults, report: finalReport });
        } catch (error) {
          console.error('[API Error]', error);
          send({ type: 'error', error: error.message });
        } finally {
          controller.close();
          pendingAnswers.delete(sessionId);
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[API Error]', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
