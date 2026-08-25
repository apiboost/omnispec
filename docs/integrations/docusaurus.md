---
id: docusaurus
title: Docusaurus
sidebar_label: Docusaurus
description: Embed the OmniSpec renderer in a Docusaurus site — a client-only full-page route, theme sync with the site's color mode, and MDX embedding.
---

# Docusaurus

Embed `<OmniSpecRenderer>` in a [Docusaurus](https://docusaurus.io/) site. This
guide is built from the pattern that powers the
[live demo](https://apiboost.github.io/omnispec/demo).

## When to use

Use this guide when you are building a Docusaurus docs site. Docusaurus is
React-based, so you embed the **React component** directly — no Web Component
needed. Because Docusaurus server-renders pages at build time and the renderer is
[client-only](../concepts.md#client-rendered-not-server-rendered), the one
load-bearing requirement is that it must be wrapped in `<BrowserOnly>`.

## Install

```bash
npm install @apiboost/omnispec
```

React and ReactDOM are already provided by Docusaurus, so nothing else is
required.

## Minimal working example

Create a full-page route at `src/pages/api.tsx`. This mounts the renderer inside
`<BrowserOnly>` on a full-height stage:

```tsx
// src/pages/api.tsx
import Layout from '@theme/Layout'
import BrowserOnly from '@docusaurus/BrowserOnly'
import {useColorMode} from '@docusaurus/theme-common'

// Only mounts client-side (see BrowserOnly below), so useColorMode and the
// browser-only renderer are both safe to use here.
function LiveRenderer(): React.ReactNode {
  const {colorMode} = useColorMode() // 'light' | 'dark' — tracks the header toggle
  const {OmniSpecRenderer} = require('@apiboost/omnispec') as typeof import('@apiboost/omnispec')

  return (
    <OmniSpecRenderer
      spec="https://petstore3.swagger.io/api/v3/openapi.json"
      theme={{base: colorMode}}
    />
  )
}

export default function ApiPage(): React.ReactNode {
  return (
    <Layout title="API Reference" description="API documentation">
      <div style={{height: '100vh'}}>
        <BrowserOnly fallback={<div>Loading the API reference…</div>}>
          {() => <LiveRenderer />}
        </BrowserOnly>
      </div>
    </Layout>
  )
}
```

The `require('@apiboost/omnispec')` call lives **inside** the `<BrowserOnly>`
child (`LiveRenderer`), not at the top of the module. The renderer relies on
browser APIs (DOM, `fetch`, `IntersectionObserver`) that do not exist during the
static build, so importing it at module scope would break `docusaurus build`.
`<BrowserOnly>` renders its child only in the browser, and the `require` inside it
defers loading the package until then.

:::info
`<BrowserOnly>` is mandatory. Without it, `docusaurus build` fails when it tries
to server-render the renderer.
:::

## Theme sync

Passing an explicit `base` (`'light' | 'dark'`) puts the renderer in *controlled*
mode: it follows the value you give it and **hides its own theme toggle**, so the
site's header switcher stays the single source of truth. Wire it to Docusaurus's
color mode with `useColorMode`:

```tsx
const {colorMode} = useColorMode() // 'light' | 'dark'

return <OmniSpecRenderer spec="/openapi.json" theme={{base: colorMode}} />
```

`useColorMode` is a hook from `@docusaurus/theme-common`, so it must be called
from inside the `<BrowserOnly>` child (as in the example above) — it is not
available during server rendering.

## Embedding in MDX vs a full-page route

**Full-page route** (recommended): the `src/pages/api.tsx` route above gives the
renderer the whole viewport. Best when the API reference is a destination of its
own.

**Inside an MDX doc:** you can drop the renderer into an MDX page, still wrapped
in `<BrowserOnly>`. Give it a tall, explicit container height — the renderer fills
its parent, and a short container leaves it cramped:

```mdx
import BrowserOnly from '@docusaurus/BrowserOnly'

<BrowserOnly fallback={<div>Loading…</div>}>
  {() => {
    const {OmniSpecRenderer} = require('@apiboost/omnispec')
    return (
      <div style={{height: '100vh'}}>
        <OmniSpecRenderer spec="/openapi.json" theme={{base: 'auto'}} />
      </div>
    )
  }}
</BrowserOnly>
```

MDX pages do not expose `useColorMode` as conveniently, so either call it from a
small extracted component (as in the full-page example) or use
`theme={{base: 'auto'}}` to follow the system preference.

## Sidebar coexistence

The renderer ships its **own sidebar navigation**. On a normal MDX doc page it
would sit next to the Docusaurus doc sidebar, which crowds the layout. Two ways to
avoid the double sidebar:

- **Use a full-page route** (`src/pages/*`) — pages have no Docusaurus doc
  sidebar, so the renderer's sidebar stands alone. This is the recommended
  approach.
- **Use `layout="stacked"`** if you must embed inside a doc that keeps the
  Docusaurus sidebar — stacked layout drops the renderer's own sidebar and lays
  the operations out in a single column.

## Live demo

See it running: **[apiboost.github.io/omnispec/demo](https://apiboost.github.io/omnispec/demo)**.
That page uses exactly this pattern — `<BrowserOnly>`, a client-side
`require('@apiboost/omnispec')`, `useColorMode` theme sync, and a full-height
stage.

## Next steps

- [Integrations overview](../integrations-overview.md) — pick the right entry point
- [Configuration](../configuration.md) — layouts, navigation, display modes
- [Theming](../theming.md) — design tokens and white-labeling
- [API Reference](../api-reference.md) — all props and types
