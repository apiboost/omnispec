import Layout from '@theme/Layout'
import BrowserOnly from '@docusaurus/BrowserOnly'

// Live demo of the free-tier <OmniSpecRenderer>. It runs client-only via
// BrowserOnly because the renderer relies on browser APIs (DOM, fetch,
// IntersectionObserver) that don't exist during Docusaurus's static build.
export default function Demo(): React.ReactNode {
  return (
    <Layout title="Live Demo" description="A live, interactive OmniSpec renderer running in the docs.">
      <div style={{ height: 'calc(100vh - var(--ifm-navbar-height))' }}>
        <BrowserOnly fallback={<div style={{ padding: '2rem' }}>Loading the live renderer…</div>}>
          {() => {
            const { OmniSpecRenderer } = require('@apiboost/omnispec') as typeof import('@apiboost/omnispec')
            return (
              <OmniSpecRenderer
                spec="https://petstore3.swagger.io/api/v3/openapi.json"
                theme={{ base: 'auto' }}
                layout="sidebar"
                allowTryIt={true}
              />
            )
          }}
        </BrowserOnly>
      </div>
    </Layout>
  )
}
