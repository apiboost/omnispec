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
 * `@apiboost/omnispec/wc` — Web Component entry point.
 *
 * Importing this module registers the `<omnispec-renderer>` custom element
 * exactly once. Importing it multiple times is safe.
 *
 * @example Vanilla HTML
 * ```html
 * <script type="module" src="/path/to/omnispec-wc.js"></script>
 * <omnispec-renderer spec-url="/openapi.json"></omnispec-renderer>
 * ```
 *
 * @example Imperative
 * ```ts
 * import { OmniSpecRendererElement, defineOmniSpecRenderer } from '@apiboost/omnispec/wc'
 * defineOmniSpecRenderer()
 * const el = document.createElement('omnispec-renderer') as OmniSpecRendererElement
 * el.spec = parsedSpecObject
 * el.theme = { base: 'dark' }
 * document.body.appendChild(el)
 * ```
 */

import { OmniSpecRendererElement, TAG_NAME } from './OmniSpecRendererElement'

export { OmniSpecRendererElement, TAG_NAME }
export { buildRendererProps } from './attribute-bridge'

/**
 * Registers the `<omnispec-renderer>` custom element if it has not already been
 * registered. Safe to call multiple times.
 *
 * @param tagName Override the element tag (defaults to `'omnispec-renderer'`).
 */
export function defineOmniSpecRenderer(tagName: string = TAG_NAME): void {
  if (typeof window === 'undefined' || typeof customElements === 'undefined') {
    return
  }
  if (customElements.get(tagName)) return
  customElements.define(tagName, OmniSpecRendererElement)
}

// Auto-register on import. Consumers who want to defer registration can call
// `defineOmniSpecRenderer(customTag)` manually after stubbing `customElements`.
defineOmniSpecRenderer()
