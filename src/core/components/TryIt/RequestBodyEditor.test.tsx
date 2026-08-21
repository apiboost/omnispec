/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { RequestBodyEditor, getMultipartProps } from '@core/components/TryIt/RequestBodyEditor'

describe('getMultipartProps', () => {
  it('derives fields from schema properties and marks binary props as files', () => {
    const props = getMultipartProps({
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        description: { type: 'string', description: 'A caption' },
      },
    })
    expect(props).toHaveLength(2)
    expect(props[0]).toMatchObject({ name: 'file', isFile: true, required: true })
    expect(props[1]).toMatchObject({ name: 'description', isFile: false, required: false, description: 'A caption' })
  })

  it('treats contentEncoding (OAS 3.1) and binary array items as files', () => {
    const props = getMultipartProps({
      type: 'object',
      properties: {
        doc: { type: 'string', contentEncoding: 'base64' },
        photos: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
    })
    expect(props[0].isFile).toBe(true)
    expect(props[1].isFile).toBe(true)
  })

  it('returns empty for schema without properties', () => {
    expect(getMultipartProps(undefined)).toEqual([])
    expect(getMultipartProps({ type: 'string' })).toEqual([])
  })
})

describe('RequestBodyEditor form modes', () => {
  const schema = {
    type: 'object',
    required: ['file'],
    properties: {
      file: { type: 'string', format: 'binary' },
      note: { type: 'string' },
    },
  }

  it('renders file picker + text field for multipart/form-data', () => {
    const { container } = render(
      <RequestBodyEditor
        value=""
        onChange={() => {}}
        contentType="multipart/form-data"
        schema={schema}
        multipartFields={{}}
        onMultipartFieldChange={() => {}}
      />,
    )
    expect(container.querySelector('input[type="file"]')).toBeTruthy()
    expect(container.querySelector('input[type="text"]')).toBeTruthy()
    expect(container.querySelector('textarea')).toBeNull()
  })

  it('renders text fields (no file pickers) for x-www-form-urlencoded', () => {
    const { container } = render(
      <RequestBodyEditor
        value=""
        onChange={() => {}}
        contentType="application/x-www-form-urlencoded"
        schema={schema}
        multipartFields={{}}
        onMultipartFieldChange={() => {}}
      />,
    )
    expect(container.querySelector('input[type="file"]')).toBeNull()
    expect(container.querySelectorAll('input[type="text"]')).toHaveLength(2)
    expect(container.querySelector('textarea')).toBeNull()
  })

  it('falls back to the textarea for JSON bodies', () => {
    const { container } = render(
      <RequestBodyEditor
        value="{}"
        onChange={() => {}}
        contentType="application/json"
        schema={schema}
        multipartFields={{}}
        onMultipartFieldChange={() => {}}
      />,
    )
    expect(container.querySelector('textarea')).toBeTruthy()
    expect(container.querySelector('input')).toBeNull()
  })

  it('reports field edits through onMultipartFieldChange', () => {
    const onChange = vi.fn()
    const { container } = render(
      <RequestBodyEditor
        value=""
        onChange={() => {}}
        contentType="application/x-www-form-urlencoded"
        schema={schema}
        multipartFields={{}}
        onMultipartFieldChange={onChange}
      />,
    )
    const input = container.querySelectorAll('input[type="text"]')[1] as HTMLInputElement
    fireEvent.change(input, { target: { value: 'hello' } })
    expect(onChange).toHaveBeenCalledWith('note', 'hello')
  })
})
