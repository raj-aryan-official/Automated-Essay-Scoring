# Automated Essay Scoring (AES) — Senior UX/UI Comprehensive Audit

> **Document Version:** 1.0.0  
> **Date:** October 16, 2026  
> **Auditor Role:** Senior Principal Product Designer & Accessibility Architect  
> **Target Codebase:** `frontend/src/` (React 18 + Tailwind CSS 3.4 + Vite 5 + Axios + Recharts)  
> **Status:** Completed — Code Freeze Maintained (No application code modified)

---

## 1. Executive Summary & Review Scope

This audit evaluates the current frontend implementation of the Automated Essay Scoring (AES) platform across its complete user-facing surface:
1. **Authentication & Session:** `/login` (`LoginPage.tsx`, `AuthContext.tsx`, `ProtectedRoute.tsx`)
2. **Dashboard & Navigation:** Header (`App.tsx`), Navigation Rail, Root Routing (Currently non-existent)
3. **Essay Submission:** `/` (`SubmissionPage.tsx`)
4. **Essay Explorer & Workspace:** `/essays/:id` (`EssayDetailPage.tsx`, `ScoreWorkspace.tsx`, `HolisticScoreCard.tsx`, `ControlRail.tsx`)
5. **Dimension Feedback & Inspection:** `InspectionDrawer.tsx`
6. **Reviewer Override System:** `ReviewerOverridePanel.tsx`
7. **Model Evaluation & Telemetry:** `/evaluation` (`ModelEvaluationPage.tsx`)

### Key Takeaway
While the underlying engineering integrates functional FastAPI endpoints, BERT regression inference, and Recharts analytics, the user experience currently presents **significant cognitive friction, structural gaps, and accessibility hurdles**. 

The most critical architectural deficiency is the **absence of an app shell, dashboard, and essay manager list view**—resulting in "dead-end" user journeys where submitted essays cannot be rediscovered without copying URL tokens, and non-teacher roles (`VIEWER`, `ML_ENGINEER`) are greeted by an access-restricted wall immediately upon sign-in. Furthermore, the lack of **span-level highlighting** in the essay prose isolates diagnostic feedback from student writing, reducing an advanced NLP model to an opaque score badge.

---

## 2. Target Personas & Journey Analysis

| Persona | Primary Needs & Mental Model | Current Friction in Application |
| :--- | :--- | :--- |
| **Teacher (Primary Evaluator)** | Needs fast batch grading, transparent rubric scoring, clear justifications for low-confidence flags, and rapid human override capabilities with minimal data entry friction. | Cannot see an overview of student submissions; must execute a 2-step submit-then-score button dance; cannot compare overrides side-by-side; loses unsubmitted essays if navigating away. |
| **Student (End Consumer)** | Needs constructive, growth-oriented feedback with direct visual connection between prose errors and pedagogical explanations; needs to trust the AI's impartiality. | Confronted with a raw numeric score without denominator context (e.g. `9.42` out of what?); cannot see inline highlights on their text; sees diagnostic feedback disconnected from essay sentences. |
| **ML Engineer (Diagnostics & Auditor)** | Needs to monitor held-out QWK benchmarks, track training/val loss trajectories, observe worker queue throughput, and inspect human-vs-AI score drift. | Lands on "Access Restricted" on root route; lacks baseline ASAP comparison bars; cannot view tabular alternatives for loss curves; lacks drift and confidence distribution views. |

---

## 3. Top 15 Usability Problems

The table below outlines the 15 most severe usability issues identified in the source code, mapped to user personas and prioritized by severity.

| # | Page / Component | Problem Description | Impact on Personas | Severity | Source Code Location |
|---|---|---|---|---|---|
| **1** | **Root Routing & Shell** | **Missing Central Dashboard & Role Landing:** Root route `/` is hardwired to `<SubmissionPage />` protected exclusively for `TEACHER` and `ADMIN`. When a `VIEWER` or `ML_ENGINEER` logs in, they are immediately bounced to a blocking `Access Restricted` error screen. | **ML Engineer & Viewer:** Instant feeling of a broken application; no default landing hub. **Teacher:** No central overview of classroom stats or recent essays. | **HIGH** | [App.tsx:105-112](file:///Users/rajaryan/Desktop/AES/Automated-Essay-Scoring/frontend/src/App.tsx#L105-L112), [ProtectedRoute.tsx:34-62](file:///Users/rajaryan/Desktop/AES/Automated-Essay-Scoring/frontend/src/components/ProtectedRoute.tsx#L34-L62) |
| **2** | **Navigation & Essays** | **Missing Essay Manager / Explorer Table:** The backend exposes `GET /api/v1/essays` with pagination and status filters, but the frontend has zero UI or API binding for it. Once an essay is submitted, if the user closes or changes the URL, the essay is permanently lost to the UI. | **Teacher:** Cannot browse historical submissions, audit student progress, or find unreviewed essays. **Student:** Cannot review past feedback. | **HIGH** | Missing route in [App.tsx](file:///Users/rajaryan/Desktop/AES/Automated-Essay-Scoring/frontend/src/App.tsx), missing function in [api/index.ts](file:///Users/rajaryan/Desktop/AES/Automated-Essay-Scoring/frontend/src/api/index.ts) |
| **3** | **Submission Page** | **Disjointed Two-Step Submission & Scoring Dance:** Submitting an essay does not trigger assessment. Instead, it transitions to a green card displaying a secondary "Score Essay Now" button that must be clicked to trigger `dispatchScoring`. | **Teacher & Student:** High risk of drop-off; users believe the essay has been scored once they press "Submit Essay" and close the tab before clicking the second button. | **HIGH** | [SubmissionPage.tsx:104-135](file:///Users/rajaryan/Desktop/AES/Automated-Essay-Scoring/frontend/src/pages/SubmissionPage.tsx#L104-L135) |
| **4** | **Score Workspace** | **Zero Span-Level Inline Highlighting:** Essay prose is rendered inside a static `whitespace-pre-wrap` container. Dimension feedback in the drawer (Grammar, Coherence, Argumentation) has no interactive or visual ties to actual sentences in the text. | **Student:** Cannot locate where mechanical errors occurred or where argumentation lacked evidence. **Teacher:** Must manually scan the whole text to find what the AI flagged. | **HIGH** | [ScoreWorkspace.tsx:79-85](file:///Users/rajaryan/Desktop/AES/Automated-Essay-Scoring/frontend/src/features/scoring/ScoreWorkspace.tsx#L79-L85), [InspectionDrawer.tsx:108-149](file:///Users/rajaryan/Desktop/AES/Automated-Essay-Scoring/frontend/src/features/feedback/InspectionDrawer.tsx#L108-L149) |
| **5** | **Reviewer Override** | **Unbounded Score Input & Missing Pre-Commit Safeguards:** Score override is a raw `<input type="number" step="0.1">` without `min` or `max` attributes tied to prompt rubrics (e.g., Prompt 1 is 2–12, Prompt 3 is 0–3). No confirmation modal, delta display, or audit trail timeline exists. | **Teacher:** Can accidentally submit invalid scores (e.g. 99 on a 0–3 rubric). **ML Engineer:** Ingestion of invalid ground truth breaks feedback fine-tuning datasets. | **HIGH** | [ReviewerOverridePanel.tsx:203-217](file:///Users/rajaryan/Desktop/AES/Automated-Essay-Scoring/frontend/src/features/scoring/ReviewerOverridePanel.tsx#L203-L217) |
| **6** | **Reviewer Override** | **Simulated Role-Switcher in Production Interface:** The panel maintains local state (`useState('TEACHER')`) and renders interactive role switcher buttons (`TEACHER` vs `STUDENT`) that bypass real JWT authentication from `AuthContext`. | **All Personas:** Confuses user authorization; provides illusion of security bypass; gives students an apparent button to grant themselves teacher override rights. | **HIGH** | [ReviewerOverridePanel.tsx:94-137](file:///Users/rajaryan/Desktop/AES/Automated-Essay-Scoring/frontend/src/features/scoring/ReviewerOverridePanel.tsx#L94-L137) |
| **7** | **Essay Detail Page** | **Uninformative Polling Box During Long-Running Inference:** During worker execution, the UI displays a plain spin icon, raw elapsed seconds counter, and attempt counts (`Attempt 1/3`). No skeleton screens or multi-step progression (`Queued → Scored → Feedback`). | **Teacher & Student:** Anxiety over stalled execution; no estimated wait time; no way to cancel or continue working in background. | **HIGH** | [EssayDetailPage.tsx:252-290](file:///Users/rajaryan/Desktop/AES/Automated-Essay-Scoring/frontend/src/pages/EssayDetailPage.tsx#L252-L290) |
| **8** | **Holistic Score Card** | **Missing Score Denominator & Opaque Confidence Meaning:** Holistic score renders as a naked decimal (e.g., `9.42`) without stating the scale (`out of 12.0`). Confidence displays as a percentage with no explanation of variance or actionability. | **Student & Teacher:** `9.42` out of 10 is an A, but out of 12 is a C+. Lack of scale context creates acute grading confusion and student distress. | **MED** | [HolisticScoreCard.tsx:61-78](file:///Users/rajaryan/Desktop/AES/Automated-Essay-Scoring/frontend/src/features/scoring/HolisticScoreCard.tsx#L61-L78), [HolisticScoreCard.tsx:81-94](file:///Users/rajaryan/Desktop/AES/Automated-Essay-Scoring/frontend/src/features/scoring/HolisticScoreCard.tsx#L81-L94) |
| **9** | **Submission Page** | **Primitive File Upload Without Dropzone or Preview:** Document upload mode relies on an unstyled native browser `<input type="file">`. There is no drag-and-drop target, no mime-type pre-validation visual, no document preview, and no extraction progress. | **Teacher:** Cumbersome file selection when grading batches of DOCX/PDF essays; zero confidence that text was extracted accurately before scoring. | **MED** | [SubmissionPage.tsx:212-229](file:///Users/rajaryan/Desktop/AES/Automated-Essay-Scoring/frontend/src/pages/SubmissionPage.tsx#L212-L229) |
| **10** | **Inspection Drawer** | **Lack of Dimensional Visual Synthesis (Radar Chart / Gauges):** Dimension feedback is presented as a plain list of text blocks sorted by severity. There is no multi-axis visual synthesis (e.g. 3-axis radar chart) comparing grammar, coherence, and argumentation. | **Teacher & Student:** Requires reading dense copy to diagnose weaknesses rather than instantly grasping the student's holistic profile visually. | **MED** | [InspectionDrawer.tsx:108-149](file:///Users/rajaryan/Desktop/AES/Automated-Essay-Scoring/frontend/src/features/feedback/InspectionDrawer.tsx#L108-L149) |
| **11** | **Score Workspace** | **Mobile & Tablet Split-Screen Breakage:** On screen widths < 1024px, the 12-column grid collapses into a single column, pushing the score card, override panel, and drawer beneath the entire 620px essay text reader. | **Teacher:** Reviewing on iPad or tablet requires scrolling back and forth between essay text and score controls dozens of times per essay. | **MED** | [ScoreWorkspace.tsx:53-58](file:///Users/rajaryan/Desktop/AES/Automated-Essay-Scoring/frontend/src/features/scoring/ScoreWorkspace.tsx#L53-L58) |
| **12** | **Model Evaluation** | **Fixed-Size Charts Lacking Baseline Drift & Accessible Tables:** QWK and loss curves use hardcoded pixel heights (`h-80`) with no ASAP baseline comparison, no drift metrics, and no alternative tabular data view for screen readers. | **ML Engineer:** Cannot evaluate model drift against historical ASAP distributions; cannot verify data on smaller screens. | **MED** | [ModelEvaluationPage.tsx:329-356](file:///Users/rajaryan/Desktop/AES/Automated-Essay-Scoring/frontend/src/pages/ModelEvaluationPage.tsx#L329-L356), [ModelEvaluationPage.tsx:472-514](file:///Users/rajaryan/Desktop/AES/Automated-Essay-Scoring/frontend/src/pages/ModelEvaluationPage.tsx#L472-L514) |
| **13** | **Global Experience** | **Cryptic Technical Error Strings Without Recovery Paths:** Errors catch raw Axios exceptions and display raw backend messages (e.g. `err.response?.data?.detail` or `Internal Server Error`) without human-friendly explanations or Retry CTAs. | **All Personas:** Intimidating developer jargon; users have no guidance on whether to reload, check network, or edit inputs. | **MED** | [SubmissionPage.tsx:63-67](file:///Users/rajaryan/Desktop/AES/Automated-Essay-Scoring/frontend/src/pages/SubmissionPage.tsx#L63-L67), [EssayDetailPage.tsx:63-66](file:///Users/rajaryan/Desktop/AES/Automated-Essay-Scoring/frontend/src/pages/EssayDetailPage.tsx#L63-L66) |
| **14** | **Submission Page** | **Zero Autosave, Draft Persistence, or Leave Confirmation:** If a user accidentally refreshes, switches prompts, or clicks a header link while typing in the textarea, all text is lost without warning. | **Student & Teacher:** Devastating loss of work during essay drafting or pasting; no `localStorage` draft caching. | **MED** | [SubmissionPage.tsx:14-18](file:///Users/rajaryan/Desktop/AES/Automated-Essay-Scoring/frontend/src/pages/SubmissionPage.tsx#L14-L18) |
| **15** | **Control Rail** | **Inaccessible Slider & Hidden Inspection State:** Confidence slider provides tick labels but lacks a programmatic accessible value, ARIA description, and keyboard step optimization. Toggling the drawer moves content without focus management. | **Teacher:** Sliders are clumsy on touchscreens; screen reader users cannot tell what threshold is active without hunting. | **LOW** | [ControlRail.tsx:102-117](file:///Users/rajaryan/Desktop/AES/Automated-Essay-Scoring/frontend/src/features/scoring/ControlRail.tsx#L102-L117) |

---

## 4. Visual Inconsistencies

### 4.1 Spacing & Layout Architecture
- **Inconsistent Page Container Widths:**
  - Login Page: `max-w-md` ([LoginPage.tsx:87](file:///Users/rajaryan/Desktop/AES/Automated-Essay-Scoring/frontend/src/pages/LoginPage.tsx#L87))
  - Access Restricted Card: `max-w-xl` ([ProtectedRoute.tsx:38](file:///Users/rajaryan/Desktop/AES/Automated-Essay-Scoring/frontend/src/components/ProtectedRoute.tsx#L38))
  - Submission Page & Error Alerts: `max-w-4xl` ([SubmissionPage.tsx:90](file:///Users/rajaryan/Desktop/AES/Automated-Essay-Scoring/frontend/src/pages/SubmissionPage.tsx#L90))
  - Essay Detail & Model Evaluation: `max-w-6xl` ([EssayDetailPage.tsx:188](file:///Users/rajaryan/Desktop/AES/Automated-Essay-Scoring/frontend/src/pages/EssayDetailPage.tsx#L188), [ModelEvaluationPage.tsx:175](file:///Users/rajaryan/Desktop/AES/Automated-Essay-Scoring/frontend/src/pages/ModelEvaluationPage.tsx#L175))
  - *Result:* The viewport width jumps erratically from 448px to 1152px as the user navigates between routes.
- **Card Padding Disparities:**
  - Cards inconsistently alternate between `p-6` (Submission, Model Eval), `p-5` (ScoreCard, ControlRail, ReviewerPanel), `p-4` (Error banners), and `p-3.5` (Override history).
- **Body Background Collision:**
  - `index.html` defines `<body class="bg-slate-50 text-slate-900 antialiased">` ([index.html:9](file:///Users/rajaryan/Desktop/AES/Automated-Essay-Scoring/frontend/index.html#L9)), while `App.tsx` wraps the app in `<div className="min-h-screen bg-slate-900 text-slate-100">` ([App.tsx:98](file:///Users/rajaryan/Desktop/AES/Automated-Essay-Scoring/frontend/src/App.tsx#L98)). On overscroll or slow renders, a bright white frame flashes around the dark interface.

### 4.2 Typography & Type Hierarchy
- **Font Family Clashes:**
  - Global UI defaults to system sans-serif font stack.
  - Essay prose suddenly switches to `font-serif` ([ScoreWorkspace.tsx:81](file:///Users/rajaryan/Desktop/AES/Automated-Essay-Scoring/frontend/src/features/scoring/ScoreWorkspace.tsx#L81)), but the Submission textarea uses `font-mono` ([SubmissionPage.tsx:209](file:///Users/rajaryan/Desktop/AES/Automated-Essay-Scoring/frontend/src/pages/SubmissionPage.tsx#L209)). A student typing an essay sees monospace code font, which then transforms into a serif book font on the score page.
- **Arbitrary Micro Font Sizing:**
  - Excessive usage of sub-12px arbitrary font classes: `text-[10px]` and `text-[11px]` are scattered across badges, buttons, tooltips, and card footers without an established typographical scale.
  - Leading line-heights are often left unspecified, resulting in clipped descenders on accented characters and uppercase badges.

### 4.3 Color Token Collisions
- **Brand Definition Contradiction:**
  - `tailwind.config.js` defines `brand` as emerald/green (`500: #22c55e`, `600: #16a34a`) ([tailwind.config.js:10-15](file:///Users/rajaryan/Desktop/AES/Automated-Essay-Scoring/frontend/tailwind.config.js#L10-L15)).
  - In `App.tsx`, the primary brand dot is green (`bg-brand-500`).
  - However, in `ReviewerOverridePanel.tsx`, teacher actions use purple (`bg-purple-600`), in `ModelEvaluationPage.tsx` primary accents use brand green, cyan (`#06b6d4`), and purple (`#a855f7`), and the prompt selection buttons use `bg-brand-600`.
  - In `HolisticScoreCard.tsx`, score band confidence uses `text-emerald-400`, creating visual confusion between what is a "brand action" and what is a "high score / high confidence" indicator.

### 4.4 Inconsistent Button & Interactive Component Styles
- **Corner Radii Inconsistencies:** Buttons alternate unpredictably between `rounded-md` ([HolisticScoreCard.tsx:70](file:///Users/rajaryan/Desktop/AES/Automated-Essay-Scoring/frontend/src/features/scoring/HolisticScoreCard.tsx#L70)), `rounded-lg` ([LoginPage.tsx:155](file:///Users/rajaryan/Desktop/AES/Automated-Essay-Scoring/frontend/src/pages/LoginPage.tsx#L155)), `rounded-xl` ([ModelEvaluationPage.tsx:249](file:///Users/rajaryan/Desktop/AES/Automated-Essay-Scoring/frontend/src/pages/ModelEvaluationPage.tsx#L249)), and `rounded-full` ([App.tsx:60](file:///Users/rajaryan/Desktop/AES/Automated-Essay-Scoring/frontend/src/App.tsx#L60)).
- **Button Sizing & Padding:** Primary buttons range from `py-1.5 px-3` to `py-2.5 px-4` and `py-2 px-3`. No standard `sm`, `md`, or `lg` button sizes exist.
- **Loading State Indicator Divergence:**
  - `LoginPage.tsx` uses a 14px border-2 spinner with text "Signing In...".
  - `SubmissionPage.tsx` uses a simple text toggle ("Submitting...") with no spinner.
  - `ReviewerOverridePanel.tsx` uses a 14px spinner with text "Finalizing...".
  - `EssayDetailPage.tsx` replaces the entire page with a 32px spinner.

---

## 5. Missing States Matrix

A resilient user experience must account for all four fundamental states: **Loading**, **Empty**, **Error**, and **Success**.

| Page / Feature | Loading State | Empty State | Error State | Success State |
| :--- | :--- | :--- | :--- | :--- |
| **Login (`/login`)** | Button spinner present. **Missing:** Skeleton for demo accounts; disabled field overlay. | Not applicable (form fields initialized empty). | Raw text banner. **Missing:** Inline field validation errors; shake animation. | **Missing:** Success checkmark transition before route redirect. |
| **Dashboard (Missing)** | **Missing Entirely:** No skeleton KPI cards or activity feed loaders. | **Missing Entirely:** No "Welcome, submit your first essay" empty dashboard state. | **Missing Entirely:** No API failure fallback. | **Missing Entirely:** No celebratory milestone states (e.g. "100 essays graded"). |
| **Essay Manager (Missing)** | **Missing Entirely:** No table row skeleton loaders. | **Missing Entirely:** No "No essays found matching filters" illustration. | **Missing Entirely:** No table fetch error banner with retry. | **Missing Entirely:** No bulk action confirmation banners. |
| **Submission (`/`)** | Button text switches to "Submitting...". **Missing:** Upload progress bar; text parsing skeleton. | Textarea has placeholder. **Missing:** Empty document dropzone prompt; word count zero-state warning. | Raw string box. **Missing:** File size limit error; invalid file format alert; min-word constraint alert. | Green banner appears, but requires a secondary manual click to trigger score. |
| **Essay Detail (`/essays/:id`)** | Raw polling counter in blue box. **Missing:** Async pipeline stepper (`Queued → Scored → Feedback`); content skeletons. | **Missing:** Empty essay text fallback; zero dimensions state. | Raw error text with "Retry" link. **Missing:** Network drop handling; worker timeout recovery. | Sudden transition without entrance motion or score count-up animation. |
| **Reviewer Override** | "Finalizing..." button spinner. **Missing:** Form submission backdrop blocker. | **Missing:** Empty override audit history placeholder; blank reason warning. | Raw red banner. **Missing:** Score-out-of-bounds inline error; minimum character requirement flag. | Green alert box appears, but does not provide an audit timeline. |
| **Model Evaluation (`/evaluation`)** | 40px center spinner. **Missing:** Skeleton chart boxes and KPI metric placeholder cards. | Loss curve displays plain text message if empty. **Missing:** Empty prompt telemetry graphic. | Rose card with "Retry". **Missing:** Granular per-chart error fallbacks (one failed chart blocks entire page). | **Missing:** "Acceptance gate passed" celebratory visual accent. |

---

## 6. Accessibility & Inclusivity Gaps (WCAG 2.1 AA)

### 6.1 Color Contrast Failures
All text against dark backgrounds (`bg-slate-800` #1e293b and `bg-slate-900` #0f172a) must meet the minimum WCAG 2.1 AA contrast ratio of **4.5:1** for normal text and **3:1** for large text / UI components.
- `text-slate-400` (`#94a3b8`) on `#1e293b`: **3.82:1 — FAILS WCAG AA** for normal body copy (widely used for descriptions, labels, and table headers).
- `text-slate-500` (`#64748b`) on `#0f172a`: **2.45:1 — SEVERE FAILURE** (used in footer, character count, and slider tick marks).
- `text-slate-500` (`#64748b`) on `#1e293b`: **2.21:1 — SEVERE FAILURE** (used for subtitle copy and secondary metadata).
- `text-[10px]` uppercase labels on dark backgrounds with low contrast are virtually unreadable for low-vision users.

### 6.2 Keyboard Navigation & Focus Ring Elimination
- **Outline Suppression:** The form controls and inputs use `focus:outline-none focus:ring-1 focus:ring-brand-500` without providing a high-contrast offset focus ring (`focus-visible:ring-2 focus-visible:ring-offset-2`).
- **Interactive Toggles:** Dimension toggle buttons in the Control Rail ([ControlRail.tsx:61-85](file:///Users/rajaryan/Desktop/AES/Automated-Essay-Scoring/frontend/src/features/scoring/ControlRail.tsx#L61-L85)) and prompt selector tabs in Model Evaluation ([ModelEvaluationPage.tsx:422-436](file:///Users/rajaryan/Desktop/AES/Automated-Essay-Scoring/frontend/src/pages/ModelEvaluationPage.tsx#L422-L436)) lack standard `aria-pressed` or `role="tab"` semantic attributes.
- **Missing Focus Traps:** The Inspection Drawer is rendered inline rather than as an accessible dialog or drawer with focus trapping. Pressing `Tab` cycles behind the drawer, and pressing `Escape` does not dismiss it.
- **Skip Link:** There is no `<a href="#main-content">Skip to Main Content</a>` link at the top of `App.tsx`.

### 6.3 Semantic Structure & ARIA Labels
- **Form Association:** In `SubmissionPage.tsx`, the custom prompt UUID input ([SubmissionPage.tsx:154-160](file:///Users/rajaryan/Desktop/AES/Automated-Essay-Scoring/frontend/src/pages/SubmissionPage.tsx#L154-L160)) has no `<label>` element or `aria-label`.
- **Range Slider Accessibility:** The slider in `ControlRail.tsx` ([ControlRail.tsx:103-111](file:///Users/rajaryan/Desktop/AES/Automated-Essay-Scoring/frontend/src/features/scoring/ControlRail.tsx#L103-L111)) has no `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, or `aria-valuetext` (e.g. "80 percent standard threshold").
- **Dynamic Updates & Screen Readers:** When the scoring status updates from `QUEUED` to `PROCESSING` to `SCORED`, or when polling counts update, there are no `aria-live="polite"` regions to inform screen reader users of background completion.

### 6.4 Motion & Vestibular Sensitivities
- Continuous spinning animations (`animate-spin`, `animate-pulse`, `animate-ping`) run indefinitely on the score card, processing box, and live telemetry badges without `@media (prefers-reduced-motion: reduce)` overrides, presenting discomfort to users with vestibular disorders.

---

## 7. Prioritized Fix List Mapped to Prompts 2–20

The following 19 implementation phases directly resolve all findings in this audit according to the structured 20-prompt roadmap:

```
[Phase A: Foundation]  ──>  [Phase B: Core Screens]  ──>  [Phase C: States & Data]  ──>  [Phase D: Quality]
(Prompts 2-4)               (Prompts 5-10)                 (Prompts 11-14)                (Prompts 15-20)
```

| Phase | Prompt | Target Scope | Specific Usability & Accessibility Issues Resolved |
| :--- | :--- | :--- | :--- |
| **Phase A** | **Prompt 2** | **Design System & Tokens** | Unifies color palette (resolves brand green vs purple/emerald collisions), establishes a 6-tier type scale with consistent line heights, defines standard spacing/radii/shadow scales, establishes CSS variables for light/dark themes, fixes `index.html` body contrast collision. |
| **Phase A** | **Prompt 3** | **Reusable UI Library** | Replaces inconsistent ad-hoc buttons and inputs with typed UI components (`Button`, `Input`, `Textarea`, `Slider`, `Toggle`, `Badge`, `Card`, `Drawer`, `Modal`, `Skeleton`, `EmptyState`, `Toast`) featuring uniform sizes, hover/focus rings, and keyboard support. |
| **Phase A** | **Prompt 4** | **App Shell & Navigation** | Solves **Problem 1 & Problem 2**: Creates persistent left sidebar + top bar app shell; provides role-filtered navigation for `TEACHER`, `ML_ENGINEER`, `ADMIN`, `VIEWER`; eliminates dead-end routes and access restriction bounces. |
| **Phase B** | **Prompt 5** | **Essay Submission Experience** | Solves **Problem 3, 9 & 14**: Creates two-tab layout ("Paste Text" & "Upload Document"); adds dropzone file upload with drag-and-drop, PDF/DOCX preview, and word count alerts; adds auto-save draft recovery; auto-dispatches scoring on submit to eliminate 2-step barrier. |
| **Phase B** | **Prompt 6** | **Score Workspace Split-Screen** | Solves **Problem 11**: Implements responsive 60/40 desktop split-screen; adds sticky summary header with score, band, and confidence while scrolling; collapses Control Rail to a toolbar on tablet and bottom-sheet on mobile; makes drawer slide-over. |
| **Phase B** | **Prompt 7** | **Score & Confidence Visualization** | Solves **Problem 8**: Large score with denominator (`out of {rubric_max}`); segmented rubric-band bar showing all prompt bands; confidence meter with plain-language tooltip explanation and low-confidence warning banner; score count-up animation. |
| **Phase B** | **Prompt 8** | **Dimension Feedback Panels** | Solves **Problem 10**: Redesigns dimension inspector into expandable cards with sub-scores, radial/bar gauges, and severity chips; introduces top 3-axis radar chart summarizing Grammar, Coherence, and Argumentation simultaneously. |
| **Phase B** | **Prompt 9** | **Essay Text Highlighting (Spans)** | Solves **Problem 4**: Integrates span-level inline annotations (wavy underline for grammar, background highlight for coherence, margin marker for argumentation); bi-directional click-to-scroll syncing between text spans and drawer cards. |
| **Phase B** | **Prompt 10** | **Reviewer Override Panel UX** | Solves **Problem 5 & 6**: Removes fake client role switcher; adds AI vs Override side-by-side comparison with delta; bounds inputs strictly to prompt rubric range; adds quick-select reason chips, character minimum, confirmation modal, and audit trail timeline. |
| **Phase C** | **Prompt 11** | **Loading, Skeletons & Stepper** | Solves **Problem 7**: Replaces raw polling spinner with layout-matched skeleton screens; adds 5-step async progression stepper (`Queued → Processing → Scoring → Generating Feedback → Done`) with elapsed time and cancel/refresh support. |
| **Phase C** | **Prompt 12** | **Error, Empty & Edge-Case States** | Solves **Problem 13**: Implements illustrated empty states per page; replaces raw technical exception strings with friendly HTTP/network error boundaries; adds global toast notification system; adds retry CTA for failed inference jobs. |
| **Phase C** | **Prompt 13** | **Essay List & Search (Essay Manager)** | Solves **Problem 2**: Builds full Essay Manager table with prompt, status pill, score, band, submitter, and date; adds live search, status filters, URL sync, row hover actions, bulk selection, and mobile card transformation. |
| **Phase C** | **Prompt 14** | **Dashboard & Charts Polish** | Solves **Problem 1 & 12**: Creates primary teacher/engineer Dashboard with top-row KPI cards (Essays scored, Avg QWK, Avg Confidence, Queue count); enhances Model Evaluation with ASAP baseline drift comparisons, responsive charts, and accessible data tables. |
| **Phase D** | **Prompt 15** | **Accessibility (WCAG 2.1 AA)** | Resolves all contrast failures; adds visible focus rings (`focus-visible`); enforces focus trapping in drawer/modal; connects ARIA labels and live regions for dynamic job updates; adds skip-to-content link and prefers-reduced-motion support. |
| **Phase D** | **Prompt 16** | **Responsive Design Polish** | Validates and fixes layouts across 360px, 768px, 1024px, and 1440px breakpoints; ensures minimum 44px touch targets for mobile; tests Score Workspace tabbed layout on handheld devices. |
| **Phase D** | **Prompt 17** | **Dark Mode & Theming** | Implements robust `light` / `dark` / `system` theming backed by CSS variables and `localStorage` with zero-flash initialization; re-verifies high-contrast thresholds across both themes. |
| **Phase D** | **Prompt 18** | **Microinteractions & Motion** | Adds purposeful 150–300ms microinteractions (drawer slides, button press feedback, toast animations, score number count-up) fully disabled when `prefers-reduced-motion` is enabled. |
| **Phase D** | **Prompt 19** | **Onboarding, Help & Guidance** | Introduces 4-step first-run walkthrough for teachers; contextual glossary tooltips next to QWK, Rubric Band, and Confidence; 1-click sample essay loader for immediate testing; dedicated Help/FAQ page. |
| **Phase D** | **Prompt 20** | **Performance, Polish & UX Pass** | Route-level code splitting with `React.lazy`; input debounce for search and sliders; virtualized essay lists; final Lighthouse pass targeting Performance ≥ 90 and Accessibility ≥ 95; generates `UX_CHANGELOG.md`. |

---

## 8. Conclusion & Sign-Off

The current AES frontend contains robust functional foundations but suffers from fragmented navigation, isolated prose feedback, unconstrained override mechanics, and accessibility debt. 

Executing **Prompts 2 through 20** in strict, unbatched sequence will elevate the platform into a state-of-the-art, WCAG 2.1 AA-compliant educational assessment tool that empowers teachers, clarifies insights for students, and provides transparent diagnostics for machine learning engineers.
