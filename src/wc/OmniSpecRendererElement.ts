/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

/**
 * `<omnispec-renderer>` custom element.
 *
 * Wraps the React `OmniSpecRenderer` component so it can be used from any
 * framework (vanilla HTML, Vue, Angular, Svelte, ...) via a standard
 * Web Component API.
 *
 * Two configuration paths are supported:
 *
 * 1. Declarative HTML attributes for simple/scalar config:
 *      <omnispec-renderer
 *        spec-url="https://petstore3.swagger.io/api/v3/openapi.json"
 *        theme-base="auto"
 *        display-mode="compact"
 *      ></omnispec-renderer>
 *
 * 2. Imperative property assignment for complex/JSON config:
 *      const el = document.querySelector('omnispec-renderer')
 *      el.spec = { openapi: '3.0.3', info: { ... }, paths: { ... } }
 *      el.theme = { base: 'dark', overrides: { ... } }
 *      el.sidebarNav = { items: [...] }
 *
 * Both can be mixed freely — the imperative property wins for any field it
 * specifies.
 *
 * Shadow DOM mode is `open` (allows inspection via `el.shadowRoot`). Design
 * tokens (`--omnispec-*`) defined on the host element cascade into the shadow
 * root automatically, since CSS custom properties inherit through the shadow
 * boundary.
 */

import * as React from 'react'
import type { Root } from 'react-dom/client'
import { createRoot } from 'react-dom/client'
import { OmniSpecRenderer } from '../unified/OmniSpecRenderer'
import type { OmniSpecRendererProps } from '../unified/OmniSpecRenderer'
import type { ThemeConfig } from '../core/types/theme.types'
import type { SidebarNavConfig } from '../core/types/sidebar-nav.types'
import type { SpecLoadedInfo } from '../core/types/common.types'
import type { TryItRequest, TryItResponse } from '../core/types/try-it.types'
import { attachStyleMirror } from './style-injection'
import { buildRendererProps, parseJsonAttr } from './attribute-bridge'

/** Tag name the element is registered under. */
export const TAG_NAME = 'omnispec-renderer'

/** Observed declarative attributes. */
const OBSERVED_ATTRIBUTES = [
  'spec-url',
  'theme-base',
  'theme-toggle',
  'display-mode',
  'navigation-mode',
  'layout',
  'sidebar-position',
  'try-it-layout',
  'schema-style',
  'allow-try-it',
  'interactive-oauth',
  'default-expand-operations',
  'proxy-url',
  'download-link',
  'docs-url',
  'upgrade-url',
  'server-url',
  'try-it-persist-ttl',
  // Complex/JSON attributes — also surface as properties for imperative use.
  'theme',
  'sidebar-nav',
  'spec',
] as const

type ObservedAttribute = typeof OBSERVED_ATTRIBUTES[number]

export class OmniSpecRendererElement extends HTMLElement {
  static get observedAttributes(): readonly string[] {
    return OBSERVED_ATTRIBUTES
  }

  private root: Root | null = null
  private mountPoint: HTMLDivElement | null = null
  private detachStyles: (() => void) | null = null
  private rafHandle: number | null = null

  // Imperative property storage. These win over attributes when set.
  private specProp: OmniSpecRendererProps['spec'] | undefined = undefined
  private themeProp: ThemeConfig | undefined = undefined
  private sidebarNavProp: SidebarNavConfig | undefined = undefined

  // ---------- Property accessors ----------

  get spec(): OmniSpecRendererProps['spec'] | undefined {
    return this.specProp
  }

  set spec(value: OmniSpecRendererProps['spec'] | undefined) {
    this.specProp = value
    this.scheduleRender()
  }

  get theme(): ThemeConfig | undefined {
    return this.themeProp
  }

  set theme(value: ThemeConfig | undefined) {
    this.themeProp = value
    this.scheduleRender()
  }

  get sidebarNav(): SidebarNavConfig | undefined {
    return this.sidebarNavProp
  }

  set sidebarNav(value: SidebarNavConfig | undefined) {
    this.sidebarNavProp = value
    this.scheduleRender()
  }

  // ---------- Lifecycle ----------

  connectedCallback(): void {
    if (!this.shadowRoot) {
      const shadow = this.attachShadow({ mode: 'open' })
      // Host display defaults; consumers can override via CSS on the host.
      const hostStyle = document.createElement('style')
      hostStyle.textContent = ':host { display: block; width: 100%; height: 100%; }'
      shadow.appendChild(hostStyle)

      const mount = document.createElement('div')
      mount.setAttribute('data-omnispec-mount', '')
      mount.style.width = '100%'
      mount.style.height = '100%'
      shadow.appendChild(mount)
      this.mountPoint = mount

      this.detachStyles = attachStyleMirror({ shadow })
    }

    // Promote any JSON attributes set before connection into the property
    // store. Imperative assignments take priority over the attribute reflection.
    this.syncJsonAttributes()
    this.scheduleRender()
  }

  disconnectedCallback(): void {
    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle)
      this.rafHandle = null
    }
    if (this.root) {
      this.root.unmount()
      this.root = null
    }
    if (this.detachStyles) {
      this.detachStyles()
      this.detachStyles = null
    }
    this.mountPoint = null
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) return
    // JSON attributes overwrite the property store on change.
    if (name === 'theme') {
      this.themeProp = parseJsonAttr<ThemeConfig>(newValue, 'theme')
    } else if (name === 'sidebar-nav') {
      this.sidebarNavProp = parseJsonAttr<SidebarNavConfig>(newValue, 'sidebar-nav')
    } else if (name === 'spec') {
      this.specProp = parseJsonAttr<OmniSpecRendererProps['spec']>(newValue, 'spec')
    }
    this.scheduleRender()
  }

  // ---------- Event emission ----------

  private emit<T>(name: string, detail: T): void {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }))
  }

  // ---------- Internal helpers ----------

  /**
   * Reads JSON-shaped attributes that may have been set before
   * `connectedCallback` ran (e.g. inline on the element). Imperative property
   * assignments always win, so we only populate from attributes if the
   * corresponding property has not been explicitly set.
   */
  private syncJsonAttributes(): void {
    if (this.specProp === undefined) {
      const attr = this.getAttribute('spec')
      if (attr !== null) {
        this.specProp = parseJsonAttr<OmniSpecRendererProps['spec']>(attr, 'spec')
      }
    }
    if (this.themeProp === undefined) {
      const attr = this.getAttribute('theme')
      if (attr !== null) {
        this.themeProp = parseJsonAttr<ThemeConfig>(attr, 'theme')
      }
    }
    if (this.sidebarNavProp === undefined) {
      const attr = this.getAttribute('sidebar-nav')
      if (attr !== null) {
        this.sidebarNavProp = parseJsonAttr<SidebarNavConfig>(attr, 'sidebar-nav')
      }
    }
  }

  /**
   * Batches multiple attribute/property changes into a single render via
   * requestAnimationFrame. Falls back to a microtask in non-DOM environments.
   */
  private scheduleRender(): void {
    if (!this.mountPoint) return
    if (this.rafHandle !== null) return
    const schedule =
      typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame
        : (cb: FrameRequestCallback): number => {
          queueMicrotask(() => cb(performance.now()))
          return 0
        }
    this.rafHandle = schedule(() => {
      this.rafHandle = null
      this.render()
    })
  }

  private render(): void {
    if (!this.mountPoint) return

    const attr = (name: ObservedAttribute): string | null => this.getAttribute(name)
    const props = buildRendererProps({
      specUrl: attr('spec-url'),
      specProp: this.specProp,
      themeProp: this.themeProp,
      themeBase: attr('theme-base'),
      themeToggle: attr('theme-toggle'),
      sidebarNavProp: this.sidebarNavProp,
      displayMode: attr('display-mode'),
      navigationMode: attr('navigation-mode'),
      layout: attr('layout'),
      sidebarPosition: attr('sidebar-position'),
      tryItLayout: attr('try-it-layout'),
      schemaStyle: attr('schema-style'),
      allowTryIt: attr('allow-try-it'),
      interactiveOAuth: attr('interactive-oauth'),
      defaultExpandOperations: attr('default-expand-operations'),
      proxyUrl: attr('proxy-url'),
      downloadLink: attr('download-link'),
      docsUrl: attr('docs-url'),
      upgradeUrl: attr('upgrade-url'),
      serverUrl: attr('server-url'),
      tryItPersistTtl: attr('try-it-persist-ttl'),
    })

    if (!props) {
      if (this.root) {
        this.root.unmount()
        this.root = null
      }
      return
    }

    // Wire up event callbacks so consumers can listen via `addEventListener`.
    const propsWithEvents: OmniSpecRendererProps = {
      ...props,
      onSpecLoaded: (info: SpecLoadedInfo) => this.emit('spec-loaded', info),
      onTryItRequest: (req: TryItRequest) => this.emit('try-it-request', req),
      onTryItResponse: (res: TryItResponse) => this.emit('try-it-response', res),
    }

    if (!this.root) {
      this.root = createRoot(this.mountPoint)
    }
    this.root.render(React.createElement(OmniSpecRenderer, propsWithEvents))
  }
}
