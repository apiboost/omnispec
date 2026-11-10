/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { OpenApiSpec } from './OpenApiSpec'

describe('OpenApiSpec error state', () => {
  it('renders the themed error card when the spec fails to load', async () => {
    // A root-relative URL is unfetchable under jsdom/node, forcing the error state.
    render(<OpenApiSpec spec={'/missing-spec.json'} theme={{ base: 'light' }} />)
    expect(await screen.findByText('Failed to load specification')).toBeInTheDocument()
  })
})

describe('OpenApiSpec Try-It callbacks', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('fires onTryItRequest and onTryItResponse when Send is clicked', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"ok":true}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })))
    const onTryItRequest = vi.fn()
    const onTryItResponse = vi.fn()
    const spec = {
      openapi: '3.0.3',
      info: { title: 'Pets', version: '1' },
      servers: [{ url: 'https://api.example.com' }],
      paths: { '/pets': { get: { operationId: 'listPets', responses: { 200: { description: 'ok' } } } } },
    }
    render(
      <OpenApiSpec
        spec={spec}
        defaultExpandOperations
        onTryItRequest={onTryItRequest}
        onTryItResponse={onTryItResponse}
      />,
    )
    fireEvent.click(await screen.findByRole('button', { name: /^try it$/i }))
    const send = (await screen.findAllByRole('button', { name: /^send$/i }))[0]
    fireEvent.click(send)
    await waitFor(() => expect(onTryItResponse).toHaveBeenCalledTimes(1))
    expect(onTryItRequest).toHaveBeenCalledTimes(1)
    expect(onTryItRequest.mock.calls[0][0]).toMatchObject({ method: 'GET', url: 'https://api.example.com/pets' })
    expect(onTryItResponse.mock.calls[0][0]).toMatchObject({ status: 200, body: '{"ok":true}' })
  })
})
