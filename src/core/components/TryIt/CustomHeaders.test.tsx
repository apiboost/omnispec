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
import { CustomHeaders } from '@core/components/TryIt/CustomHeaders'

afterEach(cleanup)

describe('CustomHeaders', () => {
  it('adds a blank row via "+ Add header"', () => {
    const onChange = vi.fn()
    const { getByText } = render(<CustomHeaders headers={[]} onChange={onChange} />)
    fireEvent.click(getByText('+ Add header'))
    expect(onChange).toHaveBeenCalledWith([{ name: '', value: '' }])
  })

  it('edits name and value of a row', () => {
    const onChange = vi.fn()
    const { getByLabelText } = render(
      <CustomHeaders headers={[{ name: '', value: '' }]} onChange={onChange} />,
    )
    fireEvent.change(getByLabelText('Custom header 1 name'), { target: { value: 'X-Trace-Id' } })
    expect(onChange).toHaveBeenCalledWith([{ name: 'X-Trace-Id', value: '' }])

    fireEvent.change(getByLabelText('Custom header 1 value'), { target: { value: 'abc' } })
    expect(onChange).toHaveBeenCalledWith([{ name: '', value: 'abc' }])
  })

  it('removes a row', () => {
    const onChange = vi.fn()
    const { getByRole } = render(
      <CustomHeaders
        headers={[
          { name: 'A', value: '1' },
          { name: 'B', value: '2' },
        ]}
        onChange={onChange}
      />,
    )
    fireEvent.click(getByRole('button', { name: 'Remove custom header 1' }))
    expect(onChange).toHaveBeenCalledWith([{ name: 'B', value: '2' }])
  })
})
