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
import { SecuritySchemesSection } from './SecuritySchemesSection'
import type { AsyncApiSecurityScheme } from '../types/asyncapi.types'

afterEach(cleanup)

describe('SecuritySchemesSection', () => {
  it('renders each scheme with its name, type, and type-specific fields', () => {
    const schemes: Record<string, AsyncApiSecurityScheme> = {
      apiKey: { type: 'httpApiKey', name: 'X-Api-Key', in: 'header' },
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    }
    render(<SecuritySchemesSection securitySchemes={schemes} />)
    expect(screen.getByText('apiKey')).toBeInTheDocument()
    expect(screen.getByText('httpApiKey')).toBeInTheDocument()
    expect(screen.getByText('X-Api-Key')).toBeInTheDocument()
    expect(screen.getByText('bearerAuth')).toBeInTheDocument()
    expect(screen.getByText('bearer')).toBeInTheDocument()
    expect(screen.getByText('JWT')).toBeInTheDocument()
  })

  it('lists OAuth2 flows and their scopes', () => {
    const schemes: Record<string, AsyncApiSecurityScheme> = {
      oauth: {
        type: 'oauth2',
        flows: {
          clientCredentials: {
            tokenUrl: 'https://example.com/token',
            availableScopes: { 'orders:read': 'Read orders', 'orders:write': 'Write orders' },
          },
        },
      },
    }
    render(<SecuritySchemesSection securitySchemes={schemes} />)
    expect(screen.getByText('clientCredentials')).toBeInTheDocument()
    expect(screen.getByText('orders:read')).toBeInTheDocument()
    expect(screen.getByText('Read orders')).toBeInTheDocument()
    expect(screen.getByText('orders:write')).toBeInTheDocument()
  })

  it('renders nothing when there are no schemes', () => {
    const { container } = render(<SecuritySchemesSection securitySchemes={{}} />)
    expect(container).toBeEmptyDOMElement()
  })
})
