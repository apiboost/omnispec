/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { describe, it, expect, afterEach, beforeAll } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import { InlineTryIt } from '@core/components/TryIt/InlineTryIt'
import { ConfigProvider } from '@core/context/ConfigContext'
import { AuthProvider } from '@core/context/AuthContext'

// jsdom does not implement scrollIntoView; the disclosure calls it on open.
beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

afterEach(cleanup)

function renderInline() {
  return render(
    <ConfigProvider config={{}}>
      <AuthProvider schemes={[]}>
        <InlineTryIt
          method="get"
          path="/profile"
          serverUrl="https://api.example.com"
          parameters={[{ name: 'userId', in: 'query', required: false }]}
        />
      </AuthProvider>
    </ConfigProvider>,
  )
}

describe('InlineTryIt', () => {
  it('is collapsed by default (region hidden, panel not visible)', () => {
    renderInline()
    const trigger = screen.getByRole('button', { name: /try it/i })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')

    // The region wrapper carries `hidden`, so getByRole for the panel's Send
    // button reports it as not accessible.
    expect(screen.queryByRole('button', { name: /^send$/i })).toBeNull()
  })

  it('reveals the Try-It panel when the trigger is clicked', () => {
    renderInline()
    const trigger = screen.getByRole('button', { name: /try it/i })
    fireEvent.click(trigger)

    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: /^send$/i })).toBeInTheDocument()
  })

  it('keeps the TryItPanel MOUNTED across collapse — entered input survives', () => {
    renderInline()
    const trigger = screen.getByRole('button', { name: /try it/i })

    // Open, type into the query param input.
    fireEvent.click(trigger)
    const input = screen.getByLabelText(/userId/i) as HTMLInputElement
    fireEvent.change(input, { target: { value: 'abc-123' } })
    expect(input.value).toBe('abc-123')

    // Collapse, then re-open. The same input node must retain its value, which
    // is only possible if the panel was never unmounted.
    fireEvent.click(trigger) // collapse
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(trigger) // expand

    const inputAfter = screen.getByLabelText(/userId/i) as HTMLInputElement
    expect(inputAfter.value).toBe('abc-123')
  })

  it('associates the trigger with the region via aria-controls', () => {
    renderInline()
    const trigger = screen.getByRole('button', { name: /try it/i })
    const controls = trigger.getAttribute('aria-controls')
    expect(controls).toBeTruthy()
    const region = document.getElementById(controls as string)
    expect(region).not.toBeNull()
    // The Send button lives inside the controlled region.
    fireEvent.click(trigger)
    expect(within(region as HTMLElement).getByRole('button', { name: /^send$/i })).toBeInTheDocument()
  })
})
