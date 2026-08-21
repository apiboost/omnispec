/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import stylistic from '@stylistic/eslint-plugin'

export default tseslint.config(eslint.configs.recommended, ...tseslint.configs.recommended, {
  plugins: {
    '@stylistic': stylistic,
  },
  rules: {
    // Stylistic rules
    '@stylistic/indent': ['error', 2],
    '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
    '@stylistic/semi': ['error', 'never'],
    '@stylistic/comma-dangle': ['error', 'always-multiline'],
    '@stylistic/arrow-parens': ['error', 'always'],
    '@stylistic/brace-style': ['error', '1tbs'],
    '@stylistic/comma-spacing': ['error', { before: false, after: true }],
    '@stylistic/key-spacing': ['error', { beforeColon: false, afterColon: true }],
    '@stylistic/keyword-spacing': ['error', { before: true, after: true }],
    '@stylistic/object-curly-spacing': ['error', 'always'],
    '@stylistic/array-bracket-spacing': ['error', 'never'],
    '@stylistic/block-spacing': ['error', 'always'],
    '@stylistic/eol-last': ['error', 'always'],
    '@stylistic/no-trailing-spaces': 'error',
    '@stylistic/no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0 }],
    '@stylistic/jsx-quotes': ['error', 'prefer-double'],
    '@stylistic/member-delimiter-style': ['error', {
      multiline: { delimiter: 'none' },
      singleline: { delimiter: 'semi', requireLast: false },
    }],
    '@stylistic/type-annotation-spacing': 'error',

    // TypeScript rules
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],

    // General rules
    'no-console': 'warn',
    'no-debugger': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    'eqeqeq': ['error', 'always'],
  },
}, {
  ignores: ['dist/', 'node_modules/', '*.config.*', '.storybook/'],
}, storybook.configs["flat/recommended"]);
