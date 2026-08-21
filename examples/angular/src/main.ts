/**
 * This source file is part of the Apiboost(R) API Portal product.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * See https://www.apiboost.com/LICENSE.txt for license information.
 */

import { bootstrapApplication } from '@angular/platform-browser'
// Auto-registers <omnispec-renderer>.
import '@apiboost/omnispec/wc'

import { AppComponent } from './app/app.component'

bootstrapApplication(AppComponent).catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
})
