/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, fireEvent, waitFor, within } from '@testing-library/react'
import { DocLayout } from '@core/components/Layout/DocLayout'

function renderWithOpenPanel(sidebarHeader?: React.ReactNode) {
  const utils = render(
    <DocLayout layout="sidebar" sidebar={<nav>spec nav</nav>} sidebarHeader={sidebarHeader}>
      <div>content</div>
    </DocLayout>,
  )
  fireEvent.click(utils.getByRole('button', { name: 'Open navigation' }))
  return utils
}

afterEach(cleanup)

describe('DocLayout sidebar column', () => {
  it('renders the sidebar column when only a sidebarHeader slot is provided (no spec nav)', () => {
    const { getByText } = render(
      <DocLayout layout="sidebar" sidebarHeader={<nav>portal nav</nav>}>
        <div>content</div>
      </DocLayout>,
    )
    // Regression: previously the aside only rendered when `sidebar` was truthy,
    // so a slot-only nav (the host portal's navigation) disappeared — e.g. on a
    // failed spec load — leaving the user with no way to navigate away.
    expect(getByText('portal nav')).toBeInTheDocument()
    expect(getByText('content')).toBeInTheDocument()
  })

  it('renders no sidebar column when there is neither a sidebar nor sidebar slots', () => {
    const { queryByRole, getByText } = render(
      <DocLayout layout="sidebar">
        <div>content</div>
      </DocLayout>,
    )
    expect(getByText('content')).toBeInTheDocument()
    // No mobile "Open navigation" toggle when there's nothing to show.
    expect(queryByRole('button', { name: 'Open navigation' })).toBeNull()
  })
})

describe('DocLayout mobile nav panel', () => {
  it('closes when a same-tab link inside the panel is clicked', async () => {
    const { getByRole, queryByRole } = renderWithOpenPanel(
      <a href="/product/foo" onClick={(e) => e.preventDefault()}>
        Back to product
      </a>,
    )
    const panel = getByRole('region', { name: 'Navigation' })
    fireEvent.click(within(panel).getByRole('link', { name: 'Back to product' }))
    await waitFor(() =>
      expect(queryByRole('region', { name: 'Navigation' })).toBeNull(),
    )
  })

  it('stays open when a _blank link inside the panel is clicked', () => {
    const { getByRole } = renderWithOpenPanel(
      <a
        href="https://example.com"
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.preventDefault()}
      >
        External
      </a>,
    )
    const panel = getByRole('region', { name: 'Navigation' })
    fireEvent.click(within(panel).getByRole('link', { name: 'External' }))
    expect(getByRole('region', { name: 'Navigation' })).toBeTruthy()
  })

  it('toggles open and closed from the same button, reflecting aria-expanded', () => {
    const { getByRole, queryByRole } = render(
      <DocLayout layout="sidebar" sidebar={<nav>spec nav</nav>}>
        <div>content</div>
      </DocLayout>,
    )
    const toggle = getByRole('button', { name: 'Open navigation' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(toggle)
    expect(getByRole('region', { name: 'Navigation' })).toBeTruthy()
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(toggle).toHaveAccessibleName('Close navigation')

    fireEvent.click(toggle)
    expect(queryByRole('region', { name: 'Navigation' })).toBeNull()
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes on Escape and returns focus to the toggle', async () => {
    const { getByRole, queryByRole } = renderWithOpenPanel()
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() =>
      expect(queryByRole('region', { name: 'Navigation' })).toBeNull(),
    )
    expect(document.activeElement).toBe(getByRole('button', { name: 'Open navigation' }))
  })

  it('closes when focus moves outside the bar and panel', async () => {
    const { getByRole, queryByRole } = render(
      <DocLayout layout="sidebar" sidebar={<nav>spec nav</nav>}>
        <button type="button">in content</button>
      </DocLayout>,
    )
    const toggle = getByRole('button', { name: 'Open navigation' })
    fireEvent.click(toggle)
    fireEvent.blur(toggle, { relatedTarget: getByRole('button', { name: 'in content' }) })
    await waitFor(() =>
      expect(queryByRole('region', { name: 'Navigation' })).toBeNull(),
    )
  })

  it('locks page scroll only while open', () => {
    const { getByRole } = renderWithOpenPanel()
    expect(document.body.style.overflow).toBe('hidden')
    fireEvent.click(getByRole('button', { name: 'Close navigation' }))
    expect(document.body.style.overflow).toBe('')
  })

  it('renders the breadcrumb trail, dropping empty and repeated entries', () => {
    const { getByRole } = render(
      <DocLayout
        layout="sidebar"
        sidebar={<nav>spec nav</nav>}
        breadcrumbs={['Pet Store', undefined, 'Pets', 'Pets']}
      >
        <div>content</div>
      </DocLayout>,
    )
    const trail = getByRole('navigation', { name: 'Breadcrumb' })
    const items = within(trail).getAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toEqual(['Pet Store', '/Pets'])
    expect(items[1]).toHaveAttribute('aria-current', 'location')
  })

  it('renders host-provided element crumbs (e.g. router links) before text crumbs', () => {
    const { getByRole } = render(
      <DocLayout
        layout="sidebar"
        sidebar={<nav>spec nav</nav>}
        breadcrumbs={[<a key="p" href="/product/pets">Pets product</a>, 'Pet Store']}
      >
        <div>content</div>
      </DocLayout>,
    )
    const trail = getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(trail).getByRole('link', { name: 'Pets product' })).toHaveAttribute('href', '/product/pets')
    expect(within(trail).getAllByRole('listitem')).toHaveLength(2)
  })
})

describe('DocLayout sidebar collapse', () => {
  it('collapses and re-expands the sidebar via the toggle', () => {
    const { getByRole, queryByRole, getByText, queryByText } = render(
      <DocLayout layout="sidebar" sidebar={<nav>spec nav</nav>}>
        <div>content</div>
      </DocLayout>,
    )
    // Sidebar is visible and offers a collapse control.
    expect(getByText('spec nav')).toBeInTheDocument()
    fireEvent.click(getByRole('button', { name: 'Collapse sidebar' }))

    // Collapsed: the sidebar content is gone, replaced by an expand affordance,
    // giving the spec area the full width.
    expect(queryByText('spec nav')).toBeNull()
    fireEvent.click(getByRole('button', { name: 'Expand sidebar' }))

    // Re-expanded: content and collapse control return.
    expect(getByText('spec nav')).toBeInTheDocument()
    expect(queryByRole('button', { name: 'Collapse sidebar' })).toBeTruthy()
  })
})

describe('DocLayout back-to-top', () => {
  it('appears only after scrolling down and returns to the top on click', async () => {
    const scrollTo = vi.fn()
    window.scrollTo = scrollTo as unknown as typeof window.scrollTo
    const { queryByRole, getByRole } = render(
      <DocLayout layout="sidebar" sidebar={<nav>nav</nav>}>
        <div>content</div>
      </DocLayout>,
    )
    // Hidden at the top of the page.
    expect(queryByRole('button', { name: 'Back to top' })).toBeNull()

    // Scroll past the threshold → the button appears.
    Object.defineProperty(window, 'scrollY', { value: 800, configurable: true })
    fireEvent.scroll(window)
    await waitFor(() => expect(getByRole('button', { name: 'Back to top' })).toBeTruthy())

    fireEvent.click(getByRole('button', { name: 'Back to top' }))
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }))
  })
})

describe('DocLayout mobile nav a11y', () => {
  it('links the toggle to the panel via aria-controls', () => {
    const { getByRole } = render(
      <DocLayout layout="sidebar" sidebar={<nav>spec nav</nav>}>
        <div>content</div>
      </DocLayout>,
    )

    const trigger = getByRole('button', { name: 'Open navigation' })
    const controls = trigger.getAttribute('aria-controls')
    expect(controls).toBeTruthy()

    fireEvent.click(trigger)

    const panel = getByRole('region', { name: 'Navigation' })
    expect(panel.getAttribute('id')).toBe(controls)
  })
})
