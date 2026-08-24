import {useMemo, useState} from 'react'
import Layout from '@theme/Layout'
import BrowserOnly from '@docusaurus/BrowserOnly'
import {useBaseUrlUtils} from '@docusaurus/useBaseUrl'
import {useColorMode} from '@docusaurus/theme-common'
import DemoConfigPanel, {
  DEFAULT_DEMO_CONFIG,
  SPEC_OPTIONS,
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
  const {OmniSpecRenderer} = require('@apiboost/omnispec') as typeof import('@apiboost/omnispec')

  return (
    <OmniSpecRenderer
      // config.spec is already a resolved URL (a base-URL-prefixed preset, or a
      // URL the user pasted), so it goes straight to the renderer.
      // schemaStyle / layout / sidebarPosition / tryItLayout / allowTryIt /
      // downloadLink update live via config context, so they stay OUT of the
      // key. spec / displayMode / navigationMode / defaultExpandOperations are
      // mount-time concerns (parse, initial expand), so keying on them forces a
      // clean remount when they change.
      key={`${config.spec}|${config.displayMode}|${config.navigationMode}|${config.defaultExpandOperations}`}
      spec={config.spec}
      theme={{base: colorMode}}
      layout={config.layout}
      sidebarPosition={config.sidebarPosition}
      displayMode={config.displayMode}
      navigationMode={config.navigationMode || undefined}
      schemaStyle={config.schemaStyle}
      allowTryIt={config.allowTryIt}
      downloadLink={config.downloadLink}
      defaultExpandOperations={config.defaultExpandOperations}
    />
  )
}

function GearIcon(): React.ReactNode {
  return (
    <svg
      className={styles.fabIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

// Live demo of the free-tier <OmniSpecRenderer>. The renderer fills the stage;
// a floating "Configure" button opens a slide-up sheet of live settings, so the
// controls never crowd the rendered docs. Runs client-only via BrowserOnly
// because the renderer relies on browser APIs (DOM, fetch, IntersectionObserver)
// that don't exist during the static build.
export default function Demo(): React.ReactNode {
  const {withBaseUrl} = useBaseUrlUtils()
  // Resolve the bundled preset paths to real URLs once; an absolute URL a user
  // pastes passes through withBaseUrl unchanged.
  const specOptions = useMemo(
    () => SPEC_OPTIONS.map((s) => ({label: s.label, value: withBaseUrl(s.value)})),
    [withBaseUrl],
  )
  const defaults = useMemo(
    () => ({...DEFAULT_DEMO_CONFIG, spec: withBaseUrl(DEFAULT_DEMO_CONFIG.spec)}),
    [withBaseUrl],
  )
  const [config, setConfig] = useState<DemoConfig>(defaults)
  const [open, setOpen] = useState(false)

  return (
    <Layout
      title="Live Demo"
      description="A live, interactive OmniSpec renderer — adjust the settings and watch it update in real time."
    >
      <div className={styles.stageWrap}>
        <div className={styles.stage}>
          <BrowserOnly fallback={<div className={styles.loading}>Loading the live renderer…</div>}>
            {() => <LiveRenderer config={config} />}
          </BrowserOnly>
        </div>

        <button
          type="button"
          className={`${styles.fab} ${open ? styles.fabHidden : ''}`}
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="demo-config-sheet"
        >
          <GearIcon />
          Configure
        </button>

        <div
          id="demo-config-sheet"
          className={`${styles.sheet} ${open ? styles.sheetOpen : ''}`}
          role="dialog"
          aria-label="Live demo configuration"
          aria-hidden={!open}
        >
          <div className={styles.sheetHeader}>
            <h2 className={styles.sheetTitle}>Live configuration</h2>
            <div className={styles.headerActions}>
              <button
                type="button"
                className={styles.reset}
                onClick={() => setConfig(defaults)}
              >
                Reset to defaults
              </button>
              <button
                type="button"
                className={styles.close}
                onClick={() => setOpen(false)}
                aria-label="Close configuration"
              >
                ×
              </button>
            </div>
          </div>
          <div className={styles.sheetBody}>
            <div className={styles.sheetInner}>
              <DemoConfigPanel
                config={config}
                onChange={setConfig}
                specOptions={specOptions}
              />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
