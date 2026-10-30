# GDG Design System & Architectural Guidelines (`GDGDesign.md`)

> **Purpose:** This document is the single source of truth for the **Google Developer Groups (GDG)** minimal, high-contrast, developer-first design philosophy. Use this specification as a blueprint or AI system prompt reference to build consistent, accessible, high-performance GDG event platforms (DevFest, Google I/O Extended, Build with AI, Cloud Community Days, Women Techmakers).

---

## 1. Core Design Philosophy

1. **Minimalist Developer-First Aesthetic ("Technical Editorial")**
   - Avoid bloated marketing templates, heavy drop shadows, neon gradients, or visual clutter.
   - Combine **clean geometric display typography** (`Google Sans`), **high-legibility body prose** (`Google Sans Text`), and **structured technical metadata** (`Google Sans Mono` with `// EYEBROW` prefixes, pill tags, and dashed dividers).
   - Use **1px subtle structural borders** (`rgba(240, 240, 240, 0.12)`) and layered dark surfaces (`#1e1e1e` → `#252525` → `#2d2d2d`) instead of heavy box-shadows to establish depth and hierarchy.

2. **Intentional Four-Color Accent Rotation**
   - Google's four signature colors (**Blue, Red, Yellow, Green**) are never used randomly or all at once in chaotic gradients.
   - Instead, every card, track, badge, or section is assigned a deterministic semantic `data-accent="blue | red | yellow | green"` attribute.
   - **Three-tier color harmony** is strictly enforced:
     - **Core Colors** (`500`/`600`) for primary CTAs and solid interactive fills.
     - **Halftones** for high-contrast hover borders, technical eyebrows, and stat callouts on dark backgrounds.
     - **Pastels** for high-contrast pill badges with dark `#1e1e1e` text.

3. **Mobile-First & Zero-Overflow Ergonomics**
   - Designed from `320px` viewports upward using fluid `clamp()` typography and spacing.
   - Strict prevention of horizontal scroll leakage (`overflow-x: clip` on `html` and `body`, plus `visibility: hidden` and `[attr.inert]` on off-canvas drawers).
   - Touch targets meet or exceed `40px × 40px` (`2.5rem`).

4. **Performance & Accessibility by Default**
   - **WCAG 2.1 AA/AAA Contrast Compliance:** Off-white `#f0f0f0` on `#1e1e1e` base yields `15.4:1` contrast; muted `#b5b5b5` yields `8.5:1` contrast; `#1e1e1e` text on Pastel pills yields `>12:1` contrast.
   - **Native Web Primitives:** Uses native HTML `<dialog>` for modals, `hidden="until-found"` with `beforematch` for searchable FAQ accordions, and `content-visibility: auto` for below-the-fold sections.

---

## 2. Color System & Semantic Tokens

Always declare `color-scheme: dark;` on `:root` so browser scrollbars, form controls, and system UI match the dark surface automatically.

### 2.1 Complete CSS Custom Properties (`:root`)

```css
:root {
  color-scheme: dark;

  /* 1. Grayscale Surfaces & Text (WCAG 2.1 Dark Theme) */
  --bg-primary: #1e1e1e;                  /* Black 02 — Page canvas & recessed wells */
  --bg-surface: #252525;                  /* Surface 01 — Cards, drawers, tiers, containers */
  --bg-elevated: #2d2d2d;                 /* Surface 02 — Card hover states, active modals */
  --text-primary: #f0f0f0;                /* Off-White — Headings & primary copy (15.4:1 contrast) */
  --text-muted: #b5b5b5;                  /* Muted Gray — Subtitles, descriptions, meta (8.5:1 contrast) */
  --border-subtle: rgba(240, 240, 240, 0.12); /* Hairline structural borders & dividers */

  /* 2. Google Core Brand Colors (Primary Fills & CTAs) */
  --blue-500: #4285f4;
  --green-500: #34a853;
  --yellow-600: #f9ab00;
  --red-500: #ea4335;

  /* 3. Halftone Accents (Hover Borders, Stat Numbers, Monospace Eyebrows on Dark BG) */
  --halftone-blue: #57caff;
  --halftone-green: #5cdb6d;
  --halftone-yellow: #ffd427;
  --halftone-red: #ff7daf;

  /* 4. Pastel Accents (Pill Badges, Active States — ALWAYS pair with #1e1e1e text) */
  --pastel-blue: #c3ecf6;
  --pastel-green: #ccf6c5;
  --pastel-yellow: #ffe7a5;
  --pastel-red: #f8d8d8;

  /* Native form control tint */
  accent-color: var(--blue-500);
}
```

### 2.2 Color Pairing Rules (Do's & Don'ts)

| Element Type | Background Token | Text / Foreground Token | Border Token |
| :--- | :--- | :--- | :--- |
| **Page Canvas** | `--bg-primary` (`#1e1e1e`) | `--text-primary` (`#f0f0f0`) | N/A |
| **Standard Card** | `--bg-surface` (`#252525`) | `--text-primary` / `--text-muted` | `1px solid var(--border-subtle)` |
| **Nested Card / Well** (e.g. Partner item inside a Tier, or Stat Pill inside Hero) | `--bg-primary` (`#1e1e1e`) | `--text-primary` (`#f0f0f0`) | `1px solid var(--border-subtle)` |
| **Card Hover State** | `--bg-elevated` (`#2d2d2d`) | `--text-primary` (`#f0f0f0`) | `1px solid var(--halftone-{accent})` |
| **Pastel Pill / Tag** | `--pastel-{accent}` | `#1e1e1e` (**Strict Dark Text**) | None |
| **Primary CTA Button** | `--blue-500` (`#4285f4`) | `#ffffff` | `1px solid transparent` |
| **Primary CTA Hover** | `--halftone-blue` (`#57caff`) | `#1e1e1e` (**Flips to Dark Text**) | `1px solid transparent` |
| **Secondary CTA Button** | `--bg-primary` (`#1e1e1e`) | `--text-primary` (`#f0f0f0`) | `1px solid var(--border-subtle)` |
| **Secondary CTA Hover** | `--bg-primary` (`#1e1e1e`) | `--halftone-yellow` (`#ffd427`) | `1px solid var(--halftone-yellow)` |

> **CRITICAL RULE:** Never put white text (`#ffffff` or `#f0f0f0`) on `--pastel-*` or `--halftone-*` backgrounds. Always use `#1e1e1e` text on Pastel and Halftone surfaces to guarantee WCAG AAA readability.

---

## 3. Typography System

The typography system uses three purposeful font families mapped to CSS variables with `font-display: swap`.

### 3.1 Font Family Stack

```css
:root {
  --font-display: 'Google Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-sans: 'Google Sans Text', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'Google Sans Mono', ui-monospace, SFMono-Regular, monospace;
}
```

- **`--font-display` (`Google Sans` — Weights: 400, 500, 700):**
  - Used for page titles, section titles, card headings, navigation links, and buttons.
  - Pair headings with `text-wrap: balance;` to prevent awkward single-word orphans.
- **`--font-sans` (`Google Sans Text` — Weights: 400, 500, 700):**
  - Default `body` font (`line-height: 1.5` to `1.6`).
  - Used for speaker bios, session descriptions, FAQ answers, and long-form copy.
  - Constrain long-form paragraphs to `max-width: 60ch–68ch` with `text-wrap: pretty;`.
- **`--font-mono` (`Google Sans Mono` — Weights: 400, 500, 600, 700):**
  - Used for section eyebrows (`// EXPLORE TRACKS`), time slots (`10:35 AM - 11:05 AM`), pill badges, track tags, metadata counters, and directional arrows (`↗`, `→`).

### 3.2 Fluid Type Scale

| Role | Font Family | Size (`clamp` / `rem`) | Weight | Line Height | Letter Spacing |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Home Hero Display** | `--font-display` | `clamp(2.15rem, 4.8vw, 3.6rem)` | `700` | `1.08` | `-0.02em` |
| **Page Hero Title (`h1`)** | `--font-display` | `clamp(2rem, 4vw, 3rem)` | `700` | `1.15` | `-0.01em` |
| **Section Title (`h2`)** | `--font-display` | `clamp(1.5rem, 2.8vw, 2.15rem)` | `700` | `1.2` | `normal` |
| **Stat Value Callout** | `--font-display` | `clamp(1.5rem, 2.5vw, 2rem)` | `700` | `1.1` | `normal` |
| **Card Title (`h3`)** | `--font-display` | `1.15rem` – `1.25rem` | `700` | `1.3` | `normal` |
| **Lead / Hero Subtitle** | `--font-sans` | `clamp(0.98rem, 1.4vw, 1.1rem)` | `400` | `1.6` | `normal` |
| **Body Copy (Default)** | `--font-sans` | `0.92rem` – `1rem` | `400` | `1.5` – `1.6` | `normal` |
| **Card Secondary / Meta** | `--font-sans` | `0.85rem` – `0.875rem` | `400` | `1.45` | `normal` |
| **Section Eyebrow** | `--font-mono` | `0.75rem` (`12px`) | `600` | `1.2` | `0.08em` (Uppercase) |
| **Pill / Badge Label** | `--font-mono` | `0.7rem` – `0.75rem` | `600` | `1.0` | `0.02em` – `0.06em` |

---

## 4. Layout, Spacing & Grid Architecture

### 4.1 Container & Page Shell
All pages share a unified `.page-wrapper` container that centers content and establishes vertical rhythm across sections:

```css
.page-wrapper {
  max-width: 76rem; /* 1216px */
  margin: 0 auto;
  padding: 0 clamp(1rem, 3vw, 2rem);
  display: flex;
  flex-direction: column;
  gap: clamp(3rem, 6vw, 4.75rem);
}
```

### 4.2 Responsive Breakpoints
- **`600px` / `640px` (Small Tablet / Large Phone):**
  - 2-column card grids (`.cards-grid--4`).
  - Header primary CTA button (`Join GDG ... ↗`) becomes visible next to the mobile menu button.
- **`720px` (Tablet):**
  - Section headers transition from stacked column to horizontal row (`justify-content: space-between; align-items: flex-end`).
  - Hero stats bar transitions from `2×2` grid to `4×1` single row.
  - Speaker modal switches from single-column stack to 2-column split (`15.5rem` portrait sidebar + `1fr` content).
- **`960px` (Desktop Navigation Threshold):**
  - Desktop horizontal pill links appear in the navbar; hamburger button and mobile drawer hide.
  - Hero switches to a 2-column asymmetric split (`1.2fr` copy + `0.8fr` interactive brand card).
- **`1024px` (Wide Desktop):**
  - 4-column card grids (`grid-template-columns: repeat(4, 1fr)`).

### 4.3 Border Radius Scale
- **Outer Containers / Hero Cards / Modals:** `1.25rem` – `1.5rem` (`20px` – `24px`)
- **Standard Content Cards (Speaker, Team, Track, FAQ):** `1.15rem` – `1.25rem` (`18px` – `20px`)
- **Nested Cards / Avatars / Buttons / Inputs:** `0.75rem` – `1rem` (`12px` – `16px`)
- **Pills, Filter Chips, Primary CTA Buttons:** `999px` (Full capsule)

---

## 5. Brand Assets & Iconography Guidelines

1. **GDG & DevFest Lockups**
   - Always use light-text lockups (`GDG-Logo-*-Light.svg`) on the dark `#1e1e1e` / `#252525` surfaces.
   - Provide an interactive 4-color brand switcher (Blue, Red, Yellow, Green) on flagship hero cards so users can playfully toggle the event logo variant.

2. **Geometric Glyphs (`Fat` & `Thin` SVGs)**
   - Use **Thin** stroke glyphs (`arrow-right.svg`, `asterisk.svg`, ` globe.svg`) for directional button icons and metadata accents.
   - Invert dark SVGs cleanly on dark surfaces using `filter: invert(1); opacity: 0.85;`.

3. **External & Partner Logos**
   - Partner and community logos vary widely in aspect ratio (horizontal wordmarks vs. square emblems).
   - **Rule:** Render partner logos inside a fixed-height flex well (`min-height: 3.5rem; display: flex; align-items: center;`) with:
     ```css
     .partner-card__logo {
       max-height: 2.75rem;
       width: auto;
       max-width: 100%;
       object-fit: contain;
     }
     ```
   - Always define a fallback **Monogram Badge** (e.g., `GDG`, `CT`, `WTM`) styled with `background: var(--pastel-{accent}); color: #1e1e1e; font-family: var(--font-mono);` when `logoUrl` is absent.

---

## 6. Signature Component Blueprints

### 6.1 Sticky Glassmorphic Navbar & Off-Canvas Mobile Drawer
- **Header Shell:** `position: sticky; top: 0; z-index: 50; background: rgba(30, 30, 30, 0.86); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border-subtle);`
- **Desktop Active Route Pill:** High-contrast inverted pill (`background: var(--text-primary); color: #1e1e1e; font-weight: 600;`), shifting to `var(--pastel-blue)` on hover.
- **Mobile Drawer Off-Screen Protection:**
  - Never rely solely on `transform: translateX(100%)` for fixed/off-screen mobile menus, as mobile browsers may still allow horizontal touch-scrolling into the hidden region.
  - Always combine:
    ```css
    .mobile-drawer {
      transform: translateX(100%);
      visibility: hidden;
      opacity: 0;
      pointer-events: none;
    }
    .mobile-drawer--open {
      transform: translateX(0);
      visibility: visible;
      opacity: 1;
      pointer-events: auto;
    }
    ```
  - Bind `[attr.inert]="!isMobileMenuOpen() ? '' : null"` on the `<aside>` element and lock `document.body.style.overflow = 'hidden'` while open.

### 6.2 Accent-Driven Cards (`SpeakerCard`, `TeamCard`, `PartnerCard`, `TrackCard`)
Every card follows a 3-zone vertical flex layout (`justify-content: space-between`) with a `data-accent` attribute:
1. **Top Row:** Avatar (`4.5rem × 4.5rem`, `border-radius: 1rem`) on the left + Pastel Track/Role Pill on the right.
2. **Body Zone:** Monospace eyebrow badge → Bold `Google Sans` Name → Muted Role & Company (separated by a `--yellow-600` middle dot `·`) → Dashed top divider (`border-top: 1px dashed var(--border-subtle)`) → Session title.
3. **Footer Zone:** Full-width subtle action button (`background: rgba(240, 240, 240, 0.05); border: 1px solid var(--border-subtle)`) that highlights with `border-color: var(--blue-500)` on hover.
4. **Hover Micro-Interaction:**
   - Card lifts by `transform: translateY(-2px)`.
   - Surface lightens from `--bg-surface` (`#252525`) to `--bg-elevated` (`#2d2d2d`).
   - Border illuminates with the card's corresponding halftone token (`--halftone-blue`, `--halftone-red`, `--halftone-yellow`, or `--halftone-green`).

### 6.3 Filter Pill Bars (Speakers, Team, FAQs)
- Horizontal wrapping flex list of capsule buttons (`border-radius: 999px`).
- Inactive state: `background: var(--bg-surface); color: var(--text-muted); border: 1px solid var(--border-subtle);`
- Active state: `background: var(--pastel-blue); color: #1e1e1e; border-color: transparent; font-weight: 700;`

### 6.4 Native `<dialog>` Modal (`SpeakerModal`)
- Uses the native `<dialog>` element opened via `.showModal()` for automatic top-layer rendering, focus trapping, and `Escape` key handling.
- Backdrop: `background: rgba(10, 10, 10, 0.78); backdrop-filter: blur(6px);`
- Clicking the `<dialog>` backdrop outside the inner `.modal-card` closes the modal cleanly.

### 6.5 Exclusive Searchable FAQ Accordion (`FaqsPage`)
- Controlled by a single Signal (`activeIndex = signal<number | null>(0)`) so opening one question automatically collapses any previously open question.
- Uses `hidden="until-found"` on collapsed answer panels and listens to the native `(beforematch)` event so browser **Find in Page (`Cmd+F` / `Ctrl+F`)** can still search inside collapsed answers and automatically expand the matching item.

### 6.6 Interactive HTML5 Canvas Badge Studio (`BadgePage`)
- **Aspect Ratio:** `4:5` vertical portrait (`1080 × 1350 px`), optimized for Instagram, LinkedIn, and X feeds.
- **Layout:** 2-column studio workspace (Controls panel on the left, sticky live `<canvas>` preview on the right).
- **Capabilities:**
  - Local photo upload + drag/slider pan (`offsetX`, `offsetY`) and zoom (`1x` – `2.5x`).
  - Live attendee name & role/community tag overlay.
  - 4-color theme selector (`Blue`, `Red`, `Yellow`, `Green`) that dynamically redraws the canvas border accents, corner geometry, event metadata pills, and footer hashtag strip.
  - One-click high-resolution `.png` download via `canvas.toDataURL('image/png')`.

---

## 7. Engineering & Performance Standards (Angular v21+ Blueprint)

When building new GDG web applications with this design system, adhere to these technical pillars:

1. **Standalone + Signals Only:**
   - Use `ChangeDetectionStrategy.OnPush` on every component.
   - Use `signal()`, `computed()`, `input()`, and `output()` instead of RxJS `BehaviorSubject` or `@Input()` decorators for UI state.
2. **Hybrid SSR & Prerendering (`@angular/ssr`):**
   - Prerender all static marketing/event routes (`/`, `/about`, `/speakers`, `/team`, `/partners`, `/faqs`, `/badge`) using `RenderMode.Prerender`.
   - Enable `provideClientHydration(withIncrementalHydration(), withEventReplay())`.
3. **Below-the-Fold Deferral:**
   - Wrap below-the-fold home page sections and heavy interactive widgets in `@defer (hydrate on viewport)` blocks with a styled `.section-placeholder` fallback.
   - Apply `.deferred-section { content-visibility: auto; contain-intrinsic-size: auto none auto 420px; }` for instant initial paint.
4. **Centralized Typed Event Data (`event-data.ts`):**
   - Keep all event metadata (dates, venue, registration links, speakers, agenda slots, team members, partner tiers, FAQs) in a single strongly-typed data file so re-skinning the platform for a new GDG event or year requires zero template rewrites.
5. **SEO & Structured Data (`SeoService`):**
   - Inject route-specific `<title>`, OpenGraph, Twitter Card tags, and `Event` + `Organization` JSON-LD schemas during SSR so links shared on WhatsApp, LinkedIn, X, and Discord render rich previews automatically.
