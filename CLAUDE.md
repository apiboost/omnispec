# API Documentation Renderer

The Apiboost API Documentation Renderer (`@apiboost/omnispec`) is a React package that renders the following API specifications:

- OpenAPI Specification: 2.0, 3.0.x, and 3.1.x (type arrays/null unions, numeric exclusive bounds, top-level `webhooks`)
- Async API: >2.x < 3.1.0
- SOAP
- GraphQL

A "Try it now" feature supports standard authorization headers for interactive API testing, with an optional backend proxy for CORS-blocked requests.

Out of box there are two pre-defined themes: Dark and Light themes. The theme layer is customizable via design tokens for white-labelling.

## Brand & Naming

Apiboost follows a **Branded House** brand architecture: one master brand (**Apiboost**) with products named descriptively beneath it. The product's full name is therefore **"Apiboost OmniSpec"** — OmniSpec is a product *of* Apiboost, not a standalone sub-brand.

**When writing the tool name on any brand, meta, or marketing surface, use the full "Apiboost OmniSpec":** social/SEO meta (`og:*`, `twitter:*`), image/logo `alt` text, page titles and the site tagline, the footer trademark (`Apiboost OmniSpec™`), and README/marketing headings.

Bare **"OmniSpec"** is acceptable in ordinary prose and headings once context is established (e.g. "OmniSpec auto-detects the spec type"). The npm package is always `@apiboost/omnispec`; the trademark form is `Apiboost OmniSpec™`.

Do **not** present OmniSpec as an independent brand (a "House of Brands" pattern) — no naming or lockup that divorces it from Apiboost.

## Quick Reference

```bash
pnpm test             # Run vitest tests
pnpm test:watch       # Watch mode
pnpm test:coverage    # Coverage report
pnpm storybook        # Storybook on port 6006
```

**Test runner:** Vitest (not Jest)
**Build:** TypeScript (`npx tsc --noEmit` for type checking)

## Architecture

### Package Structure

```
src/
├── openapi/               # OpenAPI 2.0-3.x renderer
│   ├── parser/            # Spec parsing + $ref resolution
│   ├── components/        # UI components
│   ├── types/             # TypeScript types
│   └── hooks/             # React hooks
├── asyncapi/              # AsyncAPI 2.x-3.x renderer
├── graphql/               # GraphQL schema renderer
├── grpc/                  # gRPC/Protobuf renderer
├── soap/                  # SOAP/WSDL renderer
├── unified/               # OmniSpecRenderer (auto-detects spec type)
├── core/                  # Shared components & utilities
│   ├── components/        # SchemaViewer, TryIt, Auth, Layout, etc.
│   ├── themes/            # Design tokens
│   ├── types/             # Shared types
│   └── utils/             # Spec detection, fetch, proxy client
└── server/                # Node.js proxy middleware (server-only)
```

### OpenAPI Rendering Pipeline

```
Spec (string/object)
  → parseOpenApiSpec() — resolves $refs, extracts servers/tags/operations/schemas
  → OpenApiSpec.tsx — builds nav tree, server selector, auth panel
    → TagGroup → EndpointCard → OperationDetail
      → SchemaTree (request/response schemas)
      → TryItPanel (interactive testing)
    → ComponentsSection (schemas at bottom)
```

### Key Components (OpenAPI)

| Component | File | Purpose |
|-----------|------|---------|
| `OpenApiSpec` | `openapi/OpenApiSpec.tsx` | Main orchestrator |
| `ApiOverview` | `openapi/components/ApiOverview.tsx` | Title, description, contact, license, terms, externalDocs |
| `TagGroup` | `openapi/components/TagGroup.tsx` | Tag name + description + operations |
| `EndpointCard` | `openapi/components/EndpointCard.tsx` | Collapsible operation header with method badge, security lock |
| `OperationDetail` | `openapi/components/OperationDetail.tsx` | Parameters, request body, responses, headers, security, externalDocs |
| `ServerSelector` | `openapi/components/ServerSelector.tsx` | Server URL + variable inputs |
| `ComponentsSection` | `openapi/components/ComponentsSection.tsx` | Reusable schemas |

### Schema Rendering

`schema-utils.ts` converts JSON Schema → `SchemaNode[]` tree, handling:

- Object properties, arrays, composition (allOf/oneOf/anyOf)
- Constraints: minLength, maxLength, minimum, maximum, pattern, minItems, maxItems
- Badges: required, deprecated, readOnly, writeOnly, nullable
- Example generation from schema (format-aware: uuid, email, date-time, etc.)
- Circular reference detection (max depth 10)

### OAS Compliance

Tracked in `docs/oas-compliance.md`. Current coverage:

**Fully rendered:** Info (title, version, description, contact, license, termsOfService), servers, paths/operations, parameters, request body, responses (status codes, schema, examples, headers), security (global + per-operation), schema constraints, externalDocs (root + per-operation), tag descriptions, readOnly/writeOnly

**Remaining gaps:** form-urlencoded as form fields, multiple named examples dropdown, callbacks, discriminator, external $refs, path/operation-level servers

Testing guide: `docs/internal/features/omnispec-oas-compliance-testing.md`

### Server-Side Proxy

`@apiboost/omnispec/server` exports `createProxyRouter()` Express middleware with SSRF guard and rate limiting. Mounted in the consumer's Express server at `/api/proxy`.

## Import Conventions

**Always use TypeScript path aliases for imports.** Never use relative paths like `../../core/`. If an alias doesn't exist for a path you need, suggest adding one. If working inside a file that uses relative imports, fix them to use the aliases path instead.

| Alias | Path | Example |
|-------|------|---------|
| `@core/*` | `src/core/*` | `import { Icon } from '@core/components/common/Icon'` |
| `@openapi/*` | `src/openapi/*` | `import { EndpointCard } from '@openapi/components/EndpointCard'` |
| `@asyncapi/*` | `src/asyncapi/*` | `import { ChannelDetail } from '@asyncapi/components/ChannelDetail'` |
| `@graphql/*` | `src/graphql/*` | `import { TypeDetail } from '@graphql/components/TypeDetail'` |
| `@soap/*` | `src/soap/*` | `import { OperationCard } from '@soap/components/OperationCard'` |
| `@grpc/*` | `src/grpc/*` | `import { RpcMethodCard } from '@grpc/components/RpcMethodCard'` |
| `@unified/*` | `src/unified/*` | `import { OmniSpecRenderer } from '@unified/index'` |

Aliases are configured in three places (keep in sync): `tsconfig.json`, `webpack.config.ts`, `vitest.config.ts`.

**Import directly from the file, not barrel indexes.** Always `import { Icon } from '@core/components/common/Icon'` — never `import { Icon } from '@core/components/common'`. Direct imports prevent circular dependencies, improve tree-shaking, and keep bundle size predictable. The only barrel exports are the public API entry points (`src/index.ts`, `src/core/public.ts`).

## Icons

**Use Lucide React for all icons.** The `Icon` component (`@core/components/common/Icon`) wraps Lucide imports with a stable API. Always use `<Icon name="..." />` — never import Lucide components directly. To add a new icon, add the Lucide import and mapping to `Icon.tsx`.

Available icons: `chevron-right`, `chevron-left`, `chevron-down`, `lock`, `download`, `expand`, `compress`, `ellipsis`, `xmark`, `external-link`, `link`, `copy`, `check`, `search`, `info`, `warning`, `sun`, `moon`, `eye`, `eye-off`, `lock-keyhole`, `lock-keyhole-open`, `rotate-ccw`, `home`, `shield-check`.

## CSS and Styling Guidelines

**Always use `rem` for spacing, sizing, and layout values — never `px`.** This ensures consistent scaling with user font-size preferences and improves accessibility. The only exceptions are `1px` borders/outlines and `0` values.
**Always use box-shadow unless border is absolutely necessary** This ensures we maintain a modern look in the UI. There are cases where we need to use borders which are understandable, but for wrapping containers and creating barriers between components, box-shadows is the preferred.
**Mobile First** All CSS and logic should be implemented using Responsive Principles, prioritizing mobile devices for rendering of the UI. A vast majority of human users view the specifications on mobile devices and we should accommodate that experience. An example of this would be:

```javascript
// Incorrect:
const headerStyle = css({
  borderBottom: '1px solid var(--omnispec-border-color)',
  backgroundColor: 'var(--omnispec-bg-secondary)',
  marginBottom: '1.875rem',
  [mq.mobile]: {
    marginBottom: '1.25rem',
    borderBottom: 'none',
  },
})

  // Correct:
const headerStyle = css({
  backgroundColor: 'var(--omnispec-bg-secondary)',
  marginBottom: '1.25rem',
  [mq.desktop]: {
    borderBottom: '1px solid var(--omnispec-border-color)',
    marginBottom: '1.875rem',
  },
})
```

**Propagate styles across all Specification Types** - When making styling changes for a specific specification type component, a scan should be done to determine if any other specification type component should be updated to inherit the newly implemented designs or styles.

For schema/type rendering specifically, this is enforced structurally: the shared leaf primitives live in `src/core/components/SchemaViewer/SchemaPrimitives.tsx` (`FieldName`, `SchemaRefLink`, `FieldDescription`, `SchemaSectionTitle`, `SchemaBadge`), and every spec's type renderer (`SchemaTree`, GraphQL `TypeDetail`, gRPC `MessageDetail`, SOAP `WsdlTypesBrowser`/`OperationCard`) composes from them. **A styling change to a field name, type reference, badge, description, or schema section heading goes in the kit — not in an individual renderer.** See `src/core/components/SchemaViewer/CLAUDE.md` for the full schema-family map and rules.

## Developer Documentation

**Every feature change must include documentation updates.** Client-facing docs live in `docs/client_docs/`. When adding, modifying, or removing functionality:

1. Update or create the relevant doc in `docs/client_docs/` (e.g., `docs/client_docs/template_customization/sidebar.md`)
2. Update `docs/oas-compliance.md` if the change affects OAS field coverage
3. If the feature is user-facing (props, extensions, theming), ensure the doc includes:
   - What it does
   - Where it applies (which spec types, which objects)
   - Code examples with TypeScript types
   - Any migration notes for users coming from other renderers

Documentation is written for public consumption — external developers will read these docs to evaluate and integrate the package. Organize docs into subdirectories by topic area.

### Documentation Index

| Document | Path | Content |
|----------|------|---------|
| Getting Started | `docs/client_docs/getting-started.md` | Installation, basic usage, first render |
| API Reference | `docs/client_docs/api-reference.md` | Props, configuration, TypeScript types |
| Configuration | `docs/client_docs/configuration.md` | Layout, navigation, display modes, advanced options |
| Try It & Code Samples | `docs/client_docs/try-it.md` | Try-It panel, proxy setup, code samples, deep linking |
| Theming | `docs/client_docs/theming.md` | Design tokens, custom themes, white-label |
| External Refs | `docs/client_docs/external-refs.md` | Multi-file specs, external $ref resolution, security |
| Vendor Extensions | `docs/client_docs/vendor-extensions.md` | All supported `x-` extensions with examples and migration guides |
| Sidebar Navigation | `docs/client_docs/template_customization/sidebar.md` | Custom sidebar links, groups, placement, active state |
| Slots | `docs/client_docs/template_customization/slots.md` | Slot overrides — sidebarHeader, footer, header, etc. |
| OAS Compliance | `docs/oas-compliance.md` | Field-by-field OpenAPI rendering coverage |
| Backend Integration | `docs/client_docs/backend-integration.md` | Drupal backend setup, proxy configuration |
| gRPC Support | `docs/client_docs/grpc-support.md` | Protobuf rendering details |
| Migration Guide | `docs/client_docs/migration.md` | Migrating from Redocly, Swagger UI, Stoplight, Scalar |
| Troubleshooting | `docs/client_docs/troubleshooting.md` | Common issues and solutions |

---

## Implementation Guide

- The data contract between the backend and the frontend is defined via TypeScript types in each spec's `types/` directory.
- Exported React components: `<OpenApiSpec spec={specUrl}/>`, `<AsyncApiSpec spec={specUrl}/>`, `<OmniSpecRenderer spec={specUrl}/>` (auto-detect)
- Specifications are retrieved from local or remote servers using fetch.

### Inspiration

- OpenAPI Specification:
  - SwaggerHub: <https://github.com/swagger-api/swagger-ui/tree/master/flavors/swagger-ui-react>
  - RapidDoc: <https://github.com/rapi-doc/RapiDoc>
  - ReadME
- AsyncAPI: <https://github.com/asyncapi/asyncapi-react>
- SOAP - couldn't find any, feel free to research.
- GraphQL - couldn't find any React components, feel free to research.

### Supporting Documentation

- OpenAPI Specification: <https://spec.openapis.org/oas/>
- Async API: <https://www.asyncapi.com/docs/tutorials/create-asyncapi-document>
- OAS Compliance Checklist: `docs/oas-compliance.md`
- TODO / Roadmap: `TODO.md`
