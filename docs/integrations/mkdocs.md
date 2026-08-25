---
id: mkdocs
title: MkDocs
sidebar_label: MkDocs
description: Embed the OmniSpec Web Component in an MkDocs site — no build step, raw HTML in Markdown, theme sync with the Material palette toggle, and shadow-DOM styling.
---

# MkDocs

Embed `<omnispec-renderer>` in an [MkDocs](https://www.mkdocs.org/) site
(including [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/)).
MkDocs is a Python/Jinja static generator with no JavaScript build step, so you
use the framework-agnostic **[Web Component](../web-component.md)** loaded from a
CDN `<script>`.

## When to use

Use this guide for an MkDocs site. There is no bundler in the pipeline, so the
standalone bundle — a single self-contained `<script>` that ships React,
ReactDOM, and the renderer inline — is the natural fit. Everything runs
[client-side](../concepts.md#client-rendered-not-server-rendered) in the
browser, which is exactly what the renderer needs.

## Enable raw HTML in Markdown

MkDocs passes raw HTML in Markdown through to the page, so a plain
`<omnispec-renderer>` tag works out of the box. If you wrap the element in a
`<div>` (for example to size it), enable the `md_in_html` extension so Markdown
does not mangle the block:

```yaml
# mkdocs.yml
markdown_extensions:
  - md_in_html
```

## Minimal working example

Drop the standalone `<script>` and the element into any Markdown page:

```html
<div style="height: 100vh">
  <omnispec-renderer
    spec-url="https://petstore3.swagger.io/api/v3/openapi.json"
    theme-base="auto"
  ></omnispec-renderer>
</div>

<script src="https://unpkg.com/@apiboost/omnispec@latest/dist/wc/standalone.js"></script>
```

That is the whole integration — no install, no build.

## Sizing

The renderer fills its parent, and a short container leaves it cramped, so give
it a tall container. Inline style is fine (above), or add a rule via MkDocs's
`extra_css`:

```yaml
# mkdocs.yml
extra_css:
  - stylesheets/omnispec.css
```

```css
/* docs/stylesheets/omnispec.css */
omnispec-renderer {
  height: 100vh;
}
```

## Theme sync

Passing an explicit `theme-base` (`light`/`dark`) puts the renderer in
*controlled* mode: it follows the value you give it and **hides its own theme
toggle**. The simplest option is `theme-base="auto"`, which follows the system
preference.

Material for MkDocs's palette toggle sets `[data-md-color-scheme]` on `<body>`
(`default` for light, `slate` for dark). To follow that toggle, mirror it onto
the element with a small script:

```html
<script>
  const el = document.querySelector('omnispec-renderer')
  const body = document.body
  const sync = () =>
    el?.setAttribute(
      'theme-base',
      body.dataset.mdColorScheme === 'slate' ? 'dark' : 'light',
    )
  sync()
  new MutationObserver(sync).observe(body, {
    attributes: true,
    attributeFilter: ['data-md-color-scheme'],
  })
</script>
```

## Styling and the shadow DOM

`<omnispec-renderer>` uses **open** shadow DOM: your page CSS does not leak in.
Style it by setting `--omnispec-*` CSS custom properties **on the host
element** — they inherit through the shadow boundary:

```css
omnispec-renderer {
  --omnispec-color-primary: #8b5cf6;
}
```

See [Theming](../theming.md) for the full token list.

## Next steps

- [Integrations overview](../integrations-overview.md) — pick the right entry point
- [Web Component](../web-component.md) — the full `<omnispec-renderer>` API
- [Configuration](../configuration.md) — layouts, navigation, display modes
- [Theming](../theming.md) — design tokens and white-labeling
