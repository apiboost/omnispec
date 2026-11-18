---
id: backend-integration
title: Backend Integration
sidebar_label: Backend Integration
description: Serve API specs to @apiboost/omnispec and set up the optional Try-It proxy — the built-in Express middleware from @apiboost/omnispec/server, the proxy endpoint contract, and Node/PHP implementations.
---

# Backend Integration Guide

This guide covers how to serve API specifications to the renderer and set up the optional Try-It proxy.

## Serving Specs

The renderer fetches specs via URL. Your backend serves the raw spec file:

```
GET /api/specs/{id}/content
Content-Type: application/json   (or text/yaml, text/xml, text/plain)

Response: raw spec content
```

The renderer handles parsing. No pre-processing is needed on the backend.

### Spec Type Detection

The backend can optionally tag each spec with its type at upload time:

```json
{
  "specId": "abc-123",
  "specType": "openapi-3",
  "contentFormat": "yaml",
  "content": "https://storage.example.com/specs/abc-123.yaml"
}
```

If provided, pass `specType` to the renderer to skip auto-detection:

```tsx
import { SpecType } from '@apiboost/omnispec'

<OmniSpecRenderer spec={specUrl} specType={SpecType.OPENAPI_3} />
```

If not provided, the renderer auto-detects the type from the content.

### GraphQL Introspection Uploads (Pro)

:::info[Pro]

Rendering GraphQL schemas — whether from SDL or an introspection JSON result —
requires **[Apiboost OmniSpec Pro](https://apiboost.com/omnispec?utm_source=omnispec&utm_medium=docs&utm_campaign=pro)**. In the free
core, the renderer covers OpenAPI 2.0 / 3.0 / 3.1 and AsyncAPI 2 / 3. The
export guidance below applies when you serve GraphQL schemas to a Pro-enabled
renderer.

:::

When users upload a GraphQL schema as an introspection JSON result (instead of an SDL file), the fidelity of the rendered docs depends on how the export was generated. The `getIntrospectionQuery()` defaults omit the schema description, `@specifiedBy` URLs on custom scalars, and argument/input-field deprecation — the renderer displays those when present, but cannot recover what the export left out.

Recommend that API producers export with the full-fidelity options so the introspection result renders identically to its SDL:

```ts
import { buildSchema, graphqlSync, getIntrospectionQuery } from 'graphql'

const result = graphqlSync({
  schema,
  source: getIntrospectionQuery({
    specifiedByUrl: true,
    schemaDescription: true,
    inputValueDeprecation: true,
    directiveIsRepeatable: true,
  }),
})
```

Both the wrapped response shape (`{ "data": { "__schema": ... } }`) and the raw result (`{ "__schema": ... }`) are accepted.

## Try-It Proxy

By default, Try-It sends requests directly from the browser. For APIs that don't support CORS, configure a backend proxy.

### Recommended: Built-in Express Middleware

The package ships a ready-to-use proxy router at `@apiboost/omnispec/server`:

```js
import express from 'express'
import { createProxyRouter } from '@apiboost/omnispec/server'

const app = express()

// Behind a reverse proxy / load balancer / CDN, tell Express how many hops to
// trust so req.ip is the real client (see "Rate limiting behind a reverse
// proxy" below).
app.set('trust proxy', 1)

// Mount the proxy BEFORE any global body parser. The router parses its own
// JSON envelope with a limit sized for maxBodySize; a global express.json()
// that runs first applies its own limit (100 KB by default) instead.
app.use('/api/proxy', createProxyRouter({
  rateLimitPerMinute: 60,       // per-client rate limit (default 60)
  maxTimeout: 30000,            // max request timeout in ms (default 30s)
  maxBodySize: 1048576,         // max forwarded request / upstream response body, bytes (default 1MB)
  allowedDomains: [],           // empty = allow all external domains
  onRequest: (audit) => {       // optional audit/logging callback
    // { targetUrl, method, statusCode, duration, timestamp, ip }
  },
}))

app.use(express.json())         // the rest of your app
```

The built-in proxy includes:
- **SSRF protection** — blocks private, loopback, link-local, CGNAT, multicast and other reserved addresses, in any spelling (`2130706433`, `0x7f.1`, `[::ffff:127.0.0.1]`, `localhost.`), **after DNS resolution**, with the connection pinned to the validated address
- **No redirect following** — a `3xx` is returned to the browser as-is (opt in with `maxRedirects`)
- **Header filtering** — hop-by-hop headers, `Host` and `Content-Length` are never relayed; invalid headers are rejected
- **Rate limiting** — configurable per-client limit via `express-rate-limit` (falls back to an in-memory limiter if not installed)
- **Timeout enforcement** — caps at `maxTimeout`, prevents slow-loris
- **Body size limits** — rejects oversized request and response bodies
- **Domain allowlisting** — optional restriction to specific target domains

See the [Security Model](./security.md#the-built-in-proxy) for how each protection works.

### Proxy options

| Option | Type | Default | Description |
|---|---|---|---|
| `rateLimitPerMinute` | `number` | `60` | Requests per minute per client key. |
| `keyGenerator` | `(req) => string` | `req.ip` | Rate-limit key. Use a user/session id or an edge-supplied client IP when `trust proxy` can't identify clients. |
| `logger` | `{ warn(msg) }` | `console` | Receives one-time configuration warnings (e.g. `trust proxy` missing). |
| `maxTimeout` | `number` | `30000` | Upper bound (ms) on each proxied request; the envelope's `timeout` can only lower it. |
| `maxBodySize` | `number` | `1048576` | Max bytes of the forwarded request body (after base64 decoding) **and** of the upstream response body (after decompression). Over-limit requests get `413`, over-limit responses `502`. |
| `maxEnvelopeSize` | `number` | `2 × maxBodySize + 64 KiB` | Max bytes of the JSON envelope the router parses. Sized for base64 uploads (~4/3) and escaped XML/JSON. |
| `allowedDomains` | `string[]` | `[]` | Target host allow-list (exact host or any subdomain). Empty allows any public host. |
| `maxRedirects` | `number` | `0` | Upstream redirects to follow. `0` returns the `3xx` to the browser. When > 0, every hop is re-validated (SSRF guard, DNS check, `allowedDomains`) and a cross-origin hop forwards only `Accept`, `Accept-Language`, `Content-Language`, `Content-Type` and `User-Agent`. |
| `dnsLookup` | `(hostname) => Promise<{ address, family }[]>` | OS resolver | Custom DNS resolver. Every address it returns is still validated. |
| `onRequest` | `(audit) => void` | — | Audit callback after each proxied request. |

### Request body size (SOAP envelopes, uploads)

The router parses the browser's JSON envelope itself, with `maxEnvelopeSize`
as the limit, so you don't need `express.json()` for it. If your app installs
a **global** `express.json()` before the proxy route, that parser runs first
and its `limit` (100 KB by default) caps every Try-It request: large SOAP
envelopes and file uploads fail with `413` before the proxy sees them. Either
mount the proxy before the global parser (as above), or raise that parser's
limit to at least `maxEnvelopeSize`.

Raise `maxBodySize` for larger payloads; `maxEnvelopeSize` follows it
automatically unless you set it explicitly.

### Rate limiting behind a reverse proxy

The limit is keyed on `req.ip`. Behind a reverse proxy, load balancer or CDN,
`req.ip` is the proxy's address unless the host app sets Express's
[`trust proxy`](https://expressjs.com/en/guide/behind-proxies.html), so every
user shares one bucket and a single busy user throttles everyone. The router
can't change your app's settings, so:

- Set `app.set('trust proxy', <number of hops>)` (or the proxy's subnets), not
  `true`, which lets clients spoof `X-Forwarded-For` and rotate their key.
- Or pass `keyGenerator` to key on something your app already trusts, such as
  an authenticated user id.

When a request arrives with `X-Forwarded-For` while `trust proxy` is off and no
`keyGenerator` is set, the router logs a one-time warning through `logger`.

Then pass `proxyUrl` to the renderer:

```tsx
<OmniSpecRenderer spec={specUrl} proxyUrl="/api/proxy" />
```

### OAuth Callback Route (Pro)

:::info[Pro]

The interactive OAuth 2.0 Authorization Code + PKCE **Get Token** flow — and the
same-origin callback route it needs — are part of
**[Apiboost OmniSpec Pro](https://apiboost.com/omnispec?utm_source=omnispec&utm_medium=docs&utm_campaign=pro)**. The free core does
**not** ship an OAuth callback route, page, or component.

:::

In the free core, the Try-It Authorize panel shows the OAuth flow details and
accepts a **manually pasted access token**, so no callback route is required —
the proxy above is all the backend you need.

If you enable Pro, follow the Pro documentation for wiring the callback route and
registering its redirect URI with your identity provider. See the
[Try It guide](./try-it.md#oauth-20-flows) for the flow details and how the free
tier's manual token paste works.

### Custom Implementation

If you're not using Express (e.g., PHP, Go, or another framework), implement the proxy contract below.

### Proxy Endpoint Contract

Your backend must accept a `POST` with JSON body and return a JSON response.

**Request** (browser to your proxy):

```
POST /api/proxy
Content-Type: application/json
```

```json
{
  "url": "https://api.example.com/v1/users/42",
  "method": "GET",
  "headers": {
    "Authorization": "Bearer token123",
    "Accept": "application/json"
  },
  "body": null,
  "bodyEncoding": "utf-8",
  "timeout": 30000
}
```

**Response** (your proxy to browser):

```json
{
  "status": 200,
  "statusText": "OK",
  "headers": {
    "content-type": "application/json; charset=utf-8"
  },
  "body": "{\"id\": 42, \"name\": \"John\"}",
  "bodyEncoding": "utf-8",
  "duration": 150
}
```

### Field Reference

**Request fields:**

| Field | Type | Description |
|-------|------|-------------|
| `url` | `string` | Fully resolved target URL |
| `method` | `string` | HTTP method (GET, POST, PUT, DELETE, PATCH) |
| `headers` | `Record<string, string>` | Headers to forward (includes auth headers) |
| `body` | `string \| null` | Request body for POST/PUT/PATCH |
| `bodyEncoding` | `'utf-8' \| 'base64'` | Body encoding |
| `timeout` | `number` | Timeout in milliseconds |

**Response fields:**

| Field | Type | Description |
|-------|------|-------------|
| `status` | `number` | HTTP status code |
| `statusText` | `string` | HTTP status text |
| `headers` | `Record<string, string>` | Response headers |
| `body` | `string` | Response body |
| `bodyEncoding` | `'utf-8' \| 'base64'` | Body encoding |
| `duration` | `number` | Time in milliseconds |

### Example: Node.js / Express

A minimal sketch of the contract, without the protections the built-in router
adds — see [Security Considerations](#security-considerations) before exposing it.

```javascript
const express = require('express')
const app = express()

app.use(express.json())

app.post('/api/proxy', async (req, res) => {
  const { url, method, headers, body, timeout } = req.body
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout || 30000)
  const startTime = Date.now()

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body || undefined,
      signal: controller.signal,
      redirect: 'manual', // never follow redirects: return the 3xx to the browser
    })

    const responseBody = await response.text()
    const responseHeaders = {}
    response.headers.forEach((value, key) => { responseHeaders[key] = value })

    res.json({
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: responseBody,
      bodyEncoding: 'utf-8',
      duration: Date.now() - startTime,
    })
  } catch (err) {
    res.status(502).json({
      status: 502,
      statusText: 'Bad Gateway',
      headers: {},
      body: err.message,
      bodyEncoding: 'utf-8',
      duration: Date.now() - startTime,
    })
  } finally {
    clearTimeout(timeoutId)
  }
})
```

### Example: PHP / Laravel

```php
Route::post('/api/proxy', function (Request $request) {
    $validated = $request->validate([
        'url' => 'required|url',
        'method' => 'required|string',
        'headers' => 'array',
        'body' => 'nullable|string',
        'timeout' => 'integer',
    ]);

    $startTime = microtime(true);

    $response = Http::withHeaders($validated['headers'] ?? [])
        ->timeout(($validated['timeout'] ?? 30000) / 1000)
        ->send($validated['method'], $validated['url'], [
            'body' => $validated['body'] ?? null,
        ]);

    $duration = (microtime(true) - $startTime) * 1000;

    return response()->json([
        'status' => $response->status(),
        'statusText' => $response->reason(),
        'headers' => $response->headers(),
        'body' => $response->body(),
        'bodyEncoding' => 'utf-8',
        'duration' => round($duration),
    ]);
});
```

## SOAP Proxy Notes

SOAP services almost never support browser CORS. The proxy is effectively required for SOAP Try-It. The renderer sends:

```json
{
  "url": "http://example.com/calculator/soap",
  "method": "POST",
  "headers": {
    "Content-Type": "text/xml; charset=utf-8",
    "SOAPAction": "\"http://example.com/calculator/Add\""
  },
  "body": "<?xml version=\"1.0\"?>..."
}
```

## Security Considerations

If you implement the proxy yourself, mirror what the built-in router does:

- Validate the `url` field to prevent SSRF attacks: allow only `http`/`https`, restrict to allowed domains, and block private/reserved IPs **after resolving DNS**, connecting to the address you validated (not re-resolving), so DNS rebinding can't slip through
- Don't follow redirects automatically; if you must, re-validate every hop and drop credential headers when the origin changes
- Apply rate limiting to the proxy endpoint, keyed on the real client (configure your framework's trusted-proxy setting)
- Forward only the envelope's `headers`, never the headers or cookies the browser sent to your proxy route; drop hop-by-hop headers and set `Host`/`Content-Length` yourself
- Log proxy requests for audit purposes
- Consider restricting HTTP methods (e.g., block DELETE in read-only environments)
