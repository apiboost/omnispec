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
import { render, fireEvent, cleanup } from '@testing-library/react'
import { ParameterForm } from '@core/components/TryIt/ParameterForm'
import type { ParameterDef } from '@core/components/TryIt/ParameterForm'

afterEach(cleanup)

const arrayEnumParam: ParameterDef = {
  name: 'status',
  in: 'query',
  required: false,
  type: 'array',
  itemsEnum: ['available', 'pending', 'sold'],
}

describe('ParameterForm multi-select', () => {
  it('renders a checkbox per enum item', () => {
    const { getAllByRole } = render(
      <ParameterForm parameters={[arrayEnumParam]} values={{}} onChange={() => {}} />,
    )
    expect(getAllByRole('checkbox')).toHaveLength(3)
  })

  it('adds a value on check (comma-joined model)', () => {
    const onChange = vi.fn()
    const { getAllByRole } = render(
      <ParameterForm parameters={[arrayEnumParam]} values={{ status: 'available' }} onChange={onChange} />,
    )
    fireEvent.click(getAllByRole('checkbox')[1])
    expect(onChange).toHaveBeenCalledWith('status', 'available,pending')
  })

  it('removes a value on uncheck', () => {
    const onChange = vi.fn()
    const { getAllByRole } = render(
      <ParameterForm
        parameters={[arrayEnumParam]}
        values={{ status: 'available,sold' }}
        onChange={onChange}
      />,
    )
    fireEvent.click(getAllByRole('checkbox')[0])
    expect(onChange).toHaveBeenCalledWith('status', 'sold')
  })

  it('reflects checked state from the value', () => {
    const { getAllByRole } = render(
      <ParameterForm
        parameters={[arrayEnumParam]}
        values={{ status: 'pending,sold' }}
        onChange={() => {}}
      />,
    )
    const boxes = getAllByRole('checkbox') as HTMLInputElement[]
    expect(boxes.map((b) => b.checked)).toEqual([false, true, true])
  })
})
