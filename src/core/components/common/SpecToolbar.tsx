/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import type { ReactNode } from 'react'
import { css } from '@core/styles/css'
import { mq } from '@core/styles/breakpoints'
import { Icon } from '@core/components/common/Icon'
import { Button } from '@core/components/common/Button'

interface SpecToolbarProps {
  /** The overview/header content (title, description, metadata) */
  overview: ReactNode
  /** Version badge shown alongside actions on mobile */
  versionBadge?: ReactNode
  /** Label for the expand/collapse toggle (e.g., "operations", "channels", "types") */
  expandLabel: string
  /** Whether all items are currently expanded */
  allExpanded: boolean
  /** Callback to toggle expand/collapse all */
  onToggleExpand: () => void
  /** URL for download button. Omit to hide. */
  downloadLink?: string
}

export function SpecToolbar({
  overview,
  versionBadge,
  allExpanded,
  onToggleExpand,
  downloadLink,
}: SpecToolbarProps) {
  return (
    <div className={containerStyle}>
      <div className={overviewWrapStyle}>{overview}</div>
      <div className={actionsStyle}>
        {versionBadge && <div className={mobileBadgeStyle}>{versionBadge}</div>}
        <Button className={iconBtnStyle} onClick={onToggleExpand}>
          <Icon name={allExpanded ? 'compress' : 'expand'} size="0.85em" />
          <span className={buttonLabelStyle}>{allExpanded ? 'Collapse All' : 'Expand All'}</span>
        </Button>
        {downloadLink && (
          <Button
            className={iconBtnStyle}
            href={downloadLink}
            download
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon name="download" size="0.85em" />
            <span className={buttonLabelStyle}>Download</span>
          </Button>
        )}
      </div>
    </div>
  )
}

const containerStyle = css({
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '1rem',
  maxWidth: '100%',
  overflow: 'hidden',
  marginBottom: '2rem',
  [mq.mobile]: {
    flexDirection: 'column',
    gap: '0.5rem',
    marginBottom: '1.5rem',
  },
})

const overviewWrapStyle = css({
  flex: 1,
  minWidth: 0,
})

const actionsStyle = css({
  display: 'flex',
  gap: '0.5rem',
  flexShrink: 0,
  alignItems: 'center',
  [mq.mobile]: {
    width: '100%',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    paddingTop: '1rem',
  },
})

const mobileBadgeStyle = css({
  display: 'none',
  marginRight: 'auto',
  [mq.mobile]: {
    display: 'block',
  },
})

const iconBtnStyle = css({
  [mq.mobile]: {
    padding: '0.25rem',
    /*
     * Icon-only on mobile (labels hidden below): give the buttons a full
     * 2.75rem (44px) touch target and scale the em-sized icon up with the
     * font size so it reads at a glance.
     */
    minWidth: '1.75rem',
    minHeight: '1.75rem',
    fontSize: '1.25rem',
    justifyContent: 'center',
  },
})

const buttonLabelStyle = css({
  [mq.mobile]: {
    fontSize: '0.875rem',
  },
})
