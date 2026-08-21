/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { MarkdownRenderer } from '@core/components/MarkdownRenderer/MarkdownRenderer'

afterEach(cleanup)

describe('MarkdownRenderer', () => {
  it('flows single newlines as soft breaks (CommonMark), not <br>', () => {
    // YAML block scalars (`description: |`) preserve the author's source
    // wrapping — those newlines must not become hard line breaks.
    const { container } = render(
      <MarkdownRenderer
        content={
          'Manage Apiboost Access Groups programmatically.\nAccess Groups control which developers and teams can discover, view,\nand use specific API Products.'
        }
      />,
    )
    expect(container.querySelectorAll('br')).toHaveLength(0)
    expect(container.querySelectorAll('p')).toHaveLength(1)
    // Soft breaks stay as literal \n in the HTML source; browsers collapse
    // them as ordinary whitespace, so the text flows as one fluid string.
    expect(container.textContent?.replace(/\s+/g, ' ')).toContain(
      'discover, view, and use specific API Products',
    )
  })

  it('keeps blank lines as paragraph breaks', () => {
    const { container } = render(
      <MarkdownRenderer content={'First paragraph.\n\nSecond paragraph.'} />,
    )
    expect(container.querySelectorAll('p')).toHaveLength(2)
  })

  it('honors explicit hard breaks (trailing double space)', () => {
    const { container } = render(
      <MarkdownRenderer content={'line one  \nline two'} />,
    )
    expect(container.querySelectorAll('br')).toHaveLength(1)
  })

  it('still renders GFM tables', () => {
    const { container } = render(
      <MarkdownRenderer content={'| a | b |\n| - | - |\n| 1 | 2 |'} />,
    )
    expect(container.querySelector('table')).toBeTruthy()
  })
})
