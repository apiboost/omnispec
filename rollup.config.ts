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
 * Rollup library build for @apiboost/omnispec.
 *
 * Replaces the previous webpack-based bundler. Rollup emits dynamic
 * `import()` calls as static string references to specific chunk files
 * (e.g. `import('./chunks/openapi-abc123.js')`) instead of webpack's
 * variable-path chunk loader (`import('./' + a.u(e))`). The latter forced
 * consuming bundlers to over-match every sibling file (including
 * `server/index.js`) as potential dynamic imports, pulling Node-only
 * code into client bundles. Rollup's static chunk references avoid that.
 *
 * The web-component `dist/wc/standalone.js` is still built by webpack
 * (`webpack.wc.config.ts`) because it needs a single self-contained UMD
 * bundle with React inlined — code-splitting doesn't apply.
 */

import path from 'path'
import { fileURLToPath } from 'url'
import type { Plugin, RollupOptions } from 'rollup'
import alias from '@rollup/plugin-alias'
import nodeResolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import esbuild from 'rollup-plugin-esbuild'
import MagicString from 'magic-string'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const input = {
	index: 'src/index.ts',
	'core/public': 'src/core/public.ts',
	'openapi/index': 'src/openapi/index.ts',
	'asyncapi/index': 'src/asyncapi/index.ts',
	'server/index': 'src/server/index.ts',
	'wc/index': 'src/wc/index.ts',
}

// Peer deps + their subpath imports stay external (consumer provides them).
// Dependencies (yaml, prismjs, marked, etc.) are bundled in.
const externalPatterns = [
	/^react($|\/)/,
	/^react-dom($|\/)/,
	/^@emotion\//,
	/^express($|\/)/,
	/^express-rate-limit$/,
]

const isExternal = (id: string) =>
	externalPatterns.some((re) => re.test(id))

/**
 * framer-motion's optional `@emotion/is-prop-valid` loader hides the request
 * from bundlers via string concatenation:
 * `require("@emotion/is-prop-" + "valid")`. If that survives into our dist,
 * consuming webpack builds emit "Critical dependency: the request of a
 * dependency is an expression" for every entry that reaches the chunk. The
 * call is dead code in ESM environments (`require` is undefined at runtime,
 * so the catch fallback always runs) and omnispec never styles motion
 * components through emotion's `styled()`, so rewrite it to the equivalent
 * no-op — `loadExternalIsValidProp` early-returns on a non-function.
 */
const stripMotionDynamicRequire = (): Plugin => ({
	name: 'strip-motion-dynamic-require',
	transform(code, id) {
		if (!/framer-motion[\\/].*filter-props/.test(id)) return null
		const target = 'loadExternalIsValidProp(require(emotionPkg).default);'
		const start = code.indexOf(target)
		if (start === -1) {
			this.warn(
				`dynamic-require pattern not found in ${id} — framer-motion may ` +
					'have changed; the "Critical dependency" consumer warning is back'
			)
			return null
		}
		const s = new MagicString(code)
		s.overwrite(start, start + target.length, 'loadExternalIsValidProp(undefined);')
		return { code: s.toString(), map: s.generateMap({ hires: true }) }
	},
})

/**
 * framer-motion and lucide-react ship `"use client"` module-level directives.
 * Rollup drops them when bundling (correct for a plain library build — this
 * package ships no RSC boundaries) but warns once per module. Swallow only
 * that warning class; forward everything else to the default handler.
 */
const onwarn: RollupOptions['onwarn'] = (warning, warn) => {
	if (
		warning.code === 'MODULE_LEVEL_DIRECTIVE' &&
		warning.message.includes('"use client"')
	) {
		return
	}
	warn(warning)
}

const plugins = () => [
	stripMotionDynamicRequire(),
	alias({
		entries: [
			{ find: '@core', replacement: path.resolve(__dirname, 'src/core') },
			{ find: '@openapi', replacement: path.resolve(__dirname, 'src/openapi') },
			{ find: '@asyncapi', replacement: path.resolve(__dirname, 'src/asyncapi') },
			{ find: '@unified', replacement: path.resolve(__dirname, 'src/unified') },
		],
	}),
	nodeResolve({
		extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
		preferBuiltins: true,
	}),
	commonjs(),
	json(),
	esbuild({
		target: 'es2020',
		tsconfig: path.resolve(__dirname, 'tsconfig.json'),
		jsx: 'automatic',
		sourceMap: true,
		minify: false,
	}),
]

const config: RollupOptions[] = [
	{
		input,
		output: {
			dir: 'dist/esm',
			format: 'esm',
			entryFileNames: '[name].js',
			chunkFileNames: 'chunks/[name]-[hash].js',
			sourcemap: true,
			preserveModulesRoot: 'src',
		},
		external: isExternal,
		plugins: plugins(),
		onwarn,
	},
	{
		input,
		output: {
			dir: 'dist/cjs',
			format: 'cjs',
			entryFileNames: '[name].js',
			chunkFileNames: 'chunks/[name]-[hash].js',
			sourcemap: true,
			exports: 'named',
			interop: 'auto',
		},
		external: isExternal,
		plugins: plugins(),
		onwarn,
	},
]

export default config
