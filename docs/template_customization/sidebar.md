# Custom Sidebar Navigation

Add your own navigation links, grouped sections, and nested menus to the sidebar alongside (or instead of) the auto-generated spec navigation.

## Quick Start

```tsx
import { OmniSpecRenderer } from '@apiboost/omnispec'
import type { SidebarNavConfig } from '@apiboost/omnispec'

const sidebarNav: SidebarNavConfig = {
  heading: 'Quick Links',
  items: [
    { id: 'home', label: 'Home', href: '/' },
    { id: 'guides', label: 'Getting Started', href: '/docs/guides' },
    { id: 'status', label: 'API Status', href: 'https://status.example.com' },
  ],
}

<OmniSpecRenderer spec={specUrl} sidebarNav={sidebarNav} />
```

Custom links appear above the spec navigation with a divider between them.

## Placement

Control where custom navigation renders relative to the spec-derived nav:

```tsx
// Above spec nav (default)
sidebarNav={{ placement: 'before', items: [...] }}

// Below spec nav
sidebarNav={{ placement: 'after', items: [...] }}

// Replace spec nav entirely
sidebarNav={{ placement: 'replace', items: [...] }}
```

| Placement | Spec nav visible | Divider shown |
|-----------|-----------------|---------------|
| `before` (default) | Yes | Yes (configurable) |
| `after` | Yes | Yes (configurable) |
| `replace` | No | No |

Hide the divider with `showDivider: false`.

## Grouped Sections

Organize links into collapsible groups with labeled headings:

```tsx
const sidebarNav: SidebarNavConfig = {
  placement: 'before',
  items: [
    {
      id: 'docs-group',
      label: 'Documentation',
      items: [
        { id: 'overview', label: 'Overview', href: '/docs' },
        { id: 'auth-guide', label: 'Authentication', href: '/docs/auth' },
        { id: 'rate-limits', label: 'Rate Limits', href: '/docs/rate-limits' },
      ],
    },
    {
      id: 'resources-group',
      label: 'Resources',
      items: [
        { id: 'sdks', label: 'SDKs & Libraries', href: '/sdks' },
        { id: 'support', label: 'Support', href: 'https://support.example.com' },
      ],
    },
  ],
}
```

Groups are collapsible — click the heading to expand/collapse. Groups start expanded by default; set `defaultExpanded: false` to start collapsed.

## Nested Items

Items can have `children` for multi-level navigation (arbitrary depth):

```tsx
const sidebarNav: SidebarNavConfig = {
  items: [
    {
      id: 'guides',
      label: 'Guides',
      children: [
        { id: 'quickstart', label: 'Quickstart', href: '/docs/quickstart' },
        {
          id: 'auth-section',
          label: 'Authentication',
          children: [
            { id: 'oauth', label: 'OAuth 2.0', href: '/docs/auth/oauth' },
            { id: 'api-keys', label: 'API Keys', href: '/docs/auth/keys' },
            { id: 'jwt', label: 'JWT Tokens', href: '/docs/auth/jwt' },
          ],
        },
      ],
    },
  ],
}
```

## External Links

URLs starting with `http://` or `https://` are automatically detected as external links. They open in a new tab and display an external-link icon:

```tsx
{ id: 'github', label: 'GitHub', href: 'https://github.com/acme/api' }
```

Override the auto-detection with the `target` property:

```tsx
// Force external URL to open in same tab
{ id: 'portal', label: 'Portal', href: 'https://portal.example.com', target: '_self' }
```

## Badges

Add color-coded badges to highlight new or special items:

```tsx
{
  id: 'webhooks',
  label: 'Webhooks',
  href: '/docs/webhooks',
  badge: 'New',
  badgeColor: '#22c55e',
}
```

The `badge` prop accepts a string for simple text badges, or a `ReactNode` for custom rendering.

## Icons

Pass any `ReactNode` as an icon — it renders before the label:

```tsx
import { BookOpen, Code, Headphones } from 'lucide-react'

const sidebarNav: SidebarNavConfig = {
  items: [
    { id: 'docs', label: 'Documentation', href: '/docs', icon: <BookOpen size={14} /> },
    { id: 'sdks', label: 'SDKs', href: '/sdks', icon: <Code size={14} /> },
    { id: 'support', label: 'Support', href: '/support', icon: <Headphones size={14} /> },
  ],
}
```

## Active State

### Uncontrolled (Default)

When no `activeId` is provided, the sidebar tracks active state automatically by matching item `href` values against the current URL hash or pathname.

- `href="#section-id"` matches `window.location.hash`
- `href="/docs/guide"` matches `window.location.pathname`

### Controlled

For apps with their own routing (React Router, Next.js, etc.), pass `activeId` to control which item is highlighted:

```tsx
import { useLocation } from 'react-router-dom'

function ApiPage() {
  const location = useLocation()
  const activeId = getNavIdFromPath(location.pathname)

  return (
    <OmniSpecRenderer
      spec={specUrl}
      sidebarNav={{
        activeId,
        onItemClick: (item) => {
          if (item.href && !item.href.startsWith('http')) {
            navigate(item.href)
            return false // Prevent default navigation
          }
        },
        items: navItems,
      }}
    />
  )
}
```

When `activeId` is provided, the component becomes "controlled" — you manage active state entirely.

## Collapsing the Sidebar

On desktop, the sidebar can be collapsed to give the specification content the full width. A chevron control at the top of the sidebar collapses it to a thin rail; clicking the rail expands it again. This is built in and requires no configuration — it applies whether the sidebar shows spec-derived nav, custom `sidebarNav`, or host-injected slots. On mobile the sidebar is a drawer instead, opened and closed with the floating navigation button.

## Click Handler

The `onItemClick` callback fires when any custom nav item is clicked. Return `false` to prevent the default navigation behavior:

```tsx
sidebarNav={{
  onItemClick: (item) => {
    analytics.track('sidebar_click', { id: item.id, href: item.href })
    // Return undefined to allow default navigation
    // Return false to prevent it
  },
  items: [...],
}}
```

## Combining with Slots

`sidebarNav` and `slots` work together. The full sidebar rendering order:

```
+-----------------------------------+
| slots.sidebarHeader               |
+-----------------------------------+
| sidebarNav heading                |  (placement: "before")
| Custom nav items / groups         |
+-----------------------------------+
| ──── divider ────                 |
+-----------------------------------+
| Search bar                        |  (spec-derived)
| Operations / Channels / Types     |
| Schemas                           |
+-----------------------------------+
| slots.sidebarFooter               |
+-----------------------------------+
```

Example combining both:

```tsx
<OmniSpecRenderer
  spec={specUrl}
  slots={{
    sidebarHeader: <CompanyLogo />,
    sidebarFooter: <VersionInfo version="2.1.0" />,
  }}
  sidebarNav={{
    placement: 'before',
    heading: 'Docs',
    items: [
      { id: 'overview', label: 'Overview', href: '/docs' },
      { id: 'changelog', label: 'Changelog', href: '/changelog' },
    ],
  }}
/>
```

See [Slots](./slots.md) for details on all available slot positions.

## TypeScript Reference

```typescript
import type {
  SidebarNavConfig,
  SidebarNavItem,
  SidebarNavGroup,
  SidebarNavPlacement,
} from '@apiboost/omnispec'
```

### SidebarNavItem

```typescript
interface SidebarNavItem {
  id: string              // Unique identifier
  label: string           // Display text
  href?: string           // Navigation target (hash, path, or URL)
  target?: '_self' | '_blank'
  icon?: ReactNode        // Icon before label
  badge?: string | ReactNode
  badgeColor?: string     // Badge background color (string badges only)
  children?: SidebarNavItem[]
  defaultExpanded?: boolean
  separator?: boolean     // Render as non-interactive heading
  className?: string      // Custom CSS class
}
```

### SidebarNavGroup

```typescript
interface SidebarNavGroup {
  id: string              // Unique identifier
  label: string           // Section heading text
  items: SidebarNavItem[] // Items in this group
  defaultExpanded?: boolean
  icon?: ReactNode        // Icon for group heading
}
```

### SidebarNavConfig

```typescript
interface SidebarNavConfig {
  items: Array<SidebarNavItem | SidebarNavGroup>
  placement?: 'before' | 'after' | 'replace'  // Default: 'before'
  activeId?: string       // Controlled active state
  onItemClick?: (item: SidebarNavItem) => void | false
  showDivider?: boolean   // Default: true
  heading?: string        // Section heading above custom nav
}
```

## Spec Type Support

Custom sidebar navigation works identically across all spec types — OpenAPI, AsyncAPI, GraphQL, SOAP, and gRPC. The `buildSidebar` helper that composes custom and spec navigation is shared across all renderers.

## Full Example

A complete portal-style sidebar with guides, resources, external links, badges, and nested items:

```tsx
import { OmniSpecRenderer } from '@apiboost/omnispec'
import type { SidebarNavConfig } from '@apiboost/omnispec'

const sidebarNav: SidebarNavConfig = {
  placement: 'before',
  showDivider: true,
  items: [
    {
      id: 'guides',
      label: 'Guides',
      items: [
        { id: 'getting-started', label: 'Getting Started', href: '/' },
        { id: 'auth', label: 'Authentication', href: '/docs/auth' },
        { id: 'rate-limits', label: 'Rate Limits', href: '/docs/rate-limits' },
        { id: 'pagination', label: 'Pagination', href: '/docs/pagination' },
      ],
    },
    {
      id: 'resources',
      label: 'Resources',
      items: [
        { id: 'changelog', label: 'Changelog', href: '/docs/changelog' },
        {
          id: 'sdks',
          label: 'SDKs & Libraries',
          defaultExpanded: false,
          children: [
            { id: 'sdk-js', label: 'JavaScript', href: '/docs/sdks/javascript' },
            { id: 'sdk-python', label: 'Python', href: '/docs/sdks/python' },
            { id: 'sdk-go', label: 'Go', href: '/docs/sdks/go' },
          ],
        },
        {
          id: 'webhooks',
          label: 'Webhooks',
          href: '/docs/webhooks',
          badge: 'Beta',
          badgeColor: '#f59e0b',
        },
        { id: 'github', label: 'GitHub', href: 'https://github.com/acme/api' },
        { id: 'status', label: 'API Status', href: 'https://status.example.com' },
      ],
    },
  ],
}

function OmniSpecPage() {
  return (
    <OmniSpecRenderer
      spec="/specs/openapi.json"
      theme={{ base: 'light' }}
      sidebarNav={sidebarNav}
      slots={{
        sidebarHeader: <img src="/logo.svg" alt="Acme" style={{ padding: '0.75rem' }} />,
      }}
    />
  )
}
```
