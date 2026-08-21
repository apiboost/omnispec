/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { ErrorBoundary } from '@core/components/common/ErrorBoundary'

function Bomb(): never {
  throw new Error('boom')
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Silence React's expected error logging for the thrown render error.
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders children when there is no error', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <span>safe content</span>
      </ErrorBoundary>,
    )
    expect(getByText('safe content')).toBeTruthy()
  })

  it('renders the default fallback when a child throws', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    )
    expect(getByText('Something went wrong')).toBeTruthy()
    expect(getByText('boom')).toBeTruthy()
  })

  it('renders a custom fallback and calls onError', () => {
    const onError = vi.fn()
    const { getByText } = render(
      <ErrorBoundary fallback={(error) => <div>caught: {error.message}</div>} onError={onError}>
        <Bomb />
      </ErrorBoundary>,
    )
    expect(getByText('caught: boom')).toBeTruthy()
    expect(onError).toHaveBeenCalledOnce()
  })
})
