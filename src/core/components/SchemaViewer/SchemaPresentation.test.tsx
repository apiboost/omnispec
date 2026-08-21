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
import {
  PresentationContainer,
  PresentationRow,
  PresentationChildren,
} from '@core/components/SchemaViewer/SchemaPresentation'

describe('SchemaPresentation — variant-driven styled components', () => {
  afterEach(cleanup)

  it('does not forward the style-only `variant` prop to the DOM', () => {
    const { container } = render(
      <PresentationContainer variant="card" data-testid="c">child</PresentationContainer>,
    )
    const el = container.querySelector('[data-testid="c"]')!
    // shouldForwardProp must strip `variant` so it never becomes a DOM attribute.
    expect(el.hasAttribute('variant')).toBe(false)
  })

  it('exposes the variant as a stable `data-schema-style` marker on the container', () => {
    const variants = ['lines', 'table', 'card', 'tokens', 'chain'] as const
    for (const v of variants) {
      const { container, unmount } = render(<PresentationContainer variant={v} />)
      expect(container.firstElementChild!.getAttribute('data-schema-style')).toBe(v)
      unmount()
    }
  })

  it('renders row and children with a distinct emotion class per variant', () => {
    const variants = ['lines', 'table', 'card', 'tokens', 'chain'] as const
    const rowClasses = new Set<string>()
    const childrenClasses = new Set<string>()

    for (const v of variants) {
      const { container, unmount } = render(
        <>
          <PresentationRow variant={v} data-testid="row" />
          <PresentationChildren variant={v} data-testid="children" />
        </>,
      )
      rowClasses.add(container.querySelector('[data-testid="row"]')!.className)
      childrenClasses.add(container.querySelector('[data-testid="children"]')!.className)
      unmount()
    }

    // Row and children genuinely differ across all five variants.
    expect(rowClasses.size).toBe(5)
    expect(childrenClasses.size).toBe(5)
  })
})
