# Vue 3 Example

Use `<omnispec-renderer>` in a Vue 3 single-file component.

## Run it

```bash
pnpm install
pnpm dev
```

## Key integration points

1. **Tell the Vue template compiler about the custom element** in
   `vite.config.ts` so it does not try to resolve it as a Vue component:

   ```ts
   isCustomElement: (tag) => tag.startsWith('api-doc-'),
   ```

2. **Import once at app startup** in `main.ts` — `@apiboost/omnispec/wc`
   auto-registers the element with the browser:

   ```ts
   import '@apiboost/omnispec/wc'
   ```

3. **Use the element in any template** — attributes for scalar props, the
   `ref` + property assignment for complex JSON props (`spec`, `theme`,
   `sidebarNav`).

4. **Listen for events** via the standard `@event-name` syntax — the element
   dispatches `spec-loaded`, `try-it-request`, and `try-it-response` as
   `CustomEvent`s.
