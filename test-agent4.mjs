import { agent4_Sentiment } from './src/lib/agents/Agent4_Sentiment.js';

async function testAgent() {
  console.log('Testing Agent 4...');
  const res = await agent4_Sentiment('Starbucks', 'Some recent reviews said it was too expensive.');
  console.log('Result:', res);
}

testAgent();
