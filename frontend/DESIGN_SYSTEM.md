# Automated Essay Scoring (AES) — Design System & Token Documentation

> **Version:** 1.0.0  
> **Status:** Active  
> **Target Framework:** React + Tailwind CSS 3.4 + CSS Variables  
> **Location:** `frontend/src/styles/tokens.css`, `frontend/tailwind.config.js`

---

## 1. Design System Philosophy & Architecture

The AES Design System establishes a cohesive, accessible, and high-performance visual language tailored for educational assessment, natural language processing diagnostics, and high-stakes grading workflows.

### Core Principles
1. **Clarity & Pedagogical Transparency:** Visual affordances must reduce cognitive burden. Grading scales, model confidence metrics, and linguistic error diagnostics must be instantly decipherable.
2. **Strict Semantic Integrity:** Color carries functional meaning. Score-band semantics are strictly locked: **Low = Red**, **Mid = Amber**, **High = Green**. Brand and role colors must never conflict with evaluative score bands.
3. **Inclusive & Accessible (WCAG 2.1 AA):** High-contrast ratios (minimum 4.5:1 for normal text, 3:1 for large text / UI elements), visible keyboard focus rings, and dark/light mode balance are built into token primitives.
4. **Token-Driven Single Source of Truth:** Styles are mediated via CSS variables declared in [tokens.css](file:///Users/rajaryan/Desktop/AES/Automated-Essay-Scoring/frontend/src/styles/tokens.css) and exposed through Tailwind utilities in [tailwind.config.js](file:///Users/rajaryan/Desktop/AES/Automated-Essay-Scoring/frontend/tailwind.config.js).

---

## 2. Color Palette & Semantic System

### 2.1 Primary Brand Palette (Indigo / Blue)
Used for primary interactive controls, active navigation links, progress indicators, and system focus rings.

| Token Name | Hex Code | Tailwind Class | Recommended Usage |
| :--- | :--- | :--- | :--- |
| `primary-50` | `#eef2ff` | `bg-primary-50` / `text-primary-50` | Light theme active background, subtle tint |
| `primary-100` | `#e0e7ff` | `bg-primary-100` | Light theme tag backgrounds, hover states |
| `primary-200` | `#c7d2fe` | `border-primary-200` | Light theme borders, active chip boundaries |
| `primary-300` | `#a5b4fc` | `text-primary-300` | Dark theme secondary text, subtle accents |
| `primary-400` | `#818cf8` | `text-primary-400` | Dark theme interactive hover, focus rings |
| **`primary-500`** | **`#6366f1`** | **`bg-primary-500`** | **Core primary interactive action, focused controls** |
| `primary-600` | `#4f46e5` | `bg-primary-600` | Primary button fill (light theme default), hover state |
| `primary-700` | `#4338ca` | `bg-primary-700` | Primary button active/pressed state |
| `primary-800` | `#3730a3` | `bg-primary-800` | Deep accent elements, badge borders |
| `primary-900` | `#312e81` | `bg-primary-900` | Dark theme tinted surface headers |
| `primary-950` | `#1e1b4b` | `bg-primary-950` | High-contrast dark backgrounds |

> **Backward Compatibility Note:** The historical `brand` utility scale (`brand-50`, `brand-500`, `brand-600`, `brand-700`) is preserved in `tailwind.config.js` to ensure legacy pages render cleanly without regression.

---

### 2.2 Neutral Slate Scale (Grays)
Used for canvas backgrounds, structural card surfaces, borders, dividers, and typography.

| Token | Hex Code | Usage in Light Mode | Usage in Dark Mode |
| :--- | :--- | :--- | :--- |
| `slate-50` | `#f8fafc` | Application canvas background (`--bg-canvas`) | Primary white-equivalent text (`--text-primary`) |
| `slate-100` | `#f1f5f9` | Sunken card wells, input backgrounds | Table row hover, elevated chips |
| `slate-200` | `#e2e8f0` | Subtle container borders (`--border-subtle`) | High-contrast borders |
| `slate-300` | `#cbd5e1` | Default component borders (`--border-default`) | Secondary body text (`--text-secondary`) |
| `slate-400` | `#94a3b8` | Placeholder text, disabled labels | Tertiary body text (`--text-tertiary`), muted icons |
| `slate-500` | `#64748b` | Tertiary metadata text (`--text-tertiary`) | Muted text, disabled buttons |
| `slate-600` | `#475569` | Secondary descriptive text (`--text-secondary`)| Strong component borders (`--border-strong`) |
| `slate-700` | `#334155` | Strong borders, prominent dividers | Default component borders (`--border-default`) |
| `slate-800` | `#1e293b` | Dark popovers, tooltips | Elevated card surfaces (`--bg-surface-elevated`) |
| `slate-900` | `#0f172a` | Primary headline typography (`--text-primary`) | Base card surfaces (`--bg-surface`) |
| `slate-950` | `#020617` | High-contrast black text | Deepest dark canvas void (`--bg-canvas`) |

---

### 2.3 Semantic Feedback Palettes
Semantic colors convey system health, inference job progress, validation alerts, and status badges.

| Family | 500 (Base) | Light Usage (100 / 800) | Dark Usage (500/15% / 300) | Functional Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Success** | `#10b981` (Emerald) | `bg-emerald-50 text-emerald-800 border-emerald-200` | `bg-emerald-500/15 text-emerald-300 border-emerald-500/35` | Passed acceptance gates, successful submission, finalized scores |
| **Warning** | `#f59e0b` (Amber) | `bg-amber-50 text-amber-800 border-amber-200` | `bg-amber-500/15 text-amber-300 border-amber-500/35` | Low confidence alerts, queued jobs, unsaved changes warning |
| **Danger** | `#f43f5e` (Rose) | `bg-rose-50 text-rose-800 border-rose-200` | `bg-rose-500/15 text-rose-300 border-rose-500/35` | Failed inference jobs, input validation errors, destructive actions |
| **Info** | `#0ea5e9` (Sky) | `bg-sky-50 text-sky-800 border-sky-200` | `bg-sky-500/15 text-sky-300 border-sky-500/35` | Processing status, prompt metadata, informational tips |

---

### 2.4 Score-Band Semantic Tokens (Strict Hierarchy)

> **Mandatory Rule:** Evaluative essay scoring must never deviate from:
> - **LOW = RED** (Deficient / High Priority Intervention)
> - **MID = AMBER** (Developing / Approaching Proficiency)
> - **HIGH = GREEN** (Proficient / Exemplary)

| Score Band | Base Token | CSS Variables | Tailwind Class Utilities | Visual Meaning |
| :--- | :--- | :--- | :--- | :--- |
| **Low Band** | `#ef4444` (Red) | `--score-low-base`<br>`--score-low-bg`<br>`--score-low-text`<br>`--score-low-border` | `bg-score-low`<br>`text-score-low`<br>`border-score-low` | Lower quartile scores, critical grammatical errors, low argumentation cohesion. |
| **Mid Band** | `#f59e0b` (Amber) | `--score-mid-base`<br>`--score-mid-bg`<br>`--score-mid-text`<br>`--score-mid-border` | `bg-score-mid`<br>`text-score-mid`<br>`border-score-mid` | Intermediate rubric band, moderate confidence flags, partial evidence support. |
| **High Band** | `#10b981` (Green) | `--score-high-base`<br>`--score-high-bg`<br>`--score-high-text`<br>`--score-high-border` | `bg-score-high`<br>`text-score-high`<br>`border-score-high` | Top rubric bands (Proficient/Advanced), high model certainty (≥ 85%). |

---

### 2.5 Role-Based Identity Tokens
Used to visually distinguish RBAC user personas throughout headers, tables, and audit logs.

| Role | Theme Accent | Background Token | Text Token | Border Token |
| :--- | :--- | :--- | :--- | :--- |
| **ADMIN** | Crimson / Rose | `var(--role-admin-bg)` | `var(--role-admin-text)` | `var(--role-admin-border)` |
| **TEACHER** | Royal Purple | `var(--role-teacher-bg)` | `var(--role-teacher-text)` | `var(--role-teacher-border)` |
| **ML_ENGINEER** | Sky Blue | `var(--role-ml-bg)` | `var(--role-ml-text)` | `var(--role-ml-border)` |
| **VIEWER** | Neutral Slate | `var(--role-viewer-bg)` | `var(--role-viewer-text)` | `var(--role-viewer-border)` |

---

## 3. Typographic System & Scale

The system uses **Inter** for all UI copy, numerical data, and headings, and **JetBrains Mono** for machine identifiers, timestamps, model versions, and code telemetry.

```
Font Stacks:
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
```

### 3.1 6-Tier Type Hierarchy + Display Scale

| Token | Size | Line Height | Tracking | Recommended Weights | Intended Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `text-xs` | `0.75rem` (12px) | `1.0rem` (16px) | `+0.01em` | `font-medium`, `font-semibold` | Status pills, badge text, input captions, table subheaders. |
| `text-sm` | `0.875rem` (14px) | `1.25rem` (20px) | `+0.005em` | `font-normal`, `font-medium` | Standard form inputs, table body copy, drawer text. |
| `text-base` | `1.0rem` (16px) | `1.5rem` (24px) | `0em` | `font-normal`, `font-medium` | Primary body copy, essay prose reader, modal descriptions. |
| `text-lg` | `1.125rem` (18px) | `1.75rem` (28px) | `-0.01em` | `font-semibold`, `font-bold` | Card titles, inspection drawer section headers. |
| `text-xl` | `1.25rem` (20px) | `1.75rem` (28px) | `-0.015em` | `font-bold` | Sub-page headers, dialog headers, drawer titles. |
| `text-2xl` | `1.5rem` (24px) | `2.0rem` (32px) | `-0.02em` | `font-extrabold`, `font-black` | Main page titles, dashboard KPI figures. |
| `text-display` | `3.0rem` (48px) | `1.0` (48px) | `-0.03em` | `font-black` | Hero holistic score value on `HolisticScoreCard`. |

---

## 4. Spacing Scale & 4px Baseline Grid

The spacing system is rooted in an 8-point baseline with 4-point micro-increments. Always use scale tokens instead of arbitrary pixel values.

| Token | Rem | Px | Intended Layout Application |
| :--- | :--- | :--- | :--- |
| `0.5` | `0.125rem` | 2px | Micro gaps, button icon spacing, active underline offsets |
| `1` | `0.25rem` | 4px | Badge padding, compact button spacing |
| `1.5` | `0.375rem` | 6px | Form label margins, tag margins |
| `2` | `0.5rem` | 8px | Standard button padding (vertical), list item gaps |
| `2.5` | `0.625rem` | 10px | Medium input padding |
| `3` | `0.75rem` | 12px | Compact card padding, table cell padding |
| `4` | `1.0rem` | 16px | Standard button padding (horizontal), standard container gap |
| `5` | `1.25rem` | 20px | Compact card internal padding |
| `6` | `1.5rem` | 24px | Standard card padding, modal body padding |
| `8` | `2.0rem` | 32px | Section vertical spacing, page header bottom margin |
| `10` | `2.5rem` | 40px | Major page section margins |
| `12` | `3.0rem` | 48px | Dashboard row gaps, hero container margins |
| `16` | `4.0rem` | 64px | Page bottom padding, empty state vertical breathing room |

---

## 5. Radius Scale

Corner radii establish hierarchical depth, distinguishing floating controls from structural panels.

| Token | Value | Tailwind Class | Recommended Component Usage |
| :--- | :--- | :--- | :--- |
| `none` | `0px` | `rounded-none` | Full-width banners, edge-to-edge mobile drawers |
| `sm` | `4px` | `rounded-sm` | Status chips, inline code blocks, tiny tags |
| `md` | `6px` | `rounded-md` | Dropdown menu items, table row hover highlights |
| `lg` | `8px` | `rounded-lg` | Standard buttons, form text inputs, select boxes |
| `xl` | `12px` | `rounded-xl` | Content cards, control rail panel, feedback cards |
| `2xl` | `16px` | `rounded-2xl` | Modal dialogs, hero header panels, dashboard containers |
| `full` | `9999px` | `rounded-full` | Avatars, status indicator dots, pill badges |

---

## 6. Shadow Scale & Elevation Hierarchy

Elevation tokens establish visual hierarchy between canvas, panels, and floating dialogs.

| Level | CSS Variable | Light Mode Visual | Dark Mode Visual | Typical Component |
| :--- | :--- | :--- | :--- | :--- |
| **Elevation 0** | N/A | Flat border | Flat border | Canvas background, sunken text wells |
| **Elevation 1 (`sm`)** | `var(--shadow-sm)` | `0 1px 2px (5%)` | `0 1px 2px (35%)` | Table rows, buttons, small chips |
| **Elevation 2 (`md`)** | `var(--shadow-md)` | `0 4px 6px (10%)` | `0 4px 6px (45%)` | Standard content cards, control panels |
| **Elevation 3 (`lg`)** | `var(--shadow-lg)` | `0 10px 15px (10%)` | `0 10px 15px (55%)` | Floating dropdowns, hover card lift |
| **Elevation 4 (`xl`)** | `var(--shadow-xl)` | `0 20px 25px (10%)` | `0 20px 25px (65%)` | Modal dialogs, slide-over drawers |
| **Inset (`inner`)** | `var(--shadow-inner)` | `inset 0 2px 4px (5%)` | `inset 0 2px 4px (45%)` | Essay prose reader well, textarea fields |

---

## 7. Light & Dark Theme CSS Variables Reference

The application switches themes dynamically by toggling `.dark` or `[data-theme="dark"]` on the root document element.

### Surface & Canvas Tokens
```css
/* Background Surfaces */
bg-canvas             /* Page background (Light: slate-50 / Dark: #0b0f19) */
bg-surface            /* Default card surface (Light: white / Dark: #111827) */
bg-surface-elevated   /* Elevated card surface (Light: white / Dark: #1e293b) */
bg-surface-sunken     /* Recessed wells (Light: slate-100 / Dark: #06080e) */

/* Content / Typography */
text-content-primary    /* High-contrast text (Light: slate-900 / Dark: slate-50) */
text-content-secondary  /* Balanced body text (Light: slate-600 / Dark: slate-300) */
text-content-tertiary   /* Captions & metadata (Light: slate-500 / Dark: slate-400) */
text-content-muted      /* Disabled & placeholders (Light: slate-400 / Dark: slate-500) */
text-content-inverse    /* Inverted text on dark/light buttons */

/* Structural Borders */
border-border-subtle   /* Soft card dividers (Light: slate-200 / Dark: slate-800) */
border-border-default  /* Standard input/card border (Light: slate-300 / Dark: slate-700) */
border-border-strong   /* Interactive hover border (Light: slate-400 / Dark: slate-600) */
```

---

## 8. Best Practices & Design System Rules

1. **Do Not Hardcode Hex Codes:** Always write `bg-primary-600` or `bg-surface-elevated` instead of `#4f46e5` or `#1e293b`.
2. **Never Invert Score-Band Colors:** Never use green for low scores or red for high scores.
3. **Always Accompany Color with Secondary Indicators:** Never rely on color alone to indicate status (e.g. always include text labels like "High Confidence" or icons like `✓` / `!`).
4. **Accessible Focus Rings:** Always pair focus states with visible focus rings:  
   `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2`.
5. **Preserve Fluid Layouts:** Use `max-w-6xl` as the global application content container for all post-login pages to avoid viewport width jumps.
