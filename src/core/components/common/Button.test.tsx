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
import { Button } from '@core/components/common/Button'

describe('Button', () => {
  it('renders a <button> by default and fires onClick', () => {
    let clicked = false
    const { getByRole } = render(
      <Button onClick={() => {
        clicked = true
      }}>Go</Button>,
    )
    const btn = getByRole('button', { name: 'Go' })
    expect(btn.tagName).toBe('BUTTON')
    btn.click()
    expect(clicked).toBe(true)
  })

  it('renders an <a> when href is provided', () => {
    const { getByRole } = render(
      <Button href="/spec.yaml" download>
        Download
      </Button>,
    )
    const link = getByRole('link', { name: 'Download' })
    expect(link.tagName).toBe('A')
    expect(link.getAttribute('href')).toBe('/spec.yaml')
    expect(link.hasAttribute('download')).toBe(true)
  })

  it('respects the disabled attribute on the button element', () => {
    const { getByRole } = render(<Button disabled>Nope</Button>)
    expect((getByRole('button', { name: 'Nope' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('renders primary and active variants without error', () => {
    const { getByRole: primary } = render(<Button variant="primary">Send</Button>)
    expect(primary('button', { name: 'Send' })).toBeTruthy()
    const { getByRole: active } = render(<Button active>Authorize</Button>)
    expect(active('button', { name: 'Authorize' })).toBeTruthy()
  })
})
