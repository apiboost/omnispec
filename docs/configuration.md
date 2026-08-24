# Configuration & Advanced Usage

The examples below use `<OpenApiSpec>`, but every prop shown is shared configuration — pass the same props to `<OmniSpecRenderer>` (which auto-detects the spec type) or `<AsyncApiSpec>` interchangeably.

## Layout Modes

### Sidebar Layout (default)

Shows a navigation sidebar alongside the main content:

```tsx
<OpenApiSpec spec={url} layout="sidebar" />
```

### Stacked Layout

Content only, no sidebar. Useful for embedding in tight spaces:

```tsx
<OpenApiSpec spec={url} layout="stacked" />
```

### Sidebar Position

```tsx
// Default: left sidebar
<OpenApiSpec spec={url} sidebarPosition="left" />

// Right sidebar
<OpenApiSpec spec={url} sidebarPosition="right" />
```

The sidebar is sticky and scrolls independently from the main content.

### Mobile Drawer

On mobile viewports the sidebar becomes a full-screen drawer opened from a
floating toggle button. The drawer dismisses itself when the user navigates:
selecting a navigation item (an operation, channel, or custom link) or
clicking any same-tab link inside the drawer — including links you provide
via the `sidebarHeader`/`sidebarFooter` slots — closes it. Group headers only
expand/collapse their children and keep the drawer open, as do links with
`target="_blank"`.

## Navigation Mode

Controls how operations are rendered and navigated.

### Grouped (default for small specs)

All operations render on a single scrollable page, organized by tags. Sidebar clicks scroll to the target operation.

```tsx
<OmniSpecRenderer spec={url} navigationMode="grouped" />
```

### Segmented (default for large specs)

Each operation renders on its own internal view. The sidebar becomes the primary navigation — clicking a tag expands/collapses its operations, clicking an operation swaps the content area to show that single operation with a back button.

```tsx
<OmniSpecRenderer spec={url} navigationMode="segmented" />
```

The sidebar starts with an **Overview** entry that returns to the top-level view (spec title, description, servers, and schemas) from any operation. On that overview, the **Expand All** toolbar button expands and collapses every schema in the Schemas section (there are no operations on the overview to expand).

This mode is essential for large specs (hundreds of endpoints) where rendering all operations at once would degrade performance.

### Auto-selection (default)

When `navigationMode` is not set, the renderer auto-selects based on the total operation count:

- **≤50 operations** → `grouped`
- **>50 operations** → `segmented`

```tsx
// Auto-selects based on spec size
<OmniSpecRenderer spec={url} />

// Force segmented for a small spec (e.g., preview how it looks)
<OmniSpecRenderer spec={url} navigationMode="segmented" />

// Force grouped for a large spec (use with caution — may impact performance)
<OmniSpecRenderer spec={url} navigationMode="grouped" />
```

## Display Mode

Controls the visual presentation of each operation.

### Compact (default)

Operations render as collapsible cards with inline documentation and a Try-It panel:

```tsx
<OmniSpecRenderer spec={url} displayMode="compact" />
```

### Reference

A Redocly-style three-panel layout. On desktop: schema documentation on the left, sticky code samples and Try-It tabs on the right. On mobile: three full-width tabs (Schema / Samples / Try It).

```tsx
<OmniSpecRenderer spec={url} displayMode="reference" />
```

The left column shows parameters and response schemas using a chained-list display with expandable nested properties. The right column shows:
- **Samples tab**: request code samples (cURL, JavaScript, Python, Go, Java, C#) and response JSON samples tabbed by status code
- **Try It tab**: interactive request builder

Display mode and navigation mode are independent — reference mode works with both grouped and segmented navigation.

Both display modes render OAS 3.0 callbacks as expandable sections within each operation. Named examples (when multiple are defined) display a dropdown selector.

## Schema Rendering

The schema tree renders JSON Schema for request bodies, responses, and reusable
components. A few behaviors worth calling out:

- **Cross-links.** When a property references a reusable component schema
  (`$ref: '#/components/schemas/Pet'`), the type renders as a clickable link that
  jumps to that schema's entry in the Schemas section and updates the URL hash
  (`#schema-Pet`) so the position is shareable.
- **`oneOf` / `anyOf` branch labels.** Instead of generic "Option 1 / Option 2"
  headings, each branch is labeled by:
  1. the `discriminator.mapping` value that points at the branch, if a
     `discriminator` is present;
  2. otherwise the branch's `$ref` schema name;
  3. otherwise its `title`;
  4. falling back to "Option N" only for fully anonymous inline branches.
- **Discriminator.** When a `oneOf` / `anyOf` schema declares a `discriminator`,
  the discriminating property name is shown above the branches (e.g.
  "Discriminated by `petType`").
- **Titles.** A schema property's `title` renders as a muted label next to the
  field name.
- **Markdown descriptions.** Schema property descriptions render as markdown
  (links, emphasis, inline code, tables). The generated HTML is sanitized with
  an allowlist — script-capable tags, event handlers, and `javascript:` URLs
  are stripped.
- **readOnly / writeOnly filtering.** Request body schemas hide `readOnly`
  properties; response schemas hide `writeOnly` properties, matching how the
  API actually behaves in each direction.
- **Deprecated operations** show a warning banner at the top of the operation
  detail in addition to the badge on the collapsed card.

### Schema Style (`schemaStyle`)

`schemaStyle` switches how the property tree is presented. It applies everywhere
a schema is rendered — request bodies, responses, and the reusable Schemas
section — across every spec type.

```tsx
<OmniSpecRenderer spec={url} schemaStyle="tokens" />
```

| Value | Description | Tier |
|-------|-------------|------|
| `lines` *(default)* | Airy typographic rows with hairline dividers and a chevron + left-guide for nesting. Metadata reads as `type · format`. | Free |
| `tokens` | Dense, monospace, syntax-colored rows: the type and format are tinted, `required` shows as a `*` after the name, and enum values render as small bordered tokens. Best for power users scanning large schemas. | Free |
| `table` | A two-column layout — the name (and its required marker) on the left, and the type, description, enum, and nested children on the right (Redocly-style, the most scannable). | Pro |
| `card` | The schema is wrapped in an enclosed card with row hover and a soft accent rail on nested objects. | Pro |

**Tier gating.** `lines` and `tokens` are available in the free core.

:::info[Pro]
The `table` and `card` schema styles require **[Apiboost OmniSpec Pro](https://apiboost.com/omnispec?utm_source=omnispec&utm_medium=docs&utm_campaign=pro)**. In the free core, requesting `table` or `card` **gracefully falls back to `lines`** — no error is thrown and nothing is logged, so a spec authored for a Pro portal degrades cleanly when viewed in a free build.
:::

```tsx
// Free core: renders as `lines` (silent fallback)
import { OmniSpecRenderer } from '@apiboost/omnispec'
<OmniSpecRenderer spec={url} schemaStyle="card" />
```

As a Web Component attribute:

```html
<omnispec-renderer spec-url="/openapi.json" schema-style="tokens"></omnispec-renderer>
```

## External $ref Resolution

By default, the renderer resolves all internal `$ref` pointers (`#/components/schemas/Pet`) automatically. External refs pointing to other files are also supported with security controls.

### Same-Origin (automatic)

Refs pointing to files on the same origin as the spec URL resolve automatically:

```yaml
# Spec loaded from https://api.example.com/openapi.yaml
$ref: './models/Pet.yaml'           # ✓ resolves (same origin)
$ref: '/shared/schemas.yaml#/Error'  # ✓ resolves (same origin)
```

### Cross-Origin (requires allowlist)

Refs pointing to different origins are blocked by default. Add allowed origins via the `externalRefOrigins` prop:

```tsx
<OmniSpecRenderer
  spec="https://api.example.com/openapi.yaml"
  externalRefOrigins={[
    'https://schemas.example.com',
    'https://raw.githubusercontent.com',
  ]}
/>
```

See [External Refs Guide](./external-refs.md) for the full security model and configuration options.

## Try-It Layout

### Inline (default)

Try-It panel renders below each expanded operation:

```tsx
<OpenApiSpec spec={url} tryItLayout="inline" />
```

### Panel

Try-It renders in a sticky right column beside the operation documentation, similar to Stripe's API reference:

```tsx
<OpenApiSpec spec={url} tryItLayout="panel" />
```

The panel layout splits each expanded operation into two columns, defaulting to
a 65 / 35 split (content-heavy left, Try-It on the right). The divider is
draggable, and the chosen width is remembered:
- **Left (~65%)**: Parameters, request body schema, response codes
- **Right (~35%)**: Sticky Try-It panel with forms, send button, response viewer

## Try-It Modes

### Direct Mode (default)

Requests go directly from the browser to the API server via `fetch()`:

```tsx
<OpenApiSpec spec={url} />
```

Works when the target API supports CORS from your domain. If CORS blocks the request, the error message suggests configuring a proxy.

### Proxy Mode

Requests route through your backend to avoid CORS:

```tsx
<OpenApiSpec spec={url} proxyUrl="/api/proxy" />
```

A "proxied" badge appears next to the Try-It heading. See [Backend Integration](./backend-integration.md) for proxy setup.

### Disabled

```tsx
<OpenApiSpec spec={url} allowTryIt={false} />
```

## Server URL Override

Force the base URL used by Try-It and the generated code samples at render time,
overriding any `servers` declared in the spec. This is useful when the same spec
is served from multiple gateways (staging, production, a customer-specific Azure
API Management domain) and you want to point the renderer at one of them without
editing the spec.

### Force a single server (`serverUrl`)

```tsx
<OpenApiSpec
  spec={url}
  serverUrl="https://api-gateway.contoso.com/v1"
/>
```

`serverUrl` locks the server selector to the given URL. It takes precedence over
both the `servers` prop and the spec's own `servers` list. Try-It requests and all
code samples use this URL as their base.

### Provide a custom server list (`servers`)

```tsx
<OpenApiSpec
  spec={url}
  servers={[
    { url: 'https://staging.contoso.com', description: 'Staging' },
    { url: 'https://api.contoso.com', description: 'Production' },
  ]}
/>
```

`servers` replaces the spec's `servers` and is rendered in the server selector.
It is ignored when `serverUrl` is also set.

| Prop | Type | Notes |
|------|------|-------|
| `serverUrl` | `string` | Forces a single base URL. Highest precedence. |
| `servers` | `{ url: string; description?: string }[]` | Replaces the spec's server list. Ignored if `serverUrl` is set. |

### Web Component

The single-URL override is exposed as the `server-url` attribute:

```html
<omnispec-renderer
  spec-url="/openapi.yaml"
  server-url="https://api-gateway.contoso.com/v1"
></omnispec-renderer>
```

## Callbacks

Listen to spec loading and Try-It events:

```tsx
<OpenApiSpec
  spec={url}
  onSpecLoaded={(info) => {
    console.log(`Loaded: ${info.title} v${info.version} (${info.type})`)
    // e.g., update page title, track analytics
  }}
  onTryItRequest={(request) => {
    console.log(`${request.method} ${request.url}`)
    // e.g., log to analytics
  }}
  onTryItResponse={(response) => {
    console.log(`Response: ${response.status} (${response.duration}ms)`)
  }}
/>
```

## Slot Injection

### Sidebar Header

Inject parent application navigation above the spec's nav tree:

```tsx
<OpenApiSpec
  spec={url}
  slots={{
    sidebarHeader: (
      <nav style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
        <a href="/docs">Documentation</a>
        <span> / </span>
        <a href="/docs/apis">API Reference</a>
        <h3 style={{ marginTop: '8px' }}>Pet Store API</h3>
      </nav>
    ),
  }}
/>
```

### Sidebar Footer

Add version info or links below the nav tree:

```tsx
<OpenApiSpec
  spec={url}
  slots={{
    sidebarFooter: (
      <div style={{ padding: '12px', fontSize: '11px', color: '#888' }}>
        API Version 2.1.0 | <a href="/changelog">Changelog</a>
      </div>
    ),
  }}
/>
```

### Content Header

Inject content above the main content area — breadcrumbs, an environment banner, or a page title:

```tsx
<OpenApiSpec
  spec={url}
  slots={{
    contentHeader: <Breadcrumbs items={['Docs', 'Pet Store API']} />,
  }}
/>
```

### Header and Footer

Wrap the entire renderer with your app chrome:

```tsx
<OpenApiSpec
  spec={url}
  slots={{
    header: <AppHeader />,
    footer: <AppFooter />,
  }}
/>
```

## Combining Options

All options compose freely:

```tsx
<OpenApiSpec
  spec="https://api.example.com/openapi.yaml"
  theme={{ base: 'dark' }}
  layout="sidebar"
  sidebarPosition="left"
  tryItLayout="panel"
  proxyUrl="/api/proxy"
  slots={{
    sidebarHeader: <MyBreadcrumbs />,
    header: <MyAppHeader />,
  }}
  onSpecLoaded={(info) => document.title = info.title}
/>
```

## Spec Input Formats

| Renderer | JSON | YAML | XML | SDL | Proto | Introspection JSON |
|----------|------|------|-----|-----|-------|-------------------|
| OpenApiSpec | Yes | Yes | — | — | — | — |
| AsyncApiSpec | Yes | Yes | — | — | — | — |
| GraphqlSpec | — | — | — | Yes | — | Yes |
| SoapSpec | — | — | Yes | — | — | — |
| GrpcSpec | — | — | — | — | Yes | — |
