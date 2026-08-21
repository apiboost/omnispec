/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { afterEach, describe, it, expect } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { Collapsible } from '@core/components/common/Collapsible'
import { ExpandProvider } from '@core/context/ExpandContext'

describe('Collapsible — expand-all context', () => {
  afterEach(cleanup)

  it('stays at its defaultOpen state at generation 0 (initial mount)', () => {
    const { container } = render(
      <ExpandProvider expandAll={true} expandGeneration={0}>
        <Collapsible title="Section">
          <div>body</div>
        </Collapsible>
      </ExpandProvider>,
    )
    // Generation 0 must not override defaultOpen (false here).
    expect(container.querySelector('[aria-expanded]')?.getAttribute('aria-expanded')).toBe('false')
  })

  it('opens when Expand All is signaled via context (generation > 0)', () => {
    const { container, getByText } = render(
      <ExpandProvider expandAll={true} expandGeneration={1}>
        <Collapsible title="Section">
          <div>body</div>
        </Collapsible>
      </ExpandProvider>,
    )
    expect(container.querySelector('[aria-expanded]')?.getAttribute('aria-expanded')).toBe('true')
    expect(getByText('body')).toBeTruthy()
  })
})
