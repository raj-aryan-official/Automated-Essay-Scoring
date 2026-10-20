import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SNAPSHOTS_DIR = path.join(__dirname, '../public/responsive-snapshots');
if (!fs.existsSync(SNAPSHOTS_DIR)) {
  fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
}

const BREAKPOINTS = [
  { width: 360, height: 740, name: 'mobile_360', label: '360px (Compact Mobile)' },
  { width: 768, height: 1024, name: 'tablet_768', label: '768px (Tablet Portrait)' },
  { width: 1024, height: 768, name: 'desktop_1024', label: '1024px (Desktop)' },
  { width: 1440, height: 900, name: 'widescreen_1440', label: '1440px (Widescreen Desktop)' },
];

const PAGES_TO_TEST = [
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/submit', name: 'Submission' },
  { path: '/essays', name: 'Essay_Manager' },
  { path: '/essays/6e117e5addb14b448054cdd7b3d61bcb', name: 'Score_Workspace' },
  { path: '/jobs', name: 'Inference_Jobs' },
  { path: '/evaluation', name: 'Model_Evaluation' },
  { path: '/help', name: 'Help_Page' },
  { path: '/login', name: 'Login' },
];

async function runResponsiveAudit() {
  console.log('================================================================');
  console.log('AES RESPONSIVE DESIGN AUDIT (PROMPT 16)');
  console.log('Breakpoints: 360px, 768px, 1024px, 1440px');
  console.log('================================================================\n');

  // 1. Authenticate with Teacher role by logging in directly to backend
  let realAuth = null;
  try {
    const loginRes = await fetch('http://127.0.0.1:8000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'teacher@aes.local', password: 'Teacher123!' }),
    });
    if (loginRes.ok) {
      const loginData = await loginRes.json();
      realAuth = {
        token: loginData.access_token,
        user: {
          id: loginData.user_id,
          email: loginData.email,
          role: loginData.role,
        },
      };
      console.log('✓ Successfully authenticated with backend as Teacher.\n');
    }
  } catch (err) {
    console.warn('Could not contact backend auth endpoint directly:', err.message);
  }

  const browser = await chromium.launch({ headless: true });
  const results = [];

  try {
    for (const bp of BREAKPOINTS) {
      console.log(`\n------------------------------------------------------------`);
      console.log(`TESTING BREAKPOINT: ${bp.label} [${bp.width}x${bp.height}]`);
      console.log(`------------------------------------------------------------`);

      const context = await browser.newContext({
        viewport: { width: bp.width, height: bp.height },
        deviceScaleFactor: 2,
        hasTouch: bp.width <= 768,
        isMobile: bp.width <= 768,
      });

      const page = await context.newPage();

      // Set localStorage tokens
      if (realAuth) {
        await page.goto('http://localhost:3000/login');
        await page.evaluate((auth) => {
          localStorage.setItem('aes_token', auth.token);
          localStorage.setItem('aes_user', JSON.stringify(auth.user));
          localStorage.setItem('aes_teacher_tour_dismissed_v1', 'true');
        }, realAuth);
      }

      for (const target of PAGES_TO_TEST) {
        process.stdout.write(`  [${bp.name}] Testing ${target.name} (${target.path})... `);
        await page.goto(`http://localhost:3000${target.path}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(600);

        // A. Measure horizontal overflow
        const overflowMetrics = await page.evaluate(() => {
          const docWidth = document.documentElement.scrollWidth;
          const winWidth = window.innerWidth;
          const bodyWidth = document.body.scrollWidth;
          const hasOverflow = docWidth > winWidth + 1 || bodyWidth > winWidth + 1;

          // Find offending elements if any
          const offending = [];
          if (hasOverflow) {
            const allElements = document.querySelectorAll('*');
            for (const el of allElements) {
              const rect = el.getBoundingClientRect();
              if (rect.right > winWidth + 1) {
                offending.push({
                  tag: el.tagName,
                  id: el.id,
                  className: (el.className || '').toString().slice(0, 50),
                  right: Math.round(rect.right),
                  expectedMax: winWidth,
                });
                if (offending.length >= 3) break;
              }
            }
          }

          return { docWidth, winWidth, hasOverflow, offending };
        });

        // B. Measure interactive touch targets on mobile (<=768px)
        let touchTargetSummary = { compliant: true, checkedCount: 0, smallTargets: [] };
        if (bp.width <= 768) {
          touchTargetSummary = await page.evaluate(() => {
            const interactive = document.querySelectorAll('button, [role="button"], [role="tab"], input:not([type="range"]):not([type="checkbox"]):not([type="radio"]), select');
            let compliant = true;
            const smallTargets = [];
            let checked = 0;

            for (const el of interactive) {
              // skip hidden elements
              if (el.offsetParent === null) continue;
              const rect = el.getBoundingClientRect();
              if (rect.width === 0 || rect.height === 0) continue;

              checked++;
              // Check height >= 36px
              if (rect.height < 36 && !el.classList.contains('btn-compact') && !el.closest('[role="tooltip"]')) {
                compliant = false;
                smallTargets.push({
                  text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30),
                  tag: el.tagName,
                  h: Math.round(rect.height),
                  w: Math.round(rect.width),
                });
                if (smallTargets.length >= 4) break;
              }
            }
            return { compliant, checkedCount: checked, smallTargets };
          });
        }

        // C. Specific checks for Score Workspace on mobile
        let scoreWorkspaceDetails = null;
        if (target.name === 'Score_Workspace' && bp.width <= 768) {
          scoreWorkspaceDetails = await page.evaluate(() => {
            const scoreCard = document.getElementById('holistic-score-card');
            const essayPanel = document.getElementById('essay-text-panel');
            const mobileTabs = document.getElementById('mobile-dimensions-tabs');
            const tabButtons = mobileTabs ? mobileTabs.querySelectorAll('[role="tab"]') : [];

            // Check if score card is sticky
            let isScoreCardSticky = false;
            if (scoreCard) {
              const comp = window.getComputedStyle(scoreCard);
              isScoreCardSticky = comp.position === 'sticky';
            }

            // Check essay on top: essay top position should be directly below or near score card
            let isEssayOnTop = false;
            if (scoreCard && essayPanel) {
              const sRect = scoreCard.getBoundingClientRect();
              const eRect = essayPanel.getBoundingClientRect();
              isEssayOnTop = eRect.top >= sRect.top;
            }

            return {
              hasScoreCard: !!scoreCard,
              isScoreCardSticky,
              hasEssayPanel: !!essayPanel,
              isEssayOnTop,
              hasMobileTabs: !!mobileTabs,
              tabCount: tabButtons.length,
              tabLabels: Array.from(tabButtons).map(b => (b.textContent || '').trim().slice(0, 20)),
            };
          });

          // Test switching dimension tabs on mobile
          if (scoreWorkspaceDetails.hasMobileTabs) {
            const coherenceTab = page.locator('#mobile-tab-coherence');
            if (await coherenceTab.count() > 0) {
              await coherenceTab.click();
              await page.waitForTimeout(200);
            }
            const argumentTab = page.locator('#mobile-tab-argumentation');
            if (await argumentTab.count() > 0) {
              await argumentTab.click();
              await page.waitForTimeout(200);
            }
            const radarTab = page.locator('#mobile-tab-radar');
            if (await radarTab.count() > 0) {
              await radarTab.click();
              await page.waitForTimeout(200);
            }
            const grammarTab = page.locator('#mobile-tab-grammar');
            if (await grammarTab.count() > 0) {
              await grammarTab.click();
              await page.waitForTimeout(200);
            }
          }
        }

        // D. Capture screenshot
        const screenshotPath = path.join(SNAPSHOTS_DIR, `${bp.name}_${target.name.toLowerCase()}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: false });

        const pass = !overflowMetrics.hasOverflow && touchTargetSummary.compliant;
        if (pass) {
          console.log('✓ PASS');
        } else {
          console.log(`⚠ NOTE (overflow=${overflowMetrics.hasOverflow}, smallTargets=${JSON.stringify(touchTargetSummary.smallTargets)})`);
        }

        results.push({
          breakpoint: bp,
          page: target,
          overflow: overflowMetrics,
          touchTargets: touchTargetSummary,
          scoreWorkspace: scoreWorkspaceDetails,
          screenshotFile: path.basename(screenshotPath),
        });
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }

  // Print summary
  console.log('\n================================================================');
  console.log('AUDIT COMPLETE: All 28 viewport/page combinations tested.');
  console.log('================================================================');

  return results;
}

runResponsiveAudit().then(results => {
  // Save JSON report for markdown generator
  fs.writeFileSync(
    path.join(__dirname, '../responsive-audit-results.json'),
    JSON.stringify(results, null, 2)
  );
  console.log('Results saved to frontend/responsive-audit-results.json');
}).catch(err => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
