import { test, expect } from '@playwright/test';

test.describe('End-to-End Submit -> Score -> Review Flow', () => {
  test('submits an essay, dispatches AI scoring, polls through lifecycle, and renders Score Workspace', async ({ page }) => {
    // 1. Visit the submission page
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Submit Essay for Scoring');

    // 2. Select Prompt 1
    const promptSelect = page.locator('select');
    await promptSelect.selectOption({ index: 0 });

    // 3. Enter student essay text
    const sampleEssay =
      'The emergence of computing infrastructure has fundamentally transformed modern education and global collaboration. ' +
      'Computers allow students to access boundless information, collaborate across borders, and develop technical skills ' +
      'vital for tomorrow\'s workforce. While challenges such as digital distractions and unequal access exist, the pedagogical ' +
      'benefits of educational technology far outweigh the drawbacks when implemented thoughtfully.';

    const textarea = page.locator('textarea');
    await textarea.fill(sampleEssay);

    // Verify word and character counters
    await expect(page.locator('text=words')).toBeVisible();

    // 4. Click Submit Essay
    const submitBtn = page.locator('button[type="submit"]', { hasText: 'Submit Essay' });
    await submitBtn.click();

    // 5. Confirm submission success banner appears with SUBMITTED status and essay ID
    await expect(page.locator('text=Essay Submitted Successfully!')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Status: SUBMITTED')).toBeVisible();

    // 6. Click "Score Essay Now" button from the success banner
    const scoreNowBtn = page.locator('button', { hasText: 'Score Essay Now' });
    await scoreNowBtn.click();

    // 7. Verify navigation to the Essay Detail page (/essays/:id)
    await expect(page).toHaveURL(/\/essays\/[a-f0-9-]+/);

    // 8. Verify the lifecycle polling panel or scored status
    // The status pill should progress through PROCESSING / SCORED / FEEDBACK_READY
    const statusPill = page.locator('#essay-status-pill');
    await expect(statusPill).toBeVisible();

    // 9. Wait for the scoring to complete and auto-transition to Score Workspace
    const scoreWorkspace = page.locator('#score-workspace');
    await expect(scoreWorkspace).toBeVisible({ timeout: 35000 });

    // 10. Assert Holistic Score Card elements
    const holisticScoreCard = page.locator('#holistic-score-card');
    await expect(holisticScoreCard).toBeVisible();

    const scoreValue = page.locator('#holistic-score-value');
    await expect(scoreValue).toBeVisible();
    const scoreText = await scoreValue.textContent();
    const parsedScore = parseFloat(scoreText || '0');
    expect(parsedScore).toBeGreaterThanOrEqual(2.0);
    expect(parsedScore).toBeLessThanOrEqual(12.0);

    const rubricBand = page.locator('#rubric-band-badge');
    await expect(rubricBand).toBeVisible();

    const confidenceBadge = page.locator('#confidence-badge');
    await expect(confidenceBadge).toBeVisible();

    // 11. Assert Control Rail elements
    const controlRail = page.locator('#control-rail');
    await expect(controlRail).toBeVisible();

    const grammarToggle = page.locator('#toggle-dimension-grammar');
    const coherenceToggle = page.locator('#toggle-dimension-coherence');
    const argumentationToggle = page.locator('#toggle-dimension-argumentation');
    await expect(grammarToggle).toBeVisible();
    await expect(coherenceToggle).toBeVisible();
    await expect(argumentationToggle).toBeVisible();

    const thresholdSlider = page.locator('#confidence-threshold-slider');
    await expect(thresholdSlider).toBeVisible();

    // 12. Assert Inspection Drawer with all 3 dimension feedbacks
    const inspectionDrawer = page.locator('#inspection-drawer');
    await expect(inspectionDrawer).toBeVisible();

    const grammarFeedback = page.locator('#drawer-item-grammar');
    const coherenceFeedback = page.locator('#drawer-item-coherence');
    const argumentationFeedback = page.locator('#drawer-item-argumentation');

    await expect(grammarFeedback).toBeVisible();
    await expect(coherenceFeedback).toBeVisible();
    await expect(argumentationFeedback).toBeVisible();

    // Verify feedback text content is non-empty
    await expect(grammarFeedback).toContainText(/grammar/i);
    await expect(coherenceFeedback).toContainText(/coherence/i);
    await expect(argumentationFeedback).toContainText(/argumentation/i);

    // 13. Test interactivity: toggle a dimension and verify inspection drawer updates
    await grammarToggle.click();
    await expect(grammarFeedback).not.toBeVisible();
    await grammarToggle.click();
    await expect(grammarFeedback).toBeVisible();
  });
});
