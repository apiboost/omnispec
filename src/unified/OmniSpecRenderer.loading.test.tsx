/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

// @vitest-environment jsdom

import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { OmniSpecRenderer } from './OmniSpecRenderer'
import { loadingSlots } from '../core/components/Layout/loadingSlots'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

/** The mobile nav bar's breadcrumb trail, as text. */
function trailText(): string {
  return document.querySelector('nav[aria-label="Breadcrumb"]')?.textContent ?? ''
}

describe('loadingSlots', () => {
  it('uses loadingBreadcrumbs for the trail when provided', () => {
    expect(loadingSlots({ breadcrumbs: ['Host'], loadingBreadcrumbs: ['Host', 'Before'] }).breadcrumbs).toEqual(['Host', 'Before'])
  })

  it('leaves the slots unchanged otherwise', () => {
    const slots = { breadcrumbs: ['Host'] }
    expect(loadingSlots(slots)).toBe(slots)
  })
})

describe('OmniSpecRenderer loading state', () => {
  it('shows the host loadingBreadcrumbs in the mobile trail while the spec loads', () => {
    // Never resolves: the renderer stays in its loading state.
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    render(
      <OmniSpecRenderer
        spec="https://example.test/openapi.json"
        theme={{ base: 'light' }}
        slots={{
          breadcrumbs: ['Host product'],
          loadingBreadcrumbs: ['Host product', 'Previous reference', 'Previous section'],
          sidebarHeader: <div>host nav</div>,
        }}
      />,
    )
    expect(document.querySelector('.omnispec-loading')).not.toBeNull()
    expect(trailText()).toContain('Previous section')
  })
})
