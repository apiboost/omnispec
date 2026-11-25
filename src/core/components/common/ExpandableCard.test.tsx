/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ExpandableCard } from '@core/components/common/ExpandableCard'

describe('ExpandableCard', () => {
  it('lets a long path title wrap after each slash, keeping its full text', () => {
    const title = 'smartylighting/streetlights/1/0/event/{streetlightId}/lighting/measured'
    const { getByRole } = render(
      <ExpandableCard title={title} rightLabel="2 operations">body</ExpandableCard>,
    )
    const button = getByRole('button')
    expect(button.textContent).toBe(`${title}2 operations`)
    expect(button.querySelectorAll('wbr')).toHaveLength(title.split('/').length - 1)
  })

  it('renders a title without slashes as plain text', () => {
    const { getByRole } = render(<ExpandableCard title="UserType">body</ExpandableCard>)
    const button = getByRole('button', { name: 'UserType' })
    expect(button.querySelector('wbr')).toBeNull()
  })
})
