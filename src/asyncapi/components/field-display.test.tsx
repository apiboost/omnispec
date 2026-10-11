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
import { render, screen, cleanup } from '@testing-library/react'
import { FieldRows, humanizeField } from './field-display'

afterEach(cleanup)

describe('humanizeField', () => {
  it('title-cases camelCase keys', () => {
    expect(humanizeField('cleanSession')).toBe('Clean Session')
  })

  it('spaces and capitalizes snake_case keys', () => {
    // Matches existing behavior: only the leading character is upper-cased.
    expect(humanizeField('clean_session')).toBe('Clean session')
  })

  it('keeps x- extension keys literal (lowercase x-)', () => {
    expect(humanizeField('x-subprotocol')).toBe('x-subprotocol')
    expect(humanizeField('x-ack')).toBe('x-ack')
    expect(humanizeField('x-destination')).toBe('x-destination')
  })

  it('keeps X- extension keys literal regardless of case', () => {
    expect(humanizeField('X-Custom-Header')).toBe('X-Custom-Header')
  })
})

describe('FieldRows value rendering', () => {
  it('renders scalar string and number values', () => {
    render(<FieldRows fields={[['topic', 'orders'], ['partitions', 3]]} />)
    expect(screen.getByText('Topic')).toBeInTheDocument()
    expect(screen.getByText('orders')).toBeInTheDocument()
    expect(screen.getByText('Partitions')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('renders a plain object as nested labelled rows, not raw JSON', () => {
    render(
      <FieldRows
        fields={[
          [
            'topicConfiguration',
            { cleanupPolicy: 'delete', retentionMs: 604800000 },
          ],
        ]}
      />,
    )
    // Parent label humanized.
    expect(screen.getByText('Topic Configuration')).toBeInTheDocument()
    // Nested keys humanized and rendered as rows.
    expect(screen.getByText('Cleanup Policy')).toBeInTheDocument()
    expect(screen.getByText('delete')).toBeInTheDocument()
    expect(screen.getByText('Retention Ms')).toBeInTheDocument()
    expect(screen.getByText('604800000')).toBeInTheDocument()
    // Not collapsed to a raw JSON literal.
    expect(screen.queryByText(/\{"cleanupPolicy"/)).toBeNull()
  })

  it('renders nested x- extension keys literally inside a plain object', () => {
    render(
      <FieldRows
        fields={[['exchange', { name: 'events', 'x-destination': 'dlx' }]]}
      />,
    )
    expect(screen.getByText('x-destination')).toBeInTheDocument()
    expect(screen.queryByText('X destination')).toBeNull()
  })

  it('renders a JSON Schema value (type/enum) as a schema table showing allowed values', () => {
    render(
      <FieldRows
        fields={[
          [
            'groupId',
            {
              type: 'string',
              enum: ['consumer-a', 'consumer-b'],
              description: 'The consumer group',
            },
          ],
        ]}
      />,
    )
    expect(screen.getByText('Group Id')).toBeInTheDocument()
    // Schema type shown.
    expect(screen.getByText('string')).toBeInTheDocument()
    // Description shown.
    expect(screen.getByText('The consumer group')).toBeInTheDocument()
    // Enum allowed values shown.
    expect(screen.getByText('consumer-a')).toBeInTheDocument()
    expect(screen.getByText('consumer-b')).toBeInTheDocument()
    // Not raw JSON.
    expect(screen.queryByText(/\{"type":"string"/)).toBeNull()
  })

  it('renders a JSON Schema object with properties as a schema table', () => {
    render(
      <FieldRows
        fields={[
          [
            'query',
            {
              type: 'object',
              properties: {
                page: { type: 'integer', description: 'Page number' },
                limit: { type: 'integer' },
              },
            },
          ],
        ]}
      />,
    )
    expect(screen.getByText('Query')).toBeInTheDocument()
    expect(screen.getByText('page')).toBeInTheDocument()
    expect(screen.getByText('Page number')).toBeInTheDocument()
    expect(screen.getByText('limit')).toBeInTheDocument()
  })

  it('renders an array of scalars as comma-separated values, not a JSON literal', () => {
    render(<FieldRows fields={[['cc', ['orders.audit', 'orders.log']]]} />)
    expect(screen.getByText('orders.audit, orders.log')).toBeInTheDocument()
    expect(screen.queryByText(/\["orders.audit"/)).toBeNull()
  })

  it('renders a single-element scalar array without brackets', () => {
    render(<FieldRows fields={[['cc', ['orders.audit']]]} />)
    expect(screen.getByText('orders.audit')).toBeInTheDocument()
    expect(screen.queryByText('["orders.audit"]')).toBeNull()
  })
})
