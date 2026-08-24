---
id: migration
title: Migration Guide
sidebar_label: Migrating to OmniSpec
description: Migrate to @apiboost/omnispec from Redoc/Redocly, Swagger UI, Stoplight Elements, or Scalar — prop mappings and why to switch.
---

# Migration Guide

Switching to `@apiboost/omnispec` from another renderer. Each section covers one tool — jump to yours.

- [From Redocly / Redoc](#from-redocly--redoc)
- [From Swagger UI](#from-swagger-ui)
- [From Stoplight Elements](#from-stoplight-elements)
- [From Scalar](#from-scalar)

---

## Why Switch

| Capability | `@apiboost/omnispec` | Redoc CE | Swagger UI | Stoplight Elements | Scalar |
|---|---|---|---|---|---|
| OpenAPI 2.0 / 3.0 / 3.1 | Free | Free | Free | Free | Free |
| AsyncAPI 2.x / 3.x | Free | — | — | — | — |
| GraphQL / SOAP / gRPC | Pro | — | — | — | — |
| Try-It panel | Free | Pro only | Free | Free | Free |
| 6-language code samples | Free | Pro only | — | — | Free |
| Custom sidebar nav | Free | — | — | — | — |
| Compact + reference display modes | Free | Reference only | Compact only | Compact only | Reference only |
| Grouped + segmented navigation | Free | Grouped only | Grouped only | Segmented only | Grouped only |
| Light / dark / auto theme + CSS-variable overrides | Free | Limited (Pro) | CSS overrides | CSS overrides | Limited |
| Full white-label theming (`theme.overrides`, 70+ tokens) | Pro | Limited (Pro) | — | — | — |
| Auto theme (system preference) | Free | — | — | — | Free |
| Built-in CORS proxy (SSRF-safe) | Free | — | — | — | — |
| `x-tagGroups`, `x-codeSamples`, etc. | Pro | Pro | — | — | Free |

`@apiboost/omnispec` renders OpenAPI 2.0, 3.0.x, and 3.1, plus AsyncAPI 2.x and
3.x, in a single component — all free. GraphQL, SOAP/WSDL, and gRPC renderers,
full white-label theming, and the premium vendor extensions are part of
[Apiboost OmniSpec Pro](https://apiboost.com/omnispec).

---

## From Redocly / Redoc

### Installation

```bash
# Remove
npm uninstall redoc redoc-cli @redocly/cli

# Install
npm install @apiboost/omnispec @emotion/css
```

### Component Swap

**Before (Redoc CE)**

```tsx
import { RedocStandalone } from 'redoc'

<RedocStandalone
  specUrl="https://api.example.com/openapi.json"
  options={{
    theme: { colors: { primary: { main: '#8B5CF6' } } },
    scrollYOffset: 60,
    hideDownloadButton: true,
    expandResponses: '200,201',
    nativeScrollbars: false,
  }}
/>
```

**After (`@apiboost/omnispec`)**

```tsx
import { OmniSpecRenderer } from '@apiboost/omnispec'

<OmniSpecRenderer
  spec="https://api.example.com/openapi.json"
  theme={{
    base: 'light',
    overrides: { '--omnispec-color-primary': '#8B5CF6' },
  }}
  downloadLink={false}
  defaultExpandOperations={false}
/>
```

```css
/* In your app stylesheet — set sticky offset */
.omnispec-root {
  --omnispec-offset-top: 60px;
}
```

### Prop Mapping

| Redoc option | `@apiboost/omnispec` equivalent | Notes |
|---|---|---|
| `specUrl` | `spec` | Also accepts raw strings and objects |
| `theme.colors.primary.main` | `theme.overrides['--omnispec-color-primary']` | See [Theming](./theming.md) for all 70+ tokens |
| `scrollYOffset` | `--omnispec-offset-top` CSS variable on `.omnispec-root` | CSS-only, not in `theme.overrides` |
| `hideDownloadButton: true` | `downloadLink={false}` | |
| `expandResponses` | `defaultExpandOperations` | Expands all operations on load |
| `nativeScrollbars` | No equivalent | Custom scrollbar styling is built-in via `--omnispec-scrollbar-*` tokens |
| `disableTryItFrom` | `allowTryIt={false}` | |
| `showExtensions` | No equivalent | All supported `x-` extensions render automatically |
| `sortPropsAlphabetically` | Not supported | |
| `requiredPropsFirst` | Not supported | |

### Theme Migration

Redoc uses a nested `theme` object. `@apiboost/omnispec` uses flat CSS custom properties, which gives you more granular control.

:::info[Pro]
Passing the token map through the `theme.overrides` prop (shown in the "After"
examples below) requires **[Apiboost OmniSpec Pro](https://apiboost.com/omnispec)**. In
the free core, set the identical `--omnispec-*` tokens with a plain CSS rule on
`.omnispec-root` — the visual result is the same. See
[Theming](./theming.md) for the free CSS-variable path.
:::

**Before**

```tsx
options={{
  theme: {
    colors: {
      primary: { main: '#8B5CF6' },
      text: { primary: '#1a1a2e' },
    },
    typography: {
      fontSize: '15px',
      fontFamily: '"Inter", sans-serif',
    },
    sidebar: {
      width: '300px',
      backgroundColor: '#f6f8fa',
    },
  },
}}
```

**After**

```tsx
theme={{
  base: 'light',
  overrides: {
    '--omnispec-color-primary': '#8B5CF6',
    '--omnispec-fg-primary': '#1a1a2e',
    '--omnispec-font-size-base': '0.9375rem',
    '--omnispec-font-sans': '"Inter", sans-serif',
    '--omnispec-nav-width': '18.75rem',
    '--omnispec-nav-bg': '#f6f8fa',
  },
}}
```

See [Theming Guide](./theming.md) for all tokens.

### Vendor Extensions

Your existing Redoc vendor extensions carry over without spec changes:

| Extension | Status |
|---|---|
| `x-logo` | Supported (free) |
| `x-tagGroups` | Supported (Pro) |
| `x-displayName` | Supported (Pro) |
| `x-codeSamples` / `x-code-samples` | Supported (Pro) |
| `x-enumDescriptions` | Supported (Pro) |
| `x-internal` | Supported (Pro) |

The free core renders `x-logo` and all OpenAPI + AsyncAPI content. The premium
vendor extensions (`x-tagGroups`, `x-codeSamples`, `x-displayName`,
`x-enumDescriptions`, `x-internal`) are part of
[Apiboost OmniSpec Pro](https://apiboost.com/omnispec) — the same set you would have used
Redoc Pro for.

### Display Mode

Redocly's classic three-panel layout is available as `displayMode="reference"`:

```tsx
<OmniSpecRenderer
  spec={specUrl}
  displayMode="reference"
/>
```

The default `displayMode="compact"` uses collapsible operation cards, which works better for narrower viewports and embedded use cases.

---

## From Swagger UI

### Installation

```bash
# Remove
npm uninstall swagger-ui-react swagger-ui

# Install
npm install @apiboost/omnispec @emotion/css
```

### Component Swap

**Before (Swagger UI)**

```tsx
import SwaggerUI from 'swagger-ui-react'
import 'swagger-ui-react/swagger-ui.css'

<SwaggerUI
  url="https://api.example.com/openapi.json"
  tryItOutEnabled={true}
  docExpansion="list"
  defaultModelsExpandDepth={1}
/>
```

**After (`@apiboost/omnispec`)**

```tsx
import { OmniSpecRenderer } from '@apiboost/omnispec'

<OmniSpecRenderer
  spec="https://api.example.com/openapi.json"
  allowTryIt={true}
  navigationMode="grouped"
/>
```

No separate CSS import required — styles are applied via `@emotion/css` at runtime.

### Prop Mapping

| Swagger UI prop | `@apiboost/omnispec` equivalent | Notes |
|---|---|---|
| `url` | `spec` | Also accepts raw strings and objects |
| `spec` | `spec` | Same — pre-parsed object |
| `tryItOutEnabled` | `allowTryIt` | Default: `true` |
| `docExpansion: 'none'` | `defaultExpandOperations={false}` | Default behavior |
| `docExpansion: 'full'` | `defaultExpandOperations={true}` | Expand all operations on load |
| `docExpansion: 'list'` | `navigationMode="grouped"` | All operations visible, collapsed |
| `defaultModelsExpandDepth` | No direct equivalent | Schemas are always accessible via the schema browser |
| `filter` | No direct equivalent | Use the built-in search bar |
| `requestInterceptor` | `onTryItRequest` callback | Observe requests; cannot mutate them |
| `responseInterceptor` | `onTryItResponse` callback | Observe responses; cannot mutate them |
| `onComplete` | `onSpecLoaded` | Receives `{ title, version, type }` |
| `persistAuthorization` | Not supported | Auth values are session-scoped |
| `validatorUrl` | Not supported | |
| `plugins` | `slots` + `sidebarNav` + `theme.overrides` | See below |

### Replacing Plugins

Swagger UI's plugin system lets you inject custom components or override built-in ones. `@apiboost/omnispec` provides equivalent flexibility through typed props:

| Swagger UI plugin use case | `@apiboost/omnispec` equivalent |
|---|---|
| Custom logo / branding | `slots.sidebarHeader` or `x-logo` extension |
| Custom header / footer | `slots.header` / `slots.footer` |
| Additional sidebar links | `sidebarNav` prop |
| Custom auth UI | Not supported (auth panel is built-in) |
| CSS overrides | `theme.overrides` design tokens |

```tsx
// Swagger UI plugin (before)
const MyPlugin = () => ({
  wrapComponents: {
    InfoUrl: () => () => <a href="/home">Back to Home</a>,
  },
})

// @apiboost/omnispec equivalent (after)
<OmniSpecRenderer
  spec={specUrl}
  slots={{
    sidebarHeader: (
      <nav style={{ padding: '12px' }}>
        <a href="/home">Back to Home</a>
      </nav>
    ),
  }}
/>
```

### Three-Panel Feel

If you want a layout closer to Redocly's reference style (schema left, samples right):

```tsx
<OmniSpecRenderer
  spec={specUrl}
  displayMode="reference"
/>
```

### CORS and Try-It

Swagger UI sends Try-It requests directly from the browser. This still works in `@apiboost/omnispec`. If you were working around CORS with a custom proxy, mount the built-in proxy middleware instead:

```js
// Express
import { createProxyRouter } from '@apiboost/omnispec/server'
app.use('/api/proxy', createProxyRouter())
```

```tsx
<OmniSpecRenderer spec={specUrl} proxyUrl="/api/proxy" />
```

The built-in proxy includes SSRF protection (blocks private IPs and link-local ranges) and rate limiting (60 req/min per IP).

---

## From Stoplight Elements

### Installation

```bash
# Remove
npm uninstall @stoplight/elements @stoplight/elements-core

# Install
npm install @apiboost/omnispec @emotion/css
```

### Component Swap

**Before (Stoplight Elements)**

```tsx
import { API } from '@stoplight/elements'
import '@stoplight/elements/styles.min.css'

<API
  apiDescriptionUrl="https://api.example.com/openapi.json"
  layout="sidebar"
  router="hash"
  tryItCredentialsPolicy="same-origin"
/>
```

**After (`@apiboost/omnispec`)**

```tsx
import { OmniSpecRenderer } from '@apiboost/omnispec'

<OmniSpecRenderer
  spec="https://api.example.com/openapi.json"
  layout="sidebar"
  navigationMode="segmented"
/>
```

### Prop Mapping

| Stoplight prop | `@apiboost/omnispec` equivalent | Notes |
|---|---|---|
| `apiDescriptionUrl` | `spec` | Also accepts raw strings and objects |
| `apiDescriptionDocument` | `spec` | Pre-parsed object or raw string |
| `layout="sidebar"` | `layout="sidebar"` | Same — default |
| `layout="stacked"` | `layout="stacked"` | Same |
| `router="hash"` | `navigationMode="segmented"` | Segmented mode shows one operation at a time; closest equivalent to hash routing |
| `router="memory"` | `navigationMode="segmented"` | Same |
| `router="history"` | `navigationMode="segmented"` | |
| `router="static"` | `navigationMode="grouped"` | All operations on one page |
| `tryItCredentialsPolicy` | `onTryItRequest` + `proxyUrl` | See below |
| `hideTryItPanel` | `allowTryIt={false}` | |
| `hideSchemas` | Not supported | Schema browser is always shown |
| `hideInternal` | Not supported | Use `x-internal: true` in your spec |
| `logo` | `slots.sidebarHeader` or `x-logo` | |
| `basePath` | Not supported | Use `spec` with the full URL |

### Credentials Policy

Elements' `tryItCredentialsPolicy` controls how cookies and auth are sent. The equivalent in `@apiboost/omnispec` is to route requests through your backend proxy and handle credentials server-side:

**Before**

```tsx
<API
  apiDescriptionUrl={specUrl}
  tryItCredentialsPolicy="include"
/>
```

**After** — handle credentials in your proxy:

```js
// In your proxy route handler
const response = await fetch(targetUrl, {
  method,
  headers,
  body,
  credentials: 'include', // or handle session cookies here
})
```

```tsx
<OmniSpecRenderer spec={specUrl} proxyUrl="/api/proxy" />
```

Alternatively, use `onTryItRequest` to observe what is being sent and log requests before they go out:

```tsx
<OmniSpecRenderer
  spec={specUrl}
  onTryItRequest={(request) => {
    console.log(request.method, request.url, request.headers)
  }}
/>
```

### Segmented Navigation

Stoplight Elements is always segmented — one operation per view. `@apiboost/omnispec` auto-selects segmented for specs with more than 50 operations. You can force it:

```tsx
// Always segmented, regardless of spec size
<OmniSpecRenderer spec={specUrl} navigationMode="segmented" />

// Always grouped (all operations on one page)
<OmniSpecRenderer spec={specUrl} navigationMode="grouped" />
```

---

## From Scalar

### Installation

```bash
# Remove
npm uninstall @scalar/api-reference

# Install
npm install @apiboost/omnispec @emotion/css
```

### Component Swap

**Before (Scalar)**

```tsx
import { ApiReference } from '@scalar/api-reference'

<ApiReference
  configuration={{
    url: 'https://api.example.com/openapi.json',
    theme: 'default',
    darkMode: true,
    hideDownloadButton: false,
  }}
/>
```

**After (`@apiboost/omnispec`)**

```tsx
import { OmniSpecRenderer } from '@apiboost/omnispec'

<OmniSpecRenderer
  spec="https://api.example.com/openapi.json"
  theme={{ base: 'dark' }}
/>
```

### Prop Mapping

| Scalar prop | `@apiboost/omnispec` equivalent | Notes |
|---|---|---|
| `configuration.url` | `spec` | Also accepts raw strings and objects |
| `configuration.spec.content` | `spec` | Pre-parsed object or raw string |
| `configuration.darkMode: true` | `theme={{ base: 'dark' }}` | |
| `configuration.darkMode: false` | `theme={{ base: 'light' }}` | |
| `configuration.theme` | `theme.overrides` | Scalar themes map to design token overrides — see table below |
| `configuration.hideDownloadButton` | `downloadLink={false}` | |
| `configuration.hiddenClients` | No equivalent | All 6 language samples are always shown |
| `configuration.defaultHttpClient` | No equivalent | Language selector is user-controlled |
| `configuration.authentication` | No equivalent | Auth panel inferred from spec `securitySchemes` |
| `configuration.generateCodeSamples` | Auto-generated by default | Cannot disable per-language |
| `configuration.isEditable` | Not supported | |
| `configuration.showSidebar: false` | `layout="stacked"` | |
| `configuration.layout: 'classic'` | `displayMode="compact"` | |
| `configuration.layout: 'modern'` | `displayMode="reference"` | Three-panel layout |

### Theme Migration

Scalar's named themes (`default`, `moon`, `purple`, `solarized`) do not map directly. Use design tokens to match the visual style instead.

:::info[Pro]
As with the Redoc migration above, the `theme.overrides` prop is an
**[Apiboost OmniSpec Pro](https://apiboost.com/omnispec)** feature. In the free core,
apply the same `--omnispec-*` tokens with a CSS rule on `.omnispec-root` — see
[Theming](./theming.md).
:::

**Before — Scalar purple theme**

```tsx
configuration={{
  theme: 'purple',
  darkMode: true,
}}
```

**After — equivalent token overrides**

```tsx
theme={{
  base: 'dark',
  overrides: {
    '--omnispec-color-primary': '#8B5CF6',
    '--omnispec-color-primary-hover': '#7C3AED',
    '--omnispec-nav-accent': '#8B5CF6',
    '--omnispec-nav-active-bg': 'rgba(139, 92, 246, 0.1)',
  },
}}
```

See [Theming Guide](./theming.md) for all 70+ tokens.

### Auto Theme

Both Scalar and `@apiboost/omnispec` support system-preference detection:

**Before**

```tsx
configuration={{ theme: 'default', darkMode: false }}
// Scalar has no built-in auto mode
```

**After**

```tsx
// Detects system preference, renders a toggle button
<OmniSpecRenderer spec={specUrl} theme={{ base: 'auto' }} />

// Auto-detect without showing the built-in toggle
<OmniSpecRenderer
  spec={specUrl}
  theme={{
    base: 'auto',
    themeToggle: false,
    onThemeChange: (mode) => {
      document.documentElement.setAttribute('data-theme', mode)
    },
  }}
/>
```

### Vendor Extensions

Specs using Scalar-specific extensions are partially supported. Standard extensions work without modification:

| Scalar extension | Status in `@apiboost/omnispec` |
|---|---|
| `x-codeSamples` | Supported (Pro) |
| `x-tagGroups` | Supported (Pro) |
| `x-displayName` | Supported (Pro) |
| `x-enumDescriptions` | Supported (Pro) |
| `x-internal` / `x-scalar-ignore` | Supported (Pro) |
| `x-scalar-environments` | Not rendered (safely ignored) |
| `x-scalar-stability` | Not rendered (safely ignored) |

Unknown `x-` extensions are safely ignored — they do not cause parse errors.

### Custom Sidebar

Scalar does not offer a prop API for adding custom sidebar items. `@apiboost/omnispec` does:

```tsx
import type { SidebarNavConfig } from '@apiboost/omnispec'

const nav: SidebarNavConfig = {
  placement: 'before',
  items: [
    { id: 'changelog', label: 'Changelog', href: '/changelog' },
    { id: 'status', label: 'API Status', href: 'https://status.example.com', target: '_blank' },
  ],
}

<OmniSpecRenderer spec={specUrl} sidebarNav={nav} />
```

See [Sidebar Navigation](./template_customization/sidebar.md) for groups, icons, separators, and nested menus.

---

## Common Post-Migration Tasks

### Sticky Header Offset

If your app has a sticky navigation bar, tell the renderer to clear it:

```css
.omnispec-root {
  --omnispec-offset-top: 64px; /* height of your sticky nav */
}
```

This adjusts the sidebar height, Try-It panel position, and scroll target offsets in one variable.

### Embedding in Existing App Chrome

Use slots to keep your app header/footer around the renderer:

```tsx
<OmniSpecRenderer
  spec={specUrl}
  slots={{
    header: <YourAppHeader />,
    footer: <YourAppFooter />,
    sidebarHeader: <BackLink />,
  }}
/>
```

### AsyncAPI Without Spec Changes

If you are also documenting event-driven APIs, `@apiboost/omnispec` handles AsyncAPI 2.x and 3.x natively in the same component — no separate package or integration:

```tsx
// OpenAPI spec
<OmniSpecRenderer spec="/openapi.json" />

// AsyncAPI spec — same component, auto-detected
<OmniSpecRenderer spec="/asyncapi.yaml" />
```

### Next Steps

- [Getting Started](./getting-started.md) — install, quick start, framework setup
- [Configuration](./configuration.md) — layout modes, navigation modes, display modes
- [Theming Guide](./theming.md) — all design tokens, white-labeling checklist
- [Vendor Extensions](./vendor-extensions.md) — `x-codeSamples`, `x-tagGroups`, and more
- [Sidebar Navigation](./template_customization/sidebar.md) — custom nav items, groups, icons
- [Slots](./template_customization/slots.md) — inject components into layout regions
- [Try-It & Code Samples](./try-it.md) — proxy setup, callbacks, deep linking
