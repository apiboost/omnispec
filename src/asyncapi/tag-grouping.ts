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
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'tag'
}

/**
 * The set of tag names a channel groups under: the channel's own (3.x) tags plus
 * every tag carried by its operations. A channel tagged only at the channel level
 * (untagged operations) still groups correctly.
 */
export function channelTagNames(channel: AsyncApiChannel): string[] {
  const names = new Set<string>()
  for (const tag of channel.tags ?? []) names.add(tag.name)
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
 * trailing "Untagged" group. Group order follows, in priority:
 *   1. the `x-tagGroups` order (when provided) — so the main content matches the
 *      sidebar, which nests groups under their `x-tagGroups` parent;
 *   2. then the document's declared `tags` order (tag descriptions/externalDocs
 *      order is preserved);
 *   3. then any tags only found on operations (alphabetical);
 *   4. then "Untagged" last.
 * Groups with no channels are omitted.
 */
export function groupChannelsByTag(
  channels: AsyncApiChannel[],
  specTags: ParsedAsyncApiSpec['tags'],
  xTagGroups?: ParsedAsyncApiSpec['tagGroups'],
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

  // Order priority: x-tagGroups order, then declared tag order, then
  // operation-only tags (alphabetical). The sidebar nests groups under their
  // x-tagGroup parent, so honoring x-tagGroups here keeps the main content in
  // the same order as the nav (and matches 2.x).
  const xGrouped = (xTagGroups ?? []).flatMap((xg) => xg.tags).filter((name) => byName.has(name))
  const declared = (specTags ?? []).map((t) => t.name)
  const seen = new Set<string>(xGrouped)
  const declaredRemaining = declared.filter((name) => byName.has(name) && !seen.has(name))
  declaredRemaining.forEach((name) => seen.add(name))
  const operationOnly = Array.from(byName.keys())
    .filter((name) => !seen.has(name))
    .sort()
  // De-dup xGrouped (an x-tagGroup may list a tag more than once).
  const orderedNames = [...new Set([...xGrouped, ...declaredRemaining, ...operationOnly])]

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
