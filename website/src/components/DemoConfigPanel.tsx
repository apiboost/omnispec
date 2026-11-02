/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import {type ReactNode} from 'react';
import styles from './DemoConfigPanel.module.css';

/**
 * Free-tier renderer knobs exposed by the Live Demo. Deliberately excludes the
 * Pro-only surface (theme-token overrides, `table`/`card` schema styles) — those
 * are shown as disabled hints to signal what Pro unlocks. `spec` holds the value
 * from {@link SPEC_OPTIONS} (a `static/specs/*` path, resolved with useBaseUrl
 * before it reaches the renderer).
 */
export interface DemoConfig {
  spec: string;
  layout: 'sidebar' | 'stacked';
  sidebarPosition: 'left' | 'right';
  displayMode: 'compact' | 'reference';
  navigationMode: '' | 'grouped' | 'segmented';
  schemaStyle: 'lines' | 'tokens' | 'chain';
  allowTryIt: boolean;
  downloadLink: boolean;
  defaultExpandOperations: boolean;
}

/** Difficulty hint shown beside each spec, ordered basic → advanced. */
export type SpecLevel = 'Basic' | 'Intermediate' | 'Advanced';

/** A single curated spec: a friendly name, its `static/specs/*` path, and a
 * difficulty hint used to order the basic→advanced gradient. */
export interface SpecOption {
  label: string;
  value: string;
  level: SpecLevel;
}

/** A labeled section of the spec picker (one spec family). */
export interface SpecGroup {
  label: string;
  options: ReadonlyArray<SpecOption>;
}

/**
 * Curated demo specs served from `static/specs/` — bundled for reliable,
 * CORS-free switching. Grouped by spec family (OpenAPI, AsyncAPI) and ordered
 * basic → advanced within each group so the sidebar can showcase the full range
 * of what the renderer handles. The sidebar picker renders directly from this
 * structure; `demo.tsx` resolves each `value` with useBaseUrl before it reaches
 * the renderer. (A custom spec URL can still be pasted into the sidebar field.)
 */
export const SPEC_GROUPS: ReadonlyArray<SpecGroup> = [
  {
    label: 'OpenAPI',
    options: [
      {label: 'Petstore — minimal REST', value: 'specs/petstore.json', level: 'Basic'},
      {
        label: 'Task Management — OAuth2 + nested schemas',
        value: 'specs/openapi-moderate.json',
        level: 'Intermediate',
      },
      {label: 'E-Commerce — complex OAS', value: 'specs/ecommerce.json', level: 'Advanced'},
    ],
  },
  {
    label: 'AsyncAPI',
    options: [
      {label: 'Minimal — basic pub/sub', value: 'specs/asyncapi-simple.yaml', level: 'Basic'},
      {
        label: 'Streetlights — event-driven',
        value: 'specs/streetlights-asyncapi.yaml',
        level: 'Intermediate',
      },
      {
        label: 'IoT Sensor Network — 3.x bindings, oneOf, security',
        value: 'specs/asyncapi-complex.yaml',
        level: 'Advanced',
      },
    ],
  },
];

/** Flat list of all preset specs, kept for callers that resolve/scan every
 * preset (e.g. the base-URL resolver and the paste-field preset detection). */
export const SPEC_OPTIONS: ReadonlyArray<SpecOption> = SPEC_GROUPS.flatMap(
  (group) => group.options,
);

export const DEFAULT_DEMO_CONFIG: DemoConfig = {
  // Lead with the real-world Cat API — a production REST spec that shows the
  // renderer at its best on first load. It is not in the picker's basic→advanced
  // gradient, so it stays here as the default rather than in SPEC_GROUPS.
  spec: 'specs/catapi.yaml',
  layout: 'sidebar',
  sidebarPosition: 'left',
  displayMode: 'compact',
  navigationMode: '',
  schemaStyle: 'lines',
  allowTryIt: true,
  downloadLink: true,
  defaultExpandOperations: true,
};

interface SelectFieldProps<K extends keyof DemoConfig> {
  id: K;
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  children: ReactNode;
}

function SelectField<K extends keyof DemoConfig>({
  id,
  label,
  value,
  disabled,
  onChange,
  children,
}: SelectFieldProps<K>): ReactNode {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={`demo-${id}`}>
        {label}
      </label>
      <select
        id={`demo-${id}`}
        className={styles.select}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
    </div>
  );
}

interface CheckboxFieldProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function CheckboxField({id, label, checked, onChange}: CheckboxFieldProps): ReactNode {
  return (
    <label className={styles.checkbox} htmlFor={`demo-${id}`}>
      <input
        id={`demo-${id}`}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

export interface DemoConfigPanelProps {
  config: DemoConfig;
  onChange: (config: DemoConfig) => void;
}

export default function DemoConfigPanel({
  config,
  onChange,
}: DemoConfigPanelProps): ReactNode {
  const set = <K extends keyof DemoConfig>(key: K, value: DemoConfig[K]) =>
    onChange({...config, [key]: value});

  // The spec picker now lives in the sidebar (see SpecSidebar); this panel holds
  // only the remaining renderer knobs so there is a single spec picker.
  return (
    <div className={styles.panel}>
      <div className={styles.grid}>
        <SelectField
          id="layout"
          label="Layout"
          value={config.layout}
          onChange={(v) => set('layout', v as DemoConfig['layout'])}
        >
          <option value="sidebar">Sidebar</option>
          <option value="stacked">Stacked</option>
        </SelectField>
        <SelectField
          id="sidebarPosition"
          label="Sidebar position"
          value={config.sidebarPosition}
          disabled={config.layout !== 'sidebar'}
          onChange={(v) => set('sidebarPosition', v as DemoConfig['sidebarPosition'])}
        >
          <option value="left">Left</option>
          <option value="right">Right</option>
        </SelectField>
        <SelectField
          id="displayMode"
          label="Display mode"
          value={config.displayMode}
          onChange={(v) => set('displayMode', v as DemoConfig['displayMode'])}
        >
          <option value="compact">Compact</option>
          <option value="reference">Reference (three-panel)</option>
        </SelectField>
        <SelectField
          id="navigationMode"
          label="Navigation"
          value={config.navigationMode}
          onChange={(v) => set('navigationMode', v as DemoConfig['navigationMode'])}
        >
          <option value="">Auto</option>
          <option value="grouped">Grouped by tag</option>
          <option value="segmented">Segmented</option>
        </SelectField>
        <SelectField
          id="schemaStyle"
          label="Schema style"
          value={config.schemaStyle}
          onChange={(v) => set('schemaStyle', v as DemoConfig['schemaStyle'])}
        >
          <option value="lines">Lines</option>
          <option value="tokens">Tokens</option>
          <option value="chain">Chain</option>
          <option value="table" disabled>
            Table (Pro)
          </option>
          <option value="card" disabled>
            Card (Pro)
          </option>
        </SelectField>
      </div>

      <div className={styles.checkboxRow}>
        <CheckboxField
          id="allowTryIt"
          label="Enable Try-It"
          checked={config.allowTryIt}
          onChange={(v) => set('allowTryIt', v)}
        />
        <CheckboxField
          id="downloadLink"
          label="Show download link"
          checked={config.downloadLink}
          onChange={(v) => set('downloadLink', v)}
        />
        <CheckboxField
          id="defaultExpandOperations"
          label="Expand operations by default"
          checked={config.defaultExpandOperations}
          onChange={(v) => set('defaultExpandOperations', v)}
        />
      </div>

      <p className={styles.hint}>
        Theme follows the site&apos;s light/dark toggle. Full white-label theming and{' '}
        <code>table</code>/<code>card</code> schema styles are{' '}
        <a href="https://apiboost.com/omnispec?utm_source=omnispec&utm_medium=demo&utm_campaign=pro">
          OmniSpec Pro
        </a>{' '}
        features.
      </p>
    </div>
  );
}
