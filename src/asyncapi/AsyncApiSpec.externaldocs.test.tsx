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

// End-to-end regression for root externalDocs must render for a 3.x
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

// AsyncAPI 3.0 relocated the document-root `tags` and `externalDocs` out of the
// root and INTO the `info` object (2.x keeps them at the root). QA reported that
// for real 3.0 specs the root externalDocs, tag descriptions, and tag
// externalDocs all failed to render — the parser only ever read the 2.x root
// location. These specs place the metadata where 3.0 actually puts it.
const v3SpecWithInfoMetadata = {
  asyncapi: '3.0.0',
  info: {
    title: 'Lighting API',
    version: '1.0.0',
    externalDocs: { url: 'https://docs.example.com/lighting', description: 'Lighting developer guide' },
    tags: [
      {
        name: 'Commands',
        description: 'Device command operations',
        externalDocs: { url: 'https://docs.example.com/commands', description: 'Commands reference' },
      },
    ],
  },
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
      tags: [{ name: 'Commands' }],
    },
  },
}

describe('AsyncApiSpec 3.x info-level metadata (AsyncAPI 3.0 location)', () => {
  it('renders root externalDocs declared under info', async () => {
    render(<AsyncApiSpec spec={v3SpecWithInfoMetadata} theme={{ base: 'light' }} />)

    const link = await screen.findByRole('link', {
      name: 'Lighting API external docs, opens in new tab',
    })
    expect(link).toHaveAttribute('href', 'https://docs.example.com/lighting')
  })

  it('renders tag description for tags declared under info', async () => {
    render(<AsyncApiSpec spec={v3SpecWithInfoMetadata} theme={{ base: 'light' }} />)

    // Tag description renders through the async MarkdownRenderer; allow a
    // generous wait so a cold-compile render doesn't race the default timeout.
    expect(
      await screen.findByText('Device command operations', undefined, { timeout: 3000 }),
    ).toBeInTheDocument()
  })

  it('renders tag externalDocs for tags declared under info', async () => {
    render(<AsyncApiSpec spec={v3SpecWithInfoMetadata} theme={{ base: 'light' }} />)

    const tagLink = await screen.findByRole('link', {
      name: 'Commands external docs, opens in new tab',
    })
    expect(tagLink).toHaveAttribute('href', 'https://docs.example.com/commands')
  })
})
