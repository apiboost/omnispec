/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { useAuth } from '@core/context/AuthContext'
import { Modal } from '@core/components/common/Modal'
import { AuthPanel } from '@core/components/Auth/AuthPanel'

/**
 * Renders the Authorization panel inside a modal, driven by AuthContext.
 *
 * The Authorize trigger lives in each Try-It panel header; it calls
 * `openAuthPanel()` from AuthContext, and this single host (rendered once
 * inside AuthProvider) shows the shared modal. Applied credentials are global
 * (AuthContext), so authorizing from any operation's panel affects them all.
 */
interface AuthPanelModalProps {
  /** Selected server URL, forwarded so OAuth2 relative flow URLs resolve. */
  serverUrl?: string
}

export function AuthPanelModal({ serverUrl }: AuthPanelModalProps = {}) {
  const { schemes, authPanelOpen, closeAuthPanel } = useAuth()

  if (schemes.length === 0) return null

  return (
    <Modal open={authPanelOpen} onClose={closeAuthPanel} title="Authorization">
      <AuthPanel schemes={schemes} serverUrl={serverUrl} />
    </Modal>
  )
}
