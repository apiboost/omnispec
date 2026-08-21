/**
 * This source file is part of the Apiboost(R) API Portal product.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * See https://www.apiboost.com/LICENSE.txt for license information.
 */

import { createApp } from 'vue'
// Auto-registers <omnispec-renderer>.
import '@apiboost/omnispec/wc'

import App from './App.vue'

createApp(App).mount('#app')
