# Third-Party Licenses — @apiboost/omnispec & @apiboost/omnispec-pro

Inventory of the **production (shipped) dependency tree** for both omnispec packages
and each package’s license. It guarantees the mixed OSS + commercial distribution
carries **no GPL / LGPL / AGPL or other copyleft / source-available dependency**.

- **Generated:** 2026-08-24 — `pnpm run licenses:report` (source: `pnpm licenses list --prod`).
- **Scope:** runtime `dependencies` + full transitive closure of `@apiboost/omnispec` (Free)
  and `@apiboost/omnispec-pro` (Pro). Excludes the packages’ own code and build-only devDependencies.
- **Enforced in CI:** `pnpm run check:licenses` (`.github/workflows/license-check.yml`) fails any PR
  that introduces a disallowed license.

## Verdict

✅ **All 147 production dependencies are permissively licensed** (0BSD / Apache-2.0 / BSD-3-Clause / ISC / MIT). No GPL, LGPL, AGPL, or other copyleft license is present.

> **Attribution obligation (not a blocker):** MIT, ISC, BSD, and Apache-2.0 require preserving
> copyright/permission notices in distributed copies. Ship this file (or generated license banners)
> with the bundled builds. None impose copyleft reciprocity.

## Summary

| License | Packages |
|---|---|
| 0BSD | 1 |
| Apache-2.0 | 1 |
| BSD-3-Clause | 4 |
| ISC | 7 |
| MIT | 134 |
| **Total** | **147** |

## Full list

| Package | Version(s) | License |
|---|---|---|
| `@babel/code-frame` | 7.29.7 | MIT |
| `@babel/generator` | 7.29.8 | MIT |
| `@babel/helper-globals` | 7.29.7 | MIT |
| `@babel/helper-module-imports` | 7.29.7 | MIT |
| `@babel/helper-string-parser` | 7.29.7 | MIT |
| `@babel/helper-validator-identifier` | 7.29.7 | MIT |
| `@babel/parser` | 7.29.8 | MIT |
| `@babel/runtime` | 7.29.7 | MIT |
| `@babel/template` | 7.29.7 | MIT |
| `@babel/traverse` | 7.29.8 | MIT |
| `@babel/types` | 7.29.8 | MIT |
| `@emotion/babel-plugin` | 11.13.5 | MIT |
| `@emotion/cache` | 11.14.0 | MIT |
| `@emotion/css` | 11.13.5 | MIT |
| `@emotion/hash` | 0.9.2 | MIT |
| `@emotion/is-prop-valid` | 1.4.0 | MIT |
| `@emotion/memoize` | 0.9.0 | MIT |
| `@emotion/react` | 11.14.0 | MIT |
| `@emotion/serialize` | 1.3.3 | MIT |
| `@emotion/sheet` | 1.4.0 | MIT |
| `@emotion/styled` | 11.14.1 | MIT |
| `@emotion/unitless` | 0.10.0 | MIT |
| `@emotion/use-insertion-effect-with-fallbacks` | 1.2.0 | MIT |
| `@emotion/utils` | 1.4.2 | MIT |
| `@emotion/weak-memoize` | 0.4.0 | MIT |
| `@jridgewell/gen-mapping` | 0.3.13 | MIT |
| `@jridgewell/resolve-uri` | 3.1.2 | MIT |
| `@jridgewell/sourcemap-codec` | 1.5.5 | MIT |
| `@jridgewell/trace-mapping` | 0.3.31 | MIT |
| `@nodable/entities` | 3.0.0 | MIT |
| `@types/parse-json` | 4.0.2 | MIT |
| `@types/react` | 19.2.18 | MIT |
| `accepts` | 2.0.0 | MIT |
| `anynum` | 1.0.1 | MIT |
| `babel-plugin-macros` | 3.1.0 | MIT |
| `body-parser` | 2.3.0 | MIT |
| `bytes` | 3.1.2 | MIT |
| `call-bind-apply-helpers` | 1.0.2 | MIT |
| `call-bound` | 1.0.4 | MIT |
| `callsites` | 3.1.0 | MIT |
| `content-disposition` | 1.1.0 | MIT |
| `content-type` | 1.0.5, 2.1.0 | MIT |
| `convert-source-map` | 1.9.0 | MIT |
| `cookie` | 0.7.2 | MIT |
| `cookie-signature` | 1.2.2 | MIT |
| `cosmiconfig` | 7.1.0 | MIT |
| `csstype` | 3.2.3 | MIT |
| `debug` | 4.4.3 | MIT |
| `depd` | 2.0.0 | MIT |
| `dunder-proto` | 1.0.1 | MIT |
| `ee-first` | 1.1.1 | MIT |
| `encodeurl` | 2.0.0 | MIT |
| `error-ex` | 1.3.4 | MIT |
| `es-define-property` | 1.0.1 | MIT |
| `es-errors` | 1.3.0 | MIT |
| `es-object-atoms` | 1.1.2 | MIT |
| `escape-html` | 1.0.3 | MIT |
| `escape-string-regexp` | 4.0.0 | MIT |
| `etag` | 1.8.1 | MIT |
| `express` | 5.2.1 | MIT |
| `express-rate-limit` | 7.5.1 | MIT |
| `fast-xml-builder` | 1.3.1 | MIT |
| `fast-xml-parser` | 5.11.0 | MIT |
| `finalhandler` | 2.1.1 | MIT |
| `find-root` | 1.1.0 | MIT |
| `forwarded` | 0.2.0 | MIT |
| `framer-motion` | 12.43.0 | MIT |
| `fresh` | 2.0.0 | MIT |
| `function-bind` | 1.1.2 | MIT |
| `get-intrinsic` | 1.3.0 | MIT |
| `get-proto` | 1.0.1 | MIT |
| `gopd` | 1.2.0 | MIT |
| `graphql` | 16.14.2 | MIT |
| `has-symbols` | 1.1.0 | MIT |
| `hasown` | 2.0.4 | MIT |
| `hoist-non-react-statics` | 3.3.2 | BSD-3-Clause |
| `http-errors` | 2.0.1 | MIT |
| `iconv-lite` | 0.7.3 | MIT |
| `import-fresh` | 3.3.1 | MIT |
| `inherits` | 2.0.4 | ISC |
| `ipaddr.js` | 1.9.1 | MIT |
| `is-arrayish` | 0.2.1 | MIT |
| `is-core-module` | 2.16.2 | MIT |
| `is-promise` | 4.0.0 | MIT |
| `is-unsafe` | 2.0.2 | MIT |
| `js-tokens` | 4.0.0 | MIT |
| `jsesc` | 3.1.0 | MIT |
| `json-parse-even-better-errors` | 2.3.1 | MIT |
| `lines-and-columns` | 1.2.4 | MIT |
| `long` | 5.3.2 | Apache-2.0 |
| `lucide-react` | 1.33.0 | ISC |
| `marked` | 15.0.12 | MIT |
| `math-intrinsics` | 1.1.0 | MIT |
| `media-typer` | 1.1.1 | MIT |
| `merge-descriptors` | 2.0.0 | MIT |
| `mime-db` | 1.54.0 | MIT |
| `mime-types` | 3.0.2 | MIT |
| `motion` | 12.43.0 | MIT |
| `motion-dom` | 12.43.0 | MIT |
| `motion-utils` | 12.39.0 | MIT |
| `ms` | 2.1.3 | MIT |
| `negotiator` | 1.1.0 | MIT |
| `object-inspect` | 1.13.4 | MIT |
| `on-finished` | 2.4.1 | MIT |
| `once` | 1.4.0 | ISC |
| `parent-module` | 1.0.1 | MIT |
| `parse-json` | 5.2.0 | MIT |
| `parseurl` | 1.3.3 | MIT |
| `path-expression-matcher` | 1.6.2 | MIT |
| `path-parse` | 1.0.7 | MIT |
| `path-to-regexp` | 8.4.2 | MIT |
| `path-type` | 4.0.0 | MIT |
| `picocolors` | 1.1.1 | ISC |
| `prismjs` | 1.30.0 | MIT |
| `protobufjs` | 8.7.2 | BSD-3-Clause |
| `proxy-addr` | 2.0.7 | MIT |
| `qs` | 6.15.3 | BSD-3-Clause |
| `range-parser` | 1.3.0 | MIT |
| `raw-body` | 3.0.2 | MIT |
| `react` | 19.2.8 | MIT |
| `react-dom` | 19.2.8 | MIT |
| `react-is` | 16.13.1 | MIT |
| `resolve` | 1.22.12 | MIT |
| `resolve-from` | 4.0.0 | MIT |
| `router` | 2.2.0 | MIT |
| `safer-buffer` | 2.1.2 | MIT |
| `scheduler` | 0.27.0 | MIT |
| `send` | 1.2.1 | MIT |
| `serve-static` | 2.2.1 | MIT |
| `setprototypeof` | 1.2.0 | ISC |
| `side-channel` | 1.1.1 | MIT |
| `side-channel-list` | 1.0.1 | MIT |
| `side-channel-map` | 1.0.1 | MIT |
| `side-channel-weakmap` | 1.0.2 | MIT |
| `source-map` | 0.5.7 | BSD-3-Clause |
| `statuses` | 2.0.2 | MIT |
| `strnum` | 2.4.2 | MIT |
| `stylis` | 4.2.0 | MIT |
| `supports-preserve-symlinks-flag` | 1.0.0 | MIT |
| `toidentifier` | 1.0.1 | MIT |
| `tslib` | 2.8.1 | 0BSD |
| `type-is` | 2.1.0 | MIT |
| `unpipe` | 1.0.0 | MIT |
| `vary` | 1.1.2 | MIT |
| `wrappy` | 1.0.2 | ISC |
| `xml-naming` | 0.3.0 | MIT |
| `yaml` | 1.10.3, 2.9.0 | ISC |
