---
id: astro-starlight
title: Astro / Starlight
sidebar_label: Astro / Starlight
description: Embed OmniSpec in an Astro or Starlight site — the Web Component via a client script, or a React island with client:only, plus theme sync and sizing.
---

# Astro / Starlight

Embed OmniSpec in an [Astro](https://astro.build/) site or a
[Starlight](https://starlight.astro.build/) docs site. Astro is
framework-agnostic, so you have two paths: the framework-agnostic **[Web
Component](../web-component.md)** (no React needed), or a **React island** using
the React component (needs the React integration). Both work — pick by whether
you already ship React on the page.

## When to use

Use this guide for an Astro or Starlight site. Astro statically generates pages
and the renderer is
[client-only](../concepts.md#client-rendered-not-server-rendered), so in both
paths it must be mounted **client-only** — use `client:only` (not
`client:load`), which skips server rendering of the renderer entirely rather
than rendering it on the server and hydrating.

## Option A — Web Component (no React)

The simplest path: no framework integration, no build wiring. Drop the
standalone bundle and the element into an `.mdx` page.

```mdx
---
title: API Reference
---

<div style="height: 100vh">
  <omnispec-renderer
    spec-url="https://petstore3.swagger.io/api/v3/openapi.json"
    theme-base="auto"
  ></omnispec-renderer>
</div>

<script src="https://unpkg.com/@apiboost/omnispec@latest/dist/wc/standalone.js"></script>
```

Astro leaves `<script src>` tags with a full URL as-is and runs them in the
browser, so the element registers client-side. If you install the package
instead of using the CDN, register it from a client script:

```mdx
<script>
  import '@apiboost/omnispec/wc'
</script>
```

An Astro `<script>` (without a `src` to an external URL) is bundled and runs on
the client only, which keeps the browser-only registration out of the SSG build.

## Option B — React island (`client:only`)

If you prefer the React component, add the React integration and mount it as a
client-only island.

```bash
npx astro add react
npm install @apiboost/omnispec
```

```tsx
// src/components/ApiReference.tsx
import {OmniSpecRenderer} from '@apiboost/omnispec'

export default function ApiReference() {
  return (
    <div style={{height: '100vh'}}>
      <OmniSpecRenderer
        spec="https://petstore3.swagger.io/api/v3/openapi.json"
        theme={{base: 'auto'}}
      />
    </div>
  )
}
```

```mdx
---
title: API Reference
---

import ApiReference from '../../components/ApiReference'

<ApiReference client:only="react" />
```

:::info
Use `client:only="react"`, not `client:load`. `client:only` skips server
rendering of the island, so Astro's static build never evaluates the renderer's
browser-only APIs (DOM, `fetch`, `IntersectionObserver`).
:::

## Theme sync

Passing an explicit theme base puts the renderer in *controlled* mode: it
follows the value you give it and **hides its own theme toggle**, so the site's
switcher stays the single source of truth.

Starlight tracks the active theme with a `data-theme="light" | "dark"`
attribute on `<html>`. The simplest option in either path is
`theme-base="auto"` (Web Component) or `theme={{base: 'auto'}}` (React), which
follows the system preference. To follow Starlight's own toggle, mirror
`data-theme` onto the element:

```mdx
<script>
  const el = document.querySelector('omnispec-renderer')
  const html = document.documentElement
  const sync = () =>
    el?.setAttribute('theme-base', html.dataset.theme === 'dark' ? 'dark' : 'light')
  sync()
  new MutationObserver(sync).observe(html, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })
</script>
```

## Styling and the shadow DOM

The Web Component uses **open** shadow DOM: your page CSS does not leak in.
Style it by setting `--omnispec-*` CSS custom properties **on the host
element** — they inherit through the shadow boundary:

```css
omnispec-renderer {
  --omnispec-color-primary: #8b5cf6;
}
```

See [Theming](../theming.md) for the full token list.

## Sizing and the sidebar

The renderer ships its **own sidebar navigation**. Give the element a tall
container (`height: 100vh`). Starlight already renders its own doc sidebar, so
add `layout="stacked"` (Web Component) or `layout="stacked"` prop (React) to
drop the renderer's sidebar and avoid a double sidebar.

## Next steps

- [Integrations overview](../integrations-overview.md) — pick the right entry point
- [Web Component](../web-component.md) — the full `<omnispec-renderer>` API
- [Configuration](../configuration.md) — layouts, navigation, display modes
- [Theming](../theming.md) — design tokens and white-labeling
