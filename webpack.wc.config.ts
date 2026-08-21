/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

/**
 * Standalone Web Component bundle.
 *
 * Produces a single self-contained file at `dist/wc/standalone.js` that bundles
 * React, ReactDOM, @emotion/css, and the WC code. Suitable for loading via a
 * plain `<script>` tag without any build step on the consumer side.
 *
 * Auto-registers `<omnispec-renderer>` on load (idempotently).
 */

import path, { dirname } from 'path'
import { fileURLToPath } from 'url'
import webpack from 'webpack'
import type { Configuration } from 'webpack'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const config: Configuration = {
  mode: 'production',
  devtool: 'source-map',
  entry: './src/wc/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist', 'wc'),
    filename: 'standalone.js',
    library: {
      // UMD wrapper so the bundle works as a <script>, AMD module, or CJS
      // require. Side-effect registers `<omnispec-renderer>` on load; named
      // exports (e.g. `OmniSpecRendererElement`, `defineOmniSpecRenderer`) are
      // exposed on `globalThis.ApiboostOmniSpec` for imperative use.
      name: 'ApiboostOmniSpec',
      type: 'umd',
    },
    globalObject: 'globalThis',
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      '@core': path.resolve(__dirname, 'src/core'),
      '@openapi': path.resolve(__dirname, 'src/openapi'),
      '@asyncapi': path.resolve(__dirname, 'src/asyncapi'),
      '@unified': path.resolve(__dirname, 'src/unified'),
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
          },
        },
        exclude: /node_modules/,
      },
    ],
  },
  optimization: {
    minimize: true,
    splitChunks: false,
    runtimeChunk: false,
  },
  // Inline all dynamically-imported chunks so the standalone file is a single
  // self-contained <script>.
  plugins: [
    new webpack.optimize.LimitChunkCountPlugin({ maxChunks: 1 }),
  ],
  // No externals — bundle React, ReactDOM, @emotion/css into the file.
  performance: {
    // Bundling React adds weight; suppress the asset-size warning so CI logs
    // stay clean. Consumers see the gzipped size in the docs.
    hints: false,
  },
}

export default config
