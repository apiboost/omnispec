/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { lazy, Suspense, useMemo } from 'react'
import type { ComponentType } from 'react'
import type { BaseSpecProps } from '../core/types/common.types'
import type { SpecType } from '../core/types/spec-detection.types'
import { useSpecFetcher } from '../core/hooks/useSpecFetcher'
import { useSpecDetector } from '../core/hooks/useSpecDetector'
import { ThemeProvider } from '../core/themes/ThemeProvider'
import { LoadingScreen } from '../core/components/common/LoadingScreen'
import { ErrorMessage } from '../core/components/common/ErrorMessage'
import { ErrorBoundary } from '../core/components/common/ErrorBoundary'
import { UpgradePrompt } from '../core/components/common/UpgradePrompt'
import { SpecStatusScreen } from '../core/components/Layout/SpecStatusScreen'

const OpenApiSpec = lazy(() =>
  import('../openapi/OpenApiSpec').then((m) => ({ default: m.OpenApiSpec })),
)
const AsyncApiSpec = lazy(() =>
  import('../asyncapi/AsyncApiSpec').then((m) => ({ default: m.AsyncApiSpec })),
)

export interface OmniSpecRendererProps extends BaseSpecProps {
  specType?: SpecType
  docsUrl?: string
  upgradeUrl?: string
}

export function OmniSpecRenderer({ specType, spec, theme, docsUrl, upgradeUrl, pro, ...props }: OmniSpecRendererProps) {
  const { data: rawContent, state } = useSpecFetcher<string>(spec)
  const detected = useSpecDetector(rawContent, specType)
  const proRenderers = useMemo(() => pro?.renderers ?? new Map(), [pro?.renderers])

  if (state.status === 'loading') {
    return (
      <ThemeProvider theme={theme}>
        <LoadingScreen />
      </ThemeProvider>
    )
  }

  // Non-fatal spec problems (failed load, unrecognized content) render in the
  // content area while the host's nav/chrome stays put, so the user can
  // navigate away. Fatal render errors still use the ErrorBoundary fallback.
  if (state.status === 'error') {
    return (
      <SpecStatusScreen
        theme={theme}
        layout={props.layout}
        sidebarPosition={props.sidebarPosition}
        slots={props.slots}
        sidebarNav={props.sidebarNav}
        premiumThemingEnabled={pro?.premiumThemingEnabled ?? false}
      >
        <ErrorMessage title="Failed to load specification" message={state.error} />
      </SpecStatusScreen>
    )
  }

  if (!detected) {
    return (
      <SpecStatusScreen
        theme={theme}
        layout={props.layout}
        sidebarPosition={props.sidebarPosition}
        slots={props.slots}
        sidebarNav={props.sidebarNav}
        premiumThemingEnabled={pro?.premiumThemingEnabled ?? false}
      >
        <ErrorMessage
          title="Unable to detect specification type"
          message="The provided content could not be recognized as a supported API specification (OpenAPI, AsyncAPI, GraphQL, SOAP, or gRPC)."
        />
      </SpecStatusScreen>
    )
  }

  const specProps = { ...props, spec, theme, pro }

  return (
    <ErrorBoundary
      fallback={(error) => (
        <ThemeProvider theme={theme}>
          <ErrorMessage
            title="Failed to render specification"
            message={error.message || 'An unexpected error occurred while rendering the documentation.'}
          />
        </ThemeProvider>
      )}
    >
      <Suspense
        fallback={
          <ThemeProvider theme={theme}>
            <LoadingScreen />
          </ThemeProvider>
        }
      >
        <SpecRenderer
          type={detected.type}
          props={specProps}
          registeredRenderers={proRenderers}
          docsUrl={docsUrl}
          upgradeUrl={upgradeUrl}
        />
      </Suspense>
    </ErrorBoundary>
  )
}

interface SpecRendererProps {
  type: SpecType
  props: BaseSpecProps
  registeredRenderers: Map<SpecType, ComponentType<BaseSpecProps>>
  docsUrl?: string
  upgradeUrl?: string
}

function SpecRenderer({ type, props, registeredRenderers, docsUrl, upgradeUrl }: SpecRendererProps) {
  const RegisteredRenderer = registeredRenderers.get(type)
  if (RegisteredRenderer) {
    return <RegisteredRenderer {...props} />
  }

  switch (type) {
    case 'openapi-2':
    case 'openapi-3':
      return <OpenApiSpec {...props} />
    case 'asyncapi-2':
    case 'asyncapi-3':
      return <AsyncApiSpec {...props} />
    default:
      return (
        <ThemeProvider theme={props.theme}>
          <UpgradePrompt specType={type} docsUrl={docsUrl} upgradeUrl={upgradeUrl} />
        </ThemeProvider>
      )
  }
}
