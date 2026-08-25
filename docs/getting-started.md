---
description: Render interactive OpenAPI, Swagger & AsyncAPI docs in React with OmniSpec — built-in Try-It console, auto-generated code samples, theming, and a framework-agnostic Web Component.
keywords:
  - OpenAPI
  - Swagger
  - AsyncAPI
  - API documentation
  - React API docs renderer
  - Try-It console
  - code samples
  - Web Component
  - Redoc alternative
  - open source
---

# Getting Started

Render interactive OpenAPI, Swagger, and AsyncAPI documentation in your React app in under two minutes.

## Packages

| Package | Specs | Install |
|---------|-------|---------|
| `@apiboost/omnispec` | OpenAPI 2.0–3.1, AsyncAPI 2.x–3.x | `npm install @apiboost/omnispec` |
| `@apiboost/omnispec-pro` | + GraphQL, SOAP/WSDL, gRPC, theme overrides, interactive OAuth | `npm install @apiboost/omnispec @apiboost/omnispec-pro` |

**Peer dependencies:** React 18 or 19 (`react`, `react-dom`). Everything else, including `@emotion/css` for styling, is bundled as a normal dependency — no separate install needed. (Pro additionally requires `@apiboost/omnispec` as a peer, shown above.)

## Quick Start

```tsx
import { OmniSpecRenderer } from '@apiboost/omnispec'

function OmniSpec() {
  return (
    <OmniSpecRenderer
      spec="https://petstore3.swagger.io/api/v3/openapi.json"
    />
  )
}
```

That's it. The component fetches the spec, auto-detects the type, and renders full documentation with sidebar navigation, schema viewers, code samples, and a Try-It panel.

New to how the pieces fit together? Read [Concepts](./concepts.md) for the mental model.

### Adding Pro

:::info[Pro]
GraphQL, SOAP/WSDL, and gRPC renderers, plus full theme-token white-labeling, require **[Apiboost OmniSpec Pro](https://apiboost.com/omnispec?utm_source=omnispec&utm_medium=docs&utm_campaign=pro)**. In the free core, OpenAPI and AsyncAPI specs render fully; other spec types display a styled upgrade prompt.
:::

Pro is activated by importing the pre-wired `OmniSpecRenderer` from `@apiboost/omnispec-pro` — it needs no provider or extra configuration:

```tsx
import { OmniSpecRenderer } from '@apiboost/omnispec-pro'

function OmniSpec() {
  return <OmniSpecRenderer spec="/schema.graphql" />
}
```

Alternatively, keep importing from `@apiboost/omnispec` and pass the Pro capability object through the `pro` prop. (The deprecated `<ProProvider>` wrapper still works but should not be used in new code.) See [Free vs Pro](./free-vs-pro.md).

## Choose your integration

How you embed the renderer depends on your stack:

- **React app** → import the `<OmniSpecRenderer>` React component (shown above).
- **Docs site** (Docusaurus, etc.) → follow the [Docusaurus guide](./integrations/docusaurus.md).
- **Non-React app** (Vue, Angular, Svelte, vanilla HTML) → use the [Web Component](./web-component.md).

See [Integrations](./integrations-overview.md) for the full decision guide and per-framework recipes.

### Server-side rendering

OmniSpec is a **client-rendered** component — it parses the spec and renders the documentation in the browser after mount. It does not crash under `renderToString` or static builds, but the server output is only a themed shell: the API documentation renders (and hydrates) on the client, so there is no server-rendered content for SEO or no-JS clients. Mount it inside a **client-only boundary** in SSR/SSG frameworks:

- **Next.js:** add `'use client'`, or use `dynamic(() => import('@apiboost/omnispec').then((m) => m.OmniSpecRenderer), { ssr: false })`.
- **Docusaurus and other static-site generators:** wrap it in a client-only boundary (e.g. Docusaurus's `<BrowserOnly>`) to avoid a hydration mismatch. See the [Docusaurus guide](./integrations/docusaurus.md).

## Passing Specs

Specs can be provided as a URL, raw content string, or pre-parsed object:

```tsx
// URL — fetched automatically
<OmniSpecRenderer spec="https://api.example.com/openapi.json" />

// Raw JSON/YAML string
<OmniSpecRenderer spec={yamlString} />

// Pre-parsed JavaScript object
<OmniSpecRenderer spec={parsedSpecObject} />

// Force a specific spec type (skip auto-detection)
import { SpecType } from '@apiboost/omnispec'
<OmniSpecRenderer spec={specUrl} specType={SpecType.ASYNCAPI_3} />
```

OpenAPI and AsyncAPI accept JSON or YAML. GraphQL accepts SDL strings or introspection results. SOAP accepts WSDL XML. gRPC accepts `.proto` file content.

> **GraphQL introspection exports:** `getIntrospectionQuery()`'s defaults omit the schema description, `@specifiedBy` URLs on custom scalars, and argument/input-field deprecation. To make an introspection export render identically to its SDL, generate it with the full-fidelity options:
>
> ```ts
> import { getIntrospectionQuery } from 'graphql'
>
> getIntrospectionQuery({
>   specifiedByUrl: true,
>   schemaDescription: true,
>   inputValueDeprecation: true,
>   directiveIsRepeatable: true,
> })
> ```

## Supported Specifications

| Component | Spec Type | Versions | Package |
|-----------|-----------|----------|---------|
| `<OmniSpecRenderer>` | Auto-detect | All below | `@apiboost/omnispec` |
| `<OpenApiSpec>` | OpenAPI / Swagger | 2.0, 3.0.x, 3.1 | `@apiboost/omnispec` |
| `<AsyncApiSpec>` | AsyncAPI | 2.x — 3.x | `@apiboost/omnispec` |
| `<GraphqlSpec>` | GraphQL SDL | Any | `@apiboost/omnispec-pro` |
| `<SoapSpec>` | WSDL / SOAP | 1.1 | `@apiboost/omnispec-pro` |
| `<GrpcSpec>` | Protocol Buffers | proto2, proto3 | `@apiboost/omnispec-pro` |

`<OmniSpecRenderer>` auto-detects the spec type and lazy-loads only the renderer needed. When you render with `@apiboost/omnispec-pro` (or pass the `pro` prop), all spec types render automatically.

## Next steps

- [Concepts](./concepts.md) — the mental model behind OmniSpec
- [Integrations](./integrations-overview.md) — React, Docusaurus, and Web Component recipes
- [Configuration](./configuration.md) — layouts, navigation, display modes, advanced options
- [Theming](./theming.md) — design tokens, custom themes, white-labeling
- [Try It & Code Samples](./try-it.md) — Try-It panel, proxy setup, code samples, deep linking
- [API Reference](./api-reference.md) — all props and TypeScript types
