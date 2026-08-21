# CLAUDE.md — `src/openapi/`

OpenAPI 2.x and 3.x renderer. The most-used and most-tested renderer in the package. Treat it as the reference implementation when adding a new spec type.

---

## Directory Map

```
openapi/
├── OpenApiSpec.tsx           Main orchestrator (lazy-loaded by unified/OmniSpecRenderer)
├── OpenApiSpec.stories.tsx
├── components/
│   ├── ApiOverview.tsx       Title, description, contact, license, terms, externalDocs, x-logo
│   ├── TagGroup.tsx          Tag name + description + member operations
│   ├── EndpointCard.tsx      Collapsible operation header (method badge, summary, security lock)
│   ├── OperationDetail.tsx   Parameters, request body, responses, headers, security, externalDocs
│   ├── ServerSelector.tsx    Server URL + variable inputs
│   ├── ComponentsSection.tsx Reusable schemas at bottom of the doc
│   └── ...
├── hooks/                    OpenAPI-specific React hooks
├── parser/                   Spec parsing + $ref resolution
├── types/                    OpenAPI-specific TypeScript types
├── index.ts                  Barrel — public subpath export
```

---

## Rendering Pipeline

```
spec URL or object
  → useSpecFetcher (from @core/hooks)
  → parseOpenApiSpec (in parser/)
     │   - resolves $refs (internal, external — Phase 14)
     │   - extracts servers, tags, operations, schemas
     │   - normalizes 2.x vs 3.x differences
  → OpenApiSpec.tsx
     │   - builds nav tree
     │   - mounts ServerSelector + AuthPanel
     ├─→ TagGroup → EndpointCard → OperationDetail
     │     ├─→ SchemaTree (request/response schemas)
     │     └─→ TryItPanel (interactive testing)
     └─→ ComponentsSection (reusable schemas at bottom)
```

---

## Path Alias

`@openapi/*` resolves to this directory. Pro renderers (GraphQL, SOAP, gRPC) sometimes import from `@openapi/` for shared parsing logic (e.g. vendor extension handling) — verify before adding new cross-renderer dependencies.

---

## Key Conventions

### 2.x and 3.x normalization happens in the parser

`OpenApiSpec.tsx` should never branch on spec version. The parser normalizes Swagger 2.0 (`host` + `basePath`, `produces`/`consumes`, `parameters` types, `definitions` vs `components/schemas`) into a 3.x-shaped internal model. Add new version-specific handling in `parser/`, not in components.

### Vendor extensions

Free supports `x-logo` (auto-populates `slots.logo` if no override is provided). Other extensions (`x-codeSamples`, `x-tagGroups`, `x-displayName`, `x-badges`, `x-internal`, `x-enumDescriptions`) are **Pro-gated** — their parsing/rendering lives in `omnispec-pro/src/renderers/openapi-extensions/` (or similar) and hooks into Free's parser via the registered enhancer pattern.

**When adding a new vendor extension:**

1. Decide tier (Free or Pro) per the boundary in `docs/internal/features/2026-06-11-omnispec-package-split-plan.md`
2. Document it in `packages/omnispec/docs/client_docs/vendor-extensions.md`
3. Update `docs/oas-compliance.md` if the extension touches OAS-spec fields
4. Add a test fixture in `src/__fixtures__/`

### OAS Compliance Tracking

`packages/omnispec/docs/oas-compliance.md` is the canonical field-by-field coverage matrix. Update it whenever you add or change OAS field rendering.

Currently rendered: Info (title/version/description/contact/license/termsOfService), servers, paths/operations, parameters, request body, responses (status codes, schema, examples, headers), security (global + per-operation), schema constraints, externalDocs (root + per-operation), tag descriptions, readOnly/writeOnly.

Known gaps: form-urlencoded as form fields, multiple named examples dropdown, callbacks, discriminator, external `$refs`, path/operation-level servers.

### Code samples

Auto-generated for 6 languages (cURL, JS, Python, Go, Java, C#). Generators live in `core/utils/` (since AsyncAPI / SOAP can reuse them in the future). The OpenAPI renderer wires a `TryItRequest` (HTTP method, URL, headers, body) into the `CodeSamples` component.

The `x-codeSamples` / `x-code-samples` extension lets spec authors override auto-generated samples per operation. This is Pro-only.

### Schema constraints

`SchemaTree` (from `@core/components/SchemaViewer`) handles all schema constraint rendering. Don't reimplement constraint badges or example generation in OpenAPI components.

---

## Adding a New Component

1. Drop it under `openapi/components/`
2. Co-locate test + story
3. Add the Apache-2.0 license header (template in the root CLAUDE.md)
4. Use `@core/components/common/*` primitives (Icon, Tabs, ExpandableCard, etc.) instead of building from scratch
5. If the pattern would apply to another spec type, consider promoting it to `@core/components/`
6. Update `packages/omnispec/docs/client_docs/` if the component is user-visible

---

## Testing

- Unit tests with vitest, co-located as `*.test.tsx`
- Storybook stories drive visual regression (Chromatic via the parent ab_ui_core_ai monorepo workflows)
- Test fixtures: live in `src/__fixtures__/`
- QA test scope: APARC-1761 + sub-tasks (existing OpenAPI QA), APARC-1873 (developer integration)
