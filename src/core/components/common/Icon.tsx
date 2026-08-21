/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import type { CSSProperties } from 'react'
import {
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Lock,
  Download,
  Maximize2,
  Minimize2,
  Ellipsis,
  X,
  ExternalLink,
  Link,
  Copy,
  Check,
  Search,
  Info,
  AlertTriangle,
  Sun,
  Moon,
  Eye,
  EyeOff,
  LockKeyhole,
  LockKeyholeOpen,
  RotateCcw,
  House,
  ShieldCheck,
  ArrowUp,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideProps,
} from 'lucide-react'

const iconMap = {
  'chevron-right': ChevronRight,
  'chevron-left': ChevronLeft,
  'chevron-down': ChevronDown,
  lock: Lock,
  download: Download,
  expand: Maximize2,
  compress: Minimize2,
  ellipsis: Ellipsis,
  xmark: X,
  'external-link': ExternalLink,
  link: Link,
  copy: Copy,
  check: Check,
  search: Search,
  info: Info,
  warning: AlertTriangle,
  sun: Sun,
  moon: Moon,
  eye: Eye,
  'eye-off': EyeOff,
  'lock-keyhole': LockKeyhole,
  'lock-keyhole-open': LockKeyholeOpen,
  'rotate-ccw': RotateCcw,
  home: House,
  'shield-check': ShieldCheck,
  'arrow-up': ArrowUp,
  'panel-left-close': PanelLeftClose,
  'panel-left-open': PanelLeftOpen,
} as const

export type IconName = keyof typeof iconMap

interface IconProps {
  name: IconName
  size?: number | string
  color?: string
  style?: CSSProperties
  className?: string
  strokeWidth?: number
}

export function Icon({
  name,
  size = '1.5em',
  color = 'currentColor',
  style,
  className,
  strokeWidth = 2,
}: IconProps) {
  const LucideIcon = iconMap[name]
  if (!LucideIcon) return null

  const lucideProps: LucideProps = {
    size,
    color,
    strokeWidth,
    className,
    style: { display: 'inline-block', verticalAlign: 'middle', ...style },
  }

  return <LucideIcon {...lucideProps} aria-hidden="true" />
}
