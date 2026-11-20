---
title: Security Model
sidebar_position: 9
---

# Security Model

This page consolidates the security posture of the free core, `@apiboost/omnispec`. It covers what network activity the renderer performs, the trust model for Try-It (direct vs. proxied), the built-in proxy's SSRF and abuse protections, and the controls around external `$ref` resolution.

## What the renderer touches

The renderer is a client-side rendering engine. In the browser it makes **no network calls of its own** except:

1. **Fetching the spec** — when you pass a URL to the `spec` prop, the renderer performs a single `GET` to load it. If you pass a raw string or a pre-parsed object, no fetch occurs.
2. **Resolving external `$ref`** — only for cross-origin refs you have explicitly allow-listed (see below). Same-origin refs are fetched from the base origin: the spec URL's origin, or the page origin for a string or object spec.
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

app.set('trust proxy', 1) // when behind a reverse proxy / load balancer
app.use('/api/proxy', createProxyRouter({
  rateLimitPerMinute: 60,   // per-client rate limit (default 60)
  maxTimeout: 30000,        // max request timeout in ms (default 30s)
  maxBodySize: 1048576,     // max request/response body in bytes (default 1MB)
  allowedDomains: [],       // empty = allow all external domains
  maxRedirects: 0,          // default: never follow upstream redirects
  onRequest: (audit) => {   // optional audit callback
    // { targetUrl, method, statusCode, duration, timestamp, ip }
  },
}))
```

All options are listed in [Backend Integration](./backend-integration.md#proxy-options). It provides the following protections out of the box:

### SSRF protection

The proxy refuses to connect to private and internal network addresses, regardless of what URL the browser submits. Checks happen in two steps:

1. **Before any network activity**, the target must be `http`/`https`, and the hostname must not be `localhost`, `*.localhost` or a blocked IP literal. Hostnames are canonicalized the way the URL parser does first, so alternative spellings — `2130706433`, `0177.0.0.1`, `0x7f.1`, `[::ffff:127.0.0.1]`, `localhost.` — are caught.
2. **At connect time**, the hostname is resolved once and **every** resolved address is checked. If any of them is blocked the request fails with `403`. The socket then connects to the validated address itself; the name is never resolved a second time, so a DNS rebind between check and connect can't redirect it. TLS SNI and the `Host` header still use the original hostname.

Blocked ranges (from the IANA special-purpose registries):

- **Loopback / unspecified** — `127.0.0.0/8`, `0.0.0.0/8`, `::1`, `::`, `localhost`
- **RFC 1918 private ranges** — `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`
- **Link-local and cloud metadata** — `169.254.0.0/16` (incl. `169.254.169.254`), `fe80::/10`
- **IPv6 unique-local** — `fc00::/7` (incl. AWS `fd00:ec2::254`), and deprecated site-local `fec0::/10`
- **Carrier-grade NAT** — `100.64.0.0/10`
- **Documentation, benchmarking and protocol ranges** — `192.0.0.0/24`, `192.0.2.0/24`, `198.18.0.0/15`, `198.51.100.0/24`, `203.0.113.0/24`, `2001:db8::/32`, `2001::/23`, `100::/64`
- **Multicast, reserved and broadcast** — `224.0.0.0/4`, `240.0.0.0/4`, `ff00::/8`
- **Addresses that embed IPv4** — IPv4-mapped `::ffff:0:0/96` (checked against the IPv4 list), NAT64 `64:ff9b::/96` and `64:ff9b:1::/48`, 6to4 `2002::/16`, relay `192.88.99.0/24`

This stops a Try-It form from being used to probe your internal network via the proxy. The same checks are exported as `isPrivateIp()` (hostname, pre-DNS) and `isBlockedAddress()` (resolved IP) from `@apiboost/omnispec/server`.

### Redirects

By default the proxy **does not follow redirects**. A `3xx` response, with its `Location` header, goes back to the browser as-is. Following redirects server-side would let any allowed host bounce the request, with its API-key headers, to an address the checks never saw, such as the metadata service.

If your APIs legitimately redirect, set `maxRedirects` to a small number. Each hop is then re-validated exactly like the original target (scheme, IP literal, `allowedDomains`, resolved-address check and pinning). A hop to a **different origin** forwards only `Accept`, `Accept-Language`, `Content-Language`, `Content-Type` and `User-Agent`. `Authorization`, `Cookie` and any custom API-key header are dropped, because the proxy can't tell which custom headers carry credentials. `303` (and `301`/`302` after a `POST`) switch to `GET` without a body, as browsers do.

### Header handling

Only the `headers` inside the Try-It JSON envelope are forwarded. The headers and cookies the browser sends to your proxy route, such as your portal's own session cookie, never reach the target API. From the envelope headers, the proxy:

- forwards `Cookie`, because it carries `in: cookie` API keys, which only a proxy can deliver (browsers forbid scripts from setting it);
- drops hop-by-hop headers (`Connection` and the headers it lists, `Keep-Alive`, `Proxy-Authorization`, `Proxy-Connection`, `TE`, `Trailer`, `Transfer-Encoding`, `Upgrade`);
- sets `Host` and `Content-Length` itself from the target URL and the actual body;
- rejects invalid header names or values (including CR/LF injection) with `400`.

Hop-by-hop headers are also removed from the response envelope.

### Rate limiting

A per-client limit (default **60 requests/minute**) throttles abuse. When [`express-rate-limit`](https://www.npmjs.com/package/express-rate-limit) is installed it is used; otherwise the middleware falls back to an in-memory limiter.

Clients are keyed by `req.ip`. **Behind a reverse proxy, load balancer or CDN you must set Express's `trust proxy`** in the host app (e.g. `app.set('trust proxy', 1)`). Otherwise `req.ip` is the proxy's address and all users share one bucket. Alternatively, pass a `keyGenerator(req)` that returns a key your app trusts (for example an authenticated user id). If a request carries `X-Forwarded-For` while `trust proxy` is off, the router logs a one-time warning. See [Rate limiting behind a reverse proxy](./backend-integration.md#rate-limiting-behind-a-reverse-proxy).

### Timeout and body-size enforcement

Requests are capped at `maxTimeout` (default 30s), preventing slow-loris style hangs. `maxBodySize` (default 1 MB) applies to the request body actually forwarded (after base64 decoding; over-limit gets `413`) and to the upstream response body after decompression (over-limit gets `502`, and the download stops at the limit, so compression bombs can't exhaust memory).

The router parses its own JSON envelope, limited by `maxEnvelopeSize` (default `2 × maxBodySize + 64 KiB`). If your app installs a global `express.json()` *before* the proxy route, that parser's limit applies first. See [Request body size](./backend-integration.md#request-body-size-soap-envelopes-uploads).

### Domain allow-listing

Set `allowedDomains` to a non-empty array to restrict the proxy to specific target hosts (an exact host or any of its subdomains). Left empty, the proxy allows any external (non-private) domain; SSRF protection still applies. For a public docs site that only ever calls your own APIs, allow-listing narrows the blast radius. Allow-listing a host doesn't exempt it from the SSRF checks: an allowed name that resolves to a private address is still blocked.

### Audit logging

The optional `onRequest` callback receives an audit record (`targetUrl`, `method`, `statusCode`, `duration`, `timestamp`, `ip`) for every proxied request — wire it into your logging/SIEM pipeline.

:::tip
If you implement the proxy yourself in another language (PHP, Go, etc.), you own these protections. At minimum: validate the `url` against an allow-list, block private IP ranges *after* DNS resolution and connect to the address you checked, don't follow redirects, rate-limit the endpoint per real client, enforce timeouts and body-size caps, and avoid forwarding sensitive internal headers. See [Backend Integration](./backend-integration.md#security-considerations).
:::

## External `$ref` resolution

Specs split across multiple files reference each other with `$ref`. The renderer resolves these with the same security-first posture as the proxy.

The checks apply however the spec is provided (URL, string or object).

- **Same-origin refs** (relative paths, or absolute URLs on the base origin) resolve automatically. The base origin is the spec URL's origin; for a string or object spec it is `window.location.origin` in a browser. Without `window` (SSR / Node) there is no base origin: relative refs cannot be resolved and absolute refs must be allow-listed.
- **Cross-origin refs** are **blocked by default**. To allow them, list the permitted origins in `externalRefOrigins`. Entries and ref URLs are both normalized with the WHATWG URL parser to `scheme://host[:port]` (lowercased, IDN hosts in punycode, default port and trailing slash dropped), then matched **exactly** — the scheme and any non-default port must agree. Entries that are not bare http(s) origins (a path, query, fragment, credentials, or wildcard) are ignored with a single console warning; wildcard subdomains such as `https://*.example.com` are not supported and never match. Anything not on the list renders a structured "unavailable" indicator instead of the schema — nothing is thrown, and the rest of the document renders normally.

```tsx
<OmniSpecRenderer
  spec="https://docs.example.com/openapi.yaml"
  externalRefOrigins={['https://schemas.example.com', 'https://cdn.trusted.io']}
/>
```

### SSRF protection for refs

Ref resolution blocks absolute refs whose host is `localhost`, `*.localhost` or a private or reserved IP literal, even when the origin is allow-listed. It uses the proxy's pre-DNS `isPrivateIp()` check, so the same ranges and alternative IP spellings are covered. The base origin itself is exempt, so a portal served from `localhost` or an intranet address can still use same-origin refs.

Unlike the proxy, ref resolution runs in the browser and **cannot resolve DNS**. A public hostname that resolves to a private address (including through DNS rebinding) is not caught, so only allow-list origins you trust.

:::caution[Behavior change]
Earlier versions skipped these checks for specs passed as a string or object. Integrators who relied on unchecked cross-origin refs in such specs must now list those origins in `externalRefOrigins`; the blocked indicator names the origin to add.
:::

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
| Try-It (proxy) | Request from your server; SSRF-guarded | `allowedDomains`, `rateLimitPerMinute`, `keyGenerator`, `maxTimeout`, `maxBodySize`, `maxEnvelopeSize`, `maxRedirects` |
| External cross-origin `$ref` | Blocked, for URL, string and object specs | `externalRefOrigins` allow-list (with hard fetch limits) |
| Telemetry | None | — |

## See also

- [Backend Integration](./backend-integration.md) — proxy setup, endpoint contract, and non-Express implementations.
- [External `$ref` Resolution](./external-refs.md) — allow-list configuration (exact origins only, no wildcard subdomains) and limits.
