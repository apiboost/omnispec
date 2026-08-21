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
import { render, fireEvent, cleanup, act } from '@testing-library/react'
import { ResponsiveColumns } from '@core/components/common/ResponsiveColumns'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('ResponsiveColumns', () => {
  it('renders a single column without right content (no separator)', () => {
    const { queryByRole, getByText } = render(<ResponsiveColumns left={<div>docs</div>} />)
    expect(getByText('docs')).toBeTruthy()
    expect(queryByRole('separator', { hidden: true })).toBeNull()
  })

  it('renders a resize separator between columns', () => {
    const { getByRole } = render(
      <ResponsiveColumns left={<div>docs</div>} right={<div>tryit</div>} rightLabel="Try It" />,
    )
    const separator = getByRole('separator', { hidden: true })
    expect(separator.getAttribute('aria-orientation')).toBe('vertical')
    expect(separator.getAttribute('aria-label')).toBe('Resize Try It panel')
  })

  it('updates the column width custom property while dragging (clamped to min)', () => {
    const { getByRole, container } = render(
      <ResponsiveColumns left={<div>docs</div>} right={<div>tryit</div>} />,
    )
    const grid = container.firstElementChild as HTMLElement
    vi.spyOn(grid, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      right: 1200,
      width: 1200,
      top: 0,
      bottom: 800,
      height: 800,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect)

    const separator = getByRole('separator', { hidden: true })
    fireEvent.pointerDown(separator, { clientX: 700 })
    // Drag to clientX 700 → right width = 1200 - 700 = 500px.
    act(() => {
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 700 }))
    })
    expect(grid.style.getPropertyValue('--omnispec-tryit-col')).toBe('500px')

    // Below the 320px minimum clamps.
    act(() => {
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 1150 }))
    })
    expect(grid.style.getPropertyValue('--omnispec-tryit-col')).toBe('320px')

    act(() => {
      window.dispatchEvent(new MouseEvent('pointerup'))
    })
  })
})
