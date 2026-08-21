/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.*', 'src/**/*.stories.*', 'src/test-setup.ts'],
    },
  },
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, 'src/core'),
      '@openapi': path.resolve(__dirname, 'src/openapi'),
      '@asyncapi': path.resolve(__dirname, 'src/asyncapi'),
      '@graphql': path.resolve(__dirname, 'src/graphql'),
      '@soap': path.resolve(__dirname, 'src/soap'),
      '@grpc': path.resolve(__dirname, 'src/grpc'),
      '@unified': path.resolve(__dirname, 'src/unified'),
    },
  },
})
