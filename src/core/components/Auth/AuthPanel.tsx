/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import type { ReactElement } from 'react'
import { css } from '../../styles/css'
import type { AuthScheme, AppliedAuthValue } from '../../types/auth.types'
import { authSchemeLabel } from '../../types/auth.types'
import { useAuth } from '../../context/AuthContext'
import { useConfig } from '../../context/ConfigContext'
import type { InteractiveAuthComponent } from '../../types/interactive-auth.types'
import { Tabs } from '../common/Tabs'
import type { TabItem } from '../common/Tabs'
import { Icon } from '../common/Icon'
import { ApiKeyAuth } from './ApiKeyAuth'
import { BearerAuth } from './BearerAuth'
import { BasicAuth } from './BasicAuth'
import { OAuth2AuthManual } from './OAuth2AuthManual'
import { OpenIdConnectManual } from './OpenIdConnectManual'

interface AuthPanelProps {
  schemes: AuthScheme[]
  /** Selected server URL — forwarded so OAuth2 relative flow URLs resolve. */
  serverUrl?: string
}

interface SchemeFormProps {
  scheme: AuthScheme
  onApply: (value: AppliedAuthValue) => void
  onRemove: (schemeId: string) => void
  applied: boolean
  appliedValue?: AppliedAuthValue
  serverUrl?: string
}

/**
 * Renders the form for a single scheme, or null for a type we can't render.
 * The `oauth2`/`openIdConnect` components are resolved by the caller: the free
 * manual shell by default, or a Pro-supplied interactive component when present
 * and not opted out.
 */
function renderSchemeForm(
  props: SchemeFormProps,
  Oauth2Component: InteractiveAuthComponent,
  OpenIdConnectComponent: InteractiveAuthComponent,
): ReactElement | null {
  switch (props.scheme.type) {
    case 'apiKey':
      return <ApiKeyAuth {...props} />
    case 'http-bearer':
      return <BearerAuth {...props} />
    case 'http-basic':
      return <BasicAuth {...props} />
    case 'oauth2':
      return <Oauth2Component {...props} />
    case 'openIdConnect':
      return <OpenIdConnectComponent {...props} />
    default:
      return null
  }
}

export function AuthPanel({ schemes, serverUrl }: AuthPanelProps) {
  const { appliedAuth, applyAuth, removeAuth } = useAuth()
  const { interactiveAuth, interactiveOAuth } = useConfig()

  if (schemes.length === 0) return null

  // Interactive OAuth/OIDC is a Pro feature supplied via `interactiveAuth`. Use
  // it when present and the consumer hasn't opted out (`interactiveOAuth={false}`);
  // otherwise fall back to the free manual (token-paste) shell.
  const useInteractive = interactiveOAuth !== false
  const Oauth2Component: InteractiveAuthComponent =
    (useInteractive && interactiveAuth?.oauth2) || OAuth2AuthManual
  const OpenIdConnectComponent: InteractiveAuthComponent =
    (useInteractive && interactiveAuth?.openIdConnect) || OpenIdConnectManual

  const buildProps = (scheme: AuthScheme): SchemeFormProps => ({
    scheme,
    onApply: applyAuth,
    onRemove: removeAuth,
    applied: appliedAuth.has(scheme.id),
    // Restored credential (if any) so the input can be prefilled.
    appliedValue: appliedAuth.get(scheme.id),
    serverUrl,
  })

  // Only schemes we can actually render become forms; unknown types are dropped
  // so they never surface as an empty tab.
  const renderable = schemes
    .map((scheme) => ({ scheme, form: renderSchemeForm(buildProps(scheme), Oauth2Component, OpenIdConnectComponent) }))
    .filter((entry): entry is { scheme: AuthScheme; form: ReactElement } => entry.form !== null)

  if (renderable.length === 0) return null

  // A single scheme renders directly — no tab chrome (unchanged behavior).
  if (renderable.length === 1) {
    return (
      <div className={`omnispec-auth-panel ${panelContainerStyle}`}>
        {renderable[0].form}
      </div>
    )
  }

  // The type label comes from the canonical map so casing is consistent
  // (ABOSPEC-215). When more than one scheme shares a type, the per-scheme id
  // disambiguates them; a lone scheme of its type shows just the type label.
  const typeCounts = renderable.reduce<Record<string, number>>((acc, { scheme }) => {
    acc[scheme.type] = (acc[scheme.type] ?? 0) + 1
    return acc
  }, {})
  const tabLabel = (scheme: AuthScheme): string => {
    const label = authSchemeLabel(scheme.type)
    return typeCounts[scheme.type] > 1 ? `${label} (${scheme.id})` : label
  }

  // Multiple schemes: one tab each. The applied indicator lives on the tab so
  // the authorized state of schemes you're NOT currently viewing stays visible
  // — important when an operation requires more than one scheme (AND).
  const tabs: TabItem[] = renderable.map(({ scheme, form }) => ({
    id: scheme.id,
    label: (
      <span className={tabLabelStyle}>
        {tabLabel(scheme)}
        {appliedAuth.has(scheme.id) && (
          <span className={appliedIconStyle} title="Authorized" role="img" aria-label="Authorized">
            <Icon name="shield-check" size="0.875rem" />
          </span>
        )}
      </span>
    ),
    content: form,
  }))

  // Land on an already-authorized scheme if there is one, else the first.
  const defaultTab = renderable.find(({ scheme }) => appliedAuth.has(scheme.id))?.scheme.id
    ?? renderable[0].scheme.id

  return (
    <div className={`omnispec-auth-panel ${panelContainerStyle}`}>
      <Tabs tabs={tabs} defaultTab={defaultTab} flush />
    </div>
  )
}

const panelContainerStyle = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
})

const tabLabelStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.375rem',
})

const appliedIconStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  color: 'var(--omnispec-color-success)',
  flexShrink: 0,
})
