import {useState} from 'react'
import Layout from '@theme/Layout'
import BrowserOnly from '@docusaurus/BrowserOnly'
import useBaseUrl from '@docusaurus/useBaseUrl'
import {useColorMode} from '@docusaurus/theme-common'
import DemoConfigPanel, {
  DEFAULT_DEMO_CONFIG,
  type DemoConfig,
} from '@site/src/components/DemoConfigPanel'
import styles from './demo.module.css'

// Renders the live library, driven by the config panel and Docusaurus's color
// mode. Passing an explicit `base` ('light' | 'dark') puts the renderer in
// controlled mode: it follows the site's header toggle and hides its own, so
// the header switcher stays the single source of truth. This component only
// mounts client-side (see BrowserOnly below), so useColorMode, useBaseUrl, and
// the browser-only renderer are all safe here.
function LiveRenderer({config}: {config: DemoConfig}): React.ReactNode {
  const {colorMode} = useColorMode() // 'light' | 'dark' — tracks the header switcher
  const specUrl = useBaseUrl(config.spec) // prefixes the /omnispec/ baseUrl
  const {OmniSpecRenderer} = require('@apiboost/omnispec') as typeof import('@apiboost/omnispec')

  return (
    <OmniSpecRenderer
      // schemaStyle / layout / sidebarPosition / tryItLayout / allowTryIt /
      // downloadLink update live via config context, so they stay OUT of the
      // key. spec / displayMode / navigationMode / defaultExpandOperations are
      // mount-time concerns (parse, initial expand), so keying on them forces a
      // clean remount when they change.
      key={`${specUrl}|${config.displayMode}|${config.navigationMode}|${config.defaultExpandOperations}`}
      spec={specUrl}
      theme={{base: colorMode}}
      layout={config.layout}
      sidebarPosition={config.sidebarPosition}
      displayMode={config.displayMode}
      navigationMode={config.navigationMode || undefined}
      schemaStyle={config.schemaStyle}
      tryItLayout={config.tryItLayout}
      allowTryIt={config.allowTryIt}
      downloadLink={config.downloadLink}
      defaultExpandOperations={config.defaultExpandOperations}
    />
  )
}

// Live demo of the free-tier <OmniSpecRenderer> with an interactive config rail.
// Runs client-only via BrowserOnly because the renderer relies on browser APIs
// (DOM, fetch, IntersectionObserver) that don't exist during the static build.
export default function Demo(): React.ReactNode {
  const [config, setConfig] = useState<DemoConfig>(DEFAULT_DEMO_CONFIG)

  return (
    <Layout
      title="Live Demo"
      description="A live, interactive OmniSpec renderer — adjust the settings and watch it update in real time."
    >
      <div className={styles.stageRow}>
        <aside className={styles.rail}>
          <DemoConfigPanel config={config} onChange={setConfig} />
        </aside>
        <div className={styles.stage}>
          <BrowserOnly fallback={<div className={styles.loading}>Loading the live renderer…</div>}>
            {() => <LiveRenderer config={config} />}
          </BrowserOnly>
        </div>
      </div>
    </Layout>
  )
}
