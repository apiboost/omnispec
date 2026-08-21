/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import {
  FieldName,
  SchemaRefLink,
  FieldDescription,
  SchemaSectionTitle,
  SchemaBadge,
} from '@core/components/SchemaViewer/SchemaPrimitives'

describe('SchemaPrimitives', () => {
  it('FieldName renders the name and a required marker only when required', () => {
    const { rerender, container } = render(<FieldName name="userId" />)
    expect(container.textContent).toBe('userId')

    rerender(<FieldName name="userId" required />)
    expect(container.textContent).toBe('userId*')
  })

  it('SchemaRefLink is a button that fires onClick', () => {
    let clicked = false
    const { getByRole } = render(
      <SchemaRefLink onClick={() => {
        clicked = true
      }}>User</SchemaRefLink>,
    )
    const btn = getByRole('button', { name: 'User' })
    btn.click()
    expect(clicked).toBe(true)
  })

  it('FieldDescription renders its children', () => {
    const { container } = render(<FieldDescription>The user id.</FieldDescription>)
    expect(container.textContent).toBe('The user id.')
  })

  it('SchemaSectionTitle renders an h5', () => {
    const { container } = render(<SchemaSectionTitle>Fields</SchemaSectionTitle>)
    expect(container.querySelector('h5')?.textContent).toBe('Fields')
  })

  it('SchemaBadge renders each variant without error', () => {
    const variants = ['required', 'deprecated', 'readonly', 'writeonly', 'constraint', 'enum', 'muted', 'default'] as const
    variants.forEach((variant) => {
      const { container } = render(<SchemaBadge variant={variant}>{variant}</SchemaBadge>)
      expect(container.textContent).toBe(variant)
    })
  })
})
