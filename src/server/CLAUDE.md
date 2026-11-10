# CLAUDE.md — `src/server/`

Server-only code. Exported via the `@apiboost/omnispec/server` subpath (part of the free core, not Pro). Provides an Express-compatible proxy router for Try-It with CORS-blocked APIs.

> **This module is the only `.ts` source that targets Node, not the browser.** Don't import browser-only modules (React, @emotion/css, etc.) here. Don't import this module from any other directory in `src/`.

---

## Directory Map

```
server/
├── index.ts             Public exports: createProxyRouter, isPrivateIp, isBlockedAddress, types
├── proxy-router.ts      Express middleware factory (validation, rate limit, envelope parsing, redirects)
├── ssrf-guard.ts        Blocklist (net.BlockList over IANA special-purpose ranges) + hostname canonicalization
├── guarded-lookup.ts    DNS lookup that validates every resolved address and pins the socket to it
├── upstream-request.ts  http/https transport (no fetch): pinned lookup, no redirects, capped/decoded body
└── headers.ts           Request/response header sanitizing (hop-by-hop, Host, Content-Length, CRLF)
```

---

## What It Provides

```ts
// Consumer mounts this in their Express app:
import express from 'express'
import { createProxyRouter } from '@apiboost/omnispec/server'

const app = express()
app.use('/api/proxy', createProxyRouter({
  // options
}))
```

The frontend Try-It panel posts requests to the mounted route. The proxy validates, optionally enforces an allowlist, forwards the request, and returns the response.

---

## Security Layers

1. **SSRF guard, pre-connect** (`ssrf-guard.ts`) — rejects non-http(s) schemes, `localhost`/`*.localhost`, and IP literals in any blocked range: loopback, RFC 1918, link-local/metadata, CGNAT, documentation/benchmarking, multicast/reserved, IPv6 ULA/link-local/site-local, and prefixes that embed IPv4 (mapped, NAT64, 6to4). Hostnames are canonicalized via the WHATWG URL parser first, so `2130706433`, `0x7f.1`, `[::ffff:127.0.0.1]` and `localhost.` are caught
2. **SSRF guard, at connect** (`guarded-lookup.ts`) — resolves the hostname once, rejects if **any** address is blocked, and hands the socket the validated address (DNS-rebinding safe). The transport is Node `http`/`https` with `agent: false`, not `fetch`, precisely so the lookup can be pinned
3. **No redirect following** — default `maxRedirects: 0` returns the 3xx to the client. When enabled, every hop re-runs layers 1, 2 and the allowlist, and cross-origin hops forward only `CROSS_ORIGIN_SAFE_HEADERS`
4. **Rate limiting** — per client, keyed by `req.ip` or `keyGenerator`. Behind a reverse proxy the *host app* must set `trust proxy`; the router warns once (via `logger`) when it sees `X-Forwarded-For` without it
5. **Allowed-domains allowlist** — optional (`allowedDomains`), checked on every hop. When a spec uses an `openIdConnect` scheme, the OpenID discovery host and any endpoint hosts it advertises (`authorization_endpoint` / `token_endpoint`) must be covered by this list too — the discovery fetch and the token exchange both route through this proxy as a CORS fallback
6. **Body size limits** — the router parses its own JSON envelope (`maxEnvelopeSize`, default `2 * maxBodySize + 64 KiB`); `maxBodySize` caps the decoded request body and the decompressed response body
7. **Header filtering** (`headers.ts`) — only envelope headers are forwarded (never the inbound request's own headers/cookies). Hop-by-hop headers, anything named in `Connection`, `Host` and `Content-Length` are dropped; invalid names/values (CR/LF) are rejected with 400. `Cookie` **is** forwarded — it carries `in: cookie` API keys, which only the proxy can deliver. Hop-by-hop headers are also stripped from the response envelope

Do not bypass any of these guards. They are the primary defense against SSRF / abuse when the proxy is exposed publicly.

---

## Configuration Surface

The `createProxyRouter` options (see `ProxyRouterOptions` in `proxy-router.ts` for the canonical shape):

- `rateLimitPerMinute?: number` — default 60
- `keyGenerator?: (req) => string` — rate-limit key, default `req.ip`
- `logger?: { warn(msg) }` — one-time config warnings, default `console`
- `maxTimeout?: number` — ms, default 30000
- `maxBodySize?: number` — bytes, default 1 MB (request after base64 decode; response after decompression)
- `maxEnvelopeSize?: number` — bytes, JSON envelope parse limit
- `allowedDomains?: string[]` — host allowlist (exact or subdomain)
- `maxRedirects?: number` — default 0 (don't follow)
- `dnsLookup?: (hostname) => Promise<{ address, family }[]>` — custom resolver; results are still validated
- `onRequest?: (audit) => void` — audit callback

If you add an option:

1. Default it sensibly so existing consumers don't break
2. Add a test in `proxy-router.test.ts`
3. Document it in `docs/backend-integration.md` (options table) and, if security-relevant, `docs/security.md`

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

- Unit tests with vitest, co-located as `*.test.ts`, with `// @vitest-environment node` (the default env is jsdom)
- `proxy-router.test.ts` runs the router against a local upstream `http` server on 127.0.0.1; it mocks `./ssrf-guard` to treat exactly that address as public, and injects `dnsLookup` to simulate hostnames, rebinding and private resolutions. Never hit the real network
- SSRF guard tests should include tricky cases: IPv6, IPv4-mapped/NAT64, numeric IPv4 forms, trailing dots, DNS rebinding

---

## QA Scope

- APARC-1774 — Try-It panel end-to-end
- APARC-1882 — Express SSR + CORS proxy mount (developer integration)
- APARC-1858 — SOAP/WSDL Try-It through CORS proxy
