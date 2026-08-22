---
title: Framework Integration
sidebar_position: 6
---

# Framework Integration

`@apiboost/omnispec` works in any web stack. There are two entry points:

- **React** — import the `<OmniSpecRenderer>` React component directly from `@apiboost/omnispec`.
- **Everything else** — use the framework-agnostic **web component**, `<omnispec-renderer>`, a standards-compliant custom element that runs in Vue, Angular, Svelte, vanilla HTML, and any framework that can render a DOM node.

:::tip
If you are already in React, use the React component — there is no benefit to wrapping it in a custom element. The web component exists for non-React stacks.
:::

The web component is registered with the browser by importing its entry point once at app startup:

```ts
import '@apiboost/omnispec/wc'
// <omnispec-renderer> is now registered globally.
```

Scalar options are passed as **kebab-case attributes** (`spec-url`, `theme-base`, `display-mode`); complex objects (parsed specs, theme config, sidebar nav) are set as **properties** on the element reference. See [Web Component](./web-component.md) for the complete attribute, property, and event reference.

Runnable examples for each non-React framework live under [`examples/`](https://github.com/apiboost/omnispec/tree/main/examples) in the repository.

## React

Import the component directly — no web component needed:

```tsx
import { OmniSpecRenderer } from '@apiboost/omnispec'

export function Docs() {
  return (
    <div style={{ height: '100vh' }}>
      <OmniSpecRenderer spec="https://petstore3.swagger.io/api/v3/openapi.json" />
    </div>
  )
}
```

See [Getting Started](./getting-started.md) for the Vite + React setup and [API Reference](./api-reference.md) for all props.

## Next.js (SSR)

The renderer uses browser APIs (DOM, `fetch`, clipboard), so it must run on the client. In the App Router, add the `'use client'` directive at the top of the page or component that mounts it:

```tsx
// app/docs/page.tsx
'use client'

import { OmniSpecRenderer } from '@apiboost/omnispec'

export default function DocsPage() {
  return (
    <div style={{ height: '100vh' }}>
      <OmniSpecRenderer spec="https://api.example.com/openapi.json" />
    </div>
  )
}
```

The renderer is SSR-safe with `renderToString` — the Try-It panel and mobile drawer hydrate on the client. For a server-rendered Express + React setup, see the SSR section of [Getting Started](./getting-started.md#express-ssr).

## Vue

Tell the Vue template compiler that `omnispec-` tags are custom elements so it does not try to resolve `<omnispec-renderer>` as a Vue component:

```ts
// vite.config.ts
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue({
    template: {
      compilerOptions: {
        isCustomElement: (tag) => tag.startsWith('omnispec-'),
      },
    },
  })],
})
```

```vue
<script setup lang="ts">
import '@apiboost/omnispec/wc'
</script>

<template>
  <omnispec-renderer spec-url="/openapi.json" theme-base="auto"></omnispec-renderer>
</template>
```

Runnable example: [`examples/vue/`](https://github.com/apiboost/omnispec/tree/main/examples/vue) — Vue 3 + Vite, including imperative property assignment and event binding.

## Angular

Add `CUSTOM_ELEMENTS_SCHEMA` to the component (or `NgModule`) so the Angular compiler accepts the unknown `<omnispec-renderer>` tag, and import the web component entry once (typically in `main.ts`):

```ts
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core'
import '@apiboost/omnispec/wc'

@Component({
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<omnispec-renderer spec-url="/openapi.json"></omnispec-renderer>`,
})
export class AppComponent {}
```

Use a `ViewChild` to set complex properties (`sidebarNav`, `theme`, `spec`) imperatively after view init. Runnable example: [`examples/angular/`](https://github.com/apiboost/omnispec/tree/main/examples/angular) — Angular 18 standalone component.

## Svelte

Svelte passes unknown attributes straight through to the DOM, so no compiler configuration is needed. Import the entry once and use the element directly:

```svelte
<script lang="ts">
  import '@apiboost/omnispec/wc'
</script>

<omnispec-renderer spec-url="/openapi.json"></omnispec-renderer>
```

Use `bind:this` plus `$effect` (runes mode) to set complex JSON properties imperatively once the element is mounted. Runnable example: [`examples/svelte/`](https://github.com/apiboost/omnispec/tree/main/examples/svelte) — Svelte 5 + Vite.

## Vanilla HTML / CDN

The fastest path is the standalone bundle — a single self-contained `<script>` that ships React, ReactDOM, and the renderer inline, with no build step. Load it from a CDN (pin a version in production):

```html
<!doctype html>
<html>
  <body>
    <script src="https://unpkg.com/@apiboost/omnispec@latest/dist/wc/standalone.js"></script>
    <omnispec-renderer
      spec-url="https://petstore3.swagger.io/api/v3/openapi.json"
      theme-base="auto"
    ></omnispec-renderer>
  </body>
</html>
```

Runnable example: [`examples/vanilla-html/`](https://github.com/apiboost/omnispec/tree/main/examples/vanilla-html) — a single HTML file with no build step.

## Next steps

- [Web Component](./web-component.md) — full attribute, property, and event API, shadow-DOM behavior, and design-token cascade.
- [Configuration](./configuration.md) — layouts, navigation, and display modes.
- [Backend Integration](./backend-integration.md) — serving specs and the Try-It proxy.
