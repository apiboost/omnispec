/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { useEffect, useId, useRef, useState } from 'react'
import { css, cx } from '@core/styles/css'
import { Icon } from '@core/components/common/Icon'
import { TryItPanel } from '@core/components/TryIt/TryItPanel'
import type { ComponentProps } from 'react'

type TryItPanelProps = ComponentProps<typeof TryItPanel>

/**
 * `tryItLayout: 'inline'` (compact mode only) presentation of the Try-It
 * console: a full-width disclosure rendered BELOW the operation detail, closed
 * by default and revealed by a full-width "Try it" trigger.
 *
 * The wrapped `TryItPanel` stays MOUNTED across collapse/expand — the region is
 * hidden with the `hidden` attribute (display:none), never unmounted — so any
 * entered params, auth, request body, and response survive being hidden. This
 * is deliberately NOT built on `Collapsible`, whose viewport-gated
 * `shouldRender` unmounts its children when closed.
 */
export function InlineTryIt(props: TryItPanelProps) {
  const [open, setOpen] = useState(false)
  const regionId = useId()
  const regionRef = useRef<HTMLDivElement>(null)

  // On open, bring the newly revealed console into view without a jarring jump.
  useEffect(() => {
    if (open) {
      regionRef.current?.scrollIntoView({ block: 'nearest' })
    }
  }, [open])

  return (
    <div className={wrapperStyle}>
      <button
        type="button"
        className={triggerStyle}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={regionId}
      >
        <Icon name="chevron-right" size="0.875rem" className={cx(chevronStyle, open && chevronOpenStyle)} />
        <span>{open ? 'Hide Try it' : 'Try it'}</span>
      </button>
      {/* Kept mounted; `hidden` (display:none) preserves the panel's state. */}
      <div id={regionId} ref={regionRef} hidden={!open} className={regionStyle}>
        <TryItPanel {...props} docked={false} />
      </div>
    </div>
  )
}

const wrapperStyle = css({
  marginTop: '1rem',
})

const triggerStyle = css({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  width: '100%',
  padding: '0.625rem 1rem',
  background: 'var(--omnispec-bg-secondary)',
  color: 'var(--omnispec-fg-primary)',
  border: 'none',
  borderRadius: 'var(--omnispec-border-radius)',
  boxShadow: 'var(--omnispec-btn-secondary-shadow)',
  cursor: 'pointer',
  fontSize: 'var(--omnispec-font-size-base)',
  fontWeight: 600,
  textAlign: 'left',
  '&:hover': {
    background: 'var(--omnispec-btn-secondary-bg-hover)',
  },
})

const chevronStyle = css({
  display: 'inline-flex',
  flexShrink: 0,
  transition: 'transform 0.2s ease',
})

const chevronOpenStyle = css({
  transform: 'rotate(90deg)',
})

const regionStyle = css({
  paddingTop: '0.75rem',
})
