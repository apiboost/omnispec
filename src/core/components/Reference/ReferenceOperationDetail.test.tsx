/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { afterEach, describe, it, expect } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { ReferenceOperationDetail } from '@core/components/Reference/ReferenceOperationDetail'
import { ConfigProvider } from '@core/context/ConfigContext'
import { ExpandProvider } from '@core/context/ExpandContext'

describe('ReferenceOperationDetail — schema presentation', () => {
  afterEach(cleanup)

  it('renders operation schemas through the configurable SchemaTree, honoring schemaStyle', () => {
    const { container } = render(
      <ConfigProvider config={{ schemaStyle: 'chain' }}>
        <ReferenceOperationDetail
          operationId="getThing"
          parameters={[
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          ]}
          responses={[]}
        />
      </ConfigProvider>,
    )

    // The reference layout must use the same configurable renderer as compact
    // mode, so the client's `schemaStyle` choice takes effect here too.
    const tree = container.querySelector('.omnispec-schema-tree')
    expect(tree).not.toBeNull()
    expect(tree!.getAttribute('data-schema-style')).toBe('chain')
  })

  it('defaults to the "lines" presentation when no style is configured', () => {
    const { container } = render(
      <ConfigProvider config={{}}>
        <ReferenceOperationDetail
          operationId="getThing"
          parameters={[
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          ]}
          responses={[]}
        />
      </ConfigProvider>,
    )

    const tree = container.querySelector('.omnispec-schema-tree')
    expect(tree!.getAttribute('data-schema-style')).toBe('lines')
  })

  it('does not render an expand toggle for a response with no content', () => {
    const { container, getByText } = render(
      <ConfigProvider config={{}}>
        <ReferenceOperationDetail
          operationId="getThing"
          parameters={[]}
          responses={[
            { statusCode: '401', description: 'Missing or invalid authorization.' },
          ]}
        />
      </ConfigProvider>,
    )

    // The status + description still render...
    expect(getByText('Missing or invalid authorization.')).toBeTruthy()
    // ...but there is no expand affordance, because there is nothing to expand.
    expect(container.querySelectorAll('[aria-expanded]')).toHaveLength(0)
  })

  it('renders an expand toggle for a response that has content', () => {
    const { container } = render(
      <ConfigProvider config={{}}>
        <ReferenceOperationDetail
          operationId="getThing"
          parameters={[]}
          responses={[
            {
              statusCode: '200',
              description: 'A pet',
              content: {
                'application/json': { schema: { type: 'object', properties: { id: { type: 'integer' } } } },
              },
            },
          ]}
        />
      </ConfigProvider>,
    )

    expect(container.querySelectorAll('[aria-expanded]')).toHaveLength(1)
  })

  it('opens response cards when Expand All is signaled via the expand context', () => {
    const { container } = render(
      <ExpandProvider expandAll={true} expandGeneration={1}>
        <ConfigProvider config={{}}>
          <ReferenceOperationDetail
            operationId="getThing"
            parameters={[]}
            responses={[
              {
                statusCode: '200',
                description: 'A pet',
                content: {
                  'application/json': { schema: { type: 'object', properties: { id: { type: 'integer' } } } },
                },
              },
            ]}
          />
        </ConfigProvider>
      </ExpandProvider>,
    )

    // The response card mirrors the expand-all signal from context.
    const toggle = container.querySelector('[aria-expanded]')
    expect(toggle?.getAttribute('aria-expanded')).toBe('true')
    // ...and its schema content is rendered.
    expect(container.querySelector('.omnispec-schema-tree')).not.toBeNull()
  })
})
