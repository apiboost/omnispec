---
id: web-component
title: Web Component
sidebar_label: Web Component
description: Use the framework-agnostic <omnispec-renderer> Web Component from @apiboost/omnispec in vanilla HTML, Vue, Angular, or Svelte.
---

# Web Component

`@apiboost/omnispec` ships a framework-agnostic Web Component
(`<omnispec-renderer>`) alongside the React component. It is part of the free
package — no additional install. Use it from vanilla HTML, Vue, Angular,
Svelte, or any other framework that can render a DOM element.

## Quick start

The fastest path is the standalone bundle — a single self-contained
`<script>` that ships React, ReactDOM, and the renderer inline, with no build
step on the consumer side.

```html
<!doctype html>
<html>
  <body>
    <script src="https://unpkg.com/@apiboost/omnispec@latest/dist/wc/standalone.js"></script>
    <omnispec-renderer
      spec-url="https://petstore3.swagger.io/api/v3/openapi.json"
    ></omnispec-renderer>
  </body>
</html>
```

For framework apps, prefer the subpath import so React/ReactDOM are shared
with your existing tree:

```ts
import '@apiboost/omnispec/wc'
// <omnispec-renderer> is now registered globally.
```

## Two configuration paths

### Declarative HTML attributes

Best for scalar config like URLs, enums, and booleans:

```html
<omnispec-renderer
  spec-url="https://example.com/openapi.json"
  theme-base="auto"
  display-mode="compact"
  navigation-mode="grouped"
  allow-try-it="true"
  proxy-url="/api/proxy"
></omnispec-renderer>
```

### Imperative property assignment

Recommended for complex objects (parsed specs, theme overrides, sidebar nav):

```ts
import type { OmniSpecRendererElement } from '@apiboost/omnispec/wc'

const el = document.querySelector('omnispec-renderer') as OmniSpecRendererElement
el.spec = parsedSpecObject
el.theme = {
  base: 'dark',
  overrides: { '--omnispec-color-primary': '#8B5CF6' },
}
el.sidebarNav = {
  items: [
    { id: 'home', label: 'Home', href: '/' },
  ],
}
```

You can also stringify-then-set the same complex props as JSON attributes — the
element parses them with a try/catch and logs a console error on failure:

```html
<omnispec-renderer
  spec-url="/openapi.json"
  theme='{"base":"dark"}'
></omnispec-renderer>
```

The imperative property always wins over an attribute when both are set.

## Attribute reference

| Attribute | Type | Description |
| --- | --- | --- |
| `spec-url` | string | URL to fetch the spec from. |
| `spec` | JSON string | Inline spec content (object or string) — see properties. |
| `theme-base` | `'light' \| 'dark' \| 'auto'` | Theme base. `'auto'` follows the system preference. |
| `theme-toggle` | boolean | Show the floating theme toggle in `'auto'` mode. Defaults to `true`. |
| `theme` | JSON string | Full `ThemeConfig` (use the property in JS). |
| `sidebar-nav` | JSON string | Sidebar nav config (use the property in JS). |
| `display-mode` | `'compact' \| 'reference'` | Layout mode. |
| `navigation-mode` | `'grouped' \| 'segmented'` | Nav grouping. |
| `layout` | `'sidebar' \| 'stacked'` | Page layout. |
| `sidebar-position` | `'left' \| 'right'` | Sidebar placement. |
| `try-it-layout` | `'inline' \| 'panel'` | Try-It panel layout. |
| `schema-style` | `'lines' \| 'tokens' \| 'chain' \| 'table' \| 'card'` | Schema tree style. `table` and `card` require Pro. |
| `allow-try-it` | boolean | Enable Try-It. |
| `interactive-oauth` | boolean | Opt out of the Pro interactive OAuth flow with `"false"` (forces manual token paste). No effect without Pro. |
| `default-expand-operations` | boolean | Expand every operation on load. |
| `proxy-url` | string | Try-It proxy endpoint. |
| `server-url` | string | Override the API base URL for Try-It, ignoring the spec's `servers`. |
| `try-it-persist-ttl` | number (ms) | How long to persist Try-It auth and inputs in the browser. |
| `download-link` | boolean or URL | Show a download button — pass `true` to use the spec URL or a string to specify a different URL. |
| `docs-url` | string | URL for the upgrade prompt's docs link. |
| `upgrade-url` | string | URL for the upgrade prompt's upgrade link. |

Boolean attributes are truthy by default: any value other than `'false'`, `'0'`,
or `'off'` (case-insensitive) — including a bare attribute with no value — is
treated as `true`. To disable a boolean, set it to `false`/`0`/`off` or leave the
attribute unset.

## Property reference

For complex/JSON config, use the property API. Properties are available on the
custom element after it has been created.

| Property | Type | Description |
| --- | --- | --- |
| `spec` | `string \| object` | URL, raw string, or parsed spec object. |
| `theme` | `ThemeConfig` | Full theme config including `overrides`, `onThemeChange`. |
| `sidebarNav` | `SidebarNavConfig` | Custom sidebar navigation. |

## Events

The element dispatches standard `CustomEvent`s that bubble and are composed
through the shadow boundary. The `detail` property carries the typed payload.

| Event | `detail` type | When |
| --- | --- | --- |
| `spec-loaded` | `SpecLoadedInfo` (`{ title, version, type }`) | After the spec has been fetched and parsed. |
| `try-it-request` | `TryItRequest` | When the user clicks "Try it" — payload of the outgoing request. |
| `try-it-response` | `TryItResponse` | When the Try-It response is received. |

```ts
el.addEventListener('spec-loaded', (e) => {
  console.log((e as CustomEvent).detail) // { title, version, type }
})
```

## Shadow DOM

The element uses **open** shadow DOM. You can inspect it via
`el.shadowRoot` for debugging. The renderer's styles are isolated from your
page — host page CSS does not leak in, and renderer styles do not leak out.

### Design tokens cascade in

CSS custom properties inherit through shadow boundaries, so design tokens
defined on the host element are picked up by the renderer:

```css
omnispec-renderer {
  --omnispec-color-primary: #8B5CF6;
  --omnispec-color-primary-hover: #7C3AED;
  --omnispec-font-sans: 'Inter', sans-serif;
}
```

See [Theming](./theming.md) for the full token list.

### Sizing the element

By default the element renders as `display: block` with `width: 100%` and
`height: 100%`. Position it within your layout like any other block-level
element:

```css
omnispec-renderer {
  height: 100vh;
}
```

## Framework integration

### Vanilla HTML

```html
<script src="https://unpkg.com/@apiboost/omnispec@latest/dist/wc/standalone.js"></script>
<omnispec-renderer spec-url="/openapi.json"></omnispec-renderer>
```

### Vue 3

Tell the Vue compiler that any `<omnispec-...>` tag is a custom element so it
does not try to resolve it as a Vue component:

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
  import { ref, onMounted } from 'vue'
  import type { OmniSpecRendererElement } from '@apiboost/omnispec/wc'

  const docs = ref<OmniSpecRendererElement | null>(null)
  onMounted(() => {
    if (docs.value) docs.value.theme = { base: 'dark' }
  })
</script>

<template>
  <omnispec-renderer
    ref="docs"
    spec-url="/openapi.json"
    @spec-loaded="console.log($event.detail)"
  ></omnispec-renderer>
</template>
```

### Angular

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

### Svelte 5

```svelte
<script lang="ts">
  import '@apiboost/omnispec/wc'
  import type { OmniSpecRendererElement } from '@apiboost/omnispec/wc'

  let docs: OmniSpecRendererElement | undefined = $state()
  $effect(() => {
    if (docs) docs.theme = { base: 'dark' }
  })
</script>

<omnispec-renderer
  bind:this={docs}
  spec-url="/openapi.json"
></omnispec-renderer>
```

### React

If you already use React, prefer the React component — there is no benefit to
wrapping it in a custom element. The `<omnispec-renderer>` element exists for
non-React stacks.

## Working examples

Runnable examples for each framework live under
[`examples/`](https://github.com/apiboost/omnispec/tree/main/examples) in the
repository. Each has its own `README.md` with run instructions:

- `examples/vanilla-html/` — single-file demo, no build step
- `examples/vue/` — Vue 3 + Vite
- `examples/angular/` — Angular 18+ standalone component
- `examples/svelte/` — Svelte 5 + Vite (runes mode)

## Pro features in the Web Component

:::info[Pro]
Pro renderers (GraphQL, SOAP/WSDL, gRPC), full white-label theming
(`theme.overrides`), and interactive OAuth require
**[Apiboost OmniSpec Pro](https://apiboost.com/omnispec?utm_source=omnispec&utm_medium=docs&utm_campaign=pro)**. In the free core, the
`<omnispec-renderer>` element renders OpenAPI and AsyncAPI specs with the base
light/dark/auto theme and CSS-variable overrides. A parallel Pro Web Component
is not shipped today — Pro features are available through the React component.
:::

## Limitations and future work

- **JSON attributes** are convenient but verbose. Prefer the imperative
  property API for production use.
- **`@emotion/css` style mirroring** copies emotion-generated styles from
  `document.head` into the shadow root. The footprint per page is tiny
  (typically a few kilobytes), but if you mount many `<omnispec-renderer>`
  elements on one page they will each carry a copy. For most users this is
  not a concern.
