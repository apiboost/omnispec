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
import { ComponentsSection } from './ComponentsSection'
import { ConfigProvider } from '@core/context/ConfigContext'
import { ExpandProvider } from '@core/context/ExpandContext'
import type { AsyncApiComponents } from '../types/asyncapi.types'

afterEach(cleanup)

function renderComponents(components: AsyncApiComponents) {
  return render(
    <ConfigProvider config={{}}>
      <ComponentsSection components={components} />
    </ConfigProvider>,
  )
}

// The component-message Collapsible is closed by default; mirror the document-wide
// "expand all" so the body (payload, headers, contentType) mounts for assertions.
function renderComponentsExpanded(components: AsyncApiComponents) {
  return render(
    <ConfigProvider config={{}}>
      <ExpandProvider expandAll expandGeneration={1}>
        <ComponentsSection components={components} />
      </ExpandProvider>
    </ConfigProvider>,
  )
}

describe('ComponentsSection', () => {
  it('renders a browsable component messages section', () => {
    const components: AsyncApiComponents = {
      schemas: {},
      securitySchemes: {},
      messages: {
        UserSignedUp: {
          name: 'UserSignedUp',
          title: 'User signed up',
          payload: { type: 'object', properties: { id: { type: 'string' } } },
        },
      },
    }
    renderComponents(components)
    expect(screen.getByText('Messages')).toBeInTheDocument()
    expect(screen.getByText('UserSignedUp')).toBeInTheDocument()
  })

  it('shows a "Headers" label before the headers schema', () => {
    const components: AsyncApiComponents = {
      schemas: {},
      securitySchemes: {},
      messages: {
        UserSignedUp: {
          name: 'UserSignedUp',
          payload: { type: 'object', properties: { id: { type: 'string' } } },
          headers: { type: 'object', properties: { 'x-trace-id': { type: 'string' } } },
        },
      },
    }
    renderComponentsExpanded(components)
    expect(screen.getByText('Headers')).toBeInTheDocument()
  })

  // correlationId must render in the components Messages view, matching the
  // channel view (it was previously only shown inside ChannelDetail).
  it('renders a message correlationId', () => {
    const components: AsyncApiComponents = {
      schemas: {},
      securitySchemes: {},
      messages: {
        AddOnlyMessage: {
          name: 'AddOnlyMessage',
          payload: { type: 'object' },
          correlationId: { location: '$message.header#/correlationId', description: 'Correlates replies' },
        },
      },
    }
    renderComponentsExpanded(components)
    expect(screen.getByText('correlationId')).toBeInTheDocument()
    expect(screen.getByText('$message.header#/correlationId')).toBeInTheDocument()
    expect(screen.getByText('Correlates replies')).toBeInTheDocument()
  })

  // Applied message trait identifiers are surfaced in the components Messages view.
  it('renders applied message trait identifiers', () => {
    const components: AsyncApiComponents = {
      schemas: {},
      securitySchemes: {},
      messages: {
        AddOnlyMessage: {
          name: 'AddOnlyMessage',
          payload: { type: 'object' },
          appliedTraits: ['CommonHeaders', 'TracingTrait'],
        },
      },
    }
    renderComponentsExpanded(components)
    expect(screen.getByText('CommonHeaders')).toBeInTheDocument()
    expect(screen.getByText('TracingTrait')).toBeInTheDocument()
  })

  it('displays an inherited contentType', () => {
    const components: AsyncApiComponents = {
      schemas: {},
      securitySchemes: {},
      messages: {
        UserSignedUp: {
          name: 'UserSignedUp',
          contentType: 'application/json',
          contentTypeInherited: true,
          payload: { type: 'object', properties: { id: { type: 'string' } } },
        },
      },
    }
    renderComponentsExpanded(components)
    expect(screen.getByText('application/json')).toBeInTheDocument()
    expect(screen.getByText(/default/i)).toBeInTheDocument()
  })
})
