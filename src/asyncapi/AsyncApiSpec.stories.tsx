/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { AsyncApiSpec } from './AsyncApiSpec'
import streetlightsYaml from '../__fixtures__/streetlights-asyncapi.yaml'

export default {
  title: 'AsyncAPI/AsyncApiSpec',
  component: AsyncApiSpec,
}

export const LightTheme = {
  args: {
    spec: streetlightsYaml,
    theme: { base: 'light' },
    layout: 'sidebar',
  },
}

export const DarkTheme = {
  args: {
    spec: streetlightsYaml,
    theme: { base: 'dark' },
    layout: 'sidebar',
  },
}

export const StackedLayout = {
  args: {
    spec: streetlightsYaml,
    theme: { base: 'light' },
    layout: 'stacked',
  },
}

export const RightSidebar = {
  args: {
    spec: streetlightsYaml,
    theme: { base: 'light' },
    layout: 'sidebar',
    sidebarPosition: 'right',
  },
}
