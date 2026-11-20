# Review rules: Apiboost OmniSpec (open-source core)

This repository is the **open-source core** of Apiboost OmniSpec (`@apiboost/omnispec`), a public,
Apache-2.0 TypeScript/React library. It renders OpenAPI 2.0/3.0/3.1 and AsyncAPI specifications, with a
"Try it now" panel and an optional Node.js proxy (`src/server/`). Outside contributors may submit pull
requests. Apiboost's commercial Pro product is separate and proprietary, and is not part of this
repository.

Project conventions live in the root `AGENTS.md` and in `src/core/components/SchemaViewer/CLAUDE.md` (the
schema rendering family). Read the trusted base-branch copies when you need them.

Do not comment on pure style issues that ESLint already enforces in CI (`eslint src/ --max-warnings=0`),
unless they slipped into files ESLint doesn't lint (scripts, configs, `website/`).

Use these categories, most severe first:

## 1. `[SECURITY]` (critical)

- **Untrusted spec content:** OpenAPI/AsyncAPI documents come from consumers and may be hostile. Flag:
  - XSS: `dangerouslySetInnerHTML`, unsanitized Markdown or HTML from `description`/`summary`, and
    `javascript:`/`data:` URLs in links, `externalDocs`, `termsOfService` or contact URLs
  - prototype pollution when merging spec objects
  - unbounded recursion on cyclic or deeply nested schemas (the schema utilities cap depth)
  - ReDoS from spec-supplied `pattern` values
- **External `$ref` resolution:** SSRF (private, loopback and link-local hosts), path traversal and
  `file:` access, unbounded fetches, and missing size or time limits.
- **Server proxy (`src/server/`):** keep the SSRF guard and rate limiting. Flag forwarding of hop-by-hop or
  sensitive headers, open-proxy behaviour, and header or URL injection.
- **Try-It credentials:** no tokens or keys in URLs, logs or `localStorage` without justification, and no
  credentials sent to a different origin than the one the user chose.
- **Supply chain:**
  - new runtime dependencies, `postinstall` or other lifecycle scripts
  - changes to `.github/workflows/`: `pull_request_target` checking out or running PR code, `${{ }}` inside
    `run:`, broader `permissions`, secrets exposed to untrusted code, actions not pinned to a full SHA
  - changes to the release flow (`release.yml`, semantic-release, npm provenance)

## 2. `[LICENSE]` (blocking)

- **Every source file** (`.ts`, `.tsx`, `.mjs`, `.js`, workflow `.yml`) must start with the **Core**
  header:
  `This source file is part of the Apiboost(R) OmniSpec Core.` / `Copyright (c) Apiboost, Inc.` /
  `SPDX-License-Identifier: Apache-2.0` / `See LICENSE.md and LICENSING.md in the project root for license information.`
- **No Pro or proprietary content.** Flag any `OmniSpec Pro` or `Proprietary` header, and any code that
  appears to come from the Pro product.
- **Dependencies:** new runtime `dependencies` must be compatible with Apache-2.0. Flag GPL, LGPL, AGPL,
  MPL, SSPL, BUSL and other copyleft or source-available licenses. `THIRD-PARTY-LICENSES.md` and `NOTICE.md`
  must stay accurate.
- **Provenance:** flag code that looks copied from third-party projects without attribution or with an
  incompatible license. This matters for AI-assisted changes in particular.
- **Free-vs-Pro docs policy:** document only what ships in this core. Pro features (GraphQL, SOAP/WSDL and
  gRPC renderers, `theme.overrides`, interactive OAuth) may appear only as an `:::info[Pro]` callout that
  states the free fallback, on `free-vs-pro.md`, or in the Free-vs-Pro comparison tables. Flag dedicated
  Pro feature pages, and any Pro feature names in page `keywords`, `og:*`/`twitter:*` meta, the `og:image`,
  or the site tagline.
- **Brand naming:** brand, meta and marketing surfaces (SEO/social meta, image `alt` text, page titles, the
  tagline, the footer trademark `Apiboost OmniSpec™`, README headings) use the full **"Apiboost OmniSpec"**.
  Never present OmniSpec as a standalone brand.

## 3. `[STANDARD]` (important)

- TypeScript strict: avoid `any` (prefer `unknown` plus narrowing), no unjustified non-null assertions,
  and `import type` for type-only imports.
- **Path aliases** (`@core/*`, `@openapi/*`, `@asyncapi/*`, `@unified/*`) instead of relative `../`
  imports across directories. Aliases are kept in sync in `tsconfig.json`, `webpack.config.ts` and
  `vitest.config.ts`.
- **Direct imports**, not barrel indexes. The only barrels are the public entry points `src/index.ts` and
  `src/core/public.ts`.
- **Icons:** always `<Icon name="…" />` from `@core/components/common/Icon`. Never import `lucide-react`
  directly; new icons are added to `Icon.tsx`.
- React: hooks rules, effects that clean up listeners and timers, stable list keys, and memoized context
  values.
- Tests are co-located (`*.test.ts(x)`, Vitest + Testing Library). New behaviour needs tests.

## 4. `[ARCHITECTURE]` (important)

- **CSS units:** `rem` for spacing, sizing and layout, never `px` (the only exceptions are `1px`
  borders/outlines and `0`).
- **Box-shadow over border** for wrapping containers and separators, unless a border is necessary.
- **Mobile first:** base styles target mobile, with `mq.desktop` overrides. Flag base desktop styles
  undone by `mq.mobile`.
- **Design tokens:** use `--omnispec-*` CSS variables. No hard-coded brand colours.
- **Schema styling kit:** styling changes to field names, type references, badges, descriptions or
  schema section headings belong in `src/core/components/SchemaViewer/SchemaPrimitives.tsx`, not in an
  individual renderer.
- **Cross-spec consistency:** a styling change in one spec renderer (OpenAPI or AsyncAPI) should be
  carried over to the other where it applies.
- **Public API** changes go through `src/index.ts` / `src/core/public.ts`. `src/server/` must not import
  browser-only code.

## 5. `[DOCS]` (important)

- Every feature change updates the client docs in `docs/client_docs/`. For user-facing props, extensions
  or theming, the docs cover what it does, where it applies, TypeScript examples, and migration notes.
- Changes that affect OpenAPI field coverage update `docs/oas-compliance.md`.

## 6. `[QUALITY]` (advisory)

- Components over roughly 150 lines: suggest extracting sub-components.
- Loading and error states for async spec loading and parsing.
- No dead code or commented-out blocks. Meaningful names (PascalCase components, camelCase utilities,
  `use*` hooks).
- Accessibility: semantic elements, labels, and keyboard support for interactive controls.
