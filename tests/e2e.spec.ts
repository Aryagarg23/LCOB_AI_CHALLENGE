import { test, expect } from '@playwright/test';

test.describe('Consultation Flow', () => {
  test('should navigate through the entire consulting flow and publish report', async ({ page }) => {
    test.setTimeout(60000); // 60s allows the real interview to complete and trigger the mocked simulation.

    // We only mock the heavy backend agents to avoid 5-minute runtimes. 
    // The initial interview uses a fast model that we can test against the real API.

    // 3. Mock the Simulate Endpoint (Server-Sent Events)
    await page.route('**/api/simulate', async route => {
      const sseBody = `data: {"type": "progress", "step": 1, "total": 1, "label": "Batch 1"}\n\n` +
                      `data: {"type": "agent_start", "agent": "agent1", "label": "Brand & Value Perception"}\n\n` +
                      `data: {"type": "agent_done", "agent": "agent1", "label": "Brand & Value Perception", "data": {}}\n\n` +
                      `data: {"type": "report_start"}\n\n` +
                      `data: {"type": "report_chunk", "chunk": "# Strategy Report\\n\\nThis is a highly successful bakery."}\n\n` +
                      `data: {"type": "complete", "report": "# Strategy Report\\n\\nThis is a highly successful bakery.", "data": {}}\n\n`;

      return route.fulfill({
        status: 200,
        contentType: 'text/event-stream; charset=utf-8',
        body: sseBody
      });
    });

    // 4. Mock the Artifacts Endpoint (saving the report)
    await page.route('**/api/artifacts', async route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, artifactId: 'mock-id-123' })
      });
    });

    // --- STEP: HOME PAGE ---
    await page.goto('/');
    
    // Click "Try It Now ->" or "Start Your Analysis ->"
    // Multiple buttons exist, we can use the first one matching "Start Your Analysis"
    await page.click('text=Start Your Analysis');

    // --- STEP: UPLOAD PAGE ---
    await expect(page.locator('h1')).toHaveText('New Business Analysis');
    
    // Skip uploads
    await page.click('button:has-text("Skip uploads & start interview")');

    // --- STEP: INTERVIEW PAGE ---
    await expect(page.locator('h1')).toHaveText('Tell us about your business');

    // Fill the chat input
    await page.fill('input[placeholder="e.g. I run a cotton mill in El Paso, TX..."]', 'I want to open an artisanal sourdough bakery in downtown Seattle, ZIP 98101.');
    await page.click('button:has-text("Send")');

    // Wait for the mock to respond with READY_TO_ANALYZE, which automatically transitions the page.
    // The UI should show "Researching Your Market" eventually.
    // However, the AI interviewer might ask a follow-up question.
    // Let's create a loop to answer up to 3 follow-up questions if it doesn't transition.
    
    let isAnalyzing = false;
    for (let i = 0; i < 4; i++) {
      try {
        await expect(page.locator('h1')).toHaveText('Researching Your Market', { timeout: 15000 });
        isAnalyzing = true;
        break;
      } catch (e) {
        // If it timed out, the AI probably asked a follow-up question.
        // Reply with a generic response to satisfy it.
        const inputLocator = page.locator('input[placeholder="e.g. I run a cotton mill in El Paso, TX..."]');
        if (await inputLocator.isVisible()) {
          await inputLocator.fill('Yes, that sounds correct. Please proceed with the analysis.');
          await page.click('button:has-text("Send")');
        } else {
           // Not visible means it might be transitioning or in error state
           break;
        }
      }
    }
    
    expect(isAnalyzing).toBeTruthy();

    // --- STEP: ANALYZING PAGE ---
    // Wait for the AI SDK to complete and UI to show "Analysis Complete", which renders the "Publish Report" button.
    // This can take over 2 minutes since 8 agents run in parallel and the orchestrator writes a long report.
    await expect(page.locator('h3:has-text("Analysis Complete")')).toBeVisible({ timeout: 240000 });

    const publishBtn = page.locator('button:has-text("Publish Report")');
    await expect(publishBtn).toBeVisible();

    // The download button should also exist. We mock the download click by intercepting it or just clicking it.
    // However, downloads in playwright could hang if not handled properly.
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Download Markdown")');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('_strategy_report.md');

    // Click Publish Report
    await publishBtn.click();
  });
});
