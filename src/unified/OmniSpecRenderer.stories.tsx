/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { OmniSpecRenderer } from './OmniSpecRenderer'
import petstoreSpec from '../__fixtures__/petstore-minimal.json'
import streetlightsYaml from '../__fixtures__/streetlights-asyncapi.yaml'
import starWarsSDL from '../__fixtures__/starwars.graphql'

export default {
  title: 'Unified/OmniSpecRenderer',
  component: OmniSpecRenderer,
}

export const AutoDetectOpenApi = {
  name: 'Auto-detect: OpenAPI',
  args: {
    spec: petstoreSpec,
    theme: { base: 'light' },
  },
}

export const AutoDetectAsyncApi = {
  name: 'Auto-detect: AsyncAPI',
  args: {
    spec: streetlightsYaml,
    theme: { base: 'light' },
  },
}

export const AutoDetectGraphql = {
  name: 'Auto-detect: GraphQL',
  args: {
    spec: starWarsSDL,
    theme: { base: 'light' },
  },
}

export const ExplicitSpecType = {
  name: 'Explicit specType override',
  args: {
    spec: petstoreSpec,
    specType: 'openapi-3',
    theme: { base: 'dark' },
  },
}
