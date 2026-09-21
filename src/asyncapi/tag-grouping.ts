/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import type { AsyncApiChannel, ParsedAsyncApiSpec } from './types/asyncapi.types'

export type TagMeta = NonNullable<ParsedAsyncApiSpec['tags']>[number]

export interface TagGroup {
  /** Tag metadata, or undefined for the synthetic "Untagged" bucket. */
  tag?: TagMeta
  /**
   * Stable, DOM/URL-safe identifier for keys and element ids. Derived from the
   * tag `name` (not the display label, which may contain spaces/punctuation and
   * is not unique). De-duplicated across groups.
   */
  id: string
  /** Display label for the group. */
  label: string
  channels: AsyncApiChannel[]
}

export const UNTAGGED_LABEL = 'Untagged'

/** Slugify a tag name into a DOM/URL-safe id fragment. */
function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'tag'
}

/** The set of tag names carried by a channel's operations. */
export function channelTagNames(channel: AsyncApiChannel): string[] {
  const names = new Set<string>()
  for (const op of channel.operations) {
    for (const tag of op.tags ?? []) names.add(tag.name)
  }
  return Array.from(names)
}

/** True when at least one channel has a tag — i.e. grouping is meaningful. */
export function hasAnyTags(channels: AsyncApiChannel[]): boolean {
  return channels.some((ch) => channelTagNames(ch).length > 0)
}

/**
 * Group channels by the tags their operations carry. A channel with multiple
 * tags appears under each of its tag groups; channels with no tags fall into a
 * trailing "Untagged" group. Group order follows the document's declared `tags`
 * first (so tag descriptions/externalDocs order is preserved), then any tags
 * only found on operations, then "Untagged" last. Groups with no channels are
 * omitted.
 */
export function groupChannelsByTag(
  channels: AsyncApiChannel[],
  specTags: ParsedAsyncApiSpec['tags'],
): TagGroup[] {
  const byName = new Map<string, AsyncApiChannel[]>()
  const untagged: AsyncApiChannel[] = []

  for (const channel of channels) {
    const names = channelTagNames(channel)
    if (names.length === 0) {
      untagged.push(channel)
      continue
    }
    for (const name of names) {
      const list = byName.get(name) ?? []
      list.push(channel)
      byName.set(name, list)
    }
  }

  // Preserve declared tag order first, then operation-only tags (alphabetical).
  const declared = (specTags ?? []).map((t) => t.name)
  const operationOnly = Array.from(byName.keys())
    .filter((name) => !declared.includes(name))
    .sort()
  const orderedNames = [...declared.filter((name) => byName.has(name)), ...operationOnly]

  const tagMetaByName = new Map((specTags ?? []).map((t) => [t.name, t]))

  // Assign a unique, DOM-safe id per group derived from the tag name.
  const usedIds = new Set<string>()
  const uniqueId = (base: string): string => {
    let id = base
    let n = 2
    while (usedIds.has(id)) id = `${base}-${n++}`
    usedIds.add(id)
    return id
  }

  const groups: TagGroup[] = orderedNames.map((name) => ({
    tag: tagMetaByName.get(name) ?? { name },
    id: uniqueId(slugify(name)),
    label: tagMetaByName.get(name)?.displayName ?? name,
    channels: byName.get(name) ?? [],
  }))

  if (untagged.length > 0) {
    groups.push({ tag: undefined, id: uniqueId('untagged'), label: UNTAGGED_LABEL, channels: untagged })
  }

  return groups
}
