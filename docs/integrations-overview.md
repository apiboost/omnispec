---
id: integrations-overview
title: Integrations
sidebar_label: Overview
description: Decide how to embed OmniSpec — the React component for React apps, the framework-agnostic Web Component for everything else, and framework-specific guides for docs sites like Docusaurus.
---

# Integrations

How to embed OmniSpec depends on your stack. This page routes you to the right
guide.

## Decision guide

- **React app** → import the `<OmniSpecRenderer>` React component directly from
  `@apiboost/omnispec`.
- **Non-React app** (Vue, Angular, Svelte, vanilla HTML) → use the
  framework-agnostic **Web Component**, `<omnispec-renderer>`.
- **Docs site** (Docusaurus, etc.) → use the framework-specific guide below. If
  the docs site is React-based, embed the React component inside a client-only
  boundary; otherwise use the Web Component.

If you are already in React, prefer the React component — there is no benefit to
wrapping it in a custom element.

## Where to go

| You are building | Use | Guide |
|---|---|---|
| A Docusaurus docs site | React component in `<BrowserOnly>` | [Docusaurus](./integrations/docusaurus.md) |
| Another docs-site framework | see the guides below | [Docs-site frameworks](#docs-site-frameworks) |
| A React app (Vite, Next.js, CRA, …) | `<OmniSpecRenderer>` | [App-framework recipes](./framework-integration.md) |
| Vue, Angular, Svelte, or vanilla HTML | `<omnispec-renderer>` | [Web Component](./web-component.md) |

## Docs-site frameworks

Copy-paste embedding guides for the common documentation generators. Each one
picks the right entry point for its stack and handles the client-only mount,
theme sync, and sizing.

| Framework | Entry point | Guide |
|---|---|---|
| Docusaurus | React component | [Docusaurus](./integrations/docusaurus.md) |
| VitePress | Web Component (Vue) | [VitePress](./integrations/vitepress.md) |
| Nextra | React component (Next.js) | [Nextra](./integrations/nextra.md) |
| Astro / Starlight | Web Component or React island | [Astro / Starlight](./integrations/astro-starlight.md) |
| MkDocs | Web Component (no build) | [MkDocs](./integrations/mkdocs.md) |
| Plain HTML | Web Component (no build) | [Plain HTML](./integrations/plain-html.md) |

## The client-only gotcha

OmniSpec is [client-rendered](./concepts.md#client-rendered-not-server-rendered):
it parses and renders the spec in the browser after mount. It does not crash
under SSR/SSG, but it emits only a themed shell on the server, and it needs a
**client-only boundary** to avoid a hydration mismatch (and, in strict static
builds, to avoid pulling browser-only APIs into the server bundle):

- **Next.js:** add `'use client'`, or
  `dynamic(() => import('@apiboost/omnispec').then((m) => m.OmniSpecRenderer), { ssr: false })`.
- **Docusaurus / other SSG:** wrap it in `<BrowserOnly>` (see the
  [Docusaurus guide](./integrations/docusaurus.md)).

See [Getting Started → Server-side rendering](./getting-started.md#server-side-rendering)
for the full explanation.
