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

### 1. Height-Responsive Layout

Extend the existing `@media (min-height: 900px)` pattern already in `tokens.css` with a complementary `@media (max-height: 800px)` block that tightens spacing when the viewport is short (targets 1366×768 Chromebook at 100% zoom — usable height ~668px).

**`tokens.css` additions:**
- New CSS class `sidebar-width`: `width: 13rem` (208px / w-52) by default, `width: 16rem` (256px / w-64) at `min-height: 801px`
- New CSS class `content-section-gap`: `gap: 1rem` at max-height: 800px, inherits `space-y` otherwise (handled via Tailwind class swap in test-runner.tsx)
- New CSS class `panel-compact`: reduces panel padding to `0.75rem` at max-height: 800px
- New CSS class `readout-icon-compact`: reduces ReadoutCard icon from `w-10 h-10` to `w-8 h-8` at max-height: 800px

**`app.tsx` changes:**
- Desktop sidebar `nav`: replace hardcoded `w-64` with `sidebar-width` class

**`test-runner.tsx` changes:**
- Outer wrapper `space-y-8` → `space-y-4 lg-h:space-y-8` via a CSS class `sections-gap` defined in tokens.css
- `Panel` component: add `panel-compact` class alongside existing padding classes
- `Panel` header: `mb-4` → `mb-2 compact-h:mb-4` via tokens.css rule on `.panel-compact h3`
- `ReadoutCard`: add `readout-icon-compact` class to icon wrapper; `p-4` → handled by `panel-compact` rule on parent

### 2. Sidebar Width

The sidebar already uses height-responsive token classes (`sidebar-gauge`, `sidebar-battery`, `sidebar-brand`, etc.) that fire below 900px. Content fits in ~464px against ~636px available sidebar height at 768px — no vertical changes needed.

Only the width changes:
- `sidebar-width` CSS class: `16rem` (256px) by default, `13rem` (208px) at `max-height: 800px`
- Applied to the desktop `nav` element in `app.tsx`
- Mobile drawer is unaffected (it uses `w-72 max-w-[85vw]` and is width-breakpoint-controlled)

### 3. Dropdown Theming

Native `<select>` and `<option>` elements ignore most CSS on their dropdown panel. In Chrome/Chromium (the only browser target for Chromebook), `background-color` and `color` on `option` elements are respected.

**`tokens.css` additions:**
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

This is a global rule — covers all four dropdowns (keyboard layout, CPU duration, GPU duration, Tab Swarm preset) without touching individual component files.

## Files Changed

| File | Change |
|------|--------|
| `src/styles/tokens.css` | Add `@media (max-height: 800px)` block with `sidebar-width`, `sections-gap`, `panel-compact`, `readout-icon-compact` classes; add global `select`/`option` dark theme rules |
| `src/app.tsx` | Sidebar `nav`: replace `w-64` with `sidebar-width` class |
| `src/pages/test-runner.tsx` | Outer wrapper: add `sections-gap` class; `Panel`: add `panel-compact`; `ReadoutCard`: add `readout-icon-compact` on icon div |

## What Does NOT Change

- Mobile breakpoints (`md:` Tailwind classes) — untouched
- Mobile drawer (`w-72 max-w-[85vw]`) — untouched
- Keyboard `AutoScaleKeyboard` — width-scales already, no height intervention
- Trackpad canvas `aspectRatio: 4/3` — untouched
- All existing `min-height: 900px` sidebar token rules — stay as-is
- Any canvas `devicePixelRatio` math — untouched

## Success Criteria

- On 1366×768 at 100% zoom: all test sections visible with significantly less scrolling (~20% height reduction)
- Sidebar fits within viewport without scrolling at 768px height
- Sidebar is 208px wide on Chromebook, 256px on larger screens
- All `<select>` dropdowns render with dark background (#141414) and readable text (#E8EAED)
- No visual regressions on desktop (32") or mobile
