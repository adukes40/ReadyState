# Chromebook Screen Compaction + Dropdown Theming

**Date:** 2026-03-21
**Status:** Approved

## Problem

ReadyState was designed on a 32" widescreen. On a Chromebook (1366×768 at 100% zoom), sections are too tall and require excessive scrolling. The sidebar also takes up unnecessary horizontal space. Additionally, native `<select>` dropdowns render with OS-default bright backgrounds, making options unreadable against the dark theme.

## Goals

1. Automatically compact layout on short screens (≤800px viewport height) without requiring user zoom changes
2. Narrow the sidebar on short screens to free up horizontal space
3. Theme all dropdown elements to match the dark instrument-panel aesthetic
4. Preserve all existing mobile optimizations (width-based `md:` breakpoints, drawer behavior, canvas sizing)

## Approach

### 1. Section Spacing (`tokens.css` + `test-runner.tsx`)

Define a CSS class `sections-gap` in `tokens.css` that uses margin-top on direct children — the same mechanism Tailwind's `space-y-*` uses:

```css
/* Compact on short screens (Chromebook 768px), generous on tall screens */
.sections-gap > * + * { margin-top: 1rem; }

@media (min-height: 801px) {
  .sections-gap > * + * { margin-top: 2rem; }
}
```

In `test-runner.tsx`, replace the outer wrapper's `space-y-8` with `sections-gap`. Do not keep `space-y-8` alongside it — `sections-gap` fully replaces it.

### 2. Panel Compaction (`tokens.css` + `test-runner.tsx`)

Define a CSS class `panel-compact` in `tokens.css`:

```css
.panel-compact {
  padding: 0.75rem;
}

@media (min-height: 801px) {
  .panel-compact {
    padding: 1.25rem;
  }
}

/* h3 header margin — rule has higher specificity than Tailwind utility via explicit selector */
.panel-compact > h3 {
  margin-bottom: 0.5rem;
}

@media (min-height: 801px) {
  .panel-compact > h3 {
    margin-bottom: 1rem;
  }
}
```

In `test-runner.tsx`, the `Panel` component:
- Replace `p-4 md:p-5` with `panel-compact` on the `<section>` element
- Remove `mb-4` from the `h3` className — the `.panel-compact > h3` CSS rule handles it instead

### 3. ReadoutCard Icon (`tokens.css` + `test-runner.tsx`)

Define a CSS class `readout-icon` in `tokens.css`:

```css
.readout-icon {
  width: 2rem;    /* w-8 — compact */
  height: 2rem;
}

@media (min-height: 801px) {
  .readout-icon {
    width: 2.5rem;  /* w-10 — full size */
    height: 2.5rem;
  }
}
```

In `test-runner.tsx`, the `ReadoutCard` component's icon wrapper div:
- Remove `w-10 h-10` from the className
- Add `readout-icon` class in their place

The `rounded-xl bg-white/5 flex items-center justify-center border border-white/10 flex-shrink-0` classes remain unchanged.

Also add a compact grid gap to the System Readout grid in `tokens.css`:

```css
.readout-grid {
  gap: 0.5rem;
}

@media (min-height: 801px) {
  .readout-grid {
    gap: 0.75rem;
  }
}
```

In `test-runner.tsx`, replace `gap-3` on the readout `<div className="grid ...">` with `readout-grid`.

### 4. Sidebar Width (`tokens.css` + `app.tsx`)

Define a CSS class `sidebar-width` in `tokens.css`:

```css
/* Default (short screens ≤800px, or any height): narrow */
.sidebar-width {
  width: 13rem;   /* 208px — w-52 */
}

/* Tall screens (>800px): full width */
@media (min-height: 801px) {
  .sidebar-width {
    width: 16rem;   /* 256px — w-64 */
  }
}
```

**Breakpoint rationale:** `min-height: 801px` is intentional — it draws the line immediately above the 800px threshold. On a 1366×768 Chromebook at 100% zoom the CSS viewport height is ~668px (768px minus ~100px browser chrome), so only the narrow `13rem` applies. On 900px+ screens the wide `16rem` applies, matching current behavior.

The desktop sidebar `nav` in `app.tsx` (line 139):
- Remove `w-64`
- Add `sidebar-width`

The mobile drawer is unaffected — it uses `w-72 max-w-[85vw]` controlled by the `md:hidden` breakpoint.

The sidebar content (gauge, battery, brand spacing) already adapts via the existing `min-height: 900px` token classes — no height changes needed. Height estimate at 768px: ~464px content in ~636px sidebar → comfortable fit without scrolling.

### 5. Dropdown Theming (`tokens.css`)

Add global rules for native `<select>` elements. Chrome/Chromium (the Chromebook browser) respects `background-color` and `color` on `<option>` elements:

```css
select {
  background-color: #141414;
  color: #E8EAED;
}

select option {
  background-color: #141414;
  color: #E8EAED;
}
```

This is a global rule — covers all four dropdowns (keyboard layout, CPU duration, GPU duration, Tab Swarm preset) without modifying individual component files.

## Files Changed

| File | Change |
|------|--------|
| `src/styles/tokens.css` | Add CSS classes: `sections-gap`, `panel-compact`, `readout-icon`, `readout-grid`, `sidebar-width`; add global `select`/`option` dark theme rules |
| `src/app.tsx` | Sidebar `nav`: remove `w-64`, add `sidebar-width` |
| `src/pages/test-runner.tsx` | Outer wrapper: replace `space-y-8` with `sections-gap`; `Panel` `<section>`: replace `p-4 md:p-5` with `panel-compact`, remove `mb-4` from `h3`; `ReadoutCard` icon div: remove `w-10 h-10`, add `readout-icon`; readout grid div: replace `gap-3` with `readout-grid` |

## What Does NOT Change

- Mobile breakpoints (`md:` Tailwind classes) — untouched
- Mobile drawer (`w-72 max-w-[85vw]`) — untouched
- Keyboard `AutoScaleKeyboard` — handles its own width scaling, no changes
- Trackpad canvas `aspectRatio: 4/3` — untouched
- All existing `min-height: 900px` sidebar token rules — stay as-is
- Canvas `devicePixelRatio` math — untouched

## Success Criteria

- On 1366×768 at 100% zoom: the test-runner page's total scrollable content height is reduced by at least 150px compared to before the change
- On 1366×768: the sidebar renders at 208px wide and its full content (logo through Privacy button) is visible without scrolling
- On a 1920×1080 (or any ≥900px height) display: layout is visually identical to before — sidebar 256px, full spacing
- All four `<select>` dropdowns (keyboard, CPU, GPU, Tab Swarm) render with background `#141414` and legible text
- No visual regressions on mobile (drawer still works, layout correct on <768px width screens)
