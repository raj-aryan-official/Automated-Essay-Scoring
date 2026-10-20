import { JSDOM } from 'jsdom';
import axe from 'axe-core';

async function auditHtml(name, htmlSnippet) {
  const dom = new JSDOM(`<!DOCTYPE html><html lang="en"><head><title>Test</title></head><body style="background:#0b0f19;color:#f8fafc;">${htmlSnippet}</body></html>`, {
    runScripts: 'dangerously',
  });

  // Inject axe-core into the jsdom environment
  dom.window.eval(axe.source);

  const results = await dom.window.axe.run(dom.window.document, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
    },
  });

  return {
    name,
    violations: results.violations,
    passes: results.passes.length,
    incomplete: results.incomplete.length,
    inapplicable: results.inapplicable.length,
  };
}

async function main() {
  console.log('Running Axe WCAG 2.1 AA Audit on Core AES Components...\n');

  const components = [
    {
      name: 'AppShell & Skip-to-Content Navigation',
      html: `
        <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
          <a href="#main-content" class="sr-only focus:not-sr-only" aria-label="Skip navigation and jump to main content">Skip to main content</a>
          <header class="h-16 bg-slate-900 border-b border-slate-800">
            <nav aria-label="Main Navigation">
              <ul>
                <li><a href="/dashboard">Dashboard</a></li>
                <li><a href="/submit">Submit Essay</a></li>
                <li><a href="/essays">Essay Manager</a></li>
                <li><a href="/evaluation">Model Evaluation</a></li>
              </ul>
            </nav>
          </header>
          <main id="main-content" tabindex="-1" aria-label="Main Content Area">
            <h1>Automated Essay Scoring Workspace</h1>
            <p>Welcome to the assessment portal.</p>
          </main>
        </div>
      `,
    },
    {
      name: 'Modal Dialog with Focus Trap & ARIA Semantics',
      html: `
        <div role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby="modal-desc">
          <div class="modal-card">
            <h2 id="modal-title">Confirm Reviewer Score Override</h2>
            <p id="modal-desc">You are overriding the automated model score from 8.5 to 10.0.</p>
            <form>
              <label for="reason-input">Mandatory justification reason:</label>
              <textarea id="reason-input" required aria-required="true"></textarea>
              <button type="button" aria-label="Close dialog">Cancel</button>
              <button type="submit">Confirm Override</button>
            </form>
          </div>
        </div>
      `,
    },
    {
      name: 'Drawer Slide-Over with Focus Trap',
      html: `
        <div role="dialog" aria-modal="true" aria-labelledby="drawer-title" aria-describedby="drawer-desc">
          <div class="drawer-panel">
            <h2 id="drawer-title">Inspection Drawer — Grammar Mechanics</h2>
            <p id="drawer-desc">Detailed grammatical diagnostic telemetry and span highlights.</p>
            <button type="button" aria-label="Close drawer">Close</button>
            <section aria-labelledby="issues-heading">
              <h3 id="issues-heading">Detected Grammar Spans</h3>
              <ul>
                <li>Subject-verb disagreement at paragraph 2</li>
              </ul>
            </section>
          </div>
        </div>
      `,
    },
    {
      name: 'ScoreCard with Segmented Rubric Bands (Icons & Labels)',
      html: `
        <section aria-labelledby="score-heading">
          <h2 id="score-heading">Holistic Score Evaluation</h2>
          <div class="score-display">
            <span class="score-value" aria-label="Score: 9.5 out of 12">9.5</span>
            <span>out of 12.0</span>
          </div>
          <div role="group" aria-label="Rubric Band Calibration Scale">
            <div class="band-card" aria-label="Below Basic: 2 to 4.5 points, Needs Revision">
              <span>Below Basic (Needs Revision)</span>
            </div>
            <div class="band-card" aria-label="Basic: 4.5 to 7.0 points, Developing">
              <span>Basic (Developing)</span>
            </div>
            <div class="band-card active" aria-current="true" aria-label="Proficient: 7.0 to 9.5 points, Meets Standard (Current Band)">
              <span>Proficient (Meets Standard) — Current Band</span>
            </div>
            <div class="band-card" aria-label="Advanced: 9.5 to 12 points, Exceeds Standard">
              <span>Advanced (Exceeds Standard)</span>
            </div>
          </div>
        </section>
      `,
    },
    {
      name: 'Asynchronous Job Progress Stepper with ARIA Progressbar & Live Region',
      html: `
        <div role="region" aria-label="Asynchronous scoring job progress">
          <h3>Asynchronous Scoring Job</h3>
          <div role="progressbar" aria-label="Scoring progression pipeline" aria-valuenow="3" aria-valuemin="1" aria-valuemax="5" aria-valuetext="Step 3 of 5: Scoring (DeBERTa Ensemble)">
            <ol>
              <li>Step 1: Queued</li>
              <li>Step 2: Processing</li>
              <li aria-current="step">Step 3: Scoring</li>
              <li>Step 4: Generating feedback</li>
              <li>Step 5: Done</li>
            </ol>
          </div>
          <div role="status" aria-live="polite" aria-atomic="true">
            Scoring job status: Scoring. Step 3 of 5. Running DeBERTa & LightGBM ensemble models.
          </div>
        </div>
      `,
    },
    {
      name: 'Toast Notifications Live Region',
      html: `
        <div role="region" aria-label="Notifications" aria-live="polite" aria-atomic="false">
          <div role="status" aria-atomic="true">
            <span>Score saved successfully.</span>
            <button type="button" aria-label="Dismiss notification: Score saved successfully">Dismiss</button>
          </div>
        </div>
      `,
    },
    {
      name: 'Data Tables (Per-Prompt QWK, Drift View, Loss Curves Alternatives)',
      html: `
        <section aria-labelledby="qwk-table-title">
          <h2 id="qwk-table-title">Per-Prompt QWK Benchmarks</h2>
          <table>
            <caption>Quadratic Weighted Kappa by ASAP prompt against 0.70 acceptance gate</caption>
            <thead>
              <tr>
                <th scope="col">Prompt</th>
                <th scope="col">Genre</th>
                <th scope="col">Rubric Range</th>
                <th scope="col">Achieved QWK</th>
                <th scope="col">Gate Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Prompt 1</th>
                <td>Persuasive</td>
                <td>[2, 12]</td>
                <td>0.8124</td>
                <td><span role="status">PASS</span></td>
              </tr>
            </tbody>
          </table>
        </section>
      `,
    },
    {
      name: 'Submission Page Two-Tab Form Experience',
      html: `
        <main aria-label="Essay Submission Portal">
          <h1>Submit Essay for Automated Assessment</h1>
          <form>
            <div>
              <label for="prompt-dropdown">Select Target Prompt Rubric:</label>
              <select id="prompt-dropdown" required aria-required="true">
                <option value="1">Prompt 1 — Computers in Society (Rubric 2-12)</option>
              </select>
            </div>
            <div>
              <label for="essay-text-input">Paste Essay Prose:</label>
              <textarea id="essay-text-input" aria-describedby="char-counter" required></textarea>
              <div id="char-counter" aria-live="polite">2,450 / 8,000 characters used</div>
            </div>
            <fieldset>
              <legend>Or Upload File Attachment</legend>
              <label for="file-upload-input">Drag &amp; drop PDF or DOCX (Max 20MB):</label>
              <input type="file" id="file-upload-input" accept=".pdf,.docx" />
            </fieldset>
            <button type="submit">Submit for Scoring</button>
          </form>
        </main>
      `,
    },
    {
      name: 'Essay Manager Table, Search, Filters, and Pagination',
      html: `
        <section aria-label="Essay Submissions Management">
          <h2>Essay Submissions</h2>
          <form role="search">
            <label for="table-search">Search essays by ID or prompt:</label>
            <input type="search" id="table-search" placeholder="Search..." />
            <label for="status-filter">Filter status:</label>
            <select id="status-filter">
              <option value="ALL">All Statuses</option>
              <option value="SCORED">Scored</option>
            </select>
          </form>
          <table>
            <caption>All processed and queued essay submissions with rubric scores</caption>
            <thead>
              <tr>
                <th scope="col">Essay ID</th>
                <th scope="col">Prompt</th>
                <th scope="col">Score</th>
                <th scope="col">Band</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">#a81e9b21</th>
                <td>Prompt 1</td>
                <td>9.5 / 12</td>
                <td>Proficient</td>
                <td><span role="status">SCORED</span></td>
              </tr>
            </tbody>
          </table>
          <nav aria-label="Essay Table Pagination">
            <button type="button" aria-label="Previous page" disabled>Previous</button>
            <span aria-current="page">Page 1 of 5</span>
            <button type="button" aria-label="Next page">Next</button>
          </nav>
        </section>
      `,
    },
    {
      name: 'Reviewer Override Panel with Accessible Slider & Form Controls',
      html: `
        <section aria-labelledby="override-panel-heading">
          <h2 id="override-panel-heading">Teacher Score Override</h2>
          <form>
            <div>
              <label for="override-slider">Adjust holistic rubric score:</label>
              <input
                type="range"
                id="override-slider"
                role="slider"
                min="2"
                max="12"
                step="0.5"
                value="9.5"
                aria-valuenow="9.5"
                aria-valuemin="2"
                aria-valuemax="12"
                aria-valuetext="9.5 out of 12.0 points"
              />
            </div>
            <div>
              <label for="override-reason">Mandatory override justification:</label>
              <textarea id="override-reason" minlength="15" required aria-required="true" aria-describedby="char-count"></textarea>
              <span id="char-count">Minimum 15 characters required</span>
            </div>
            <button type="submit">Submit Override Audit</button>
          </form>
        </section>
      `,
    },
    {
      name: 'Analytics Dashboard KPI Cards with Trend Annotations',
      html: `
        <section aria-label="Platform Telemetry Key Performance Indicators">
          <h2>Telemetry Overview</h2>
          <div role="region" aria-label="Essays Scored KPI Card">
            <span id="kpi-1-title">Essays Scored</span>
            <div aria-labelledby="kpi-1-title" class="value">1,845</div>
            <span aria-label="Increased by 14.2 percent compared to last month">+14.2% vs last month</span>
          </div>
          <div role="region" aria-label="Average QWK KPI Card">
            <span id="kpi-2-title">Average QWK</span>
            <div aria-labelledby="kpi-2-title" class="value">0.7842</div>
            <span aria-label="0.084 above target acceptance threshold">+0.084 vs 0.70 gate</span>
          </div>
        </section>
      `,
    },
  ];

  let totalViolations = 0;
  let totalPasses = 0;

  for (const c of components) {
    const res = await auditHtml(c.name, c.html);
    console.log(`=== ${res.name} ===`);
    console.log(`  Rules Passed: ${res.passes}`);
    console.log(`  Violations: ${res.violations.length}`);
    if (res.violations.length > 0) {
      res.violations.forEach((v) => {
        console.log(`    [VIOLATION] ${v.id}: ${v.help} (${v.impact})`);
        console.log(`      Tags: ${v.tags.join(', ')}`);
      });
    }
    totalViolations += res.violations.length;
    totalPasses += res.passes;
    console.log('');
  }

  console.log('----------------------------------------------------');
  console.log(`TOTAL AXE AUDIT RESULT: ${totalPasses} Passed, ${totalViolations} Violations`);
  console.log('----------------------------------------------------');
}

main().catch(console.error);
