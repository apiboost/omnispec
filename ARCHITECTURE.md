# ARCHITECTURE.md — `@apiboost/omnispec` System Overview

> How the moving parts fit together. Read this after [CLAUDE.md](./CLAUDE.md) and before drilling into any subdomain.

---

## Runtime Composition

```
Consumer App
│
├── (Free only)
│     <OmniSpecRenderer spec={url} theme={...} />
│     └─ fetches + auto-detects spec type
│        └─ OpenAPI → <OpenApiSpec>   (built-in, lazy-loaded)
│        └─ AsyncAPI → <AsyncApiSpec> (built-in, lazy-loaded)
│        └─ other    → <UpgradePrompt>  (Pro required)
│
└── (With Pro)
      <OmniSpecRenderer spec={url} pro={proFeatures} theme={overrides} />
            │
            └─ pro.renderers: Map<SpecType, ComponentType>
            │     ├─ 'graphql-sdl' / 'graphql-introspection' → <GraphqlSpec>
            │     ├─ 'soap-wsdl'                            → <SoapSpec>
            │     └─ 'grpc-proto'                           → <GrpcSpec>
            └─ pro.premiumThemingEnabled: boolean (unlocks theme.overrides)
```

Consumers importing from `@apiboost/omnispec-pro` get a pre-wired `OmniSpecRenderer` that already passes `proFeatures` as the `pro` prop — they don't have to wire it themselves.

---

## Core Concepts

### 1. The `pro` Prop (Extension Mechanism)

**Where:** `packages/omnispec/src/core/types/common.types.ts` — `ProFeatures` interface
**Consumers:** `packages/omnispec/src/unified/OmniSpecRenderer.tsx`

Free defines a `ProFeatures` type and accepts it as a prop. Pro exports an object matching that shape:

```ts
// In @apiboost/omnispec-pro
export const proFeatures = {
  renderers: new Map([
    ['graphql-sdl', GraphqlSpec],
    ['graphql-introspection', GraphqlSpec],
    ['soap-wsdl', SoapSpec],
    ['grpc-proto', GrpcSpec],
  ]),
  premiumThemingEnabled: true,
}
```

Free's `OmniSpecRenderer` reads `pro.renderers`, looks up the detected spec type, and uses the registered renderer if one exists. Otherwise it falls back to the built-in (OpenAPI, AsyncAPI) or shows an `<UpgradePrompt>`.

**Free remains completely unaware of Pro at the type and code level.** No stub renderers, no conditional imports, no feature flags. The contract is a typed prop.

### 2. The Deprecated Registry Pattern (`<ProProvider>`)

**Where:** `packages/omnispec/src/core/context/RendererRegistry.tsx`
**Status:** Deprecated. Kept as a no-op wrapper in Pro for backwards compatibility.

Earlier designs used a React Context (`RendererRegistry`) populated by `<ProProvider>` wrapping the consumer's tree. This added needless complexity. The current `pro` prop approach is the canonical pattern.

`RendererRegistryProvider` and `useRendererRegistry` are still exported from `@apiboost/omnispec` for compatibility, but new code should not use them.

### 3. Spec Detection

**Where:** `packages/omnispec/src/core/utils/detect-spec.ts`, `packages/omnispec/src/core/hooks/useSpecDetector.ts`

`detectSpecType(content)` inspects raw spec content (string or object) and returns a `SpecType`:

- `openapi-2`, `openapi-3`
- `asyncapi-2`, `asyncapi-3`
- `graphql-sdl`, `graphql-introspection`
- `soap-wsdl`
- `grpc-proto`

Consumers can override via the `specType` prop on `OmniSpecRenderer`. Auto-detection runs all of them through the same renderer pipeline — Pro's gate is purely "is there a registered renderer for this type?"

### 4. Theme System

**Where:** `packages/omnispec/src/core/themes/` (`ThemeProvider.tsx`, `tokens.ts`, `index.ts`)

- **Free** ships `lightTheme` and `darkTheme` (70+ CSS custom properties prefixed `--omnispec-*`)
- **Auto mode** (`theme.base: 'auto'`) detects `prefers-color-scheme` and renders a floating toggle (`theme.themeToggle: false` to hide)
- **Pro** unlocks `theme.overrides` — a partial token map that's merged into the active theme. The merge is gated by `pro.premiumThemingEnabled`. Without Pro, overrides are silently ignored
- CSS variables are injected via a `<style>` tag inside `ThemeProvider`, NOT as inline `style={}` attributes (architectural decision for SSR + WC compatibility)

### 5. Slot System

**Where:** `packages/omnispec/src/core/types/theme.types.ts` — `SlotOverrides`

Consumers can replace fixed regions of the layout via the `slots` prop:

- `header` / `footer` (full-width)
- `sidebarHeader` / `sidebarFooter`
- `contentHeader`
- `logo` (sidebar branding)

Each slot accepts a React node. The layout passes through whatever the consumer provides. The `x-logo` OpenAPI extension auto-populates `slots.logo` if no override is provided.

### 6. Custom Sidebar Navigation

**Where:** `packages/omnispec/src/core/types/sidebar-nav.types.ts`, `packages/omnispec/src/core/components/Navigation/`

The `sidebarNav` prop accepts a `SidebarNavConfig` with three placements relative to the auto-generated spec nav:

- `before` — consumer nav above spec nav
- `after` — consumer nav below spec nav
- `replace` — consumer nav replaces spec nav entirely

Items can be flat or grouped. Items have `href`, `icon`, `target`, `separator` options. Active state is either controlled (`activeId` prop) or uncontrolled (hash matching).

### 7. Layout & Display Modes

**Where:** `packages/omnispec/src/core/components/Layout/`, `packages/omnispec/src/core/components/Reference/`

Two top-level layout modes via the `displayMode` prop:

- `'compact'` — two-column (nav + content); the historical default
- `'reference'` — three-column (nav + content + samples); Stripe / Redocly-style

Two navigation modes via `navigationMode`:

- `'grouped'` — operations grouped by tag, expandable
- `'segmented'` — endpoint-as-page; auto-threshold at >50 operations

All combinations work for OpenAPI. Other spec types should verify under both modes (see QA stories APARC-1815 / 1819 / 1824 / 1829).

### 8. Try-It & Server-Side Proxy

**Where:** `packages/omnispec/src/core/components/TryIt/`, `packages/omnispec/src/server/`

Try-It runs entirely in the browser. For CORS-blocked APIs the browser cannot reach, the consumer mounts the optional Express middleware from `@apiboost/omnispec/server` (the proxy ships in the free core):

```ts
import { createProxyRouter } from '@apiboost/omnispec/server'
app.use('/api/proxy', createProxyRouter({ /* options */ }))
```

The proxy has built-in:

- **SSRF guard** — blocks loopback (`127.0.0.1`, `::1`) and RFC1918 private network ranges
- **Rate limiting** — configurable per-IP
- **Allowed-hosts** allowlist (optional)

The frontend's `proxyUrl` config (or `try-it.proxyUrl`) points the Try-It panel at the mounted route.

### 9. CSS Encapsulation

The Web Component wrapper requires `@emotion/css` to inject styles into a Shadow Root. The `@core/styles/css` re-export centralizes the dependency so this can be reconfigured in one place. See `src/wc/` for the implementation.

---

## How Pro Extends Free Without Modifying It

This is the most important architectural property. Free is genuinely useful standalone and has zero knowledge of Pro:

1. Free declares a typed prop contract (`ProFeatures`)
2. Free's `OmniSpecRenderer` reads the prop and uses registered renderers if present
3. Pro implements that contract by exporting a matching object
4. Pro overrides `OmniSpecRenderer` in its package to pre-wire `pro={proFeatures}` for convenience

A consumer who installs only Free gets a working OpenAPI + AsyncAPI renderer with no degradation. A consumer who adds Pro gets the additional spec types and theming overrides with one extra import.

---

## Module Boundaries

| Domain | Owns | Imported by |
|--------|------|-------------|
| `core/` | Layout, Nav, SchemaViewer, TryIt, Auth, theme, types, utilities | Everyone |
| `openapi/` | OpenAPI 2/3 parsing + rendering | `unified/`, Pro renderers (for `x-*` shared parsing) |
| `asyncapi/` | AsyncAPI 2/3 parsing + rendering | `unified/` |
| `unified/` | `OmniSpecRenderer` orchestrator, spec auto-detection | Public entry point |
| `server/` | Express proxy router, SSRF guard | Node consumer apps (via `@apiboost/omnispec/server`) |
| `wc/` | Web Component custom element + Shadow DOM wrapper | CDN-loadable bundle |

`core` is the only directory imported by everything else. Spec renderers (`openapi/`, `asyncapi/`) do NOT import each other. Pro renderers in `omnispec-pro/src/renderers/*` import from `@core/` via the path alias.

---

## Public API Surface (Free Package)

`packages/omnispec/src/index.ts` is the public contract. Anything not exported here is private and may change without notice.

Currently exposed:

- **Components**: `OpenApiSpec`, `AsyncApiSpec`, `OmniSpecRenderer`, `ThemeProvider`
- **Themes**: `lightTheme`, `darkTheme`
- **Types**: `OmniSpecRendererProps`, `BaseSpecProps`, `ProFeatures`, `SpecResponse`, `SpecMetadata`, `LoadingState`, `SpecType`, `SpecDetectionResult`, `ContentFormat`, `ThemeConfig`, `ThemeTokens`, `SlotOverrides`, `AuthScheme`, `AuthSchemeType`, `OAuth2Flows`, `OAuth2Flow`, `AppliedAuthValue`, `TryItRequest`, `TryItResponse`, `ProxyRequest`, `ProxyResponse`, `TryItConfig`, `SidebarNavItem`, `SidebarNavGroup`, `SidebarNavConfig`, `SidebarNavPlacement`
- **Utilities**: `detectSpecType`, `fetchSpec`, `useTheme`, `isSidebarNavGroup`
- **Deprecated**: `RendererRegistryProvider`, `useRendererRegistry`

Subpath exports:

- `@apiboost/omnispec/openapi` — `OpenApiSpec` + types
- `@apiboost/omnispec/asyncapi` — `AsyncApiSpec` + types
- `@apiboost/omnispec/server` — `createProxyRouter` + `ssrf-guard`
- `@apiboost/omnispec/wc` — Web Component registration

---

## Performance Notes

- **Lazy loading**: `OpenApiSpec` and `AsyncApiSpec` are `lazy()`-imported inside `OmniSpecRenderer` so consumers using the unified entry only download the bytes for the spec type they're rendering
- **Memoization**: `TagGroup`, `ExpandableCard`, and other high-frequency components are wrapped in `React.memo`
- **Pub/sub for expand state**: Targeted re-renders (only affected card re-renders on expand/collapse)
- **IntersectionObserver**: Off-screen operations defer their schema tree rendering until scrolled into view

See `packages/omnispec/TODO.md` and `docs/internal/features/roadmap.md` Phase 14 for ongoing perf work.
