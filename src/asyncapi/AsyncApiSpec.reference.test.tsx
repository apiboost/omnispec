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
import { AsyncApiSpec } from './AsyncApiSpec'

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

afterEach(cleanup)

const spec = {
  asyncapi: '2.6.0',
  info: { title: 'Reference mode', version: '1.0.0' },
  channels: {
    'orders/placed': {
      subscribe: {
        operationId: 'onOrderPlaced',
        message: {
          name: 'OrderPlaced',
          contentType: 'application/json',
          payload: { type: 'object', properties: { id: { type: 'string' } } },
        },
      },
    },
  },
}

describe('AsyncApiSpec display mode', () => {
  it('renders the three-panel reference layout (samples column) when displayMode is "reference"', async () => {
    render(<AsyncApiSpec spec={spec} theme={{ base: 'light' }} displayMode="reference" defaultExpandOperations />)

    await screen.findByRole('navigation')

    // ReferenceLayout exposes a "Samples" tab in its right/mobile column — this is
    // the distinctive three-panel structure OpenAPI produces in reference mode.
    const samplesTabs = await screen.findAllByRole('tab', { name: /^samples$/i })
    expect(samplesTabs.length).toBeGreaterThan(0)
  })

  it('keeps the compact single-column layout (no Samples column) when displayMode is "compact"', async () => {
    render(<AsyncApiSpec spec={spec} theme={{ base: 'light' }} displayMode="compact" defaultExpandOperations />)

    await screen.findByRole('navigation')

    // Compact mode renders the message as "Payload Schema"/"Example" tabs — never
    // the reference "Samples" column.
    expect(screen.queryByRole('tab', { name: /^samples$/i })).toBeNull()
  })

  it('defaults to compact (no Samples column) when displayMode is unset', async () => {
    render(<AsyncApiSpec spec={spec} theme={{ base: 'light' }} defaultExpandOperations />)

    await screen.findByRole('navigation')
    expect(screen.queryByRole('tab', { name: /^samples$/i })).toBeNull()
  })
})
