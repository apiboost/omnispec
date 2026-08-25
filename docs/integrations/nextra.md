---
id: nextra
title: Nextra
sidebar_label: Nextra
description: Embed the OmniSpec React component in a Nextra site — a client-only mount under Next.js, MDX embedding, and theme sync with next-themes.
---

# Nextra

Embed `<OmniSpecRenderer>` in a [Nextra](https://nextra.site/) site. Nextra is
Next.js + MDX and React-based, so you embed the **React component** directly —
no Web Component needed.

## When to use

Use this guide when you are building a Nextra docs site. Because Next.js
server-renders (and statically generates) pages and the renderer is
[client-only](../concepts.md#client-rendered-not-server-rendered), the one
load-bearing requirement is that it must mount **client-side only**.

## Install

```bash
npm install @apiboost/omnispec
```

React and ReactDOM are already provided by Next.js, so nothing else is required.

## Minimal working example

Create a small client component and mount it only in the browser. There are two
equivalent ways to keep it client-only under Next SSR.

**Option A — a `'use client'` component.** Extract the renderer into its own
file marked `'use client'`, then import it into your MDX page:

```tsx
// components/ApiReference.tsx
'use client'
import {OmniSpecRenderer} from '@apiboost/omnispec'

export default function ApiReference() {
  return (
    <div style={{height: '100vh'}}>
      <OmniSpecRenderer spec="https://petstore3.swagger.io/api/v3/openapi.json" />
    </div>
  )
}
```

**Option B — `next/dynamic` with `ssr: false`.** Skip server rendering of the
component entirely:

```tsx
// components/ApiReference.tsx
import dynamic from 'next/dynamic'

const OmniSpecRenderer = dynamic(
  () => import('@apiboost/omnispec').then((m) => m.OmniSpecRenderer),
  {ssr: false, loading: () => <div>Loading the API reference…</div>},
)

export default function ApiReference() {
  return (
    <div style={{height: '100vh'}}>
      <OmniSpecRenderer spec="/openapi.json" />
    </div>
  )
}
```

:::info
A client-only mount is mandatory. The renderer relies on browser APIs (DOM,
`fetch`, `IntersectionObserver`) that do not exist during the build, so a plain
server-rendered import breaks `next build`.
:::

## Embedding in an MDX page

Import the wrapper component into any `.mdx` doc and render it like a normal
component:

```mdx
import ApiReference from '../components/ApiReference'

# API Reference

<ApiReference />
```

Keep the wrapper as the client boundary (Option A or B above) so the MDX page
itself stays a normal server-rendered doc.

## Theme sync

Passing an explicit `base` (`'light' | 'dark'`) puts the renderer in
*controlled* mode: it follows the value you give it and **hides its own theme
toggle**, so Nextra's header switcher stays the single source of truth. Nextra
uses [`next-themes`](https://github.com/pacocoursey/next-themes) under the hood,
so read the resolved theme with `useTheme()`:

```tsx
// components/ApiReference.tsx
'use client'
import {useTheme} from 'next-themes'
import {OmniSpecRenderer} from '@apiboost/omnispec'

export default function ApiReference() {
  const {resolvedTheme} = useTheme() // 'light' | 'dark'

  return (
    <div style={{height: '100vh'}}>
      <OmniSpecRenderer
        spec="/openapi.json"
        theme={{base: resolvedTheme === 'dark' ? 'dark' : 'light'}}
      />
    </div>
  )
}
```

Use `resolvedTheme` (not `theme`) so the `system` setting resolves to a concrete
`light`/`dark`. If you would rather not wire the hook, pass `theme={{base:
'auto'}}` to follow the system preference directly.

## Sizing and the sidebar

The renderer ships its **own sidebar navigation**. Give its container a tall,
explicit height (`height: 100vh`) — the renderer fills its parent, and a short
container leaves it cramped. Because Nextra keeps its own doc sidebar on the
page, add `layout="stacked"` to drop the renderer's sidebar and avoid a double
sidebar:

```tsx
<OmniSpecRenderer spec="/openapi.json" layout="stacked" />
```

## Next steps

- [Integrations overview](../integrations-overview.md) — pick the right entry point
- [App-framework recipes](../framework-integration.md) — more Next.js patterns
- [Configuration](../configuration.md) — layouts, navigation, display modes
- [Theming](../theming.md) — design tokens and white-labeling
- [API Reference](../api-reference.md) — all props and types
