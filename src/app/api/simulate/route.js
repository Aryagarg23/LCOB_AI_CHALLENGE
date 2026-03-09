import { agent1_Vision } from '@/lib/agents/Agent1_Vision';
import { agent2_Demographics } from '@/lib/agents/Agent2_Demographics';
import { agent3_SalesHistorian } from '@/lib/agents/Agent3_Sales';
import { agent4_Sentiment } from '@/lib/agents/Agent4_Sentiment';
import { agent5_MacroFed } from '@/lib/agents/Agent5_Macro';
import { agent6_Commodities } from '@/lib/agents/Agent6_Commodities';
import { agent7_UrbanMobility } from '@/lib/agents/Agent7_Mobility';
import { agent8_CompetitorAI } from '@/lib/agents/Agent8_Competitor';
import { agent9_Orchestrator } from '@/lib/agents/Agent9_Orchestrator';

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

          // BATCH 1: Vision + Demographics + Macro (independent, no business-specific data needed)
          send({ type: 'progress', step: 1, total: 4, label: 'Launching research batch 1: Brand Analysis, Demographics, Macroeconomic Scan...' });
          await Promise.all([
            runAgent('agent1', agent1_Vision, [inputs.aesthetic || '', inputs.imageUrls?.[0] || null, inputs.businessAgeMonths]),
            runAgent('agent2', agent2_Demographics, [inputs.zipcode || '']),
            runAgent('agent5', agent5_MacroFed, []),
          ]);

          // BATCH 2: Sales + Sentiment + Mobility (may use Batch 1 context)
          send({ type: 'progress', step: 2, total: 4, label: 'Launching batch 2: Sales Data, Sentiment Analysis, Location Assessment...' });
          await Promise.all([
            runAgent('agent3', agent3_SalesHistorian, [Number(inputs.businessAgeMonths) || 0, inputs.productType || '', inputs.businessType || '']),
            runAgent('agent4', agent4_Sentiment, [inputs.businessName || '', inputs.recentReviews || '', inputs.businessAgeMonths]),
            runAgent('agent7', agent7_UrbanMobility, [inputs.address || '', inputs.zipcode || '']),
          ]);

          // BATCH 3: Commodities + Competitors (market-facing, benefit from all context)
          send({ type: 'progress', step: 3, total: 4, label: 'Launching batch 3: Supply Chain Costs, Competitive Intelligence...' });
          await Promise.all([
            runAgent('agent6', agent6_Commodities, [inputs.productType || '', inputs.businessType || '', inputs.businessAgeMonths]),
            runAgent('agent8', agent8_CompetitorAI, [inputs.zipcode || '', inputs.productType || '', inputs.businessType || '', inputs.businessAgeMonths]),
          ]);

          // BATCH 4: Orchestrator synthesizes everything
          send({ type: 'progress', step: 4, total: 4, label: 'Synthesizing findings into comprehensive strategy report...' });
          let finalReport = await agent9_Orchestrator(inputs, agentResults);

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
