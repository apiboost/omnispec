---
id: try-it
title: Try It & Code Samples
sidebar_label: Try It
description: Send live API requests from your docs with @apiboost/omnispec — direct or proxied, parameter input, file uploads, six-language code samples, and manual OAuth token paste. Interactive OAuth (PKCE) Get Token is an Apiboost OmniSpec Pro feature.
---

# Try It Now

The Try It feature allows users to send live API requests directly from the documentation. It supports all standard HTTP methods, parameter input, request body editing, and displays the response with syntax highlighting.

## Request Modes

Try It supports two modes for sending requests:

### Direct Mode (Default)

By default, requests are sent **directly from the browser** to the API server using `fetch`. This requires no additional configuration.

```tsx
<OpenApiSpec
  spec={specUrl}
  allowTryIt={true}  // default
/>
```

**When to use:** The target API supports CORS from your documentation domain, or the API is on the same origin.

**Limitations:** The browser enforces CORS policy. If the target API does not include the appropriate `Access-Control-Allow-Origin` headers, the request will fail. When this happens, the error message will suggest configuring a proxy.

### Proxy Mode

When a `proxyUrl` is provided, all Try It requests are routed through your backend proxy. The browser sends a `POST` to your proxy endpoint, which forwards the request to the target API and returns the response.

```tsx
<OpenApiSpec
  spec={specUrl}
  proxyUrl="/api/proxy"
/>
```

When proxy mode is active, a **"proxied"** badge appears next to the "Try it" heading.

**When to use:**
- The target API does not support CORS
- You need to audit or rate-limit test requests
- Auth flows require server-side secrets (e.g., OAuth2 client credentials)
- SOAP services (which almost never support CORS)

## Proxy Endpoint Contract

Your backend proxy must accept a `POST` request with a JSON body and return a JSON response:

### Request (from browser to proxy)

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

| Field | Type | Description |
|-------|------|-------------|
| `url` | `string` | Fully resolved target URL (path params substituted, query params appended) |
| `method` | `string` | HTTP method (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`) |
| `headers` | `Record<string, string>` | Headers to forward to the target API (includes auth headers) |
| `body` | `string \| null` | Request body (for POST/PUT/PATCH) |
| `bodyEncoding` | `"utf-8" \| "base64"` | Body encoding format. `base64` is used for `multipart/form-data` uploads — the browser serializes the real multipart payload (boundary included) and base64-encodes it; the proxy must decode it back to raw bytes before forwarding. The built-in `createProxyRouter` handles this automatically |
| `timeout` | `number` | Request timeout in milliseconds |

### Response (from proxy to browser)

```json
{
  "status": 200,
  "statusText": "OK",
  "headers": {
    "content-type": "application/json; charset=utf-8",
    "x-request-id": "abc-123"
  },
  "body": "{\"id\": 42, \"name\": \"John\"}",
  "bodyEncoding": "utf-8",
  "duration": 150
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | `number` | HTTP status code from the target API |
| `statusText` | `string` | HTTP status text |
| `headers` | `Record<string, string>` | Response headers from the target API |
| `body` | `string` | Response body |
| `bodyEncoding` | `"utf-8" \| "base64"` | `base64` when the upstream response is binary (PDF, images, zip, octet-stream, ...) — the proxy must read the body as bytes and base64-encode it. The built-in `createProxyRouter` does this automatically |
| `duration` | `number` | Time taken by the target API in milliseconds |

### Binary Responses

Binary response content types (PDF, images, audio/video, zip,
`application/octet-stream`, fonts, ...) are detected in both direct and proxy
modes. Instead of rendering mangled text, the response body tab shows the
content type and size with a **Download** button. The filename comes from the
`Content-Disposition` header when present, otherwise it is derived from the
content type (`response.pdf`, `response.png`, ...).

### Example Proxy Implementation (Node.js / Express)

```js
app.post('/api/proxy', async (req, res) => {
  const { url, method, headers, body, timeout } = req.body;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout || 30000);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body || undefined,
      signal: controller.signal,
    });

    const responseBody = await response.text();
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    res.json({
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: responseBody,
      bodyEncoding: 'utf-8',
      duration: Date.now() - startTime,
    });
  } catch (err) {
    res.status(502).json({
      status: 502,
      statusText: 'Bad Gateway',
      headers: {},
      body: err.message,
      bodyEncoding: 'utf-8',
      duration: 0,
    });
  } finally {
    clearTimeout(timeoutId);
  }
});
```

## File Uploads (multipart/form-data)

When an operation's request body is `multipart/form-data`, the body editor
renders one input per schema property instead of a raw JSON textarea:

- Properties with `type: string, format: binary` (OAS 3.0) or `contentEncoding`
  (OAS 3.1) become **file pickers**. Arrays of binary items count too.
- All other properties become text fields.
- Required properties are marked with `*`.

```yaml
requestBody:
  content:
    multipart/form-data:
      schema:
        type: object
        required: [file]
        properties:
          file:
            type: string
            format: binary
          description:
            type: string
```

On send, a real `FormData` payload is built. In **direct mode** the browser
sets the multipart boundary automatically. In **proxy mode** the multipart
payload is serialized and base64-encoded into the JSON envelope
(`bodyEncoding: "base64"`) and decoded back to bytes by the proxy before
forwarding — file content arrives at the target API byte-for-byte intact.

The generated cURL sample uses `-F` per form part (`-F 'file=@avatar.png'`).

### URL-encoded forms

`application/x-www-form-urlencoded` bodies get the same schema-driven form
treatment — one labeled text input per schema property (no file pickers). On
send, the fields are serialized as URL-encoded pairs. If the schema defines no
properties, the editor falls back to the JSON textarea and converts the JSON
object to URL-encoded pairs on send.

> Note: when using proxy mode with your own Express app, ensure your JSON body
> parser limit (`express.json({ limit })`) is large enough for base64-encoded
> uploads (~4/3 of the file size), and set the router's `maxBodySize`
> accordingly.

## Prefilling from Examples

Try It inputs are prefilled automatically from the spec:

- A parameter's `example` (singular) prefills its input.
- When a parameter defines multiple named `examples` (plural), an example
  selector appears in that parameter's documentation. Choosing an example
  prefills the corresponding Try It input with that example's value (unless you
  have already edited the field manually).
- Request body examples work the same way — a selector appears when more than
  one named example is defined.

```yaml
parameters:
  - name: status
    in: query
    schema:
      type: string
    examples:
      active:
        summary: Active items
        value: active
      archived:
        summary: Archived items
        value: archived
```

## Resizable Panel

On desktop, a drag handle sits between the operation documentation and the Try
It panel. Drag it to resize the panel — the width is clamped between 320px and
65% of the card and persisted in `localStorage`, so your preferred layout
sticks across operations and reloads.

## Array Parameters with Enums

Query parameters typed `array` whose `items` define an `enum` render as a
checkbox multi-select instead of a free-text input. Serialization follows the
OAS form-style defaults:

- `explode: true` (the default for query parameters) sends repeated pairs:
  `?status=available&status=pending`
- `explode: false` sends a single comma-joined value: `?status=available,pending`

## Required-Input Enforcement

The **Send** button is disabled — with an inline message explaining why —
while:

- any **required path or query parameter** is empty, or
- the operation requires authentication and **no security requirement group is
  satisfied** (e.g. a required API key has not been applied in the
  Authorization panel).

Root-level `security` from the spec applies to every operation unless the
operation declares its own `security` (an explicit empty array `security: []`
marks the operation as public).

## OAuth 2.0 Flows

For `oauth2` and `openIdConnect` security schemes, the Authorize panel always
displays the declared OAuth flow details (flow type, authorization/token URLs,
and scopes) and accepts a **manually pasted access token**, which is applied
as a `Bearer` Authorization header on Try-It requests. This works on every
tier and requires no extra configuration.

:::info[Pro]

The interactive **Get Token** flow — Authorization Code with PKCE (RFC 7636)
and Client Credentials — requires **[Apiboost OmniSpec Pro](https://apiboost.com/omnispec?utm_source=omnispec&utm_medium=docs&utm_campaign=pro)**.
Pro adds a **Get Token** button that runs the flow end to end (consent popup,
`state`/PKCE, code-for-token exchange) and applies the result automatically. In
the free core, the Authorize panel shows the same flow details and you paste an
access token obtained out of band.

:::

### OpenID Connect

An `openIdConnect` security scheme declares only a discovery URL
(`openIdConnectUrl`) rather than explicit flow URLs. OmniSpec fetches the
OpenID configuration from that URL and maps the discovered
`authorization_endpoint`, `token_endpoint`, and `scopes_supported` into the
OAuth2 flow model, so the panel renders identically to an equivalent `oauth2`
scheme:

```yaml
components:
  securitySchemes:
    oidc:
      type: openIdConnect
      openIdConnectUrl: https://idp.example.com/.well-known/openid-configuration
```

- **Free and Pro:** the discovered flow details plus manual access-token paste.
- **Discovery failure** (unreachable IdP, malformed document, or an endpoint on
  a disallowed origin) degrades gracefully to a themed error and manual token
  paste — the panel never breaks.

:::info[Pro]

The interactive **Get Token** flow over an OpenID Connect scheme (same
Authorization Code + PKCE flow as `oauth2`) requires
**[Apiboost OmniSpec Pro](https://apiboost.com/omnispec?utm_source=omnispec&utm_medium=docs&utm_campaign=pro)**. In the free core,
OpenID Connect schemes render the discovered flow details with manual token
paste.

:::

### Multi-environment token endpoints (relative flow URLs)

`tokenUrl`, `authorizationUrl`, and `refreshUrl` may be **relative**. A relative
flow URL resolves against the **currently selected server** (from the server
dropdown), so a single spec with several `servers` — e.g. local, staging,
production — sends the token request to whichever environment you pick:

```yaml
servers:
  - url: https://api.dev.example.com
  - url: https://api.example.com
components:
  securitySchemes:
    oauth2:
      type: oauth2
      flows:
        clientCredentials:
          tokenUrl: /oauth/token   # follows the selected server
          scopes: {}
```

**Absolute** flow URLs are used as-is and are never rebased — correct for a
central or third-party identity provider (Auth0, Okta, a separate Keycloak
host) whose token endpoint is not co-located with the API. If no `servers` are
declared, a relative flow URL resolves against the page origin (OpenAPI's
default server is `/`).

> Tip: an absolute `tokenUrl` pinned to one environment is a common cause of a
> **502** when testing another environment through the proxy — the proxy can't
> reach the pinned host. Use a relative `tokenUrl` so it follows the server.

### Templated token endpoints (`x-flowVariables`)

When the environment isn't distinguished by the server URL — for example a
third-party IdP whose host varies by environment (`https://{env}.auth.example.com`)
or a per-tenant token path — declare the [`x-flowVariables`](vendor-extensions.md)
extension on the flow. Each variable renders one control in the Authorize panel
(a dropdown when it lists an `enum`, otherwise a text input), placed just under
the **Token URL**, and its value substitutes into the `{name}` placeholders:

```yaml
components:
  securitySchemes:
    petstore_auth:
      type: oauth2
      flows:
        clientCredentials:
          tokenUrl: https://{env}.auth.example.com/oauth/token
          x-flowVariables:
            env:
              default: dev
              enum: [dev, staging, prod]
          scopes: {}
```

Substitution runs **before** the relative-URL resolution described above, so the
two compose: a templated *relative* URL like `/{tenant}/oauth/token` first has
`{tenant}` filled in, then resolves against the selected server. The displayed
Token URL reflects the substituted, resolved value, and your selection persists
across close/reopen. This is spec-authored behavior that works on every tier;
the interactive **Get Token** that consumes the resulting URL is a Pro feature
(see below).

### Interactive Get Token (Pro)

:::info[Pro]

The interactive **Get Token** flow requires
**[Apiboost OmniSpec Pro](https://apiboost.com/omnispec?utm_source=omnispec&utm_medium=docs&utm_campaign=pro)**. Pro runs the OAuth
exchange from inside the Authorize panel and adds the controls that drive it —
a client-authentication toggle (`client_secret_basic` vs `client_secret_post`),
per-scope selection checkboxes, Client Credentials support, and hardened flow
security (PKCE with `S256`, `state` validation, origin-locked callback
`postMessage`, ephemeral `sessionStorage` code verifier, and a secure-context
requirement). In the free core, the Authorize panel shows the same flow details
and accepts a manually pasted access token.

:::

## Multiple security schemes

When a spec declares more than one security scheme (e.g. an API key *and*
OAuth 2.0), the Authorize panel renders one **tab per scheme** instead of
stacking the forms — only the selected scheme's form is shown, which keeps a
tall OAuth block from crowding a short API-key input. A small dot on a tab
marks a scheme whose credentials have been applied, so you can see the
authorized state of schemes you aren't currently viewing (relevant when an
operation requires more than one). A spec with a single scheme skips the tab
bar and shows its form directly.

## Custom Headers

Use the **+ Add header** button in the Try It panel to attach arbitrary
request headers beyond the ones the spec defines (correlation IDs, feature
flags, tenant headers, etc.). Custom headers:

- are included in the sent request and in all generated code samples,
- override spec-defined headers of the same name,
- persist along with the rest of the Try It form state (see below).

## Input Persistence

Try It inputs survive navigation and page reloads:

- **Parameter values, request body, content type, and form fields** are saved
  to `localStorage`, namespaced per spec and operation
  (`omnispec:tryit:{title@version}:{METHOD path}`), and restored on mount.
  Restored values take precedence over spec examples.
- **Auth tokens** (API keys, bearer tokens, basic credentials) are saved to
  `sessionStorage` only — they survive reloads within the tab but are cleared
  when the browser session ends, and are never written to `localStorage`.
- Selected **files are never persisted**.

Each Try It panel has a **Reset** button that clears the saved entry for that
operation and restores the spec defaults.

### Expiration (`tryItPersistTtl`)

By default, persisted inputs never expire — they live until the browser's
storage is cleared. The `tryItPersistTtl` prop bounds their age in **seconds**:

```tsx
// Restored inputs older than 24 hours are discarded on load.
<OmniSpecRenderer spec={specUrl} tryItPersistTtl={86400} />

// 0 disables Try It input persistence entirely (no save, no restore).
<OmniSpecRenderer spec={specUrl} tryItPersistTtl={0} />
```

- Entries older than the TTL are removed from `localStorage` the next time the
  operation is opened.
- Saved entries carry a timestamp; entries written by versions prior to this
  feature have no timestamp and are treated as expired whenever a TTL is set.
- Auth credentials are unaffected — they always live in `sessionStorage` for
  the lifetime of the tab, regardless of this setting.

Web component consumers can set the same value via the `try-it-persist-ttl`
attribute: `<omnispec-renderer spec-url="..." try-it-persist-ttl="86400" />`.

## Disabling Try It

To completely disable the Try It feature:

```tsx
<OpenApiSpec
  spec={specUrl}
  allowTryIt={false}
/>
```

## Callbacks

You can listen to Try It requests and responses:

```tsx
<OpenApiSpec
  spec={specUrl}
  onTryItRequest={(request) => {
    console.log('Sending:', request.method, request.url);
  }}
  onTryItResponse={(response) => {
    console.log('Received:', response.status, response.duration + 'ms');
  }}
/>
```

## Props Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `allowTryIt` | `boolean` | `true` | Enable or disable the Try It panel |
| `proxyUrl` | `string` | `undefined` | Backend proxy URL. When set, requests route through the proxy instead of going directly to the API |
| `oauth` | `OAuthConfig` | `undefined` | **(Pro)** Configures the interactive OAuth 2.0 (PKCE) Get Token flow. Requires [Apiboost OmniSpec Pro](https://apiboost.com/omnispec?utm_source=omnispec&utm_medium=docs&utm_campaign=pro); the free core uses manual token paste |
| `onTryItRequest` | `(request: TryItRequest) => void` | — | Callback fired before a request is sent |
| `onTryItResponse` | `(response: TryItResponse) => void` | — | Callback fired after a response is received |

## Code Samples

Every operation automatically generates code snippets in 6 languages, displayed in a tabbed language selector below the Try It form:

| Language | Library/Pattern |
|----------|----------------|
| cURL | Standard curl command |
| JavaScript | `fetch()` API with async/await |
| Python | `requests` library |
| Go | `net/http` standard library |
| Java | `java.net.http.HttpClient` (Java 11+) |
| C# | `HttpClient` (.NET) |

Code samples automatically include:
- The selected server URL with interpolated variables
- Authentication headers from the Auth panel
- Path and query parameters from the parameter form
- Request body from the editor or schema-generated defaults

### Custom Code Samples (`x-codeSamples`)

:::info[Pro]

Overriding the auto-generated snippets with your own per-operation samples via
the `x-codeSamples` vendor extension requires
**[Apiboost OmniSpec Pro](https://apiboost.com/omnispec?utm_source=omnispec&utm_medium=docs&utm_campaign=pro)**. In the free core, the
six auto-generated language samples above are always shown.

:::

See the [Vendor Extensions](vendor-extensions.md) guide for details.

### SOAP Code Samples

SOAP operations also include multi-language code samples. The generated snippets include the full SOAP envelope as the request body and appropriate `Content-Type` and `SOAPAction` headers.

## Deep Linking

Operations, parameters, request bodies, and responses are deep-linkable via URL hash. Hovering over a section heading reveals a link icon — clicking it copies the deep link URL to the clipboard.

Hash format examples:
- `#listVersionsv2` — operation by operationId
- `#listVersionsv2-responses` — responses section
- `#listVersionsv2-parameters` — parameters section
- `#listVersionsv2-request-body` — request body section
- `#schemas` — schemas section
- `#schema-Pet` — individual schema

The page automatically scrolls to the matching element when loaded with a hash URL.
