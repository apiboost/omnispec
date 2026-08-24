# Slots

Slots let you inject your own React components into predefined regions of the documentation layout — headers, footers, sidebar branding, and more. Use them to embed the renderer inside your app's chrome without forking or wrapping.

## Available Slots

| Slot | Location | Typical Use |
|------|----------|-------------|
| `header` | Above the entire renderer | App navigation bar, environment banners |
| `footer` | Below the entire renderer | Copyright, support links |
| `contentHeader` | Above the main content, below header | Breadcrumbs, back navigation |
| `sidebarHeader` | Top of sidebar, above search/nav | Logo, parent navigation, API name |
| `sidebarFooter` | Bottom of sidebar, below nav tree | Version badge, quick links |

All slots accept `ReactNode` — any valid JSX. To place a logo, use `sidebarHeader`.

## Usage

Pass slots via the `slots` prop on any renderer component:

```tsx
import { OmniSpecRenderer } from '@apiboost/omnispec'

<OmniSpecRenderer
  spec="https://api.example.com/openapi.json"
  slots={{
    sidebarHeader: <MyLogo />,
    sidebarFooter: <VersionBadge version="2.1.0" />,
    header: <AppHeader />,
    footer: <AppFooter />,
    contentHeader: <Breadcrumbs />,
  }}
/>
```

## Slot Examples

### Sidebar Header — Logo + Parent Navigation

```tsx
<OmniSpecRenderer
  spec={specUrl}
  slots={{
    sidebarHeader: (
      <div style={{ padding: '0.75rem' }}>
        <img src="/logo.svg" alt="Acme" style={{ height: '2rem' }} />
        <nav style={{ marginTop: '0.5rem', fontSize: '0.8125rem' }}>
          <a href="/docs">Docs</a>
          <span> / </span>
          <a href="/docs/api">API Reference</a>
        </nav>
      </div>
    ),
  }}
/>
```

The sidebar header appears above the search bar and navigation tree. It's separated from the nav content by a bottom border.

### Sidebar Footer — Version + Links

```tsx
<OmniSpecRenderer
  spec={specUrl}
  slots={{
    sidebarFooter: (
      <div style={{ padding: '0.75rem', fontSize: '0.6875rem', color: '#888' }}>
        API v2.1.0 &middot; <a href="/changelog">Changelog</a>
      </div>
    ),
  }}
/>
```

The sidebar footer is pinned at the bottom of the sidebar, below the nav tree.

### Header + Footer — App Chrome

Wrap the renderer in your application's global header and footer:

```tsx
<OmniSpecRenderer
  spec={specUrl}
  slots={{
    header: (
      <header style={{ padding: '1rem', borderBottom: '1px solid #eee' }}>
        <a href="/">Home</a>
        <a href="/docs">Docs</a>
        <a href="/support">Support</a>
      </header>
    ),
    footer: (
      <footer style={{ padding: '1rem', textAlign: 'center', color: '#999' }}>
        &copy; 2026 Acme Inc. All rights reserved.
      </footer>
    ),
  }}
/>
```

Header and footer render outside the sidebar/content split — they span the full width.

### Content Header — Breadcrumbs

```tsx
<OmniSpecRenderer
  spec={specUrl}
  slots={{
    contentHeader: (
      <nav style={{ fontSize: '0.8125rem', color: '#666' }}>
        <a href="/products">Products</a> / <a href="/products/payments">Payments</a> / API Reference
      </nav>
    ),
  }}
/>
```

The content header appears above the main documentation content but below the global header. It does not appear in the sidebar.

## Layout Rendering Order

When all slots are provided, the layout renders in this order:

```
+-------------------------------------------+
| slots.header                              |
+-------------------------------------------+
| slots.sidebarHeader  |  slots.contentHeader |
| [Search bar]         |                      |
| [Nav tree]           |  [Spec content]      |
| [Custom nav]         |                      |
| slots.sidebarFooter  |                      |
+-------------------------------------------+
| slots.footer                              |
+-------------------------------------------+
```

## Combining with Sidebar Navigation

Slots and the `sidebarNav` prop work together. The sidebar rendering order is:

1. `slots.sidebarHeader` — logo, breadcrumbs
2. Custom navigation (`sidebarNav` with `placement: "before"`)
3. Divider
4. Search bar + spec-derived navigation
5. Custom navigation (`sidebarNav` with `placement: "after"`)
6. `slots.sidebarFooter` — version info, links

See [Sidebar Navigation](./sidebar.md) for details on custom nav items.

## TypeScript

```typescript
import type { SlotOverrides } from '@apiboost/omnispec'

const slots: SlotOverrides = {
  header: <AppHeader />,
  footer: <AppFooter />,
  contentHeader: <Breadcrumbs />,
  sidebarHeader: <Logo />,
  sidebarFooter: <VersionBadge />,
}

<OmniSpecRenderer spec={specUrl} slots={slots} />
```

## Spec Type Support

All slots work identically across every spec type — OpenAPI, AsyncAPI, GraphQL, SOAP, and gRPC. The `DocLayout` component that manages slot rendering is shared across all renderers.

## Tips

- **Sidebar header with `x-logo`**: If your OpenAPI spec includes `x-logo`, the renderer auto-populates `sidebarHeader` with the logo image. Passing your own `sidebarHeader` overrides this.
- **Stacked layout**: In `layout="stacked"` mode, sidebar slots (`sidebarHeader`, `sidebarFooter`) are ignored since there is no sidebar.
- **Styling**: Slots render inside the themed container, so they inherit the renderer's CSS custom properties (`var(--omnispec-bg-primary)`, `var(--omnispec-fg-primary)`, etc.). Use these tokens for consistent theming.
