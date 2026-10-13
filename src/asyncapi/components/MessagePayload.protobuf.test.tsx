/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { render, cleanup } from '@testing-library/react'
import { describe, it, expect, afterEach } from 'vitest'
import { MessagePayload } from './MessagePayload'
import type { AsyncApiMessage } from '@asyncapi/types/asyncapi.types'

afterEach(cleanup)

// Protobuf payloads collapsed to the bare word "any". Full .proto
// field-tree parsing is a Pro capability; Free must at least surface the raw
// payload content rather than "any".
describe('MessagePayload protobuf', () => {
  it('surfaces the raw protobuf payload content instead of collapsing to "any"', () => {
    const message: AsyncApiMessage = {
      name: 'OrderProto',
      schemaFormat: 'application/vnd.google.protobuf; version=proto3',
      payload: { messageName: 'Order', fields: [{ name: 'orderId', type: 'int32' }] },
    }
    const { container } = render(<MessagePayload message={message} idx={0} />)
    expect(container.textContent).toContain('messageName')
    expect(container.textContent).toContain('Order')
    expect(container.textContent).toContain('orderId')
  })
})
