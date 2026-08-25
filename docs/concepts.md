---
id: concepts
title: Concepts
sidebar_label: Concepts
description: The OmniSpec mental model — spec auto-detection, lazy per-type renderers, client-side rendering, React component vs Web Component, the Try-It proxy model, and the theming model.
---

# Concepts

A short mental model of how `@apiboost/omnispec` works. Each concept links out to
the page that covers it in depth.

## Auto-detection and lazy renderers

`<OmniSpecRenderer>` inspects the spec you pass — a URL, a raw string, or a
pre-parsed object — and **auto-detects the spec type** (OpenAPI, AsyncAPI,
GraphQL, SOAP, or gRPC). It then **lazy-loads only the renderer for that type**,
so a page that shows an OpenAPI document never pays the cost of the AsyncAPI,
GraphQL, or other renderers.

OpenAPI and AsyncAPI render fully in the free core. GraphQL, SOAP/WSDL, and gRPC
render with **[OmniSpec Pro](https://apiboost.com/omnispec?utm_source=omnispec&utm_medium=docs&utm_campaign=pro)**;
without Pro they display a styled upgrade prompt.

You can skip detection and force a type with the `specType` prop. See
[Getting Started → Passing Specs](./getting-started.md#passing-specs) and
[Free vs Pro](./free-vs-pro.md).

## Client-rendered, not server-rendered

The renderer parses the spec and builds the documentation **in the browser after
mount** — it is a client-rendered component, not meaningfully server-rendered. It
does not crash under `renderToString` or a static build, but the server output is
only a themed shell; the actual API documentation renders (and hydrates) on the
client, so there is no server-rendered content for SEO or no-JS clients.

In SSR/SSG frameworks (Next.js, Docusaurus, and others) mount it inside a
**client-only boundary**. See
[Getting Started → Server-side rendering](./getting-started.md#server-side-rendering)
and the [Integrations](./integrations-overview.md) guides.

## React component vs Web Component

There are two entry points that render the same documentation:

| Entry point | Use when | Import |
|---|---|---|
| `<OmniSpecRenderer>` (React) | Your app is React | `import { OmniSpecRenderer } from '@apiboost/omnispec'` |
| `<omnispec-renderer>` (Web Component) | Non-React stacks (Vue, Angular, Svelte, vanilla HTML) or a docs site | `import '@apiboost/omnispec/wc'` |

If you are already in React, use the React component — there is no benefit to
wrapping it in a custom element. The Web Component is a standards-compliant custom
element (open shadow DOM, kebab-case attributes for scalars, properties for
complex objects) that exists for everything else. See
[Integrations](./integrations-overview.md) for the decision guide and the
[Web Component](./web-component.md) reference for the full API.

## The Try-It proxy model

The Try-It console sends live API requests in one of two modes:

- **Direct mode (default):** the browser sends the request straight to the API
  with `fetch`. No configuration — works when the API allows CORS from your docs
  origin (or is same-origin).
- **Proxy mode:** set `proxyUrl` and every Try-It request is routed through your
  backend, which forwards it to the API. Use this for CORS-restricted APIs,
  request auditing/rate-limiting, or SOAP services (which rarely support CORS).

A **"proxied"** badge appears when proxy mode is active. See
[Try It & Code Samples](./try-it.md) for both modes and
[Backend Integration](./backend-integration.md) for the proxy endpoint contract.

## The theming model

Theming has three layers, two free and one Pro:

- **`theme.base`** (free) — `'light'`, `'dark'`, or `'auto'` (follows the system
  preference, with a toggle). This is the everyday setting.
- **Raw `--omnispec-*` CSS variables** (free) — override individual design tokens
  scoped to `.omnispec-root` in your own stylesheet. The free white-label path.
- **`theme.overrides`** (Pro) — structured white-labeling of all 70+ design tokens
  through the `theme` prop, requires
  **[OmniSpec Pro](https://apiboost.com/omnispec?utm_source=omnispec&utm_medium=docs&utm_campaign=pro)**.

See [Theming](./theming.md) for the full token list and examples.
