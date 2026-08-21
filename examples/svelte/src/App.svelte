<!--
  This source file is part of the Apiboost(R) API Portal product.

  Copyright (c) Apiboost, Inc.

  See https://www.apiboost.com/LICENSE.txt for license information.
-->
<script lang="ts">
  import type { OmniSpecRendererElement } from '@apiboost/omnispec/wc'

  let docs: OmniSpecRendererElement | undefined = $state()

  $effect(() => {
    if (!docs) return

    // Imperative property assignment for complex props. Svelte 5's `bind:this`
    // captures a reference to the underlying DOM node — the element is just a
    // standard custom element so anything you can do in the DOM, you can do
    // here.
    docs.theme = {
      base: 'auto',
      overrides: {
        '--omnispec-color-primary': '#10B981',
      },
    }
  })

  function onSpecLoaded(event: CustomEvent) {
    // eslint-disable-next-line no-console
    console.log('[svelte] spec loaded:', event.detail)
  }
</script>

<div class="layout">
  <omnispec-renderer
    bind:this={docs}
    spec-url="https://petstore3.swagger.io/api/v3/openapi.json"
    display-mode="compact"
    onspec-loaded={onSpecLoaded}
  ></omnispec-renderer>
</div>

<style>
  :global(html), :global(body), :global(#app) {
    margin: 0;
    padding: 0;
    height: 100%;
  }
  .layout { height: 100vh; }
  omnispec-renderer { display: block; height: 100%; }
</style>
