# Brand assets — drop-in guide

Place all files in `website/static/img/`. Docusaurus serves `static/` verbatim,
so `static/img/logo.svg` is referenced in config as `img/logo.svg`.

Files are named by the **mode they render in** (matching Docusaurus's `src` =
light mode, `srcDark` = dark mode). A "light-mode" asset shows on a light
background, so its ink is dark/colored; a "dark-mode" asset shows on a dark
background, so its ink is light/white.

## Required

| File | Purpose | Spec |
|------|---------|------|
| `logo.svg` | Navbar logo, **light mode** | SVG (preferred), transparent bg, dark/brand ink. Renders ~28–32px tall. |
| `logo-dark.svg` | Navbar logo, **dark mode** | SVG, transparent bg, light/white ink. |
| `favicon-light.svg` | Browser-tab icon, **light** chrome | Square SVG, ink that reads on a light tab bar. Default/fallback. |
| `favicon-dark.svg` | Browser-tab icon, **dark** chrome | Square SVG, ink that reads on a dark tab bar. Wired via `media="(prefers-color-scheme: dark)"`. |

## Optional (nice to have)

| File | Purpose | Spec |
|------|---------|------|
| `apple-touch-icon.png` | iOS home-screen icon | 180×180 PNG, square, non-transparent bg. |
| `omnispec-social-card.png` | Link-preview (og:image) | 1200×630 PNG, branded. |

## If you'd rather not make an adaptive favicon

Provide `favicon-light.png` + `favicon-dark.png` (32×32 and/or 48×48) instead of
`favicon.svg`, and I'll wire theme-aware `<link media="(prefers-color-scheme: …)">`
tags. One adaptive SVG is simpler, though.

## Format notes

- **SVG is best** for both logos and the favicon — crisp at any size, tiny, and
  it's what enables the adaptive favicon trick. Raster fallback: PNG at 2× the
  display size, transparent background.
- **Branded House:** the navbar logo should be the **Apiboost OmniSpec** product
  lockup (ideally with an Apiboost endorsement), and the favicon the compact
  square OmniSpec mark.
- The in-renderer "Powered by Apiboost" sidebar badge uses its own embedded
  Apiboost logo (in `packages`/`src/core/components/Layout/DocLayout.tsx`) — that
  is separate from these docs-site assets. If you want to refresh that mark too,
  give me a small square Apiboost logo and I'll re-embed it.

## Once the files are in place

Tell me and I'll wire:
- `themeConfig.navbar.logo` → `{ src: 'img/logo.svg', srcDark: 'img/logo-dark.svg', alt: 'Apiboost OmniSpec', href: '/' }`
- `favicon: 'img/favicon.svg'` (+ `.ico` fallback / theme-aware `headTags`)
- `themeConfig.image` → `img/omnispec-social-card.png` (if provided)
- Remove the leftover scaffold assets (`docusaurus.png`, `undraw_*.svg`, the default social card).
