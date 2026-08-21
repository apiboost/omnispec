/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

// This file has been automatically migrated to valid ESM format by Storybook.
import { fileURLToPath } from "node:url";
import type { StorybookConfig } from '@storybook/react-webpack5'
import path, { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/react-webpack5',
    options: {},
  },
  typescript: {
    reactDocgen: false,
    check: false,
  },
  webpackFinal: async (config) => {
    // Add path aliases
    if (config.resolve) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@core': path.resolve(__dirname, '../src/core'),
        '@openapi': path.resolve(__dirname, '../src/openapi'),
        '@asyncapi': path.resolve(__dirname, '../src/asyncapi'),
        '@graphql': path.resolve(__dirname, '../src/graphql'),
        '@soap': path.resolve(__dirname, '../src/soap'),
        '@grpc': path.resolve(__dirname, '../src/grpc'),
        '@unified': path.resolve(__dirname, '../src/unified'),
      }
    }

    // Add ts-loader for our source files
    config.module = config.module || { rules: [] }
    config.module.rules = config.module.rules || []
    config.module.rules.push({
      test: /\.tsx?$/,
      include: path.resolve(__dirname, '../src'),
      use: [
        {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
          },
        },
      ],
    })

    // Load spec files as raw strings
    config.module.rules.push({
      test: /\.(ya?ml|graphql|wsdl|xml|proto)$/,
      type: 'asset/source',
    })

    return config
  },
}

export default config
