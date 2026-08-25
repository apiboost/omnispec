---
id: plain-html
title: Plain HTML
sidebar_label: Plain HTML
description: Embed the OmniSpec Web Component in a plain HTML file — one standalone script, no build step, theme sync, and imperative props via JavaScript.
---

# Plain HTML

The simplest possible integration: one `<script>` and one
`<omnispec-renderer>` element in a static HTML file, with no build step. This
uses the framework-agnostic **[Web Component](../web-component.md)** and its
standalone bundle — a single self-contained script that ships React, ReactDOM,
and the renderer inline.

## When to use

Use this when you are dropping API docs onto a plain HTML page, a CMS template,
or any site without a JavaScript bundler. Everything runs
[client-side](../concepts.md#client-rendered-not-server-rendered) in the
browser, which is exactly what the renderer needs — there is no server rendering
to worry about.

:::info
The standalone bundle inlines React and ReactDOM. That is ideal for non-React
sites, but wasteful inside an app that already ships React — there, use the
subpath import (`import '@apiboost/omnispec/wc'`) or the React component. See the
[Web Component](../web-component.md) reference and the other
[integration guides](../integrations-overview.md).
:::

## Minimal working example

A complete, copy-pasteable page with a full-height container:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>API Reference</title>
    <style>
      html,
      body {
        margin: 0;
        height: 100%;
      }
      omnispec-renderer {
        display: block;
        height: 100vh;
      }
    </style>
  </head>
  <body>
    <omnispec-renderer
      spec-url="https://petstore3.swagger.io/api/v3/openapi.json"
      theme-base="auto"
    ></omnispec-renderer>

    <script src="https://unpkg.com/@apiboost/omnispec@latest/dist/wc/standalone.js"></script>
  </body>
</html>
```

`theme-base="auto"` follows the system light/dark preference and shows a
floating theme toggle. Set `theme-base="light"` or `theme-base="dark"` to pin it
and hide the toggle.

## Sizing

The renderer fills its parent and ships its **own sidebar navigation**, so give
it a tall container — `height: 100vh` above gives it the whole viewport. A short
container leaves it cramped.

## Complex props via JavaScript

Scalar config (URLs, enums, booleans) goes through kebab-case attributes.
Complex objects — a parsed spec, `theme.overrides`, or a custom `sidebarNav` —
are set imperatively as **properties** on the element in a script:

```html
<omnispec-renderer id="docs"></omnispec-renderer>

<script src="https://unpkg.com/@apiboost/omnispec@latest/dist/wc/standalone.js"></script>
<script>
  const el = document.getElementById('docs')
  el.spec = {
    /* a parsed OpenAPI/AsyncAPI object */
  }
  el.theme = {
    base: 'dark',
    overrides: {'--omnispec-color-primary': '#8b5cf6'},
  }
  el.sidebarNav = {
    items: [{id: 'home', label: 'Home', href: '/'}],
  }
</script>
```

An imperative property always wins over the matching attribute when both are
set. You can also listen for events (`spec-loaded`, `try-it-request`,
`try-it-response`) with `el.addEventListener(...)`.

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

## Next steps

- [Integrations overview](../integrations-overview.md) — pick the right entry point
- [Web Component](../web-component.md) — the full `<omnispec-renderer>` API, attributes, and events
- [Configuration](../configuration.md) — layouts, navigation, display modes
- [Theming](../theming.md) — design tokens and white-labeling
