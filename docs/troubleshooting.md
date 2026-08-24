---
id: troubleshooting
title: Troubleshooting & FAQ
sidebar_label: Troubleshooting
description: Fixes for common @apiboost/omnispec issues — CORS in Try-It, large-spec performance, sticky-header offset, theme tokens, external $ref resolution, relative server URLs, spec detection, and React 18/19 compatibility.
---

# Troubleshooting

Common issues and how to fix them. Each section is self-contained.

---

## CORS Errors in Try-It

**Symptom:** The Try-It panel shows "Failed to fetch. This may be a CORS issue" and the request never reaches the API.

**Cause:** Browsers block cross-origin requests unless the target API returns the appropriate `Access-Control-Allow-Origin` response headers. Most third-party or internal APIs don't add these for your documentation domain.

**Fix:** Route Try-It requests through a backend proxy by setting the `proxyUrl` prop:

```tsx
<OmniSpecRenderer
  spec={specUrl}
  proxyUrl="/api/proxy"
/>
```

If you're using Express, mount the built-in proxy middleware:

```js
import { createProxyRouter } from '@apiboost/omnispec/server'

// Requires: npm install express express-rate-limit
app.use('/api/proxy', createProxyRouter())
```

The built-in proxy includes SSRF protection and rate limiting out of the box. When proxy mode is active, a "proxied" badge appears next to the Try-It heading.

See [Try-It & Code Samples](./try-it.md) for the proxy endpoint contract and [Backend Integration](./backend-integration.md) for configuration options and non-Express implementations.

---

## Large Spec Performance

**Symptom:** The page freezes, becomes unresponsive, or crashes when loading specs with many endpoints (GitHub API, Stripe, Kubernetes, etc.).

**Cause:** In `grouped` navigation mode, all operations render on a single page simultaneously. For specs with 100+ operations this creates a very large DOM tree, which blocks the browser's main thread.

**Fix:** Use `segmented` navigation mode, which renders one operation at a time:

```tsx
<OmniSpecRenderer
  spec={specUrl}
  navigationMode="segmented"
/>
```

In segmented mode, the sidebar is the primary navigation. Clicking an operation loads only that operation in the content area — the rest of the spec is not in the DOM.

If you leave `navigationMode` unset, the renderer auto-selects based on operation count:

- **50 or fewer operations** — `grouped` (single scrollable page)
- **More than 50 operations** — `segmented` (one operation at a time)

Auto-selection handles most cases without any configuration. Only set `navigationMode` explicitly when you want to override the default.

Note: IntersectionObserver-based lazy rendering is built into grouped mode and defers off-screen operations, but it has limits. For very large specs (hundreds of endpoints), segmented mode is the correct solution.

See [Configuration & Advanced Usage](./configuration.md) for full navigation mode documentation.

---

## Sidebar Covered by Sticky Header

**Symptom:** The sticky sidebar starts too high and is partially hidden behind a fixed navigation bar from the host application.

**Cause:** The renderer does not know the height of external sticky or fixed elements in your application. By default the sidebar sticks to the top of the viewport (`top: 0`).

**Fix:** Set the `--omnispec-offset-top` CSS variable on the `.omnispec-root` element. The renderer uses this value as the `top` offset for the sticky sidebar and the scroll padding for deep-link anchors:

```css
.omnispec-root {
  --omnispec-offset-top: 60px;
}
```

Replace `60px` with the actual height of your sticky header. If the header height varies (e.g., collapses on scroll), update the variable dynamically:

```tsx
const headerHeight = useHeaderHeight()

return (
  <div
    className="omnispec-root"
    style={{ '--omnispec-offset-top': `${headerHeight}px` } as React.CSSProperties}
  >
    <OmniSpecRenderer spec={specUrl} />
  </div>
)
```

See [Theming Guide](./theming.md) for the full list of layout tokens.

---

## Theme Overrides Not Applying

**Symptom:** `theme.overrides` is set with custom token values but the renderer colors and fonts don't change.

**Cause:** The `overrides` option inside the `theme` **prop** is an Apiboost OmniSpec Pro feature. On the free core `theme.overrides` is accepted but has no effect. Note this is only about the *prop* — the `--omnispec-*` design tokens themselves are plain CSS custom properties that work on every tier.

**Fix (free core):** Set the `--omnispec-*` tokens directly on the `.omnispec-root` element with ordinary CSS. This is the free white-label path and requires no extra package:

```css
.omnispec-root {
  --omnispec-color-primary: #8B5CF6;
  --omnispec-color-primary-hover: #7C3AED;
  --omnispec-font-sans: "Inter", sans-serif;
}
```

This scopes cleanly, so you can even give different renderer instances on the same page different themes.

:::info[Pro]

The `theme.overrides` **prop** — passing the same token map through the React
API instead of a stylesheet — requires **[Apiboost OmniSpec Pro](https://apiboost.com/omnispec)**.
In the free core, use the CSS-variable approach above, which produces the same
result.

:::

See [Theming Guide](./theming.md) for all 70+ available design tokens.

---

## External $refs Not Resolving

**Symptom:** Schema properties show the message "External reference — add origin to `externalRefOrigins` to resolve" instead of the expanded schema.

**Cause:** Cross-origin `$ref` resolution is blocked by default. When a spec references a schema on a different domain (e.g., `$ref: "https://schemas.example.com/Pet.json#/definitions/Pet"`), the renderer does not follow it unless the origin is explicitly permitted.

**Fix:** Add the origin to the `externalRefOrigins` prop:

```tsx
<OmniSpecRenderer
  spec={specUrl}
  externalRefOrigins={['https://schemas.example.com']}
/>
```

Multiple origins are supported:

```tsx
externalRefOrigins={[
  'https://schemas.example.com',
  'https://shared-models.internal.example.com',
]}
```

The renderer will fetch schemas from permitted origins and resolve `$ref` pointers inline. Origins not in this list remain as unresolved external references in the UI.

See the external refs documentation for security considerations around enabling cross-origin schema resolution.

---

## Relative Server URL Goes to Wrong Host

**Symptom:** Try-It sends requests to `localhost` or the wrong host when the spec defines a relative server URL like `/api/v3`.

**Cause:** A relative server URL must be resolved against an origin. When the spec is loaded from a URL, the renderer uses that URL's origin as the base. If the spec is fetched from `localhost` during development but the API lives elsewhere, or if the spec is loaded as an inline string or object (with no fetch origin), the resolution may produce an unexpected result.

**Fix:** The renderer automatically resolves relative server URLs against the origin from which the spec was fetched. If this produces the wrong host, use an absolute server URL in your spec:

```yaml
# Instead of:
servers:
  - url: /api/v3

# Use:
servers:
  - url: https://api.example.com/v3
```

If you cannot modify the spec, pass the spec object and the base URL separately using the `specBaseUrl` prop:

```tsx
<OmniSpecRenderer
  spec={parsedSpecObject}
  specBaseUrl="https://api.example.com"
/>
```

This tells the renderer which origin to use when resolving relative URLs in the spec, independent of where the spec content came from.

---

## Spec Not Detected

**Symptom:** The renderer shows "Unable to detect specification type" instead of rendering the documentation.

**Cause:** Auto-detection inspects the spec content for known structural markers (OpenAPI `openapi`/`swagger` keys, AsyncAPI `asyncapi` key, GraphQL SDL syntax, WSDL root element, proto syntax). If the content does not match any of these, detection fails. This can happen with invalid specs, incomplete specs, or specs wrapped in an unexpected envelope.

**Fix — force the spec type explicitly:**

```tsx
import { SpecType } from '@apiboost/omnispec'

<OmniSpecRenderer
  spec={specUrl}
  specType={SpecType.OPENAPI_3}
/>
```

Available `SpecType` values: `OPENAPI_2`, `OPENAPI_3`, `ASYNCAPI_2`, `ASYNCAPI_3`, `GRAPHQL`, `SOAP`, `GRPC`.

**Fix — validate the spec content:**

- OpenAPI/AsyncAPI: validate at [editor.swagger.io](https://editor.swagger.io) or with `npx @redocly/cli lint your-spec.yaml`
- Check the spec is served as valid JSON or YAML (not HTML, not an error page)
- Ensure the response `Content-Type` is `application/json`, `text/yaml`, `text/xml`, or `text/plain`

If the spec is served correctly and detection still fails, the spec may be missing required top-level fields. For OpenAPI 3.x, `openapi`, `info`, and `paths` are required at minimum.

---

## Renderer Shows "Failed to render specification"

**Symptom:** Instead of the documentation, an inline error card appears with a message describing what went wrong.

**Cause:** The renderer is wrapped in an error boundary. If a render-phase exception occurs — a malformed spec that parses but produces an unrenderable structure, a bad GraphQL schema, or an unexpected data shape — the boundary catches it and shows a graceful fallback rather than crashing the host page. The underlying error is also logged to the browser console (prefixed `[omnispec]`).

**Fix:**

- Open the browser console and read the logged error for the specific cause.
- For GraphQL, the parser now validates input up front: SDL must be a non-empty string, and introspection input must be an object containing a `__schema` field (either the raw introspection result or a `{ data: { __schema } }` response). The thrown message names the exact problem.
- Validate the spec as described in [Spec Not Detected](#spec-not-detected) above.

The error boundary guarantees a single broken operation or schema can never blank the entire page — the rest of the surrounding application keeps working.

---

## React 18 / 19 Compatibility

**Symptom:** Build errors about mismatched peer dependencies, or runtime warnings like "Warning: ReactDOM.render is no longer supported".

**Cause:** A version mismatch between your installed React version, the renderer's peer dependency range, or a missing required peer package.

**Fix — verify peer dependencies are met:**

```bash
npm ls react react-dom @emotion/css
```

`@apiboost/omnispec` supports React 18 and React 19. Both versions are in the peer dependency range. `@emotion/css` is a required peer and must be installed separately:

```bash
npm install @emotion/css
```

**Fix — check for duplicate React installs:**

If your project has multiple packages that each bring their own React copy, hooks will throw "Invalid hook call" errors. Deduplicate with:

```bash
npm dedupe
# or with pnpm:
pnpm dedupe
```

**Fix — Next.js App Router:** The renderer uses browser APIs and cannot run on the server. Add `'use client'` to the file importing it, or use a dynamic import with `ssr: false`:

```tsx
import dynamic from 'next/dynamic'

const OmniSpecRenderer = dynamic(
  () => import('@apiboost/omnispec').then(m => m.OmniSpecRenderer),
  { ssr: false }
)
```

If you are seeing deprecation warnings specific to React 19's stricter concurrent mode behavior, ensure you are on the latest patch version of `@apiboost/omnispec`.
