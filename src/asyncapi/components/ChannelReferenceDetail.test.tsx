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
import { ChannelReferenceDetail } from './ChannelReferenceDetail'
import { ConfigProvider } from '@core/context/ConfigContext'
import type { AsyncApiChannel } from '../types/asyncapi.types'

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

afterEach(cleanup)

function renderRef(channel: AsyncApiChannel) {
  return render(
    <ConfigProvider config={{ defaultExpandOperations: true, displayMode: 'reference' }}>
      <ChannelReferenceDetail channel={channel} expandAll />
    </ConfigProvider>,
  )
}

describe('ChannelReferenceDetail layout', () => {
  it('stacks the operation summary on its own full-width line so it cannot spill into the samples column', () => {
    const channel: AsyncApiChannel = {
      name: 'orders',
      address: 'orders',
      operations: [
        {
          action: 'send',
          operationId: 'placeOrder',
          summary: 'Places an order with a long summary that must wrap in a narrow column',
          messages: [{ name: 'Order', payload: { type: 'object' } }],
        },
      ],
    }
    renderRef(channel)

    // The reference layout renders the schema column in both the desktop and
    // mobile variants; the summary stacks (flexBasis 100%) in each.
    const summaries = screen.getAllByText(/Places an order/)
    expect(summaries.length).toBeGreaterThan(0)
    expect(getComputedStyle(summaries[0]).flexBasis).toBe('100%')
  })
})
