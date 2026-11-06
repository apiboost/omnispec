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
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { AsyncApiSpec } from './AsyncApiSpec'

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

afterEach(cleanup)

// 3.x request-reply with a FIXED literal reply address (`reply.address` as a
// string) and a reply channel. QA reported the fixed address didn't appear in
// reference mode, where the reply channel + address were dropped entirely.
const spec = {
  asyncapi: '3.0.0',
  info: { title: 'Ping API', version: '1.0.0' },
  channels: {
    ping: { address: 'ping', messages: { Ping: { payload: { type: 'object' } } } },
    pong: { address: 'pong', messages: { Pong: { payload: { type: 'object' } } } },
  },
  operations: {
    doPing: {
      action: 'send',
      channel: { $ref: '#/channels/ping' },
      messages: [{ $ref: '#/channels/ping/messages/Ping' }],
      reply: {
        channel: { $ref: '#/channels/pong' },
        address: 'pong/fixed-queue',
        messages: [{ $ref: '#/channels/pong/messages/Pong' }],
      },
    },
  },
}

describe('AsyncApiSpec reply address', () => {
  it('shows a fixed reply address in compact mode', async () => {
    render(<AsyncApiSpec spec={spec} theme={{ base: 'light' }} defaultExpandOperations />)

    expect(await screen.findByText('pong/fixed-queue')).toBeInTheDocument()
  })

  it('links the reply channel to that channel’s card', async () => {
    render(<AsyncApiSpec spec={spec} theme={{ base: 'light' }} defaultExpandOperations />)

    const link = await screen.findByRole('link', { name: 'pong' })
    expect(link).toHaveAttribute('href', '#channel-pong')
  })

  it('shows the fixed reply address in reference mode (was dropped before)', async () => {
    render(<AsyncApiSpec spec={spec} theme={{ base: 'light' }} displayMode="reference" defaultExpandOperations />)

    // The reply lives in the right "Samples" column; open its tab in the
    // tab-based (mobile) reference layout the test environment renders.
    const samplesTabs = await screen.findAllByRole('tab', { name: /^samples$/i })
    fireEvent.click(samplesTabs[0])

    // ReferenceLayout renders both the desktop column and the mobile tab panel
    // (CSS toggles which is visible), so the address appears more than once.
    const addresses = await screen.findAllByText('pong/fixed-queue')
    expect(addresses.length).toBeGreaterThan(0)
  })
})
