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
import type { AsyncApiComponents } from '../types/asyncapi.types'

afterEach(cleanup)

function renderComponents(components: AsyncApiComponents) {
  return render(
    <ConfigProvider config={{}}>
      <ComponentsSection components={components} />
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
})
