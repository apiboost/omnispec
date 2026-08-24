/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import {useEffect, useMemo, useState, type ReactNode} from 'react';
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

/** Bundled specs served from `static/specs/` — reliable, CORS-free switching. */
export const SPEC_OPTIONS: ReadonlyArray<{label: string; value: string}> = [
  {label: 'Petstore (OpenAPI 3.0)', value: 'specs/petstore.json'},
  {label: 'OpenAPI 3.1 sample', value: 'specs/openapi-3.1.json'},
  {label: 'Task Management (larger OAS)', value: 'specs/openapi-moderate.json'},
  {label: 'Streetlights (AsyncAPI)', value: 'specs/streetlights-asyncapi.yaml'},
];

export const DEFAULT_DEMO_CONFIG: DemoConfig = {
  spec: SPEC_OPTIONS[0].value,
  layout: 'sidebar',
  sidebarPosition: 'left',
  displayMode: 'compact',
  navigationMode: '',
  schemaStyle: 'lines',
  allowTryIt: true,
  downloadLink: true,
  defaultExpandOperations: false,
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
  /** Preset specs with their base-URL-resolved values, for the paste-or-pick field. */
  specOptions: ReadonlyArray<{label: string; value: string}>;
}

export default function DemoConfigPanel({
  config,
  onChange,
  specOptions,
}: DemoConfigPanelProps): ReactNode {
  const set = <K extends keyof DemoConfig>(key: K, value: DemoConfig[K]) =>
    onChange({...config, [key]: value});

  // The spec input is a draft: typing/pasting must NOT fetch on every keystroke
  // (an incomplete or empty URL would flash "Unable to detect specification
  // type"). We only commit on submit. Picking a preset is unambiguous, so it
  // applies immediately. Keep the draft in sync when the spec changes elsewhere
  // (e.g. the header "Reset to defaults").
  const [specDraft, setSpecDraft] = useState(config.spec);
  useEffect(() => setSpecDraft(config.spec), [config.spec]);
  const presetValues = useMemo(() => new Set(specOptions.map((s) => s.value)), [specOptions]);

  const submitSpec = () => {
    const next = specDraft.trim();
    if (next && next !== config.spec) set('spec', next);
  };

  return (
    <div className={styles.panel}>
      <div className={styles.grid}>
        <div className={`${styles.field} ${styles.specField}`}>
          <label className={styles.label} htmlFor="demo-spec">
            Spec
          </label>
          <form
            className={styles.specRow}
            onSubmit={(e) => {
              e.preventDefault();
              submitSpec();
            }}
          >
            <input
              id="demo-spec"
              className={styles.select}
              type="text"
              list="demo-spec-presets"
              value={specDraft}
              spellCheck={false}
              placeholder="Paste a spec URL or pick a preset, then Render"
              onChange={(e) => {
                const value = e.target.value;
                setSpecDraft(value);
                // A preset chosen from the dropdown is complete — apply at once.
                if (presetValues.has(value)) set('spec', value);
              }}
            />
            <button type="submit" className={styles.specSubmit}>
              Render
            </button>
          </form>
          <datalist id="demo-spec-presets">
            {specOptions.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </datalist>
        </div>
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
        <a href="https://apiboost.com/omnispec">OmniSpec Pro</a> features.
      </p>
    </div>
  );
}
