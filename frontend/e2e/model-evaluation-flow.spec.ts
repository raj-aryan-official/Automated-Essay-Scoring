import { test, expect } from '@playwright/test';

test.describe('Model Evaluation Dashboard Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate as ML Engineer
    await page.goto('/login');
    await page.locator('#btn-demo-ml_engineer').click();
    await page.waitForURL('/');
  });

  test('navigates to /evaluation, renders QWK bars, loss curves, and live job counts', async ({
    page,
  }) => {
    // 1. Click Model Evaluation nav link
    const navLink = page.locator('#nav-model-eval');
    await expect(navLink).toBeVisible();
    await navLink.click();

    // 2. Verify navigation to /evaluation
    await expect(page).toHaveURL('/evaluation');
    await expect(page.locator('#model-eval-page')).toBeVisible();

    // 3. Verify Acceptance Gate badge and Average QWK metric
    const gateBadge = page.locator('#acceptance-gate-badge');
    await expect(gateBadge).toBeVisible();
    await expect(gateBadge).toContainText(/Acceptance Gate: PASSED/i);

    const avgQwk = page.locator('#average-qwk-value');
    await expect(avgQwk).toBeVisible();
    const avgQwkText = await avgQwk.textContent();
    const parsedAvgQwk = parseFloat(avgQwkText || '0');
    expect(parsedAvgQwk).toBeGreaterThanOrEqual(0.70);

    // 4. Verify Live Job Queue Telemetry cards
    await expect(page.locator('#job-card-queued')).toBeVisible();
    await expect(page.locator('#job-card-processing')).toBeVisible();
    await expect(page.locator('#job-card-completed')).toBeVisible();
    await expect(page.locator('#job-card-failed')).toBeVisible();
    await expect(page.locator('#job-card-total')).toBeVisible();

    // 5. Verify QWK Bar Chart and prompt table
    const qwkChart = page.locator('#qwk-chart-container');
    await expect(qwkChart).toBeVisible();

    const qwkTable = page.locator('#qwk-table');
    await expect(qwkTable).toBeVisible();
    // Verify all 8 prompts are listed in the table
    for (let i = 1; i <= 8; i++) {
      await expect(qwkTable).toContainText(`Prompt ${i}`);
    }

    // 6. Verify Loss Curves section & Prompt Tabs
    const lossChart = page.locator('#loss-chart-container');
    await expect(lossChart).toBeVisible();

    // Verify prompt tab buttons exist
    const tabPrompt1 = page.locator('#tab-prompt-1');
    const tabPrompt2 = page.locator('#tab-prompt-2');
    await expect(tabPrompt1).toBeVisible();
    await expect(tabPrompt2).toBeVisible();

    // Switch to Prompt 2 tab
    await tabPrompt2.click();
    await expect(page.locator('#loss-curves-section')).toContainText('Prompt 2');

    // 7. Verify live job refresh button
    const refreshBtn = page.locator('#btn-refresh-jobs');
    await expect(refreshBtn).toBeVisible();
    await refreshBtn.click();
  });
});
