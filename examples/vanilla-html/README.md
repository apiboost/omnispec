# Vanilla HTML Example

The simplest possible integration — a single HTML file with no build step.

## Run it

From the omnispec monorepo root, build the package once so `dist/wc/standalone.js`
exists:

```bash
pnpm -F @apiboost/omnispec run build:wc
```

Then open `index.html` in a browser, or serve the directory with any static
file server:

```bash
npx serve .
```

## What it shows

- Loading the standalone UMD bundle via a single `<script>` tag.
- Setting `spec-url`, `theme-base`, and `display-mode` declaratively.
- Listening for the `spec-loaded` and `try-it-request` custom events.
- Overriding two design tokens via CSS on the host element — they cascade into
  the shadow DOM automatically.

## Production usage

In production, host the bundle on your own CDN or use unpkg / jsDelivr with a
pinned version:

```html
<script src="https://unpkg.com/@apiboost/omnispec@1.1.0/dist/wc/standalone.js"></script>
```
