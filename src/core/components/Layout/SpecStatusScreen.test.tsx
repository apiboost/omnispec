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
import { SpecStatusScreen } from '@core/components/Layout/SpecStatusScreen'
import { ErrorMessage } from '@core/components/common/ErrorMessage'

afterEach(cleanup)

describe('SpecStatusScreen', () => {
  it('shows the status content in the main area while keeping the sidebarHeader nav slot', () => {
    const { getByText } = render(
      <SpecStatusScreen slots={{ sidebarHeader: <nav>portal nav</nav> }}>
        <ErrorMessage title="Failed to load specification" message="Failed to fetch spec: 404" />
      </SpecStatusScreen>,
    )
    // The whole point: a failed spec load keeps the host nav reachable.
    expect(getByText('portal nav')).toBeInTheDocument()
    expect(getByText('Failed to load specification')).toBeInTheDocument()
    expect(getByText('Failed to fetch spec: 404')).toBeInTheDocument()
  })

  it('renders the status content with no sidebar when no slots or nav are provided', () => {
    const { getByText, queryByRole } = render(
      <SpecStatusScreen>
        <ErrorMessage title="Failed to load specification" />
      </SpecStatusScreen>,
    )
    expect(getByText('Failed to load specification')).toBeInTheDocument()
    expect(queryByRole('button', { name: 'Open navigation' })).toBeNull()
  })
})
