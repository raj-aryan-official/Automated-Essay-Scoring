import { test, expect } from '@playwright/test';

test.describe('Reviewer Override Flow (Section 4.1 & POST /api/v1/essays/:id/review)', () => {
  test('submits essay, scores it, applies teacher override, and verifies FINALIZED status and score persistence', async ({
    page,
  }) => {
    // 1. Visit submission page and submit essay
    await page.goto('/');
    const promptSelect = page.locator('select');
    await promptSelect.selectOption({ index: 0 });

    const sampleEssay =
      'The emergence of computing infrastructure has fundamentally transformed modern education and global collaboration. ' +
      'Computers allow students to access boundless information, collaborate across borders, and develop technical skills ' +
      'vital for tomorrow\'s workforce. While challenges such as digital distractions and unequal access exist, the pedagogical ' +
      'benefits of educational technology far outweigh the drawbacks when implemented thoughtfully.';

    const textarea = page.locator('textarea');
    await textarea.fill(sampleEssay);

    const submitBtn = page.locator('button[type="submit"]', { hasText: 'Submit Essay' });
    await submitBtn.click();

    // 2. Score the essay
    await expect(page.locator('text=Essay Submitted Successfully!')).toBeVisible({ timeout: 10000 });
    const scoreNowBtn = page.locator('button', { hasText: 'Score Essay Now' });
    await scoreNowBtn.click();

    // 3. Wait for Score Workspace to render
    const scoreWorkspace = page.locator('#score-workspace');
    await expect(scoreWorkspace).toBeVisible({ timeout: 35000 });

    // 4. Verify Reviewer Override Panel exists
    const overridePanel = page.locator('#reviewer-override-panel');
    await expect(overridePanel).toBeVisible();

    // 5. Test Role Switching: switch to STUDENT mode and verify restriction
    const studentBtn = page.locator('#role-selector-student');
    await studentBtn.click();
    await expect(page.locator('text=You are viewing this workspace in STUDENT mode')).toBeVisible();

    // 6. Switch back to TEACHER mode
    const teacherBtn = page.locator('#role-selector-teacher');
    await teacherBtn.click();

    // 7. Verify override score input and reason textarea
    const scoreInput = page.locator('#reviewer-override-score-input');
    const reasonInput = page.locator('#reviewer-override-reason-input');
    const submitOverrideBtn = page.locator('#btn-submit-override');

    await expect(scoreInput).toBeVisible();
    await expect(reasonInput).toBeVisible();

    // Submit button should be disabled when reason is empty
    await reasonInput.fill('');
    await expect(submitOverrideBtn).toBeDisabled();

    // 8. Fill in override score and pedagogical reason
    await scoreInput.fill('10.5');
    await reasonInput.fill('Exceptional depth of synthesis and vocabulary in paragraphs 2 and 3 justifies a score adjustment.');

    // Submit button should now be enabled
    await expect(submitOverrideBtn).toBeEnabled();
    await submitOverrideBtn.click();

    // 9. Verify success banner and finalized card
    await expect(page.locator('#override-success-banner')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#override-finalized-card')).toBeVisible();

    // 10. Verify essay status pill updates to FINALIZED
    const statusPill = page.locator('#essay-status-pill');
    await expect(statusPill).toContainText('FINALIZED');

    // 11. Verify HolisticScoreCard displays the human override
    const overrideBox = page.locator('#reviewer-override-box');
    await expect(overrideBox).toBeVisible();
    await expect(overrideBox).toContainText('10.50');
    await expect(overrideBox).toContainText('Exceptional depth of synthesis');
  });
});
