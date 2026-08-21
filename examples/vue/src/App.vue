<!--
  This source file is part of the Apiboost(R) API Portal product.

  Copyright (c) Apiboost, Inc.

  See https://www.apiboost.com/LICENSE.txt for license information.
-->
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { OmniSpecRendererElement } from '@apiboost/omnispec/wc'

const docsEl = ref<OmniSpecRendererElement | null>(null)

onMounted(() => {
  if (!docsEl.value) return

  // Use the imperative API for complex props. The element is just a DOM node,
  // so this works identically in any framework.
  docsEl.value.theme = {
    base: 'auto',
    overrides: {
      '--omnispec-color-primary': '#8B5CF6',
    },
  }

  docsEl.value.sidebarNav = {
    items: [
      { id: 'home', label: 'Home', href: '/' },
      { id: 'guides', label: 'Guides', href: '/guides' },
    ],
    placement: 'before',
  }
})

const onSpecLoaded = (e: Event) => {
  const detail = (e as CustomEvent).detail
  console.log('[vue] spec loaded:', detail)
}
</script>

<template>
  <div class="layout">
    <omnispec-renderer
      ref="docsEl"
      spec-url="https://petstore3.swagger.io/api/v3/openapi.json"
      display-mode="compact"
      @spec-loaded="onSpecLoaded"
    ></omnispec-renderer>
  </div>
</template>

<style>
  html, body, #app { margin: 0; padding: 0; height: 100%; }
  .layout { height: 100vh; }
  omnispec-renderer { display: block; height: 100%; }
</style>
