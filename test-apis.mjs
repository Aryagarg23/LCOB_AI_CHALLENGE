import fs from 'fs';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

const envPath = path.join(process.cwd(), '.env.local');
const envFile = fs.readFileSync(envPath, 'utf-8');
const envVars = {};

envFile.split('\n').forEach(line => {
  const cleanLine = line.replace('\r', '');
  const match = cleanLine.match(/^([^#=]+)="?(.*?)"?$/);
  if (match && match[1]) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

process.env.OPENAI_API_KEY = envVars.OPENAI_API_KEY;

const results = {};

async function testOpenAI() {
  try {
    const openai = createOpenAI({ apiKey: envVars.OPENAI_API_KEY });
    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      prompt: 'Respond exactly with the word "SUCCESS_OPENAI".'
    });
    if (text.includes('SUCCESS_OPENAI')) {
        results.openai = 'SUCCESS: Connected and reasoning.';
    } else {
        results.openai = 'WARNING: Unexpected response ' + text;
    }
  } catch (err) {
    results.openai = 'ERROR: ' + err.message;
  }
}

async function testSupabase() {
  try {
    const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { data, error } = await supabase.storage.getBucket('artifacts');
    if (error) {
       results.supabase = 'ERROR: ' + error.message + ' (Did you create the "artifacts" public bucket?)';
    } else {
       results.supabase = `SUCCESS: Connected to bucket "${data.name}"`;
    }
  } catch (err) {
    results.supabase = 'EXCEPTION: ' + err.message;
  }
}

async function runTests() {
  await testOpenAI();
  await testSupabase();
  fs.writeFileSync('result.json', JSON.stringify(results, null, 2));
}

runTests();
