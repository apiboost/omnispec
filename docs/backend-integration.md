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
requires **[Apiboost OmniSpec Pro](https://www.apiboost.com)**. In the free
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
app.use(express.json())
app.use('/api/proxy', createProxyRouter({
  rateLimitPerMinute: 60,       // per-IP rate limit (default 60)
  maxTimeout: 30000,            // max request timeout in ms (default 30s)
  maxBodySize: 1048576,         // max body size in bytes (default 1MB)
  allowedDomains: [],           // empty = allow all external domains
  onRequest: (audit) => {       // optional audit/logging callback
    // { targetUrl, method, statusCode, duration, timestamp, ip }
  },
}))
```

The built-in proxy includes:
- **SSRF protection** — blocks requests to private IPs (127.0.0.1, 10.x, 172.16-31.x, 192.168.x, ::1, fc00::/7)
- **Rate limiting** — configurable per-IP limit via `express-rate-limit` (falls back to in-memory limiter if not installed)
- **Timeout enforcement** — caps at `maxTimeout`, prevents slow-loris
- **Body size limits** — rejects oversized request and response bodies
- **Domain allowlisting** — optional restriction to specific target domains

Then pass `proxyUrl` to the renderer:

```tsx
<OmniSpecRenderer spec={specUrl} proxyUrl="/api/proxy" />
```

### OAuth Callback Route

:::info[Pro]

The interactive OAuth 2.0 Authorization Code + PKCE **Get Token** flow that
uses this callback requires **[Apiboost OmniSpec Pro](https://www.apiboost.com)**.
In the free core, the Try-It Authorize panel shows the OAuth flow details and
accepts a manually pasted access token — no callback route is needed.

:::

When you run the Pro interactive Get Token flow, the OAuth popup must land on a
callback page served from the **same origin** as your docs page. The free
package ships that page, so the hosting is a plain-Node concern you can set up
ahead of enabling Pro. Mount it next to the proxy:

```js
import { createOAuthCallbackRoute } from '@apiboost/omnispec/server'

app.get('/oauth2-redirect.html', createOAuthCallbackRoute())
```

Register that URL (e.g. `https://portal.example.com/oauth2-redirect.html`)
as an allowed redirect URI with your identity provider.

Alternatively, serve the page without Express: copy
`node_modules/@apiboost/omnispec/oauth2-redirect.html` into your static
hosting, or render the `OAuthCallback` React component (exported from
`@apiboost/omnispec`) on an SPA route.

See the [Try It guide](./try-it.md#oauth-20-flows) for the flow details and
how the free tier's manual token paste works.

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

- Validate the `url` field to prevent SSRF attacks (restrict to allowed domains/IPs)
- Apply rate limiting to the proxy endpoint
- Do not forward sensitive internal headers
- Log proxy requests for audit purposes
- Consider restricting HTTP methods (e.g., block DELETE in read-only environments)
