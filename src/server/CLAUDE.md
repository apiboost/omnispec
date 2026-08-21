# CLAUDE.md — `src/server/`

Server-only code. Exported via the `@apiboost/omnispec-pro/server` subpath. Provides an Express-compatible proxy router for Try-It with CORS-blocked APIs.

> **This module is the only `.ts` source that targets Node, not the browser.** Don't import browser-only modules (React, @emotion/css, etc.) here. Don't import this module from any other directory in `src/`.

---

## Directory Map

```
server/
├── index.ts          Public exports: createProxyRouter, ssrf-guard utilities
├── proxy-router.ts   Express middleware factory
└── ssrf-guard.ts     SSRF guard (private network blocklist, host validator)
```

---

## What It Provides

```ts
// Consumer mounts this in their Express app:
import express from 'express'
import { createProxyRouter } from '@apiboost/omnispec-pro/server'

const app = express()
app.use('/api/proxy', createProxyRouter({
  // options
}))
```

The frontend Try-It panel posts requests to the mounted route. The proxy validates, optionally enforces an allowlist, forwards the request, and returns the response.

---

## Security Layers

1. **SSRF guard** — blocks loopback (`127.0.0.1`, `::1`) and RFC1918 private network ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`) and link-local (`169.254.0.0/16`). Resolves DNS before forwarding to prevent rebinding attacks
2. **Rate limiting** — configurable per-IP. Default sensible for public deployment
3. **Allowed-hosts allowlist** — optional (`allowedDomains`). If set, only requests targeting these hosts are forwarded. When a spec uses an `openIdConnect` scheme, the OpenID discovery host and any endpoint hosts it advertises (`authorization_endpoint` / `token_endpoint`) must be covered by this list too — the discovery fetch and the token exchange both route through this proxy as a CORS fallback (ABOSPEC-215)
4. **Body size limit** — `maxBodySize` option caps the forwarded request body
5. **Header filtering** — strips host-related and credentialed headers from the inbound request before forwarding

Do not bypass any of these guards. They are the primary defense against SSRF / abuse when the proxy is exposed publicly.

---

## Configuration Surface

The `createProxyRouter` options (see `proxy-router.ts` for the canonical shape):

- `allowedHosts?: string[]` — host allowlist
- `maxBodySize?: number` — bytes
- `rateLimit?: { windowMs, max }`
- `customHeaders?: Record<string, string>` — added to all forwarded requests (e.g. an Apiboost-specific routing header)

If you add an option:

1. Default it sensibly so existing consumers don't break
2. Add a test in `proxy-router.test.ts`
3. Document it in `packages/omnispec/docs/client_docs/try-it.md` and `backend-integration.md`

---

## Adding a New Server-Side Feature

Only add code here if it must run on Node (a Node API, a non-browser dependency, or a server-side security boundary). Otherwise it belongs in `@core/` or a renderer directory.

If you're tempted to add audit logging, telemetry, or generic logging here: there's a planned `POST /api/v2/logs` endpoint and `CollectAllowedLogTypesEvent` pattern in the backend roadmap (`docs/internal/features/roadmap/backend.md`). Coordinate with that work — don't fork a logging mechanism here.

---

## Build Considerations

- Server code is compiled to CJS and ESM, just like the rest of the package, but consumers using the `/server` subpath are expected to be in a Node environment
- No DOM types — set `lib: ["ES2022"]` (or similar) for the server-only tsconfig, OR use TypeScript reference comments to scope DOM out
- Don't bundle React or any UI dependency into the server output

---

## Testing

- Unit tests with vitest, co-located as `*.test.ts`
- Mock outbound HTTP in tests — don't hit real network
- SSRF guard tests should include tricky cases: IPv6, hostname → IP DNS rebinding, normalized hostnames

---

## QA Scope

- APARC-1774 — Try-It panel end-to-end
- APARC-1882 — Express SSR + CORS proxy mount (developer integration)
- APARC-1858 — SOAP/WSDL Try-It through CORS proxy
