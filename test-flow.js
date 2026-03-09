const http = require('http');

async function runTest() {
  console.log('🚀 Starting end-to-end integration test of Praxis Economics Backend...');
  
  // 1. Mock an interview transcript for a Palo Alto Matcha Shop
  const transcript = \`
Client: I want to open a high-end specialized matcha and artisanal pastry shop in Palo Alto, CA.
Consultant: Sounds like a great concept. Who are your primary target customers and what makes your matcha unique?
Client: Tech workers and wealthy locals. We source ceremonial grade directly from Uji, Japan.
Consultant: What is your estimated startup budget and expected price point for a standard matcha latte?
Client: We have about $150k in funding. We plan to charge $8 for a latte and $12 for pastries.
\`.trim();

  console.log('\\n[1/3] Parsing Interview...');
  let parsedData;
  try {
    const parseResp = await fetch('http://localhost:3000/api/parse-interview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, uploadedImageUrls: [], uploadedFileNames: [] })
    });
    const { data } = await parseResp.json();
    parsedData = data;
    console.log('✅ Interview parsed successfully:');
    console.log(JSON.stringify(parsedData, null, 2));
  } catch (err) {
    console.error('❌ Failed to parse interview:', err);
    return;
  }

  // 2. Launch Simulation via SSE
  console.log('\\n[2/3] Launching Multi-Agent Simulation (SSE)...');
  const sessionId = Date.now().toString();
  const simulatePayload = { ...parsedData, imageUrls: [], sessionId };

  try {
    return new Promise((resolve, reject) => {
      const req = http.request('http://localhost:3000/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, (res) => {
        
        let reportText = '';
        let stepCount = 0;

        res.on('data', (chunk) => {
          const lines = chunk.toString().split('\\n\\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const event = JSON.parse(line.slice(6));
                
                if (event.type === 'progress') {
                  console.log(\`🔵 Progress [Batches]: \${event.label}\`);
                }
                
                if (event.type === 'agent_start') {
                  console.log(\`🟢 Agent Started: \${event.label}\`);
                }

                if (event.type === 'agent_done') {
                  console.log(\`✅ Agent Finished: \${event.label}\`);
                  stepCount++;
                }

                if (event.type === 'report_start') {
                  console.log('\\n🟡 [ORCHESTRATOR] Streams starting...');
                }

                if (event.type === 'report_chunk') {
                  // Print chunks cleanly
                  process.stdout.write(event.chunk);
                  reportText += event.chunk;
                }

                if (event.type === 'complete') {
                  console.log('\\n\\n🎉 [3/3] SIMULATION COMPLETE!');
                  console.log(\`Total Agents Completed: \${stepCount}\`);
                  console.log(\`Final Report Length: \${reportText.length} characters\`);
                  resolve();
                }

                if (event.type === 'error') {
                  console.error('\\n❌ API Error Event:', event.error);
                  resolve();
                }

              } catch (e) {
                // Ignore incomplete JSON chunks bridging
              }
            }
          }
        });

        res.on('end', () => resolve());
      });

      req.on('error', (e) => {
        console.error('❌ Request error:', e);
        resolve();
      });

      req.write(JSON.stringify(simulatePayload));
      req.end();
    });
  } catch (err) {
    console.error('❌ Failed simulation:', err);
  }
}

runTest();
