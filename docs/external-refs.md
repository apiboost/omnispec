# External $ref Resolution

OpenAPI specs often split schemas across multiple files using `$ref` pointers. The renderer handles internal refs (`#/components/schemas/Pet`) automatically. External refs — paths or URLs pointing to a separate file — require a small amount of configuration when the referenced file lives on a different origin.

## Overview

There are two kinds of external refs:

| Ref type | Example | Default behavior |
|----------|---------|-----------------|
| Same-origin | `./models/Pet.yaml`, `/shared/schemas.json#/Pet` | Always resolved automatically |
| Cross-origin | `https://schemas.example.com/common.yaml#/Error` | Blocked by default — shows a structured indicator |

When a ref cannot be resolved, the renderer displays a placeholder in place of the missing schema rather than crashing. Cross-origin refs that have not been explicitly allowed show a visual indicator explaining why the schema is unavailable.

## Same-Origin Refs

If your spec and its referenced files are served from the same origin (scheme + host + port), no configuration is needed. The renderer fetches them automatically.

```yaml
# openapi.yaml — served from https://docs.example.com
components:
  schemas:
    Pet:
      $ref: './models/Pet.yaml'          # same origin, fetched automatically
    Error:
      $ref: '/shared/schemas/Error.yaml' # same origin, fetched automatically
```

Same-origin is derived from the URL you pass in the `spec` prop. If you pass a raw string or object instead of a URL, there is no origin to derive — treat all file refs as cross-origin and configure them explicitly.

## Cross-Origin Refs

Cross-origin refs are blocked by default. To allow them, pass an `externalRefOrigins` array with the permitted origins:

```tsx
<OmniSpecRenderer
  spec="https://docs.example.com/openapi.yaml"
  externalRefOrigins={[
    'https://schemas.example.com',
    'https://cdn.shared-schemas.io',
  ]}
/>
```

Origins must include the scheme and host. Trailing slashes are ignored. Port is included when non-standard:

```tsx
externalRefOrigins={[
  'https://schemas.example.com',       // any path under this origin
  'https://api.example.com:8443',      // non-standard port
]}
```

Any ref whose origin is not in the list renders the blocked indicator instead of the schema. No error is thrown.

### Wildcard subdomains

To allow all subdomains of a domain, prefix with `*.`:

```tsx
externalRefOrigins={['*.example.com']}
```

This matches `https://schemas.example.com` and `https://cdn.example.com` but not `https://example.com` itself.

## Config File Convention

For apps that render multiple specs or want to keep allow-list configuration out of component props, create an `omnispec.config.json` at the root of your project and import it where you mount the renderer:

```json
// omnispec.config.json
{
  "externalRefOrigins": [
    "https://schemas.example.com",
    "https://cdn.shared-schemas.io"
  ]
}
```

```tsx
// docs-page.tsx
import omnispecConfig from '../omnispec.config.json'
import { OmniSpecRenderer } from '@apiboost/omnispec'

function DocsPage({ specUrl }: { specUrl: string }) {
  return (
    <OmniSpecRenderer
      spec={specUrl}
      externalRefOrigins={omnispecConfig.externalRefOrigins}
    />
  )
}
```

Centralizing the allow-list in a config file makes it easy to audit which external origins your docs site depends on.

## Security Model

### SSRF Protection

The renderer never fetches private network addresses, regardless of the `externalRefOrigins` configuration. The following are always blocked:

- RFC 1918 private ranges: `10.x.x.x`, `172.16–31.x.x`, `192.168.x.x`
- Loopback: `127.x.x.x`, `::1`, `localhost`
- Link-local: `169.254.x.x`, `fe80::/10`

Attempts to use a permitted origin that resolves to a private IP (e.g., via DNS rebinding) are blocked at fetch time.

### Fetch Limits

To prevent runaway resolution of deeply nested or circular ref trees:

| Limit | Value |
|-------|-------|
| Max external hop depth | 5 levels |
| Max external files per spec | 20 files |
| Timeout per fetch | 5 seconds |
| Max file size | 2 MB |

Exceeding any limit causes the affected ref to render as the blocked indicator. The rest of the spec continues to render normally.

### Caching

External files are cached in memory for the duration of the page session. The same file URL is fetched at most once, even when referenced by multiple `$ref` pointers across the spec.

### Blocked Indicator

When a ref cannot be resolved — because the origin is not allowed, a limit was reached, or the fetch failed — the renderer shows an inline indicator:

```
⚠ External schema unavailable
  https://schemas.external.com/Pet.yaml
  Origin not in externalRefOrigins allow-list
```

The rest of the spec renders normally. Try-It panels for operations that reference the blocked schema still function — the schema viewer for that field is simply omitted.

## Troubleshooting

**Cross-origin refs are still blocked after adding the origin**

Check that the origin in `externalRefOrigins` exactly matches the scheme, host, and port of the ref URL. `https://schemas.example.com` does not cover `http://schemas.example.com` or `https://schemas.example.com:443`.

**The renderer shows the blocked indicator for a same-origin ref**

This happens when `spec` is passed as a raw YAML/JSON string or a pre-parsed object rather than a URL. Without a spec URL, there is no origin to derive — add the origin explicitly to `externalRefOrigins`.

**A ref that points to a fragment within an external file isn't resolving**

Fragment pointers (`./models.yaml#/components/schemas/Pet`) are supported. Make sure the external file itself is reachable first — check the network tab for a failed fetch before investigating the fragment path.

**Refs resolve in development but not in production**

Your production server may serve the spec from a different origin than your dev server. Check the value of `window.location.origin` in each environment and ensure your allow-list covers both, or use the config file convention to manage environment-specific values via build-time env variables:

```json
// omnispec.config.json
{
  "externalRefOrigins": [
    "https://schemas.example.com"
  ]
}
```

```ts
// For environment-specific origins, build them at import time:
const extraOrigins = process.env.EXTRA_SCHEMA_ORIGINS?.split(',') ?? []

<OmniSpecRenderer
  spec={specUrl}
  externalRefOrigins={[...omnispecConfig.externalRefOrigins, ...extraOrigins]}
/>
```

**Fetch times out for a large external schema file**

The per-file timeout is 5 seconds and the max file size is 2 MB. If a referenced file exceeds these limits, split it into smaller files or bundle the schemas inline in the main spec before publishing.
