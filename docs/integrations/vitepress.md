---
id: vitepress
title: VitePress
sidebar_label: VitePress
description: Embed the OmniSpec Web Component in a VitePress site — client-only registration, theme sync with the site's dark mode, complex props via refs, and shadow-DOM styling.
---

# VitePress

Embed `<omnispec-renderer>` in a [VitePress](https://vitepress.dev/) site.
VitePress is Vue-based, so you use the framework-agnostic **[Web
Component](../web-component.md)** — there is no React in the tree to hand the
React component to.

## When to use

Use this guide when you are building a VitePress docs site. VitePress
statically generates pages, and the renderer is
[client-only](../concepts.md#client-rendered-not-server-rendered), so the two
load-bearing requirements are: tell the Vue compiler that `<omnispec-*>` is a
custom element, and register the Web Component **only in the browser** so the
SSG build never touches its browser-only APIs.

## Install

```bash
npm install @apiboost/omnispec
```

## Tell Vue about the custom element

In `.vitepress/config.ts`, mark any `<omnispec-*>` tag as a custom element so
the Vue compiler leaves it alone instead of trying to resolve it as a Vue
component:

```ts
// .vitepress/config.ts
import {defineConfig} from 'vitepress'

export default defineConfig({
  vue: {
    template: {
      compilerOptions: {
        isCustomElement: (tag) => tag.startsWith('omnispec-'),
      },
    },
  },
})
```

## Register the Web Component client-side only

The `@apiboost/omnispec/wc` subpath registers the custom element by touching
`window`/`customElements`, which do not exist during the SSG build. Import it
lazily inside `onMounted` (which only runs in the browser), or guard the import
with `import.meta.env.SSR`.

The cleanest place is a small theme-enhancing wrapper in
`.vitepress/theme/index.ts`:

```ts
// .vitepress/theme/index.ts
import DefaultTheme from 'vitepress/theme'
import type {Theme} from 'vitepress'

const theme: Theme = {
  extends: DefaultTheme,
  enhanceApp() {
    if (!import.meta.env.SSR) {
      import('@apiboost/omnispec/wc')
    }
  },
}

export default theme
```

:::info
Registration must be client-only. Importing `@apiboost/omnispec/wc` at module
scope pulls browser-only APIs into the server bundle and breaks
`vitepress build`.
:::

## Minimal working example

With the element registered, drop it into any Markdown page. Give it a tall
container — the renderer fills its parent, and a short container leaves it
cramped:

```md
<div style="height: 100vh">
  <omnispec-renderer
    spec-url="https://petstore3.swagger.io/api/v3/openapi.json"
    theme-base="auto"
  ></omnispec-renderer>
</div>
```

`theme-base="auto"` follows the system preference and is the simplest option.
For real theme sync with VitePress's own toggle, use a `.vue` component (next
section).

## Theme sync

Passing an explicit `theme-base` (`light`/`dark`) puts the renderer in
*controlled* mode: it follows the value you give it and **hides its own theme
toggle**, so VitePress's switcher stays the single source of truth. Bind it to
VitePress's `useData().isDark`:

```vue
<!-- .vitepress/theme/ApiReference.vue -->
<script setup lang="ts">
  import {useData} from 'vitepress'
  import {computed} from 'vue'

  const {isDark} = useData()
  const base = computed(() => (isDark.value ? 'dark' : 'light'))
</script>

<template>
  <div style="height: 100vh">
    <omnispec-renderer
      spec-url="https://petstore3.swagger.io/api/v3/openapi.json"
      :theme-base="base"
    ></omnispec-renderer>
  </div>
</template>
```

Register the component globally in `enhanceApp` (`app.component('ApiReference',
ApiReference)`) and use `<ApiReference />` in any Markdown page.

## Complex props via a ref

Scalar config (URLs, enums, booleans) goes through kebab-case attributes.
Complex objects — a parsed spec, `theme.overrides`, or custom `sidebarNav` — are
set imperatively on the element via a `ref` in `onMounted`:

```vue
<script setup lang="ts">
  import {ref, onMounted} from 'vue'
  import type {OmniSpecRendererElement} from '@apiboost/omnispec/wc'

  const docs = ref<OmniSpecRendererElement | null>(null)

  onMounted(() => {
    if (docs.value) {
      docs.value.sidebarNav = {
        items: [{id: 'home', label: 'Home', href: '/'}],
      }
    }
  })
</script>

<template>
  <div style="height: 100vh">
    <omnispec-renderer ref="docs" spec-url="/openapi.json"></omnispec-renderer>
  </div>
</template>
```

## Styling and the shadow DOM

`<omnispec-renderer>` uses **open** shadow DOM: your page CSS does not leak in.
Style it by setting `--omnispec-*` CSS custom properties **on the host
element** — they inherit through the shadow boundary:

```css
omnispec-renderer {
  --omnispec-color-primary: #8b5cf6;
  --omnispec-font-sans: 'Inter', sans-serif;
}
```

See [Theming](../theming.md) for the full token list.

## Sizing and the sidebar

The renderer ships its **own sidebar navigation**. Give the element a tall
container (`height: 100vh`) so it has room. If the page already lives inside
VitePress's own doc sidebar and layout, add `layout="stacked"` to drop the
renderer's sidebar and lay operations out in a single column:

```md
<omnispec-renderer spec-url="/openapi.json" layout="stacked"></omnispec-renderer>
```

## Next steps

- [Integrations overview](../integrations-overview.md) — pick the right entry point
- [Web Component](../web-component.md) — the full `<omnispec-renderer>` API
- [Configuration](../configuration.md) — layouts, navigation, display modes
- [Theming](../theming.md) — design tokens and white-labeling
