/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { ErrorMessage } from './ErrorMessage'

interface ErrorBoundaryProps {
  children: ReactNode
  /** Title shown in the fallback UI. */
  title?: string
  /**
   * Custom fallback. Receives the caught error. When omitted, a themed
   * `ErrorMessage` is rendered so a render-phase crash never takes down the
   * host page (required hardening for the embeddable widget).
   */
  fallback?: (error: Error) => ReactNode
  /** Optional hook for logging/telemetry when a render crash is caught. */
  onError?: (error: Error, info: ErrorInfo) => void
}

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * Catches render-phase exceptions from any descendant and renders a graceful
 * fallback instead of crashing the whole React tree. React error boundaries
 * must be class components — there is no hooks equivalent.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info)
    // eslint-disable-next-line no-console
    console.error('[omnispec] Render error caught by ErrorBoundary:', error, info)
  }

  render(): ReactNode {
    const { error } = this.state
    if (error) {
      if (this.props.fallback) return this.props.fallback(error)
      return (
        <ErrorMessage
          title={this.props.title ?? 'Something went wrong'}
          message={error.message || 'An unexpected error occurred while rendering the documentation.'}
        />
      )
    }
    return this.props.children
  }
}
