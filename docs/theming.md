# Theming & Customization

The renderer uses CSS custom properties (design tokens) prefixed with `--omnispec-` for all visual styling. This enables white-labeling without modifying source code.

## Built-in Themes

Two themes are included: `light` and `dark`.

```tsx
<OmniSpecRenderer spec={url} theme={{ base: 'light' }} />
<OmniSpecRenderer spec={url} theme={{ base: 'dark' }} />
```

## Theme Modes

The `theme.base` prop supports three values:

### Controlled Mode (`'light'` or `'dark'`)

The parent application controls the theme. No built-in toggle is rendered. This is the default behavior for embedded use cases where the host app already has its own theme switching:

```tsx
// Parent app controls the theme
const [mode, setMode] = useState<'light' | 'dark'>('light')

<OmniSpecRenderer spec={url} theme={{ base: mode }} />
```

### Auto Mode (`'auto'`)

The renderer detects the user's system preference (`prefers-color-scheme`) and manages theme state internally. A floating toggle button (sun/moon icon) appears in the bottom-right corner:

```tsx
<OmniSpecRenderer spec={url} theme={{ base: 'auto' }} />
```

This is ideal for standalone deployments where the renderer is the primary page content.

#### Hiding the Toggle

To use auto-detection without showing the built-in toggle (e.g., your app provides its own toggle):

```tsx
<OmniSpecRenderer
  spec={url}
  theme={{
    base: 'auto',
    themeToggle: false,
  }}
/>
```

#### Listening to Theme Changes

Use `onThemeChange` to sync external UI with the renderer's resolved theme:

```tsx
<OmniSpecRenderer
  spec={url}
  theme={{
    base: 'auto',
    onThemeChange: (theme) => {
      document.documentElement.setAttribute('data-theme', theme)
    },
  }}
/>
```

### Mode Comparison

| `base` | `themeToggle` | Behavior |
|--------|---------------|----------|
| `'light'` / `'dark'` | ignored | Controlled by developer, no toggle |
| `'auto'` | `true` (default) | System preference + built-in toggle |
| `'auto'` | `false` | System preference, no toggle, use `onThemeChange` |

## Custom Theme Overrides

Override any token to match your brand:

```tsx
<OmniSpecRenderer
  spec={url}
  theme={{
    base: 'light',
    overrides: {
      '--omnispec-color-primary': '#8B5CF6',
      '--omnispec-color-primary-hover': '#7C3AED',
      '--omnispec-color-primary-text': '#ffffff',
      '--omnispec-nav-accent': '#8B5CF6',
      '--omnispec-border-radius': '8px',
    },
  }}
/>
```

Overrides are merged on top of the base theme. Only specify the tokens you want to change.

### Per-Mode Overrides (Light vs Dark)

`theme.overrides` is a single object that applies to whichever mode is active. If you set `--omnispec-bg-primary` to `#faf5ff`, that color is used in both light and dark mode.

To apply different overrides per mode, control the mode yourself and pass different override objects:

```tsx
const lightOverrides = {
  '--omnispec-bg-primary': '#faf5ff',
  '--omnispec-color-primary': '#7c3aed',
  '--omnispec-nav-bg': '#f3e8ff',
}

const darkOverrides = {
  '--omnispec-bg-primary': '#1a1025',
  '--omnispec-color-primary': '#a78bfa',
  '--omnispec-nav-bg': '#2d1b4e',
}

function OmniSpec() {
  const [mode, setMode] = useState<'light' | 'dark'>('light')

  return (
    <OmniSpecRenderer
      spec={url}
      theme={{
        base: mode,
        overrides: mode === 'light' ? lightOverrides : darkOverrides,
      }}
    />
  )
}
```

With `theme.base: 'auto'`, the renderer manages the mode internally. Use the `onThemeChange` callback to sync your override selection:

```tsx
function OmniSpec() {
  const [resolvedMode, setResolvedMode] = useState<'light' | 'dark'>('light')

  return (
    <OmniSpecRenderer
      spec={url}
      theme={{
        base: 'auto',
        overrides: resolvedMode === 'light' ? lightOverrides : darkOverrides,
        onThemeChange: setResolvedMode,
      }}
    />
  )
}
```

### CSS-Only Per-Mode Overrides

If you prefer CSS over props, use `prefers-color-scheme` media queries:

```css
.omnispec-root {
  --omnispec-color-primary: #7c3aed;
}

@media (prefers-color-scheme: dark) {
  .omnispec-root {
    --omnispec-color-primary: #a78bfa;
    --omnispec-bg-primary: #1a1025;
    --omnispec-nav-bg: #2d1b4e;
  }
}
```

This works with any theme mode including `'auto'`, and doesn't require Pro since it bypasses `theme.overrides`.

### Using CSS `var()` References

When integrating with an app that already defines its own CSS custom properties, you can map them directly using `var()` references. This allows the browser to resolve them at runtime from the host app's theme stylesheet:

```tsx
<OmniSpecRenderer
  spec={url}
  theme={{
    base: 'light',
    overrides: {
      '--omnispec-color-primary': 'var(--color-primary)',
      '--omnispec-fg-primary': 'var(--color-text)',
      '--omnispec-h1-color': 'var(--h1-font-color, var(--color-heading))',
      '--omnispec-btn-primary-bg': 'var(--color-primary)',
    },
  }}
/>
```

Fallback values are supported: `'var(--btn-font-size, 13px)'`.

## Design Token Reference

### Surface Colors

| Token | Light Default | Dark Default | Description |
|-------|--------------|-------------|-------------|
| `--omnispec-bg-primary` | `#ffffff` | `#0d1117` | Main background |
| `--omnispec-bg-secondary` | `#f8f9fa` | `#161b22` | Cards, panels |
| `--omnispec-bg-tertiary` | `#f1f3f5` | `#21262d` | Table headers, badges |
| `--omnispec-bg-code` | `#f5f5f5` | `#1c2128` | Code block background |

### Text Colors

| Token | Light Default | Dark Default | Description |
|-------|--------------|-------------|-------------|
| `--omnispec-fg-primary` | `#1a1a2e` | `#e6edf3` | Primary text |
| `--omnispec-fg-secondary` | `#4a4a6a` | `#b1bac4` | Secondary text, descriptions |
| `--omnispec-fg-muted` | `#8c8ca1` | `#7d8590` | Muted text, hints |
| `--omnispec-fg-code` | `#d63384` | `#ff7b72` | Inline code text |
| `--omnispec-fg-link` | `#0969da` | `#58a6ff` | Links |

### Headings

| Token | Light Default | Dark Default | Description |
|-------|--------------|-------------|-------------|
| `--omnispec-h1-font-size` | `1.75rem` | `1.75rem` | H1 font size (API title) |
| `--omnispec-h1-font-weight` | `800` | `800` | H1 font weight |
| `--omnispec-h1-color` | `#1a1a2e` | `#e6edf3` | H1 text color |
| `--omnispec-h2-font-size` | `1.25rem` | `1.25rem` | H2 font size (section headings) |
| `--omnispec-h2-font-weight` | `700` | `700` | H2 font weight |
| `--omnispec-h2-color` | `#1a1a2e` | `#e6edf3` | H2 text color |
| `--omnispec-h3-font-size` | `1rem` | `1rem` | H3 font size (sub-section headings) |
| `--omnispec-h3-font-weight` | `600` | `600` | H3 font weight |
| `--omnispec-h3-color` | `#1a1a2e` | `#e6edf3` | H3 text color |

### Brand / Accent

| Token | Light Default | Dark Default | Description |
|-------|--------------|-------------|-------------|
| `--omnispec-color-primary` | `#0969da` | `#58a6ff` | Primary action color |
| `--omnispec-color-primary-hover` | `#0550ae` | `#79c0ff` | Primary hover state |
| `--omnispec-color-primary-text` | `#ffffff` | `#0d1117` | Text on primary color |

> **Schema styles reuse these tokens.** The [`schemaStyle`](./configuration.md#schema-style-schemastyle)
> presentations are fully token-driven — no new tokens are introduced. The
> `tokens` style tints the property type with `--omnispec-color-primary` and the
> format / enum chips with `--omnispec-color-info`; the `card` style draws its
> nested accent rail from `--omnispec-color-primary` and its enclosing surface
> from `--omnispec-bg-primary` / `--omnispec-border-color`. Override those tokens
> to re-skin every schema style at once.

### Navigation

These tokens control the sidebar navigation layout, spacing, and styling. They apply to both spec-derived navigation and [custom sidebar navigation](./template_customization/sidebar.md).

| Token | Light Default | Dark Default | Description |
|-------|--------------|-------------|-------------|
| `--omnispec-nav-bg` | `#f6f8fa` | `#161b22` | Sidebar background |
| `--omnispec-nav-text` | `#1a1a2e` | `#e6edf3` | Item text color |
| `--omnispec-nav-hover-bg` | `#eaeef2` | `#21262d` | Item hover background |
| `--omnispec-nav-accent` | `#0969da` | `#58a6ff` | Active item border color |
| `--omnispec-nav-active-bg` | `#eaeef2` | `#21262d` | Active item background |
| `--omnispec-nav-active-border-width` | `0.1875rem` | `0.1875rem` | Active indicator width. Set to `0` to hide |
| `--omnispec-nav-item-padding-v` | `0.625rem` | `0.625rem` | Item vertical padding |
| `--omnispec-nav-item-padding-h` | `0.75rem` | `0.75rem` | Item horizontal padding |
| `--omnispec-nav-indent` | `0.875rem` | `0.875rem` | Per-depth child indentation |
| `--omnispec-nav-item-gap` | `0.5rem` | `0.5rem` | Gap between icon, label, and badge |
| `--omnispec-nav-item-radius` | `0` | `0` | Item border radius. Set `0.375rem` for rounded items |
| `--omnispec-nav-group-font-size` | `0.8125rem` | `0.8125rem` | Group heading font size |
| `--omnispec-nav-group-font-weight` | `600` | `600` | Group heading font weight |
| `--omnispec-nav-group-letter-spacing` | `0.04em` | `0.04em` | Group heading letter spacing |
| `--omnispec-nav-group-text-transform` | `uppercase` | `uppercase` | Group heading text transform. Set to `none` for sentence case |
| `--omnispec-nav-badge-radius` | `0.25rem` | `0.25rem` | Method/status badge border radius |
| `--omnispec-nav-badge-text` | `#ffffff` | `#ffffff` | Badge text color |
| `--omnispec-nav-width` | `18.75rem` | `18.75rem` | Sidebar width |
| `--omnispec-nav-divider-color` | `#d0d7de` | `#30363d` | Divider between custom and spec navigation |

#### Navigation Style Recipes

**Clean** — no active border, sentence-case headings, rounded items:

```tsx
theme={{
  base: 'light',
  overrides: {
    '--omnispec-nav-active-border-width': '0',
    '--omnispec-nav-item-radius': '0.375rem',
    '--omnispec-nav-group-text-transform': 'none',
    '--omnispec-nav-group-font-size': '1rem',
    '--omnispec-nav-indent': '1.25rem',
  },
}}
```

**Compact** — narrow sidebar, tighter items, pill-shaped active state:

```tsx
theme={{
  base: 'light',
  overrides: {
    '--omnispec-nav-width': '16rem',
    '--omnispec-nav-item-padding-v': '0.375rem',
    '--omnispec-nav-item-radius': '0.25rem',
    '--omnispec-nav-active-border-width': '0',
    '--omnispec-nav-active-bg': '#eef2ff',
    '--omnispec-nav-accent': '#4f46e5',
  },
}}
```

**Minimal** — no backgrounds, transparent active state:

```tsx
theme={{
  base: 'light',
  overrides: {
    '--omnispec-nav-bg': 'transparent',
    '--omnispec-nav-hover-bg': 'transparent',
    '--omnispec-nav-active-bg': 'transparent',
    '--omnispec-nav-active-border-width': '0',
  },
}}
```

### Scrollbar

Custom scrollbar styling is applied to all scrollable areas inside the renderer (sidebar, main content, code blocks). Both Firefox (`scrollbar-width`/`scrollbar-color`) and WebKit (`::-webkit-scrollbar`) are supported.

| Token | Light Default | Dark Default | Description |
|-------|--------------|-------------|-------------|
| `--omnispec-scrollbar-width` | `0.5rem` | `0.5rem` | Scrollbar width |
| `--omnispec-scrollbar-track` | `transparent` | `transparent` | Track background |
| `--omnispec-scrollbar-thumb` | `#c1c7cd` | `#484f58` | Thumb color |
| `--omnispec-scrollbar-thumb-hover` | `#a0a8b0` | `#6e7681` | Thumb hover color |

### Form controls

Native form controls inside the renderer are themed automatically so they match the active theme (including dark mode) — no per-control configuration needed:

- **Checkboxes & radios** are custom-rendered (`appearance: none`) using `--omnispec-input-bg` / `--omnispec-input-border`, and fill with `--omnispec-color-primary` (white check / centered dot) when selected.
- **Selects** use `--omnispec-input-bg` / `--omnispec-input-border` / `--omnispec-fg-primary` for the box, `--omnispec-border-radius` for the corners, and a custom chevron; hover/focus adopt `--omnispec-color-primary`.

Override the referenced tokens (`--omnispec-color-primary`, `--omnispec-input-*`, `--omnispec-border-radius`) to re-skin every control at once.

### Layout

| Token | Default | Description |
|-------|---------|-------------|
| `--omnispec-offset-top` | `0px` | Global offset for sticky elements (sidebar, Try-It panel). Set this to the height of your external sticky header so the renderer clears it. |

This is a **CSS-only variable** — it is not part of the `theme.overrides` system. Set it via a CSS rule targeting `.omnispec-root`:

```css
.omnispec-root {
  --omnispec-offset-top: 3rem; /* height of your sticky navbar */
}
```

This single variable adjusts:
- **Sidebar** — sticks below the nav, height subtracts the offset
- **Try-It panel** — sticky position accounts for the offset
- **Expand/collapse button** — clears the nav

### Buttons

| Token | Light Default | Dark Default | Description |
|-------|--------------|-------------|-------------|
| `--omnispec-btn-font-size` | `0.8125rem` | `0.8125rem` | Button font size |
| `--omnispec-btn-radius` | `0.375rem` | `0.375rem` | Button border radius |
| `--omnispec-btn-primary-bg` | `#0969da` | `#58a6ff` | Primary button background |
| `--omnispec-btn-primary-text` | `#ffffff` | `#0d1117` | Primary button text |
| `--omnispec-btn-primary-bg-hover` | `#0550ae` | `#79c0ff` | Primary button hover bg |
| `--omnispec-btn-primary-text-hover` | `#ffffff` | `#0d1117` | Primary button hover text |
| `--omnispec-btn-primary-shadow` | `none` | `none` | Primary button box-shadow |
| `--omnispec-btn-primary-shadow-hover` | `none` | `none` | Primary button hover box-shadow |
| `--omnispec-btn-secondary-bg` | `#f8f9fa` | `#21262d` | Secondary button background |
| `--omnispec-btn-secondary-text` | `#1a1a2e` | `#e6edf3` | Secondary button text |
| `--omnispec-btn-secondary-bg-hover` | `#eaeef2` | `#30363d` | Secondary button hover bg |
| `--omnispec-btn-secondary-text-hover` | `#1a1a2e` | `#e6edf3` | Secondary button hover text |
| `--omnispec-btn-secondary-shadow` | `none` | `none` | Secondary button box-shadow |
| `--omnispec-btn-secondary-shadow-hover` | `none` | `none` | Secondary button hover box-shadow |

### HTTP Method Colors

| Token | Light Default | Dark Default | Description |
|-------|--------------|-------------|-------------|
| `--omnispec-color-get` | `#1a7f37` | `#3fb950` | GET method badge |
| `--omnispec-color-post` | `#0550ae` | `#58a6ff` | POST method badge |
| `--omnispec-color-put` | `#bf8700` | `#d29922` | PUT method badge |
| `--omnispec-color-delete` | `#cf222e` | `#f85149` | DELETE method badge |
| `--omnispec-color-patch` | `#8250df` | `#bc8cff` | PATCH method badge |

### AsyncAPI Protocol Colors

| Token | Light Default | Dark Default | Description |
|-------|--------------|-------------|-------------|
| `--omnispec-color-publish` | `#0550ae` | `#58a6ff` | Publish/Send operations |
| `--omnispec-color-subscribe` | `#1a7f37` | `#3fb950` | Subscribe/Receive operations |

### Status Colors

| Token | Light Default | Dark Default | Description |
|-------|--------------|-------------|-------------|
| `--omnispec-color-success` | `#1a7f37` | `#3fb950` | Success states, 2xx responses |
| `--omnispec-color-warning` | `#bf8700` | `#d29922` | Warning states, 4xx responses |
| `--omnispec-color-error` | `#cf222e` | `#f85149` | Error states, 5xx responses |
| `--omnispec-color-info` | `#0550ae` | `#58a6ff` | Info states, 3xx responses |

### Border & UI

| Token | Light Default | Dark Default | Description |
|-------|--------------|-------------|-------------|
| `--omnispec-border-color` | `#d0d7de` | `#30363d` | Borders, dividers |
| `--omnispec-border-radius` | `0.375rem` | `0.375rem` | Border radius for cards, inputs |
| `--omnispec-input-bg` | `#ffffff` | `#0d1117` | Form input background |
| `--omnispec-input-border` | `#d0d7de` | `#30363d` | Form input border |

### Typography

| Token | Light Default | Dark Default | Description |
|-------|--------------|-------------|-------------|
| `--omnispec-font-sans` | `-apple-system, BlinkMacSystemFont, "Segoe UI", ...` | Same | Body font stack. Override with `'"Inter", sans-serif'` or any custom font. |
| `--omnispec-font-mono` | `ui-monospace, SFMono-Regular, ...` | Same | Monospace font stack |
| `--omnispec-font-size-base` | `0.9375rem` | `0.9375rem` | Base font size |
| `--omnispec-font-size-md` | `1rem` | `1rem` | Medium text (card titles, schema/type section headings) |
| `--omnispec-font-size-sm` | `0.8125rem` | `0.8125rem` | Small text |
| `--omnispec-font-size-xs` | `0.75rem` | `0.75rem` | Extra small (badges, labels) |
| `--omnispec-font-size-xxs` | `0.625rem` | `0.625rem` | Extra extra small (method badges) |
| `--omnispec-font-size-lg` | `1rem` | `1rem` | Large text |
| `--omnispec-font-size-xl` | `1.25rem` | `1.25rem` | Extra large text |

The default sans-serif stack uses system fonts for zero download cost and instant rendering. To use a custom font like Inter, override the token and load the font in your app:

```tsx
// Load Inter via Google Fonts (or self-host)
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

<OmniSpecRenderer
  spec={url}
  theme={{
    base: 'light',
    overrides: {
      '--omnispec-font-sans': '"Inter", sans-serif',
    },
  }}
/>
```

## Programmatic Theme Access

Access the current theme in custom slot components:

```tsx
import { useTheme } from '@apiboost/omnispec'

function MyCustomComponent() {
  const { base, tokens } = useTheme()

  return (
    <div style={{
      backgroundColor: base === 'dark' ? '#1a1a2e' : '#ffffff',
      color: tokens['--omnispec-fg-primary'],
    }}>
      Custom content
    </div>
  )
}
```

## CSS Override Example

Target the `omnispec-root` class for global overrides:

```css
.omnispec-root {
  --omnispec-font-size-base: 15px;
  --omnispec-font-size-sm: 13px;
}

.omnispec-root .omnispec-endpoint-card {
  border-radius: 12px;
}
```

## White-Label Checklist

To fully white-label the renderer for a client:

1. Set `--omnispec-color-primary` and `--omnispec-color-primary-hover` to the client's brand color
2. Set heading colors via `--omnispec-h1-color`, `--omnispec-h2-color`, `--omnispec-h3-color`
3. Set button styles via `--omnispec-btn-*` tokens to match the client's button design
4. Set `--omnispec-nav-accent` and `--omnispec-nav-active-bg` to match the primary color
5. Customize sidebar layout via `--omnispec-nav-*` tokens (width, padding, indent, radius)
6. Inject the client's logo via `slots.sidebarHeader` or `slots.logo`
7. Inject the client's header/footer via `slots.header` / `slots.footer`
8. Add custom navigation via [`sidebarNav`](./template_customization/sidebar.md)
9. Font families are inherited automatically from the parent app

## Related

- [Slots](./template_customization/slots.md) — inject custom components into layout regions
- [Sidebar Navigation](./template_customization/sidebar.md) — add custom links and groups to the sidebar
- [Configuration](./configuration.md) — layout modes, Try-It options, callbacks
