/**
 * This source file is part of the Apiboost(R) API Portal product.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * See https://www.apiboost.com/LICENSE.txt for license information.
 */

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // Tell Vue not to warn or try to resolve custom elements that start
          // with `api-doc-`. They are handled by the browser's customElements
          // registry, not by Vue.
          isCustomElement: (tag) => tag.startsWith('api-doc-'),
        },
      },
    }),
  ],
})
