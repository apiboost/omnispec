# Vendor Extensions (x- Properties)

`@apiboost/omnispec` supports a range of OpenAPI vendor extensions (`x-` properties) for enhanced documentation rendering. These extensions are compatible with specs authored for Redocly/Redoc, Scalar, and RapiDoc — meaning migration requires zero spec changes.

## Supported Extensions

### `x-codeSamples` / `x-code-samples`

**Placement:** Operation object
**Compatibility:** Redocly, Scalar, RapiDoc

Adds custom code samples to an operation. When present, custom samples override auto-generated code for matching languages. Languages without a custom sample still show auto-generated code.

```yaml
paths:
  /pets:
    get:
      summary: List pets
      x-codeSamples:
        - lang: JavaScript
          label: Node.js SDK
          source: |
            const pets = await client.pets.list();
            console.log(pets);
        - lang: Python
          source: |
            import requests
            response = requests.get('https://api.example.com/pets')
            print(response.json())
        - lang: cURL
          source: |
            curl -X GET https://api.example.com/pets \
              -H "Authorization: Bearer $TOKEN"
```

Each sample requires:
- `lang` (string, required) — language identifier, matched case-insensitively against the language selector
- `label` (string, optional) — display label in the language selector
- `source` (string, required) — the code snippet

---

### `x-tagGroups`

**Placement:** Root object
**Compatibility:** Redocly, Scalar

Groups tags into higher-level categories in the sidebar navigation. Tags not assigned to any group are hidden from the sidebar.

```yaml
x-tagGroups:
  - name: User Management
    tags:
      - Users
      - API Keys
      - Admin
  - name: Analytics
    tags:
      - Reports
      - Dashboards
```

When `x-tagGroups` is present, the sidebar renders as:

```
User Management
  Users
    GET /users
    POST /users
  API Keys
    GET /keys
Analytics
  Reports
    GET /reports
```

Without `x-tagGroups`, tags are listed flat in the sidebar.

---

### `x-displayName`

**Placement:** Tag object
**Compatibility:** Redocly, Scalar

Overrides the tag's `name` with a human-friendly display name in the sidebar and section headings. Useful when tag names are machine-readable identifiers.

```yaml
tags:
  - name: usr_mgmt_v2
    description: User management operations
    x-displayName: User Management
  - name: analytics_api
    x-displayName: Analytics
```

The `name` is still used for `x-tagGroups` references and anchor IDs. Only the displayed label changes.

---

### `x-badges`

**Placement:** Operation object
**Compatibility:** Redocly, Scalar, RapiDoc

Adds color-coded label badges to operation headers in the endpoint card.

```yaml
paths:
  /experimental/forecast:
    get:
      summary: Get weather forecast
      x-badges:
        - name: Beta
          color: blue
        - name: Rate Limited
          color: orange
          position: after
```

Each badge supports:
- `name` (string, required) — badge label text
- `color` (string, optional) — CSS color value (hex, named, or CSS variable). Defaults to the theme's tertiary background.
- `position` (string, optional) — `"before"` (before the title) or `"after"` (after the title, default)

---

### `x-internal`

**Placement:** Operation object or Tag object
**Compatibility:** Stoplight Elements, Scalar (as `x-scalar-ignore`)

Hides operations or entire tags from the rendered documentation. Useful for internal endpoints that shouldn't appear in public-facing docs.

```yaml
paths:
  /internal/debug:
    get:
      summary: Debug endpoint
      x-internal: true

tags:
  - name: Internal
    x-internal: true
```

Operations with `x-internal: true` are filtered out during parsing. Tags with `x-internal: true` are excluded entirely, including all their operations.

---

### `x-enumDescriptions` / `x-enum-descriptions`

**Placement:** Schema object (alongside `enum`)
**Compatibility:** Redocly, Scalar

Provides human-readable descriptions for each enum value. Rendered as a labeled list below the property, replacing the inline `[value1 | value2]` display.

```yaml
components:
  schemas:
    TicketType:
      type: string
      enum:
        - event
        - general
        - vip
      x-enumDescriptions:
        event: Event tickets with timed entry
        general: General admission
        vip: VIP access with backstage pass
```

Both `x-enumDescriptions` (camelCase) and `x-enum-descriptions` (kebab-case) are supported.

---

### `x-logo`

**Placement:** Info object
**Compatibility:** Redocly

Displays an API logo in the sidebar header. When no custom `sidebarHeader` slot is provided, the logo is auto-populated from this extension.

```yaml
info:
  title: Petstore API
  version: 1.0.0
  x-logo:
    url: "https://example.com/logo.png"
    backgroundColor: "#FFFFFF"
    altText: "Petstore logo"
    href: "https://example.com"
```

Properties:
- `url` (string, required) — absolute URL to the logo image
- `backgroundColor` (string, optional) — hex color for the logo background
- `altText` (string, optional) — alt text for the image (defaults to "Logo")
- `href` (string, optional) — link URL when the logo is clicked

If a `sidebarHeader` slot is provided via props, it takes precedence over `x-logo`.

### `x-tokenEndpointAuthMethod`

**Placement:** OAuth2 security scheme (OpenAPI 3.x `components.securitySchemes.<name>`)
**Tier:** Free

Presets the **Client authentication** method the Try-It Authorize panel uses when a confidential client exchanges credentials at the OAuth 2.0 token endpoint (RFC 6749 §2.3.1). It maps to the toggle described in [Try It — Client authentication method](try-it.md#client-authentication-method-authorization-header-vs-request-body):

| Value | Toggle preselection | Behavior |
|-------|---------------------|----------|
| `client_secret_basic` | Authorization Header | Credentials in an `Authorization: Basic base64(id:secret)` header |
| `client_secret_post` | Request Body | `client_id` / `client_secret` as form-body fields |

```yaml
components:
  securitySchemes:
    petstore_auth:
      type: oauth2
      x-tokenEndpointAuthMethod: client_secret_basic
      flows:
        clientCredentials:
          tokenUrl: https://auth.example.com/token
          scopes:
            read:pets: Read pets
```

When the extension is absent, the toggle defaults to **Authorization Header** (`client_secret_basic`). The user can still change the method in the panel; a user's choice persists across close/reopen and takes precedence over this preset. Any value other than the two above is ignored (the default applies).

---

### `x-flowVariables`

**Placement:** OAuth2 flow object (OpenAPI 3.x `components.securitySchemes.<name>.flows.<flow>`)
**Tier:** Free

Templates an OAuth flow's `tokenUrl`, `authorizationUrl`, and `refreshUrl` with named variables — the same `{name}` templating that OpenAPI [Server Variables](https://spec.openapis.org/oas/v3.1.0#server-variable-object) use for the server `url`. This lets a single spec Try-It OAuth against multiple environments, tenants, or a third-party identity provider, without duplicating the security scheme per environment.

Each variable declares a `default`, an optional `enum` of allowed values (rendered as a dropdown; free text otherwise), and an optional `description`:

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
              description: Environment
          scopes: {}
```

In the Try-It Authorize panel, each variable renders one control (a `<select>` when `enum` is present, else a text input), placed with the flow details just under the **Token URL**. The variable value substitutes into the `{name}` placeholders, and the displayed Token URL updates live. A chosen value persists across close/reopen alongside the other OAuth settings.

**Composes with relative URLs.** Substitution happens *before* the flow URL is resolved against the [selected server](try-it.md), so a relative templated URL combines both steps:

```yaml
        authorizationCode:
          authorizationUrl: https://{env}.auth.example.com/authorize
          # Relative + templated: {tenant} substitutes, then the result
          # resolves against the currently selected server.
          tokenUrl: /{tenant}/oauth/token
          x-flowVariables:
            tenant: { default: acme, description: Tenant slug }
          scopes: {}
```

> **Why an OmniSpec extension?** The OpenAPI Specification does not (through 3.1) allow variables in OAuth flow URLs — the long-standing request [OAI/OpenAPI-Specification#551](https://github.com/OAI/OpenAPI-Specification/issues/551) is deferred to a future major version (OAS 4 / "Moonwalk"). `x-flowVariables` fills that gap today. It is safely ignored by tools that don't understand it — they simply see the literal `{name}` URL.

---

## Auto-Generated Code Samples

In addition to `x-codeSamples`, the renderer automatically generates code snippets in 6 languages for every operation:

| Language | Library/Pattern |
|----------|----------------|
| cURL | Standard curl command |
| JavaScript | `fetch()` API with async/await |
| Python | `requests` library |
| Go | `net/http` standard library |
| Java | `java.net.http.HttpClient` (Java 11+) |
| C# | `HttpClient` (.NET) |

Auto-generated samples respect:
- Server URL selection and variable interpolation
- Authentication headers configured in the Auth panel
- Request body from the schema or user input
- Path and query parameters

Custom `x-codeSamples` override auto-generated snippets for matching languages. Unmatched languages fall back to auto-generation.

---

## Extension Priority

When multiple code sample extensions are present, they are evaluated in this order:

1. `x-codeSamples` (Redocly standard)
2. `x-code-samples` (hyphenated variant)

The first match wins for each language.

---

## Spec Type Support

Vendor extensions are supported across both OpenAPI and AsyncAPI specifications:

| Extension | OpenAPI 2.x/3.x | AsyncAPI 2.x/3.x |
|-----------|-----------------|-------------------|
| `x-codeSamples` | Yes | No (no HTTP requests) |
| `x-tagGroups` | Yes | Yes |
| `x-displayName` | Yes (tags) | Yes (tags) |
| `x-badges` | Yes (operations) | Yes (operations) |
| `x-internal` | Yes (operations, tags) | Yes (operations, channels, tags) |
| `x-enumDescriptions` | Yes (schemas) | Yes (schemas) |
| `x-logo` | Yes (info) | Yes (info) |
| `x-tokenEndpointAuthMethod` | Yes (OAuth2 scheme) | No (no HTTP token exchange) |
| `x-flowVariables` | Yes (OAuth2 flow) | No (no HTTP token exchange) |

AsyncAPI channels and operations support `x-internal` for filtering. Tags support `x-displayName` and `x-internal`. Schema extensions (`x-enumDescriptions`) work identically since both spec types share the JSON Schema foundation.

`x-codeSamples` is not applicable to AsyncAPI because operations are protocol-specific (MQTT, Kafka, WebSocket) rather than HTTP-based.

GraphQL, SOAP/WSDL, and gRPC specs do not use the `x-` extension convention and are not affected.

---

## Migration Guides

### From Redoc/Redocly

All Redoc CE extensions are supported: `x-codeSamples`, `x-tagGroups`, `x-displayName`, `x-logo`, `x-enumDescriptions`, and `x-internal` (via operation filtering). Your existing spec works without modification.

### From Scalar

`x-codeSamples`, `x-tagGroups`, `x-displayName`, `x-enumDescriptions`, and `x-internal` / `x-scalar-ignore` are supported. Scalar-specific extensions (`x-scalar-environments`, `x-scalar-stability`, etc.) are not rendered but are safely ignored.

### From RapiDoc

`x-codeSamples` / `x-code-samples` and `x-badges` are supported.

### From Swagger UI

Swagger UI has no built-in vendor extension rendering. Any `x-` extensions in your spec will be picked up automatically by `@apiboost/omnispec`.
