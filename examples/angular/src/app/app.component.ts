/**
 * This source file is part of the Apiboost(R) API Portal product.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * See https://www.apiboost.com/LICENSE.txt for license information.
 */

import {
  AfterViewInit,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  ViewChild,
} from '@angular/core'
import type { OmniSpecRendererElement } from '@apiboost/omnispec/wc'

@Component({
  selector: 'app-root',
  standalone: true,
  // CUSTOM_ELEMENTS_SCHEMA tells the Angular compiler not to flag unknown
  // element names like <omnispec-renderer> as errors.
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="layout">
      <omnispec-renderer
        #docs
        spec-url="https://petstore3.swagger.io/api/v3/openapi.json"
        theme-base="dark"
        display-mode="compact"
        (spec-loaded)="onSpecLoaded($event)"
      ></omnispec-renderer>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100vh; }
    .layout { height: 100vh; }
    omnispec-renderer { display: block; height: 100%; }
  `],
})
export class AppComponent implements AfterViewInit {
  @ViewChild('docs') docs!: ElementRef<OmniSpecRendererElement>

  ngAfterViewInit(): void {
    // Imperative property assignment for complex props.
    this.docs.nativeElement.sidebarNav = {
      items: [
        { id: 'home', label: 'Home', href: '/' },
        { id: 'guides', label: 'Guides', href: '/guides' },
      ],
      placement: 'before',
    }
  }

  onSpecLoaded(event: Event): void {
    const detail = (event as CustomEvent).detail
    // eslint-disable-next-line no-console
    console.log('[angular] spec loaded:', detail)
  }
}
