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
import { render, screen, cleanup } from '@testing-library/react'
import { OperationView } from '@openapi/components/OperationView'
import { ConfigProvider } from '@core/context/ConfigContext'
import { AuthProvider } from '@core/context/AuthContext'
import type { ConfigContextValue } from '@core/context/ConfigContext'
import type { OpenApiOperation } from '@openapi/types/openapi.types'

// jsdom lacks scrollIntoView; the inline disclosure calls it on open.
beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

afterEach(cleanup)

const operation: OpenApiOperation = {
  operationId: 'getProfile',
  summary: 'Get profile',
  method: 'get',
  path: '/profile',
  tags: ['Users'],
  parameters: [],
  responses: [],
}

function renderView(config: Partial<ConfigContextValue>) {
  return render(
    <ConfigProvider config={config}>
      <AuthProvider schemes={[]}>
        <OperationView operation={operation} serverUrl="https://api.example.com" onBack={() => {}} />
      </AuthProvider>
    </ConfigProvider>,
  )
}

describe('OperationView compact tryItLayout', () => {
  it("'panel' renders the docked Try-It column (Try It toggle present, no inline trigger)", () => {
    renderView({ displayMode: 'compact', tryItLayout: 'panel' })
    // ResponsiveColumns renders a "Try It" toggle button for the docked column.
    const toggle = screen.getByRole('button', { name: /try it/i })
    expect(toggle).toBeInTheDocument()
    // The toggle does NOT own aria-expanded — that is the inline disclosure's
    // contract; the docked column has no such attribute.
    expect(toggle).not.toHaveAttribute('aria-expanded')
    // The docked panel is mounted directly (not behind a disclosure). The right
    // column is display:none on mobile, so query including hidden elements.
    expect(screen.getByRole('button', { name: /^send$/i, hidden: true })).toBeInTheDocument()
  })

  it("'inline' renders no docked column — Try-It sits behind a collapsed disclosure", () => {
    renderView({ displayMode: 'compact', tryItLayout: 'inline' })
    const trigger = screen.getByRole('button', { name: /try it/i })
    // The inline trigger owns aria-expanded; the panel's Send is hidden until open.
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('button', { name: /^send$/i })).toBeNull()
  })
})
