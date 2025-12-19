---
title: Fix UI Colors and Styling
description: Investigation and resolution of color and styling issues in the login page and global theme.
status: proposed
---

# Objective
Fix the color rendering issues reported by the user ("Y los colores?") and ensure the login page matches the intended design, including proper dark/light mode behavior and icon visibility.

# Analysis
The user reported issues with icons (addressed in previous step via `<link>` tags) and now colors.
Potential causes for color issues:
1. **Theme Conflict**: `globals.css` enforces a dark theme on `body` (`background-color: var(--surface-base)` which is `#101922`), while the Login page component applies `bg-[#f6f7f8]` (light) by default unless a `dark` class is present.
2. **Missing Utility Classes**: Tailwind v4 might need explicit inclusion of color palettes if strictly defined in `@theme`.
3. **Dark Mode toggle**: The `html` tag might lack the `class="dark"` attribute or media query support, causing the `dark:` variant classes to be ignored, while global CSS variables force white text, resulting in White Text on Light Background (invisible).

# Proposed Changes

## 1. Harmonize Theme Strategy
- Update `globals.css` to support both light and dark modes or ensure the Login page overrides global defaults correctly.
- Since the provided design allows for light/dark, we should ensure the application respects user preference or defaults to a consistent state.

## 2. Update Login Page Styling
- Verify the class names against the provided HTML.
- Ensure text contrasts are correct (e.g., `text-slate-900` vs `text-white`).

## 3. Verify Tailwind Configuration
- Check `postcss.config.mjs` and package versions to confirm Tailwind v4 setup is correct.
- Ensure `@theme` block in `globals.css` includes necessary extends or that standard colors are not disabled.

## 4. Final Visual Verification
- Use browser tools (if available) or careful code review to ensure `bg-primary` and other custom tokens map correctly.

# Implementation Plan
1. **Modify `globals.css`**: Remove the forced dark mode on `body` or wrap it in a `@media (prefers-color-scheme: dark)` block or `.dark` selector to allow the Login page's light mode to function.
2. **Review `layout.tsx`**: Ensure the html structure supports the theme (e.g., `class="light"` or `dark` if we are forcing one, or let it be).
3. **Verify Icon Rendering**: Confirm the previous fix (Link tags) persists and is correct.

