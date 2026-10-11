/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { describe, it, expect, afterEach, beforeAll } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { AsyncApiSpec } from './AsyncApiSpec'

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

afterEach(cleanup)

// End-to-end regression for ABOSPEC-53: root externalDocs must render for a 3.x
// document, through the full parser -> AsyncOverview -> ExternalDocsLink path
// (QA reported 3.x root externalDocs did not appear). Operations-as-first-class
// 3.x shape is used deliberately.
const v3SpecWithExternalDocs = {
  asyncapi: '3.0.0',
  info: { title: 'Lighting API', version: '1.0.0' },
  externalDocs: { url: 'https://docs.example.com/lighting', description: 'Lighting developer guide' },
  channels: {
    lightingMeasured: {
      address: 'lighting/measured',
      messages: { measured: { payload: { type: 'object' } } },
    },
  },
  operations: {
    receiveLight: {
      action: 'receive',
      channel: { $ref: '#/channels/lightingMeasured' },
      messages: [{ $ref: '#/channels/lightingMeasured/messages/measured' }],
    },
  },
}

describe('AsyncApiSpec root externalDocs (3.x end-to-end)', () => {
  it('renders the root externalDocs link with an accessible new-tab label for a 3.x spec', async () => {
    render(<AsyncApiSpec spec={v3SpecWithExternalDocs} theme={{ base: 'light' }} />)

    const link = await screen.findByRole('link', {
      name: 'Lighting API external docs, opens in new tab',
    })
    expect(link).toHaveAttribute('href', 'https://docs.example.com/lighting')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveTextContent('Lighting developer guide')
  })
})
