# Getting Started

Render API documentation in your React app in under 2 minutes.

## Packages

| Package | Specs | Install |
|---------|-------|---------|
| `@apiboost/omnispec` | OpenAPI 2.0–3.1, AsyncAPI 2.x–3.x | `npm install @apiboost/omnispec` |
| `@apiboost/omnispec-pro` | + GraphQL, SOAP/WSDL, gRPC, theme overrides, vendor extensions | `npm install @apiboost/omnispec @apiboost/omnispec-pro` |

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

Alternatively, keep importing from `@apiboost/omnispec` and pass the Pro capability object through the `pro` prop. (The deprecated `<ProProvider>` wrapper still works but should not be used in new code.)

## Framework Setup

### Vite + React

```bash
npm create vite@latest my-docs -- --template react-ts
cd my-docs
npm install @apiboost/omnispec react-router-dom
```

```tsx
// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { OmniSpecRenderer } from '@apiboost/omnispec'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/docs/*"
          element={
            <div style={{ height: '100vh' }}>
              <OmniSpecRenderer
                spec="/specs/openapi.json"
                theme={{ base: 'light' }}
                layout="sidebar"
                allowTryIt={true}
              />
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
```

Place your spec file in the `public/specs/` directory and it will be served statically.

### Next.js (App Router)

```bash
npm install @apiboost/omnispec
```

```tsx
// app/docs/page.tsx
'use client'

import { OmniSpecRenderer } from '@apiboost/omnispec'

export default function DocsPage() {
  return (
    <div style={{ height: '100vh' }}>
      <OmniSpecRenderer
        spec="https://api.example.com/openapi.json"
        theme={{ base: 'light' }}
      />
    </div>
  )
}
```

The `'use client'` directive is required — the renderer uses browser APIs (DOM, fetch, clipboard).

### Web Component (any framework)

For Vue, Angular, Svelte, or vanilla HTML, use the framework-agnostic
`<omnispec-renderer>` custom element:

```html
<script src="https://unpkg.com/@apiboost/omnispec@latest/dist/wc/standalone.js"></script>
<omnispec-renderer spec-url="/openapi.json" theme-base="auto"></omnispec-renderer>
```

Or, in a framework app with a bundler, import the WC subpath once at startup
so React/ReactDOM are shared with your existing tree:

```ts
import '@apiboost/omnispec/wc'
// <omnispec-renderer> is now registered globally.
```

See [Web Component](./web-component.md) for the full attribute and property
reference plus working Vue, Angular, and Svelte examples.

### Express SSR

For server-rendered React apps, the renderer works with `renderToString`. The Try-It panel and mobile drawer hydrate on the client.

```tsx
// Server
import { renderToString } from 'react-dom/server'
import { OmniSpecRenderer } from '@apiboost/omnispec'

const html = renderToString(
  <OmniSpecRenderer spec={specUrl} theme={{ base: 'light' }} />
)
```

To enable Try-It proxy for CORS-restricted APIs, mount the built-in Express middleware:

```js
import { createProxyRouter } from '@apiboost/omnispec/server'

// Requires: npm install express express-rate-limit
app.use('/api/proxy', createProxyRouter())
```

```tsx
<OmniSpecRenderer spec={specUrl} proxyUrl="/api/proxy" />
```

The proxy includes SSRF protection (blocks private IPs) and rate limiting (60 req/min per IP).

See [Backend Integration](./backend-integration.md) for proxy configuration options and non-Express implementations.

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

## Essential Props

```tsx
<OmniSpecRenderer
  spec={specUrl}                    // Required: URL, string, or object
  theme={{ base: 'light' }}         // 'light', 'dark', or 'auto' (system preference)
  layout="sidebar"                  // 'sidebar' (default) or 'stacked'
  sidebarPosition="left"            // 'left' (default) or 'right'
  allowTryIt={true}                 // Show/hide Try-It panels (default: true)
  proxyUrl="/api/proxy"             // Route Try-It requests through backend proxy
  downloadLink={true}               // Show spec download button — true uses the spec URL, or pass a string URL (default: undefined)
  defaultExpandOperations={false}   // Expand all operations on load (default: false)
  displayMode="compact"            // 'compact' (default) or 'reference' (three-panel layout)
/>
```

See [API Reference](./api-reference.md) for all props.

## Theming

Three built-in theme modes: `'light'`, `'dark'`, and `'auto'` (detects system preference with a toggle button).

```tsx
<OmniSpecRenderer spec={specUrl} theme={{ base: 'auto' }} />
```

All three modes accept raw `--omnispec-*` CSS-variable overrides scoped to `.omnispec-root` — the free white-label path.

:::info[Pro]
Structured `theme.overrides` (full 70+ design-token white-labeling via the `theme` prop) requires **[Apiboost OmniSpec Pro](https://apiboost.com/omnispec?utm_source=omnispec&utm_medium=docs&utm_campaign=pro)**. In the free core, set the same tokens as raw CSS variables on `.omnispec-root` in your own stylesheet.
:::

See [Theming Guide](./theming.md) for all design tokens.

## Slot Overrides

Inject your app's navigation, branding, or custom content:

```tsx
<OmniSpecRenderer
  spec={specUrl}
  slots={{
    sidebarHeader: <MyLogo />,
    sidebarFooter: <VersionBadge />,
    header: <MyAppHeader />,
    footer: <MyAppFooter />,
    contentHeader: <Breadcrumbs />,
  }}
/>
```

## Vendor Extensions

| Extension | What it does | Package |
|-----------|-------------|---------|
| `x-logo` | API logo in sidebar (supports light/dark variants) | Free |
| `x-codeSamples` | Custom code samples per operation | Pro |
| `x-tagGroups` | Group tags into sidebar categories | Pro |
| `x-displayName` | Human-friendly tag names | Pro |
| `x-badges` | Color-coded labels (Beta, Rate Limited) | Pro |
| `x-internal` | Hide internal operations | Pro |
| `x-enumDescriptions` | Descriptions for enum values | Pro |

Specs authored for Redocly, Scalar, or RapiDoc work without modification when Pro is installed. See [Vendor Extensions](./vendor-extensions.md) for full documentation.

## Code Samples

Every operation automatically generates code snippets in 6 languages:

- cURL, JavaScript (fetch), Python (requests), Go (net/http), Java (HttpClient), C# (HttpClient)

Custom samples via `x-codeSamples` override auto-generated ones for matching languages. See [Try-It & Code Samples](./try-it.md) for details.

## Deep Linking

All operations and sections are deep-linkable via URL hash. Hover over any section heading to reveal a link icon — click to copy the deep link.

```
https://your-site.com/docs#listPets
https://your-site.com/docs#listPets-responses
https://your-site.com/docs#schemas
```

## Next Steps

- [API Reference](./api-reference.md) — all props and TypeScript types
- [Configuration Guide](./configuration.md) — layouts, navigation, display modes, advanced options
- [Theming Guide](./theming.md) — design tokens, custom themes, white-labeling
- [Try-It & Code Samples](./try-it.md) — proxy setup, code samples, deep linking
- [External Refs](./external-refs.md) — multi-file specs, external $ref resolution, security
- [Vendor Extensions](./vendor-extensions.md) — x-codeSamples, x-tagGroups, and more
- [Backend Integration](./backend-integration.md) — proxy endpoint contract, Drupal setup
- [Migration Guide](./migration.md) — migrating from Redocly, Swagger UI, Stoplight, Scalar
- [Troubleshooting](./troubleshooting.md) — common issues and solutions
