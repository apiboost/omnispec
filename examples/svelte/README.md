# Svelte 5 Example

Use `<omnispec-renderer>` in a Svelte 5 app (runes mode).

## Run it

```bash
pnpm install
pnpm dev
```

## Key integration points

1. **Import once at app startup** to register the element:

   ```ts
   // src/main.ts
   import '@apiboost/omnispec/wc'
   ```

2. **Use the element directly in any `.svelte` template** — Svelte passes
   unknown attributes through to the DOM, so `spec-url="..."` Just Works.

3. **`bind:this`** captures the element reference. Use `$effect` (runes mode)
   to set complex JSON properties imperatively once the element is mounted:

   ```svelte
   docs.sidebarNav = { items: [...] }
   docs.theme = { base: 'dark' }
   ```

4. **Custom events** dispatched by the element (`spec-loaded`,
   `try-it-request`, `try-it-response`) can be bound with the standard
   `oncamelcase` / lowercased event name attribute as shown in `App.svelte`.
