---
title: Security Model
sidebar_position: 9
---

# Security Model

This page consolidates the security posture of the free core, `@apiboost/omnispec`. It covers what network activity the renderer performs, the trust model for Try-It (direct vs. proxied), the built-in proxy's SSRF and abuse protections, and the controls around external `$ref` resolution.

## What the renderer touches

The renderer is a client-side rendering engine. In the browser it makes **no network calls of its own** except:

1. **Fetching the spec** — when you pass a URL to the `spec` prop, the renderer performs a single `GET` to load it. If you pass a raw string or a pre-parsed object, no fetch occurs.
2. **Resolving external `$ref`** — only for cross-origin refs you have explicitly allow-listed (see below). Same-origin refs are fetched from the origin of the spec URL.
3. **Try-It requests** — only when a user clicks "Try it", and only to the target described by the operation (directly, or through your proxy if configured).

It sends no telemetry, analytics, or phone-home traffic. There is no background polling. Persistence for Try-It (entered values, tokens) uses the browser's own `localStorage`/`sessionStorage` on the docs origin and never leaves the browser.

## Try-It trust model: direct vs. proxy

Try-It has two transport modes with different trust characteristics.

### Direct (default)

By default, Try-It sends the request straight from the user's browser to the target API. This is the simplest setup and keeps credentials on the client.

- **Best for** APIs that support CORS and are reachable from the browser.
- **Trust boundary:** the request originates from the end user's machine and IP. Credentials the user enters go directly to the target API — they never pass through your servers.
- **Limitation:** APIs without CORS headers, or that are not publicly reachable, cannot be called directly.

### Proxied

When you set `proxyUrl`, Try-It sends the request to your backend, which forwards it to the target and relays the response. This is required for CORS-restricted APIs.

- **Best for** APIs that block browser CORS (SOAP services almost always require this).
- **Trust boundary:** requests now originate from **your server's** IP. This means your server can reach internal hosts the browser cannot — which is precisely why the proxy needs SSRF protection (below). Credentials the user enters transit your server, so treat the proxy as a component that handles secrets and log accordingly.

Use the [built-in Express middleware](#the-built-in-proxy) or implement the [proxy endpoint contract](./backend-integration.md#proxy-endpoint-contract) yourself.

## The built-in proxy

The package ships a hardened proxy router at `@apiboost/omnispec/server`:

```js
import { createProxyRouter } from '@apiboost/omnispec/server'

app.use('/api/proxy', createProxyRouter({
  rateLimitPerMinute: 60,   // per-IP rate limit (default 60)
  maxTimeout: 30000,        // max request timeout in ms (default 30s)
  maxBodySize: 1048576,     // max request/response body in bytes (default 1MB)
  allowedDomains: [],       // empty = allow all external domains
  onRequest: (audit) => {   // optional audit callback
    // { targetUrl, method, statusCode, duration, timestamp, ip }
  },
}))
```

It provides the following protections out of the box:

### SSRF protection

The proxy refuses to forward requests to private and internal network addresses, regardless of what URL the browser submits. Blocked ranges include:

- **Loopback** — `127.0.0.0/8`, `::1`, `localhost`
- **RFC 1918 private ranges** — `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`
- **IPv6 unique-local** — `fc00::/7`
- **Link-local** — `169.254.0.0/16`, `fe80::/10`

This stops a Try-It form from being used to probe your internal network via the proxy.

### Rate limiting

A per-IP limit (default **60 requests/minute**) throttles abuse. When [`express-rate-limit`](https://www.npmjs.com/package/express-rate-limit) is installed it is used; otherwise the middleware falls back to an in-memory limiter.

### Timeout and body-size enforcement

Requests are capped at `maxTimeout` (default 30s), preventing slow-loris style hangs. A request body exceeding `maxBodySize` (default 1 MB) is rejected with a `413`; an oversized upstream **response** is rejected with a `502`.

### Domain allow-listing

Set `allowedDomains` to a non-empty array to restrict the proxy to specific target hosts. Left empty, the proxy allows any external (non-private) domain — SSRF protection still applies. For a public docs site that only ever calls your own APIs, allow-listing narrows the blast radius.

### Audit logging

The optional `onRequest` callback receives an audit record (`targetUrl`, `method`, `statusCode`, `duration`, `timestamp`, `ip`) for every proxied request — wire it into your logging/SIEM pipeline.

:::tip
If you implement the proxy yourself in another language (PHP, Go, etc.), you own these protections. At minimum: validate the `url` against an allow-list, block private IP ranges, rate-limit the endpoint, enforce timeouts and body-size caps, and avoid forwarding sensitive internal headers. See [Backend Integration](./backend-integration.md#security-considerations).
:::

## External `$ref` resolution

Specs split across multiple files reference each other with `$ref`. The renderer resolves these with the same security-first posture as the proxy.

- **Same-origin refs** (relative paths, or absolute paths on the spec's origin) resolve automatically.
- **Cross-origin refs** are **blocked by default**. To allow them, list the permitted origins in `externalRefOrigins`. Matching is **exact** — each allowed origin must be listed in full (`scheme://host[:port]`); wildcard subdomains are not supported. Anything not on the list renders a structured "unavailable" indicator instead of the schema — nothing is thrown, and the rest of the document renders normally.

```tsx
<OmniSpecRenderer
  spec="https://docs.example.com/openapi.yaml"
  externalRefOrigins={['https://schemas.example.com', 'https://cdn.trusted.io']}
/>
```

### SSRF protection for refs

Like the proxy, ref resolution never fetches private network addresses even if you allow-list an origin that later resolves to one (e.g., via DNS rebinding). The same loopback, RFC 1918, and link-local ranges are always blocked.

### Fetch limits

To prevent runaway resolution of deeply nested or circular ref trees, the resolver enforces hard ceilings:

| Limit | Value |
|-------|-------|
| Max external hop depth | 5 levels |
| Max external files per spec | 20 files |
| Timeout per fetch | 5 seconds |
| Max file size | 2 MB |

Exceeding any limit causes just the affected ref to render the blocked indicator; the rest of the spec is unaffected. Fetched files are cached in memory for the page session, so each URL is fetched at most once.

See [External `$ref` Resolution](./external-refs.md) for the full configuration reference and troubleshooting.

## Summary

| Surface | Default posture | Control |
|---|---|---|
| Spec fetch | Single `GET` to the spec URL only | Pass a string/object to avoid any fetch |
| Try-It (direct) | Request from user's browser to target | `allowTryIt={false}` to disable |
| Try-It (proxy) | Request from your server; SSRF-guarded | `allowedDomains`, `rateLimitPerMinute`, `maxTimeout`, `maxBodySize` |
| External cross-origin `$ref` | Blocked | `externalRefOrigins` allow-list (with hard fetch limits) |
| Telemetry | None | — |

## See also

- [Backend Integration](./backend-integration.md) — proxy setup, endpoint contract, and non-Express implementations.
- [External `$ref` Resolution](./external-refs.md) — allow-list configuration, wildcard subdomains, and limits.
