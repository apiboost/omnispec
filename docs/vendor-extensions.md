---
id: vendor-extensions
title: Vendor Extensions (x- Properties)
sidebar_label: Vendor Extensions
description: OpenAPI/AsyncAPI vendor extensions supported by @apiboost/omnispec. The free core supports x-logo; other x- extensions are part of Apiboost OmniSpec Pro.
---

# Vendor Extensions (x- Properties)

OpenAPI and AsyncAPI specs can carry vendor extensions (`x-` properties) that tools use for enhanced rendering. In the **free core** (`@apiboost/omnispec`), the single supported vendor extension is **`x-logo`**, documented in full below.

The premium documentation extensions popularized by Redocly, Scalar, and RapiDoc — `x-codeSamples`, `x-tagGroups`, `x-displayName`, `x-badges`, `x-internal`, and `x-enumDescriptions` — along with the OAuth Try-It extensions `x-flowVariables` and `x-tokenEndpointAuthMethod`, are part of **[Apiboost OmniSpec Pro](https://apiboost.com)**. See [Pro vendor extensions](#pro-vendor-extensions) below.

Any `x-` extension the renderer does not understand is safely ignored, so a spec authored for another tool renders without modification — you just get the free feature set unless Pro is installed.

## `x-logo` (Free)

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

`x-logo` is honored for both OpenAPI (`info`) and AsyncAPI (`info`) specifications.

---

## Auto-Generated Code Samples (Free)

The renderer automatically generates code snippets in 6 languages for every OpenAPI operation — no vendor extension required:

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

:::info[Pro]
Supplying your own hand-written code samples per operation (the `x-codeSamples` / `x-code-samples` extension) requires **[Apiboost OmniSpec Pro](https://apiboost.com)**. In the free core, every operation still gets the auto-generated 6-language samples described above.
:::

---

## Pro vendor extensions

The following documentation and OAuth Try-It extensions are part of **[Apiboost OmniSpec Pro](https://apiboost.com)**. In the free core they are parsed as unknown `x-` properties and ignored, so specs that use them still render — just without the Pro-only behavior.

| Extension | What it does |
|-----------|--------------|
| `x-codeSamples` / `x-code-samples` | Adds your own hand-written code samples to an operation, overriding the auto-generated snippet for matching languages. |
| `x-tagGroups` | Groups tags into higher-level categories in the sidebar navigation. |
| `x-displayName` | Overrides a tag's `name` with a human-friendly label in the sidebar and section headings. |
| `x-badges` | Adds color-coded label badges (e.g. "Beta", "Rate Limited") to operation headers. |
| `x-internal` | Hides operations or entire tags from the rendered documentation. |
| `x-enumDescriptions` / `x-enum-descriptions` | Adds a human-readable description for each enum value in a schema. |
| `x-flowVariables` | Templates an OAuth flow's `tokenUrl` / `authorizationUrl` / `refreshUrl` with named variables so one spec can Try-It OAuth against multiple environments or tenants. |
| `x-tokenEndpointAuthMethod` | Presets the client-authentication method (header vs. request body) the interactive OAuth Try-It panel uses at the token endpoint. |

:::info[Pro]
The vendor extensions listed above require **[Apiboost OmniSpec Pro](https://apiboost.com)**. In the free core, `x-logo` is the only supported vendor extension and every operation gets auto-generated code samples; the extensions above are safely ignored. See [apiboost.com](https://apiboost.com) for the full Pro documentation.
:::

---

## Spec Type Support

Vendor extensions apply to both OpenAPI and AsyncAPI specifications. In the free core:

| Extension | Tier | OpenAPI 2.x/3.x/3.1 | AsyncAPI 2.x/3.x |
|-----------|------|---------------------|-------------------|
| `x-logo` | Free | Yes (info) | Yes (info) |
| `x-codeSamples` | Pro | Yes | No (no HTTP requests) |
| `x-tagGroups` | Pro | Yes | Yes |
| `x-displayName` | Pro | Yes (tags) | Yes (tags) |
| `x-badges` | Pro | Yes (operations) | Yes (operations) |
| `x-internal` | Pro | Yes (operations, tags) | Yes (operations, channels, tags) |
| `x-enumDescriptions` | Pro | Yes (schemas) | Yes (schemas) |
| `x-flowVariables` | Pro | Yes (OAuth2 flow) | No (no HTTP token exchange) |
| `x-tokenEndpointAuthMethod` | Pro | Yes (OAuth2 scheme) | No (no HTTP token exchange) |

GraphQL, SOAP/WSDL, and gRPC specs (Pro renderers) do not use the `x-` extension convention and are not affected.

---

## Migrating from Another Tool

Migrating from Redoc/Redocly, Scalar, or RapiDoc requires **zero spec changes**. Your existing `x-` extensions are read where supported and safely ignored otherwise:

- The free core renders **`x-logo`** and auto-generates code samples for every operation.
- The premium extensions those tools use (`x-codeSamples`, `x-tagGroups`, `x-displayName`, `x-badges`, `x-internal`, `x-enumDescriptions`) are supported with **[Apiboost OmniSpec Pro](https://apiboost.com)**.

Swagger UI has no built-in vendor-extension rendering, so there is nothing to migrate — `x-logo` is picked up automatically.
