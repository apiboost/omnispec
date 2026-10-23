/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { render, cleanup, screen } from '@testing-library/react'
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

  it('renders a .proto source string as a formatted code block in a Payload Schema tab, not an escaped one-line string', () => {
    const proto = [
      'syntax = "proto3";',
      '',
      'message Order {',
      '  int32 order_id = 1;',
      '  string sku = 2;',
      '}',
    ].join('\n')
    const message: AsyncApiMessage = {
      name: 'OrderProto',
      schemaFormat: 'application/vnd.google.protobuf; version=proto3',
      // A protobuf payload commonly arrives as the raw `.proto` source string.
      payload: proto as unknown as Record<string, unknown>,
    }
    const { container } = render(<MessagePayload message={message} idx={0} />)
    // Rendered in a proper tab/section affordance (like JSON/Avro payloads).
    expect(screen.getByRole('tab', { name: /payload schema/i })).toBeInTheDocument()
    // The `.proto` source is shown cleanly, not JSON-escaped to one line.
    expect(container.textContent).toContain('message Order')
    expect(container.textContent).toContain('int32 order_id = 1;')
    // Not the escaped `"syntax = \"proto3\";\n..."` one-liner.
    expect(container.textContent).not.toContain('\\n')
    expect(container.textContent).not.toContain('syntax = \\"proto3\\"')
  })
})
