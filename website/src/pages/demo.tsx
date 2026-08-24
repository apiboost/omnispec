import Layout from '@theme/Layout'
import BrowserOnly from '@docusaurus/BrowserOnly'
import { useColorMode } from '@docusaurus/theme-common'

// Renders the live library, driven by Docusaurus's color mode. Passing an
// explicit `base` ('light' | 'dark') puts the renderer in controlled mode: it
// follows this prop and hides its own toggle, so the site's header switcher is
// the single source of truth. This component only mounts client-side (see
// BrowserOnly below), so useColorMode and the browser-only renderer are safe.
function LiveRenderer(): React.ReactNode {
  const { colorMode } = useColorMode() // 'light' | 'dark' — tracks the header switcher
  const { OmniSpecRenderer } = require('@apiboost/omnispec') as typeof import('@apiboost/omnispec')
  return (
    <OmniSpecRenderer
      spec="https://petstore3.swagger.io/api/v3/openapi.json"
      theme={{ base: colorMode }}
      layout="sidebar"
      allowTryIt={true}
    />
  )
}

// Live demo of the free-tier <OmniSpecRenderer>. Runs client-only via
// BrowserOnly because the renderer relies on browser APIs (DOM, fetch,
// IntersectionObserver) that don't exist during Docusaurus's static build.
export default function Demo(): React.ReactNode {
  return (
    <Layout title="Live Demo" description="A live, interactive OmniSpec renderer running in the docs.">
      <div style={{ height: 'calc(100vh - var(--ifm-navbar-height))' }}>
        <BrowserOnly fallback={<div style={{ padding: '2rem' }}>Loading the live renderer…</div>}>
          {() => <LiveRenderer />}
        </BrowserOnly>
      </div>
    </Layout>
  )
}
