# @apiboost/omnispec

React components for rendering **OpenAPI** and **AsyncAPI** documentation — with
Try-It request execution, authentication, theming, code samples, an optional
backend proxy, and a framework-agnostic Web Component.

This is the **open-source core** (Apache-2.0). Additional renderers and premium
features are available in the commercial **Pro** edition — see
[Free vs Pro](#free-vs-pro).

## Supported specifications

| Spec | Component | Versions | Edition |
|------|-----------|----------|---------|
| OpenAPI / Swagger | `<OpenApiSpec>` | 2.0, 3.0.x, 3.1 | **Free** |
| AsyncAPI | `<AsyncApiSpec>` | 2.x, 3.x | **Free** |
| GraphQL | `<GraphqlSpec>` | SDL + Introspection | Pro |
| SOAP / WSDL | `<SoapSpec>` | WSDL 1.1 | Pro |
| gRPC / Protobuf | `<GrpcSpec>` | proto3 | Pro |

A unified `<OmniSpecRenderer>` auto-detects the spec type and renders the correct
viewer. With only the free package installed it renders OpenAPI and AsyncAPI; for
other spec types it shows an upgrade prompt until [Pro](https://www.apiboost.com)
is added.

## Installation

```bash
npm install @apiboost/omnispec
# or: pnpm add @apiboost/omnispec
```

Requires **React 18 or 19** and **`@emotion/css`** as peer dependencies.

## Quick start

```tsx
import { OpenApiSpec } from '@apiboost/omnispec/openapi'

function Docs() {
  return (
    <OpenApiSpec
      spec="https://your-backend.com/api/specs/petstore.json"
      theme={{ base: 'light' }}
    />
  )
}
```

Or let the renderer auto-detect the spec type:

```tsx
import { OmniSpecRenderer } from '@apiboost/omnispec'

<OmniSpecRenderer spec={specUrl} theme={{ base: 'dark' }} />
```

## Features

- **OpenAPI (2.0 / 3.0 / 3.1) and AsyncAPI (2 / 3)** rendering, YAML or JSON, auto-detected
- **Try-It** — send requests directly from the browser or through an optional backend proxy
- **Authentication** — API key, Basic, Bearer, and OAuth 2.0 flow details with manual token entry
- **Code samples** in 6 languages
- **Light / dark / auto themes** with 40+ customizable `--omnispec-*` CSS design tokens
- **Configurable layouts** — sidebar (left/right), stacked, Try-It inline or side panel
- **Sidebar navigation, slots, and display modes** for embedding in your own portal
- **Framework-agnostic Web Component** (`<omnispec-renderer>`) for Vue, Angular, Svelte, or vanilla HTML
- **Zero Node.js dependencies** in the browser (no polyfills needed)

> **Pro** adds GraphQL, SOAP/WSDL, and gRPC renderers; full white-label theming
> (`theme.overrides` across 70+ tokens); premium vendor extensions; and the
> interactive OAuth 2.0 Authorization Code + PKCE "Get Token" flow with OpenID
> Connect discovery. See [Free vs Pro](#free-vs-pro).

## Configuration

```tsx
<OpenApiSpec
  spec={specUrl}
  theme={{ base: 'dark' }}
  layout="sidebar"
  sidebarPosition="left"
  tryItLayout="panel"
  proxyUrl="/api/proxy"
  allowTryIt={true}
  slots={{
    sidebarHeader: <MyNavigation />,
    header: <MyAppHeader />,
  }}
  onSpecLoaded={(info) => console.log(info.title)}
/>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `spec` | `string \| object` | required | URL, raw content, or parsed object |
| `theme` | `{ base, overrides? }` | `{ base: 'light' }` | `base` is Free; full `overrides` require Pro |
| `layout` | `'sidebar' \| 'stacked'` | `'sidebar'` | Navigation layout |
| `sidebarPosition` | `'left' \| 'right'` | `'left'` | Sidebar placement |
| `tryItLayout` | `'inline' \| 'panel'` | `'inline'` | Try-It below operation or in a right panel |
| `proxyUrl` | `string` | — | Route Try-It through a backend proxy |
| `allowTryIt` | `boolean` | `true` | Enable/disable Try-It |
| `slots` | `SlotOverrides` | — | Inject custom content (header, footer, sidebarHeader, sidebarFooter) |

Free tier supports theming via `theme.base` and raw `--omnispec-*` CSS variables
set on the host. The `theme.overrides` prop (arbitrary token overrides for full
white-labeling) is a Pro feature.

## Tree-shakeable imports

Import only what you need:

```tsx
import { OpenApiSpec } from '@apiboost/omnispec/openapi'
import { AsyncApiSpec } from '@apiboost/omnispec/asyncapi'
import { createProxyRouter } from '@apiboost/omnispec/server' // Express proxy middleware
```

## Web Component

A framework-agnostic Web Component (`<omnispec-renderer>`) ships in the same
package. It mounts the React renderer internally and isolates styles inside an
open shadow root, so it works in Vue, Angular, Svelte, or vanilla HTML.

### Vanilla HTML (no build step)

```html
<script src="https://unpkg.com/@apiboost/omnispec@latest/dist/wc/standalone.js"></script>
<omnispec-renderer
  spec-url="https://petstore3.swagger.io/api/v3/openapi.json"
  theme-base="auto"
></omnispec-renderer>
```

### Framework apps (bundler-managed)

```ts
import '@apiboost/omnispec/wc' // auto-registers <omnispec-renderer>
```

For complex props, set them imperatively on the element instance:

```ts
const el = document.querySelector('omnispec-renderer')
el.spec = parsedSpecObject
el.theme = { base: 'dark' }
el.sidebarNav = { items: [/* ... */] }
```

See [docs/web-component.md](./docs/web-component.md) for the full guide, the
complete attribute/property/event API, shadow-DOM notes, and framework recipes.
Runnable integrations live in [`examples/`](./examples).

## Documentation

Full documentation is published at the project docs site. In this repo:

| Guide | Description |
|-------|-------------|
| [Getting Started](./docs/getting-started.md) | Installation, quick start, spec formats |
| [Configuration](./docs/configuration.md) | Layouts, Try-It modes, slots, callbacks |
| [Theming](./docs/theming.md) | Design tokens and custom themes |
| [API Reference](./docs/api-reference.md) | Props for every component |
| [Backend Integration](./docs/backend-integration.md) | Proxy setup, serving specs, Node/PHP examples |
| [Try-It](./docs/try-it.md) | Direct vs proxy mode, endpoint contract |
| [Web Component](./docs/web-component.md) | Web Component API and framework recipes |
| [Troubleshooting](./docs/troubleshooting.md) | Common issues and FAQ |

## Free vs Pro

`@apiboost/omnispec` (this package) is the fully functional, Apache-2.0
open-source core. Apiboost also offers a commercial **Pro** edition that builds
on this core and adds:

- **GraphQL, SOAP/WSDL, and gRPC** renderers
- **Full white-label theming** (`theme.overrides`, 70+ tokens)
- **Premium vendor extensions** (`x-codeSamples`, `x-tagGroups`, `x-displayName`, `x-badges`, `x-internal`, `x-enumDescriptions`)
- **Interactive OAuth 2.0** (Authorization Code + PKCE "Get Token") and **OpenID Connect** discovery

Using the open-source core never requires Pro. See
[LICENSING.md](./LICENSING.md) and [https://www.apiboost.com](https://www.apiboost.com).

## Development

Requires Node.js (see [`.nvmrc`](./.nvmrc)) and pnpm.

```bash
pnpm install
pnpm run dev          # Storybook at http://localhost:6006
pnpm run test
pnpm run build
pnpm run lint
pnpm run typecheck
```

Contributions are welcome under the Apache License 2.0 with a Developer
Certificate of Origin sign-off (`git commit -s`). See
[CONTRIBUTING.md](./CONTRIBUTING.md).

## License

Apache License 2.0. See [LICENSE.md](./LICENSE.md) for the full text and
[LICENSING.md](./LICENSING.md) for how the open-source core relates to the
commercial Pro edition. "Apiboost" and "Apiboost OmniSpec" are trademarks of
Apiboost, Inc. — see [TRADEMARKS.md](./TRADEMARKS.md).
