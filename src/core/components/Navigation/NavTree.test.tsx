/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import { NavTree } from '@core/components/Navigation/NavTree'
import type { NavItem } from '@core/components/Navigation/NavTree'
import { MobileDrawerDismissContext } from '@core/components/Layout/MobileDrawerDismissContext'

const items: NavItem[] = [
  {
    id: 'pets',
    label: 'Pets',
    children: [
      { id: 'get-pets', label: 'List pets' },
      { id: 'hash-link', label: 'Hash link', href: '#find-pets' },
    ],
  },
  { id: 'about', label: 'About' },
]

function renderTree(dismiss: (() => void) | null, onSelect = vi.fn()) {
  const utils = render(
    <MobileDrawerDismissContext.Provider value={dismiss}>
      <NavTree items={items} onSelect={onSelect} />
    </MobileDrawerDismissContext.Provider>,
  )
  return { ...utils, onSelect }
}

afterEach(cleanup)

describe('NavTree mobile-drawer dismissal', () => {
  it('dismisses the drawer when a leaf item is selected', () => {
    const dismiss = vi.fn()
    const { getByRole, onSelect } = renderTree(dismiss)
    fireEvent.click(getByRole('button', { name: 'List pets' }))
    expect(onSelect).toHaveBeenCalledWith('get-pets')
    expect(dismiss).toHaveBeenCalledTimes(1)
  })

  it('dismisses the drawer when a leaf hash link is selected', () => {
    const dismiss = vi.fn()
    const { getByRole, onSelect } = renderTree(dismiss)
    fireEvent.click(getByRole('button', { name: 'Hash link' }))
    expect(onSelect).toHaveBeenCalledWith('find-pets')
    expect(dismiss).toHaveBeenCalledTimes(1)
  })

  it('keeps the drawer open when a group item is toggled', () => {
    const dismiss = vi.fn()
    const { getByRole } = renderTree(dismiss)
    fireEvent.click(getByRole('button', { name: 'Pets' }))
    expect(dismiss).not.toHaveBeenCalled()
  })

  it('works without a provider (desktop sidebar)', () => {
    const onSelect = vi.fn()
    const { getByRole } = render(<NavTree items={items} onSelect={onSelect} />)
    fireEvent.click(getByRole('button', { name: 'About' }))
    expect(onSelect).toHaveBeenCalledWith('about')
  })
})
