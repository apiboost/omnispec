# CLAUDE.md — `src/core/`

Shared infrastructure used by every spec renderer (Free and Pro). Anything in here is part of the package's stable contract: changes ripple to all renderers.

> Read [ARCHITECTURE.md](../../../../ARCHITECTURE.md) first for system-level context.

---

## Directory Map

```
core/
├── components/
│   ├── Auth/                Auth panel, OAuth2 flow handling, applied auth state
│   ├── CodeBlock/           Syntax highlighting (used by code samples + envelope builder)
│   ├── Layout/              DocLayout, mobile drawer, sticky header offset
│   ├── MarkdownRenderer/    GFM rendering for descriptions
│   ├── Navigation/          NavTree, SearchBar, CustomNavSection, buildSidebar helper
│   ├── Reference/           Three-panel reference layout (ReferenceLayout, ChainSchema, SamplesPanel)
│   ├── SchemaViewer/        SchemaTree, schema-utils (JSON Schema → SchemaNode tree)
│   ├── TryIt/               TryItPanel, ParameterForm, RequestBodyEditor, ResponseViewer
│   └── common/              Icon, UpgradePrompt, LoadingScreen, ErrorMessage, Collapsible, ExpandableCard, MethodBar, Tabs, Modal, ResponsiveColumns
├── context/                 AuthContext, ConfigContext, RendererRegistry (deprecated)
├── hooks/                   useSpecFetcher, useSpecDetector, useHashScroll, useTheme, etc.
├── styles/                  css.ts (@emotion/css re-export), breakpoints.ts (mq.mobile/desktop)
├── themes/                  ThemeProvider, lightTheme, darkTheme, tokens
├── types/                   All shared TypeScript types (common, spec-detection, theme, auth, try-it, sidebar-nav)
├── utils/                   detect-spec, fetch-spec, sample generators, format helpers
└── public.ts                Barrel exposing infrastructure to Pro (NOT for consumers)
```

---

## Key Patterns Inside `core/`

### Path alias

`@core/*` resolves to this directory. Always use it — never `../../../core/`.

### `@core/styles/css`

Re-exports `@emotion/css`. **Always import `css`, `cx`, `keyframes` from here**, not from `@emotion/css` directly. This centralizes the dependency so style injection can be reconfigured (notably for Shadow DOM in the Web Component wrapper) in one place.

```ts
import { css } from '@core/styles/css'
import { mq } from '@core/styles/breakpoints'

const wrapperStyle = css({
  padding: '0.75rem',                // mobile base
  [mq.desktop]: {
    padding: '1.5rem',                // desktop override
  },
})
```

### `@core/styles/styled` — reusable styled components

Re-exports `@emotion/styled` (the styled-components API on our Emotion runtime), centralized here for the same Shadow-DOM reason as `css`. **Shared UI (buttons, code, headings, inputs, checkboxes, badges, …) is authored as a `styled` primitive in `@core/components/common/` and composed — not re-styled with `css()` in each consumer.** Use `css()` for one-off component-local layout; use `styled` for reusable elements and common design primitives. Style with `var(--omnispec-*)` tokens and `rem`, mobile-first. See the monorepo `CLAUDE.md` → **CSS & Styling → Reusable styled components** for the full rule. (Add `@emotion/styled` + `@emotion/react` and create this re-export on first use.)

```ts
import { styled } from '@core/styles/styled'

export const Chip = styled.span`
  font-family: var(--omnispec-font-mono);
  font-size: var(--omnispec-font-size-xs);
  padding: 0.08rem 0.42rem;
  border-radius: var(--omnispec-border-radius);
  background: var(--omnispec-bg-tertiary);
`
```

### Breakpoints

`@core/styles/breakpoints` exports `mq.mobile` (max-width 1023px) and `mq.desktop` (min-width 1024px). The breakpoint constant lives in `breakpoints.ts` — change it once and both queries update.

**Mobile-first rule (non-negotiable):** base styles target mobile. Use `[mq.desktop]` for desktop overrides. Do NOT write desktop-first styles with `[mq.mobile]` overrides — see `packages/omnispec/CLAUDE.md` for the example.

### Icons via `<Icon name="..." />`

`@core/components/common/Icon` is the only entry for icons. Lucide imports are mapped inside `Icon.tsx`. To add a new icon, register it there — don't import Lucide elsewhere.

### Theme tokens

`@core/themes/tokens` defines the 70+ CSS custom properties (`--omnispec-*`). `ThemeProvider` injects them via a `<style>` tag (not inline `style={}`). Light/dark/auto theming, `theme.overrides` (Pro-gated), and the floating sun/moon toggle all live in `ThemeProvider`.

### SchemaTree / SchemaNode

`@core/components/SchemaViewer/schema-utils` converts JSON Schema → `SchemaNode[]` tree. Handles object properties, arrays, composition (`allOf`/`oneOf`/`anyOf`), constraints (`minLength`/`maximum`/`pattern`/etc.), badges (`required`, `deprecated`, `readOnly`, `writeOnly`, `nullable`), format-aware example generation, and circular reference detection (max depth 10). Reused by every spec renderer.

### `useSpecFetcher` / `useSpecDetector`

Standard hooks for fetch + detect. Both `OpenApiSpec` and `AsyncApiSpec` use them. New renderers should too — don't reinvent the fetch/parse loop.

### `core/public.ts`

The barrel that exposes infrastructure to Pro. Pro imports from `@apiboost/omnispec/core` (which resolves to this file). **Only add to `public.ts` what Pro actually needs.** Keep the surface narrow — the wider it gets, the more fragile the Free/Pro boundary becomes.

---

## What Belongs Here

- Any component, type, hook, or utility used by **more than one** spec renderer
- Theme + styling infrastructure
- Common UI primitives (`Icon`, `Button`, `Modal`, `Tabs`, `Collapsible`, `ExpandableCard`, `MethodBar`)
  - `Button` (`components/common/Button.tsx`) is the single source of truth for `--omnispec-btn-*` action-button styling (`variant="primary" | "secondary"`, `active`, and `href` → renders `<a>`). Compose it instead of re-implementing button chrome; bare icon/toggle buttons with no chrome stay as plain `<button>`.
- Spec-agnostic types (`BaseSpecProps`, `ProFeatures`, `LoadingState`, `SpecType`)

## What Does NOT Belong Here

- Spec-specific parsing logic (lives in `openapi/parser`, `asyncapi/parser`, etc.)
- Pro renderer code (lives in `packages/omnispec-pro/src/renderers/`)
- Anything that only one spec renderer uses (keep it in that renderer's directory)
- Consumer-facing examples (those live in `examples/`)

---

## Adding a New Shared Component

1. Place it under the appropriate `core/components/<Subdir>/` (or create a new subdir if the category is new)
2. Co-locate the test: `MyComponent.test.tsx`
3. Co-locate Storybook story: `MyComponent.stories.tsx`
4. Add the Apache-2.0 license header (template in the root CLAUDE.md)
5. Use `@core/styles/css` for styles, `@core/styles/breakpoints` for media queries
6. Import directly from the file — do not re-export through a barrel unless it's part of the public API
7. If consumers (Pro or external) need it, add it to `core/public.ts` or `src/index.ts`
