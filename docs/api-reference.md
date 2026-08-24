# Component API Reference

## Shared Props (BaseSpecProps)

All spec renderers accept these common props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `spec` | `string \| Record<string, unknown>` | **required** | URL to fetch, raw content string, or pre-parsed object |
| `theme` | `ThemeConfig` | `{ base: 'light' }` | Theme configuration with optional token overrides |
| `proxyUrl` | `string` | `undefined` | Backend proxy URL for Try-It. When set, requests route through the proxy |
| `allowTryIt` | `boolean` | `true` | Show or hide the Try-It panels |
| `layout` | `'sidebar' \| 'stacked'` | `'sidebar'` | Layout mode. Sidebar shows navigation; stacked is content-only |
| `sidebarPosition` | `'left' \| 'right'` | `'left'` | Which side the navigation sidebar appears on |
| `tryItLayout` | `'inline' \| 'panel'` | `'inline'` | Try-It position. Inline renders below the operation; panel renders in a sticky right column |
| `sidebarNav` | `SidebarNavConfig` | `undefined` | Custom navigation items in the sidebar. See [Sidebar Navigation](./template_customization/sidebar.md) |
| `slots` | `SlotOverrides` | `{}` | Custom content injected into layout slots. See [Slots](./template_customization/slots.md) |
| `defaultExpandOperations` | `boolean` | `false` | Expand all operations on initial render |
| `navigationMode` | `'grouped' \| 'segmented'` | auto | `grouped` renders all operations on one page. `segmented` renders one at a time via internal routing. Auto-selects based on operation count (>50 → segmented) |
| `displayMode` | `'compact' \| 'reference'` | `'compact'` | Compact renders operations as collapsible cards. Reference renders a Redocly-style three-panel layout with sticky samples/Try-It panel |
| `schemaStyle` | `'lines' \| 'tokens' \| 'table' \| 'card'` | `'lines'` | Presentation style for the schema/property tree. `lines` and `tokens` are Free; `table` and `card` are Pro (fall back to `lines` in the free core). See [Configuration](./configuration.md#schema-style-schemastyle) |
| `tryItPersistTtl` | `number` | `undefined` | Max age in seconds for persisted Try-It inputs (params, bodies, headers) in localStorage. `0` disables persistence; omit for no expiry. Auth credentials are unaffected (sessionStorage, tab lifetime only) |
| `externalRefOrigins` | `string[]` | `undefined` | Origins allowed for external `$ref` resolution. Same-origin is always allowed. See [External Refs](./external-refs.md) |
| `serverUrl` | `string` | `undefined` | Forces a single base URL for Try-It and code samples, overriding the spec's `servers`. Highest precedence. See [Configuration](./configuration.md#server-url-override) |
| `servers` | `{ url: string; description?: string }[]` | `undefined` | Replaces the spec's server list in the selector. Ignored when `serverUrl` is set |
| `downloadLink` | `boolean \| string` | `undefined` | Show download button. `true` uses the spec URL; a string provides a custom URL |
| `onSpecLoaded` | `(info: SpecLoadedInfo) => void` | — | Fired when the spec finishes parsing. Receives title, version, and type |
| `onTryItRequest` | `(request: TryItRequest) => void` | — | Fired before a Try-It request is sent |
| `onTryItResponse` | `(response: TryItResponse) => void` | — | Fired after a Try-It response is received |
| `oauth` | `OAuthConfig` | `undefined` | Configures the interactive OAuth Try-It flow (**Pro**). See below |
| `interactiveOAuth` | `boolean` | `true` | Opt out of the Pro interactive OAuth "Get Token" flow. Set `false` to force manual token paste even with Pro installed. No effect without Pro (the free core is manual-paste regardless) |
| `pro` | `ProFeatures` | `undefined` | Activates Pro capabilities (**Pro**). See below |
| `className` | `string` | — | CSS class applied to the root container |

### `pro` (Pro)

:::info[Pro]
The `pro` prop accepts an **[Apiboost OmniSpec Pro](https://apiboost.com/omnispec)** capability object that unlocks Pro renderers (GraphQL, SOAP/WSDL, gRPC), full theme-token white-labeling, the `table`/`card` schema styles, and the interactive OAuth Try-It flow. In the free core it is unset and these features are unavailable. The pre-wired `OmniSpecRenderer` from `@apiboost/omnispec-pro` sets it for you; the deprecated `<ProProvider>` is not the current pattern. Pro configuration syntax is documented in the Pro docs.
:::

### `oauth` (Pro)

:::info[Pro]
The `oauth` prop (`OAuthConfig`) drives the interactive OAuth "Get Token" Try-It flow — Authorization Code + PKCE and OpenID Connect discovery — requiring **[Apiboost OmniSpec Pro](https://apiboost.com/omnispec)**. In the free core, OAuth2 flow details are shown and tokens are pasted manually. The `OAuthConfig` shape and setup are documented in the Pro docs.
:::

When Pro is installed the interactive flow is on by default. To force the manual token-paste experience (e.g. in an embed where popups are undesirable), pass `interactiveOAuth={false}` on the renderer, or `interactive-oauth="false"` on the `<omnispec-renderer>` web component.

### ThemeConfig

```typescript
interface ThemeConfig {
  /** 'light' or 'dark' for controlled mode. 'auto' detects system preference and manages state internally. */
  base: 'light' | 'dark' | 'auto'
  overrides?: Partial<ThemeTokens>
  /** Show built-in theme toggle. Only applies when base is 'auto'. Defaults to true. */
  themeToggle?: boolean
  /** Called when the resolved theme changes (useful with 'auto' to sync external UI). */
  onThemeChange?: (theme: 'light' | 'dark') => void
}
```

See [Theming Guide](./theming.md) for all tokens and the full auto/controlled mode documentation.

### SlotOverrides

```typescript
interface SlotOverrides {
  header?: ReactNode         // Above the entire renderer
  footer?: ReactNode         // Below the entire renderer
  sidebarHeader?: ReactNode  // Top of sidebar, above search/nav
  sidebarFooter?: ReactNode  // Bottom of sidebar, below nav
  contentHeader?: ReactNode  // Above the main content area (e.g. breadcrumbs)
  logo?: ReactNode           // Logo element
}
```

### SpecLoadedInfo

```typescript
interface SpecLoadedInfo {
  title: string
  version: string
  type: SpecType
}
```

---

## OpenApiSpec

Renders OpenAPI 2.0 (Swagger), OpenAPI 3.0.x, and OpenAPI 3.1.x specifications. For 3.1, `type` arrays (`["string", "null"]`) render as nullable unions, numeric `exclusiveMinimum`/`exclusiveMaximum` are supported alongside the 3.0 boolean form, and top-level `webhooks` render as a dedicated "Webhooks" group.

```tsx
import { OpenApiSpec } from '@apiboost/omnispec/openapi'

<OpenApiSpec
  spec="https://api.example.com/openapi.yaml"
  theme={{ base: 'dark' }}
  tryItLayout="panel"
  proxyUrl="/api/proxy"
/>
```

**Accepts**: JSON or YAML strings, URLs to JSON/YAML files, or pre-parsed JavaScript objects.

**Features**:
- Endpoint listing grouped by tags with collapsible cards
- HTTP method badges (GET, POST, PUT, DELETE, PATCH)
- Parameter display with inline type badges and required indicators
- Request body with schema tree and example tabs
- Response codes with tinted status badges and schema display
- Server selector with variable substitution
- Authentication panel (API Key, Bearer, Basic, OAuth2)
- Try-It with direct or proxied requests
- Component/schema browser
- Search and filter endpoints

**Supported versions**: Swagger 2.0, OpenAPI 3.0.x, and OpenAPI 3.1

---

## AsyncApiSpec

Renders AsyncAPI 2.x and 3.x event-driven API specifications.

```tsx
import { AsyncApiSpec } from '@apiboost/omnispec/asyncapi'

<AsyncApiSpec
  spec="https://api.example.com/asyncapi.yaml"
  theme={{ base: 'light' }}
/>
```

**Accepts**: JSON or YAML strings, URLs, or pre-parsed objects.

**Features**:
- Channel listing with PUB/SUB/SEND/RECV badges
- Message payload schemas with example tabs
- Server/broker list with protocol badges (Kafka, MQTT, AMQP, WebSocket, etc.)
- Channel parameters table
- Protocol binding display
- Component schema browser

**Note**: Try-It is not available for AsyncAPI since async protocols (Kafka, MQTT, etc.) cannot be called from a browser.

---

## GraphqlSpec

:::info[Pro]
The GraphQL renderer requires **[Apiboost OmniSpec Pro](https://apiboost.com/omnispec)**. In the free core, GraphQL specs display a styled upgrade prompt.
:::

Renders GraphQL schemas from SDL strings or introspection results.

```tsx
import { GraphqlSpec } from '@apiboost/omnispec/graphql'

<GraphqlSpec
  spec={sdlString}
  theme={{ base: 'light' }}
/>
```

**Accepts**: GraphQL SDL strings or introspection result JSON objects.

**Features**:
- Root operation types (Query, Mutation, Subscription) displayed prominently
- Type browser for all types (Object, InputObject, Enum, Union, Interface, Scalar)
- Field display with arguments, return types, and deprecation notices
- Clickable type references for navigation between types
- Enum value listing
- Union possible types
- Search and filter types

**Note**: This is a documentation-only renderer. Interactive query playground is planned for a future release.

---

## SoapSpec

:::info[Pro]
The SOAP/WSDL renderer requires **[Apiboost OmniSpec Pro](https://apiboost.com/omnispec)**. In the free core, WSDL specs display a styled upgrade prompt.
:::

Renders WSDL 1.1 / SOAP API specifications.

```tsx
import { SoapSpec } from '@apiboost/omnispec/soap'

<SoapSpec
  spec={wsdlXmlString}
  theme={{ base: 'light' }}
  proxyUrl="/api/proxy"
/>
```

**Accepts**: WSDL XML strings or URLs to WSDL files.

**Features**:
- Service and port listing with endpoint addresses
- Operation cards with SOAPAction and binding style display
- Input/output/fault message type tables
- SOAP envelope preview (auto-generated from XSD types)
- Editable SOAP envelope with Try-It execution
- XSD type browser (complex types with field tables, simple types with restrictions)
- Support for all 44 XSD built-in types

---

## GrpcSpec

:::info[Pro]
The gRPC/Protobuf renderer requires **[Apiboost OmniSpec Pro](https://apiboost.com/omnispec)**. In the free core, `.proto` specs display a styled upgrade prompt.
:::

Renders gRPC services from Protocol Buffer (`.proto`) files.

```tsx
import { GrpcSpec } from '@apiboost/omnispec/grpc'

<GrpcSpec
  spec={protoFileContent}
  theme={{ base: 'light' }}
/>
```

**Accepts**: `.proto` file content as a string.

**Features**:
- Service listing with method counts
- RPC method cards with streaming pattern badges (UNARY, SERVER, CLIENT, BIDI)
- Proto signature display
- Clickable request/response type navigation
- Message detail with field tables (number, name, type, cardinality)
- Map field display (`map<K, V>`)
- Oneof group visualization
- Nested message and enum rendering
- Enum value listing with numeric IDs

**Note**: This is a documentation-only renderer. gRPC Try-It is not available because browsers cannot call gRPC services directly (requires HTTP/2 + binary protobuf).

---

## OmniSpecRenderer

Auto-detecting unified renderer that selects the correct spec-specific renderer based on content.

```tsx
import { OmniSpecRenderer, SpecType } from '@apiboost/omnispec'

// Auto-detect
<OmniSpecRenderer spec={specUrl} theme={{ base: 'light' }} />

// Explicit type override
<OmniSpecRenderer spec={specUrl} specType={SpecType.OPENAPI_3} />
```

| Additional Prop | Type | Default | Description |
|----------------|------|---------|-------------|
| `specType` | `SpecType` | Auto-detected | Override auto-detection with explicit type |

**SpecType values**: `OPENAPI_2`, `OPENAPI_3`, `ASYNCAPI_2`, `ASYNCAPI_3`, `GRAPHQL_SDL`, `GRAPHQL_INTROSPECTION`, `SOAP_WSDL`, `GRPC_PROTO`

**Detection logic**:
- JSON/YAML with `swagger` key -> OpenAPI 2
- JSON/YAML with `openapi` key -> OpenAPI 3
- JSON/YAML with `asyncapi` key -> AsyncAPI
- XML with `<definitions>` -> WSDL/SOAP
- Text with `syntax = "proto3"` -> gRPC
- Text with GraphQL keywords (`type Query`, `schema {`) -> GraphQL SDL
- JSON with `__schema` key -> GraphQL introspection

Each renderer is **lazy-loaded**, so only the one you need is downloaded.

---

## OAS 3.0 Feature Support

### Named Examples

When an OAS media type uses `examples` (plural) with multiple named entries, the renderer displays a dropdown selector to switch between them. This works in both compact and reference display modes.

```yaml
responses:
  '200':
    content:
      application/json:
        examples:
          success:
            summary: Successful response
            value: { "id": 1, "name": "Buddy" }
          empty:
            summary: Empty result
            value: { "id": null, "name": "" }
```

### Callbacks (Webhooks)

OAS 3.0 `callbacks` on operations are rendered as expandable sections showing the callback URL expression, HTTP method, request body schema, and response statuses.

```yaml
paths:
  /subscribe:
    post:
      callbacks:
        onEvent:
          '{$request.body#/callbackUrl}':
            post:
              summary: Event notification
              requestBody:
                content:
                  application/json:
                    schema:
                      type: object
                      properties:
                        event: { type: string }
              responses:
                '200':
                  description: Callback received
```

### Form-urlencoded Encoding

When a request body uses `application/x-www-form-urlencoded`, the curl code samples automatically use `--data-urlencode` instead of `-d` with JSON. The Try-It panel encodes form data as `key=value` pairs.

---

## Exported Utilities

### detectSpecType

Detect the spec type from content:

```tsx
import { detectSpecType, SpecType } from '@apiboost/omnispec'

const result = detectSpecType(content)
// { type: SpecType.OPENAPI_3, confidence: 'high', version: '3.0.3' }
```

### fetchSpec

Fetch a spec from a URL:

```tsx
import { fetchSpec } from '@apiboost/omnispec'

const content = await fetchSpec('https://api.example.com/openapi.json')
```

### Theme exports

```tsx
import { lightTheme, darkTheme, ThemeProvider, useTheme } from '@apiboost/omnispec'
```
