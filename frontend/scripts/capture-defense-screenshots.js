import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, '../public/defense-screenshots');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function captureScreenshots() {
  console.log('================================================================');
  console.log('CAPTURING HIGH-RES PROJECT DEFENSE SCREENSHOTS (PROMPT 20)');
  console.log(`Target Directory: ${OUTPUT_DIR}`);
  console.log('================================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2, // High-DPI Retina resolution
  });

  const page = await context.newPage();

  // Helper for screenshot
  const takeShot = async (name, delay = 500) => {
    await page.waitForTimeout(delay);
    const filePath = path.join(OUTPUT_DIR, `${name}.png`);
    await page.screenshot({ path: filePath, fullPage: false });
    console.log(`  ✓ Captured: ${name}.png`);
  };

  try {
    // 1. Login Page (Light)
    await page.goto('http://localhost:3000/login');
    await takeShot('01_login_light');

    // 2. Login Page (Dark Mode)
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('aes_theme_preference', 'dark');
    });
    await takeShot('02_login_dark');

    // Reset back to system/light for standard tour & dashboard
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('aes_theme_preference', 'light');
    });

    // Login as Teacher
    await page.locator('#btn-demo-teacher').click();
    await page.waitForTimeout(600);

    // 3. Product Tour First-Run Guidance Modal
    await page.evaluate(() => {
      localStorage.removeItem('aes_teacher_tour_dismissed_v1');
    });
    await page.locator('#topbar-launch-tour-btn').click();
    await takeShot('03_product_tour_guidance', 600);

    // Dismiss tour
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // 4. Submission Page with 1-Click Sample Essay Preset
    await page.goto('http://localhost:3000/submit');
    await page.waitForTimeout(400);
    // Click load sample essay
    const sampleBtn = page.locator('#btn-load-sample-prompt-1');
    if (await sampleBtn.count() > 0) {
      await sampleBtn.click();
      await page.waitForTimeout(300);
    }
    await takeShot('04_submission_quickstart_sample');

    // 5. Dashboard Analytics
    await page.goto('http://localhost:3000/dashboard');
    await takeShot('05_dashboard_analytics', 800);

    // 6. Score Workspace (Scored Essay)
    await page.goto('http://localhost:3000/essays/6e117e5addb14b448054cdd7b3d61bcb');
    await page.waitForTimeout(1500);
    await takeShot('06_score_workspace_full');

    // 7. Score Card & Dimension Radar
    const radarSection = page.locator('#dimension-radar-card');
    if (await radarSection.count() > 0) {
      await radarSection.scrollIntoViewIfNeeded();
      await takeShot('07_score_card_radar_dimensions');
    }

    // 8. Reviewer Override Panel
    const overridePanel = page.locator('#reviewer-override-panel');
    if (await overridePanel.count() > 0) {
      await overridePanel.scrollIntoViewIfNeeded();
      await takeShot('08_reviewer_override_panel');
    }

    // 9. Model Evaluation (QWK & Loss Curves)
    await page.goto('http://localhost:3000/evaluation');
    await takeShot('09_model_evaluation_qwk_loss', 800);

    // 10. Inference Jobs Telemetry
    await page.goto('http://localhost:3000/jobs');
    await takeShot('10_inference_jobs_telemetry', 800);

    // 11. Help & Frequently Asked Questions (Accordion expanded)
    await page.goto('http://localhost:3000/help');
    await page.waitForTimeout(500);
    const firstFaqTrigger = page.locator('button[aria-controls="faq-answer-how-bert-scores"]');
    if (await firstFaqTrigger.count() > 0) {
      await firstFaqTrigger.click();
    }
    await takeShot('11_help_page_faqs');

    // 12. UI Component Library
    await page.goto('http://localhost:3000/dev/components');
    await takeShot('12_ui_component_library', 800);

    console.log('\n================================================================');
    console.log('✓ All 12 Project Defense Screenshots captured successfully!');
    console.log('================================================================\n');
  } catch (err) {
    console.error('Error during screenshot capture:', err);
  } finally {
    await browser.close();
  }
}

captureScreenshots();
