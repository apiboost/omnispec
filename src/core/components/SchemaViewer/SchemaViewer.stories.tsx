/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { SchemaTree } from './SchemaTree'
import { SchemaTable } from './SchemaTable'
import { schemaToNodes } from './schema-utils'
import type { SchemaStyle } from './schema-style'
import { ThemeProvider } from '../../themes/ThemeProvider'
import { ConfigProvider } from '../../context/ConfigContext'

export default {
  title: 'Core/SchemaViewer',
}

const petSchema = {
  type: 'object',
  required: ['id', 'name'],
  properties: {
    id: { type: 'integer', format: 'int64', description: 'Unique pet identifier' },
    name: { type: 'string', description: 'Name of the pet', minLength: 1, maxLength: 100 },
    tag: { type: 'string', description: 'Optional tag' },
    status: { type: 'string', enum: ['available', 'pending', 'sold'], description: 'Pet status in the store' },
    metadata: {
      type: 'object',
      properties: {
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
        weight: { type: 'number', minimum: 0, description: 'Weight in kg' },
      },
    },
    vaccinations: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'date'],
        properties: {
          name: { type: 'string' },
          date: { type: 'string', format: 'date' },
          notes: { type: 'string', deprecated: true },
        },
      },
    },
  },
}

const compositionSchema = {
  oneOf: [
    {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['cat'] },
        indoor: { type: 'boolean', description: 'Whether the cat is indoor-only' },
      },
    },
    {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['dog'] },
        breed: { type: 'string' },
        trained: { type: 'boolean' },
      },
    },
  ],
}

const nodes = schemaToNodes(petSchema)
const compositionNodes = schemaToNodes(compositionSchema)

export const TreeView = () => (
  <ThemeProvider theme={{ base: 'light' }}>
    <div style={{ maxWidth: '700px' }}>
      <h3>Pet Schema (Tree View)</h3>
      <SchemaTree nodes={nodes} />
    </div>
  </ThemeProvider>
)

export const TreeViewDark = () => (
  <ThemeProvider theme={{ base: 'dark' }}>
    <div style={{ maxWidth: '700px' }}>
      <h3>Pet Schema (Tree View - Dark)</h3>
      <SchemaTree nodes={nodes} />
    </div>
  </ThemeProvider>
)

export const TableView = () => (
  <ThemeProvider theme={{ base: 'light' }}>
    <div style={{ maxWidth: '900px' }}>
      <h3>Pet Schema (Table View)</h3>
      <SchemaTable nodes={nodes} />
    </div>
  </ThemeProvider>
)

export const OneOfComposition = () => (
  <ThemeProvider theme={{ base: 'light' }}>
    <div style={{ maxWidth: '700px' }}>
      <h3>oneOf Composition</h3>
      <SchemaTree nodes={compositionNodes} />
    </div>
  </ThemeProvider>
)

const schemaStyles: { style: SchemaStyle; label: string }[] = [
  { style: 'lines', label: 'lines (default · Free)' },
  { style: 'tokens', label: 'tokens (Free)' },
  { style: 'chain', label: 'chain (reference layout · Free)' },
  { style: 'table', label: 'table (Pro)' },
  { style: 'card', label: 'card (Pro)' },
]

/** The five configurable `schemaStyle` presentations of the same schema. */
export const SchemaStyles = () => (
  <ThemeProvider theme={{ base: 'light' }}>
    <div style={{ display: 'grid', gap: '2rem', maxWidth: '760px' }}>
      {schemaStyles.map(({ style, label }) => (
        <div key={style}>
          <h3>{label}</h3>
          <ConfigProvider config={{ schemaStyle: style }}>
            <SchemaTree nodes={nodes} />
          </ConfigProvider>
        </div>
      ))}
    </div>
  </ThemeProvider>
)
