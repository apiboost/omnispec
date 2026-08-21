# CLAUDE.md — `src/unified/`

The `OmniSpecRenderer` orchestrator — the single entry point most consumers use. Fetches the spec, auto-detects the type, and dispatches to the appropriate renderer (built-in OpenAPI/AsyncAPI, Pro-registered GraphQL/SOAP/gRPC, or `UpgradePrompt`).

---

## Directory Map

```
unified/
├── OmniSpecRenderer.tsx          The orchestrator
├── OmniSpecRenderer.stories.tsx
├── OmniSpecRenderer.test.ts
└── index.ts                    Re-exports for subpath consumers
```

---

## Path Alias

`@unified/*` resolves here.

---

## Composition Rules

The orchestrator is intentionally small. It does five things:

1. Fetch the spec via `useSpecFetcher`
2. Auto-detect type via `useSpecDetector` (with optional `specType` prop override)
3. Render `<LoadingScreen>` / `<ErrorMessage>` / `<UpgradePrompt>` in the appropriate state
4. Look up a registered renderer in the `pro.renderers` Map (if a `pro` prop was provided)
5. Fall back to the built-in OpenAPI / AsyncAPI renderers via lazy import

**It must NOT contain spec-specific rendering logic.** Anything beyond dispatch belongs in the spec-specific renderer.

---

## The `pro` Prop

Free's contract with Pro is a typed prop:

```ts
export interface ProFeatures {
  renderers: Map<SpecType, ComponentType<BaseSpecProps>>
  premiumThemingEnabled: boolean
}
```

`OmniSpecRenderer` reads `pro?.renderers` and uses the registered renderer if one exists for the detected `SpecType`. `pro?.premiumThemingEnabled` is consumed by `ThemeProvider` to gate `theme.overrides`.

**Never add Pro-aware code to this file beyond reading the typed prop.** No `if (proInstalled)` checks, no `import` of any Pro module, no string-keyed feature flags.

---

## Lazy Loading

OpenAPI and AsyncAPI renderers are imported via React's `lazy()`:

```ts
const OpenApiSpec = lazy(() =>
  import('../openapi/OpenApiSpec').then((m) => ({ default: m.OpenApiSpec })),
)
```

Consumers using only OpenAPI don't download AsyncAPI's bundle (and vice versa). When adding a new built-in renderer, follow the same pattern.

Pro-registered renderers are NOT lazy-loaded here — Pro decides its own loading strategy. The `proFeatures.renderers` Map holds component references; whether those references resolve to lazy or eager imports is Pro's call.

---

## `Suspense` Boundary

`OmniSpecRenderer` wraps its render output in a single `<Suspense>` boundary with `<LoadingScreen>` as the fallback. Don't add nested Suspense boundaries unless there's a clear reason (and document it).

---

## `ThemeProvider` Wrapping

The renderer wraps every output state (loading, error, content) in `ThemeProvider`. This ensures the loading and error UIs are themed correctly. The provider is at this level (not inside individual renderers) so `theme.base: 'auto'` correctly detects `prefers-color-scheme` before any content renders.

---

## Public API Stability

`OmniSpecRenderer` is part of the public contract. Changes to its prop shape are breaking and require a major version bump per semver.

If you need to add a new prop:

1. Make it optional with a sensible default
2. Add the type to `OmniSpecRendererProps` and to `BaseSpecProps` (if it applies to spec-specific renderers too)
3. Forward it via `specProps` to whichever renderer ends up rendering
4. Document it in `packages/omnispec/docs/client_docs/api-reference.md`

---

## Testing

- `OmniSpecRenderer.test.ts` covers the dispatch logic (registered renderer wins; falls back to built-in; UpgradePrompt for unknown types)
- Storybook story exercises all three states (loading, error, rendered) and both Free-only and Pro-registered configurations
- QA scope: APARC-1885 (ProProvider activation — note: ticket pre-dates `pro` prop refactor; verify against current pattern)
