# @apiboost/omnispec

[![npm](https://img.shields.io/npm/v/@apiboost/omnispec)](https://www.npmjs.com/package/@apiboost/omnispec)
[![CI](https://github.com/apiboost/omnispec/actions/workflows/ci.yml/badge.svg)](https://github.com/apiboost/omnispec/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE.md)
[![Docs](https://img.shields.io/badge/docs-live-023E8A.svg)](https://apiboost.github.io/omnispec/)

React components for rendering **OpenAPI** and **AsyncAPI** documentation — with
Try-It request execution, authentication, theming, code samples, an optional
backend proxy, and a framework-agnostic Web Component.

This is the **open-source core** (Apache-2.0). GraphQL, SOAP/WSDL, and gRPC
renderers plus other premium features live in the commercial **Pro** edition —
see [Free vs Pro](#free-vs-pro).

📖 **[Full documentation & guides](https://apiboost.github.io/omnispec/)** · ▶️ **[Live demo](https://apiboost.github.io/omnispec/demo)**

## Supported specifications

| Spec | Component | Versions | Edition |
|------|-----------|----------|---------|
| OpenAPI / Swagger | `<OpenApiSpec>` | 2.0, 3.0.x, 3.1 | **Free** |
| AsyncAPI | `<AsyncApiSpec>` | 2.x, 3.x | **Free** |
| GraphQL | `<GraphqlSpec>` | SDL + Introspection | Pro |
| SOAP / WSDL | `<SoapSpec>` | WSDL 1.1 | Pro |
| gRPC / Protobuf | `<GrpcSpec>` | proto2, proto3 | Pro |

A unified `<OmniSpecRenderer>` auto-detects the spec type and renders the correct
viewer. With only the free package installed it renders OpenAPI and AsyncAPI; for
other spec types it shows an upgrade prompt until
[Pro](https://apiboost.com/omnispec?utm_source=omnispec&utm_medium=readme&utm_campaign=pro)
is added.

## Installation

```bash
npm install @apiboost/omnispec
# or: pnpm add @apiboost/omnispec
```

Requires **React 18 or 19** (`react`, `react-dom`) as peer dependencies.
Everything else — including `@emotion/css` for styling — is bundled, so there is
nothing else to install. (If you use the backend proxy, also add `express` and
`express-rate-limit`.)

## Quick start

```tsx
import { OmniSpecRenderer } from '@apiboost/omnispec'

function Docs() {
  return (
    <OmniSpecRenderer
      spec="https://petstore3.swagger.io/api/v3/openapi.json"
      theme={{ base: 'auto' }}
    />
  )
}
```

`<OmniSpecRenderer>` auto-detects the spec type. You can also import a specific
renderer or the Express proxy middleware directly:

```tsx
import { OpenApiSpec } from '@apiboost/omnispec/openapi'
import { AsyncApiSpec } from '@apiboost/omnispec/asyncapi'
import { createProxyRouter } from '@apiboost/omnispec/server'
```

See the [Getting Started guide](https://apiboost.github.io/omnispec/docs/getting-started)
for framework setup (Vite, Next.js, Web Component, SSR) and every configuration option.

## Features

- **OpenAPI (2.0 / 3.0 / 3.1) and AsyncAPI (2 / 3)** rendering, YAML or JSON, auto-detected
- **Try-It** — send requests directly from the browser or through an optional backend proxy
- **Authentication** — API key, Basic, Bearer, and OAuth 2.0 flow details with manual token entry
- **Code samples** in 6 languages
- **Light / dark / auto themes** with 40+ customizable `--omnispec-*` CSS design tokens
- **Configurable layouts** — sidebar (left/right), stacked, and docked or inline Try-It
- **Sidebar navigation, slots, and display modes** for embedding in your own portal
- **Framework-agnostic Web Component** (`<omnispec-renderer>`) for Vue, Angular, Svelte, or vanilla HTML
- **Zero Node.js dependencies** in the browser (no polyfills needed)

Full prop and configuration reference:
[API Reference](https://apiboost.github.io/omnispec/docs/api-reference) ·
[Configuration](https://apiboost.github.io/omnispec/docs/configuration) ·
[Theming](https://apiboost.github.io/omnispec/docs/theming).

> **Pro** adds GraphQL, SOAP/WSDL, and gRPC renderers; full white-label theming
> (`theme.overrides` across 70+ tokens); premium vendor extensions; and the
> interactive OAuth 2.0 Authorization Code + PKCE "Get Token" flow with OpenID
> Connect discovery. See [Free vs Pro](#free-vs-pro).

## Web Component

A framework-agnostic Web Component (`<omnispec-renderer>`) ships in the same
package — it mounts the React renderer internally and isolates styles in an open
shadow root, so it works in Vue, Angular, Svelte, or vanilla HTML. Zero-build
usage:

```html
<script src="https://unpkg.com/@apiboost/omnispec@latest/dist/wc/standalone.js"></script>
<omnispec-renderer
  spec-url="https://petstore3.swagger.io/api/v3/openapi.json"
  theme-base="auto"
></omnispec-renderer>
```

See the [Web Component guide](https://apiboost.github.io/omnispec/docs/web-component)
for the full attribute/property/event API and framework recipes.

## Documentation

Everything is at **[apiboost.github.io/omnispec](https://apiboost.github.io/omnispec/)**:

- [Getting Started](https://apiboost.github.io/omnispec/docs/getting-started) — install, quick start, framework setup
- [Configuration](https://apiboost.github.io/omnispec/docs/configuration) — layouts, Try-It modes, slots, callbacks
- [Theming](https://apiboost.github.io/omnispec/docs/theming) — design tokens and custom themes
- [API Reference](https://apiboost.github.io/omnispec/docs/api-reference) — props for every component
- [Backend Integration](https://apiboost.github.io/omnispec/docs/backend-integration) — proxy setup, serving specs
- [Try-It](https://apiboost.github.io/omnispec/docs/try-it) — direct vs proxy mode, endpoint contract
- [Web Component](https://apiboost.github.io/omnispec/docs/web-component) — Web Component API and framework recipes
- [Troubleshooting](https://apiboost.github.io/omnispec/docs/troubleshooting) — common issues and FAQ

## Free vs Pro

`@apiboost/omnispec` (this package) is the fully functional, Apache-2.0
open-source core. Apiboost also offers a commercial **Pro** edition that builds
on this core and adds:

- **GraphQL, SOAP/WSDL, and gRPC** renderers
- **Full white-label theming** (`theme.overrides`, 70+ tokens)
- **Premium vendor extensions** (`x-codeSamples`, `x-tagGroups`, `x-displayName`, `x-badges`, `x-internal`, `x-enumDescriptions`)
- **Interactive OAuth 2.0** (Authorization Code + PKCE "Get Token") and **OpenID Connect** discovery

Using the open-source core never requires Pro. See [LICENSING.md](./LICENSING.md)
and [apiboost.com/omnispec](https://apiboost.com/omnispec?utm_source=omnispec&utm_medium=readme&utm_campaign=pro).

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
