/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { describe, it, expect } from 'vitest'
import { groupChannelsByTag, hasAnyTags, UNTAGGED_LABEL } from './tag-grouping'
import type { AsyncApiChannel } from './types/asyncapi.types'

function channel(name: string, tagNames: string[]): AsyncApiChannel {
  return {
    name,
    address: name,
    operations: [
      { action: 'subscribe', messages: [], tags: tagNames.map((n) => ({ name: n })) },
    ],
  }
}

describe('groupChannelsByTag', () => {
  it('places a channel under each of its tags and untagged channels last', () => {
    const channels = [
      channel('orders/updated', ['orders', 'alerts']),
      channel('misc', []),
    ]
    const groups = groupChannelsByTag(channels, [
      { name: 'orders', description: 'Order events' },
      { name: 'alerts' },
    ])

    expect(groups.map((g) => g.label)).toEqual(['orders', 'alerts', UNTAGGED_LABEL])
    expect(groups[0].channels.map((c) => c.name)).toEqual(['orders/updated'])
    expect(groups[1].channels.map((c) => c.name)).toEqual(['orders/updated'])
    expect(groups[2].channels.map((c) => c.name)).toEqual(['misc'])
    // Declared tag metadata (description) is carried on the group.
    expect(groups[0].tag?.description).toBe('Order events')
  })

  it('omits the untagged group when every channel is tagged', () => {
    const groups = groupChannelsByTag([channel('a', ['x'])], [{ name: 'x' }])
    expect(groups.map((g) => g.label)).toEqual(['x'])
  })

  it('detects whether any channel carries a tag', () => {
    expect(hasAnyTags([channel('a', [])])).toBe(false)
    expect(hasAnyTags([channel('a', ['x'])])).toBe(true)
  })

  it('assigns DOM-safe slug ids from the tag name, de-duplicated (finding 5)', () => {
    // Two distinct tag names that slugify to the same value must get unique ids,
    // and ids must not embed the raw display label with spaces.
    const groups = groupChannelsByTag(
      [channel('a', ['User Events']), channel('b', ['user/events'])],
      [{ name: 'User Events' }, { name: 'user/events' }],
    )
    const ids = groups.map((g) => g.id)
    expect(ids[0]).toBe('user-events')
    expect(ids[1]).toBe('user-events-2')
    expect(new Set(ids).size).toBe(ids.length)
    ids.forEach((id) => expect(id).not.toMatch(/\s/))
  })
})
