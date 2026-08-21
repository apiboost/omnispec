/**
 * This source file is part of the Apiboost(R) API Portal product.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * See https://www.apiboost.com/LICENSE.txt for license information.
 */

import { mount } from 'svelte'
// Auto-registers <omnispec-renderer>.
import '@apiboost/omnispec/wc'

import App from './App.svelte'

mount(App, { target: document.getElementById('app')! })
