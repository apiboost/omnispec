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
import type {SpecGroup} from './DemoConfigPanel';
import styles from './SpecSidebar.module.css';

/** A spec group whose option `value`s have been resolved to real URLs. */
export interface ResolvedSpecGroup {
  label: string;
  options: ReadonlyArray<{label: string; value: string; level: string}>;
}

export interface SpecSidebarProps {
  /** Spec groups with base-URL-resolved `value`s, rendered as the picker. */
  groups: ReadonlyArray<ResolvedSpecGroup>;
  /** The currently-selected spec URL (resolved), for the active state. */
  selected: string;
  /** Called with a resolved spec URL when the user picks or pastes one. */
  onSelect: (value: string) => void;
}

/**
 * The primary spec picker, injected into the renderer's own sidebar via the
 * `slots.sidebarHeader` slot so it reads as part of the renderer rather than a
 * separate column. A grouped list (one section per spec family) ordered basic →
 * advanced drives the renderer; a paste-your-own-URL field is pinned to the
 * bottom. Styling blends with the renderer's nav chrome via `--omnispec-*`
 * tokens (available because the slot renders inside the renderer's
 * ThemeProvider). Mobile is handled by the renderer's own nav drawer — this
 * component has no breakpoint logic of its own.
 */
export default function SpecSidebar({groups, selected, onSelect}: SpecSidebarProps): ReactNode {
  // Known preset URLs — so a pasted value that matches a preset still lights up
  // the matching item, and the custom draft resets when a preset is active.
  const presetValues = useMemo(
    () => new Set(groups.flatMap((g) => g.options.map((o) => o.value))),
    [groups],
  );

  // The custom field is a draft: we only commit on submit so an incomplete URL
  // never triggers a failed fetch. Clear it when a preset becomes active.
  const [customDraft, setCustomDraft] = useState('');
  useEffect(() => {
    if (presetValues.has(selected)) setCustomDraft('');
  }, [selected, presetValues]);

  const submitCustom = () => {
    const next = customDraft.trim();
    if (next && next !== selected) onSelect(next);
  };

  return (
    <div className={styles.sidebar}>
      {groups.map((group) => (
        <div key={group.label} className={styles.group}>
          <div className={styles.groupLabel}>{group.label}</div>
          {group.options.map((option) => {
            const active = option.value === selected;
            return (
              <button
                key={option.value}
                type="button"
                className={`${styles.item} ${active ? styles.itemActive : ''}`}
                aria-pressed={active}
                onClick={() => onSelect(option.value)}
              >
                <span className={styles.itemName}>{option.label}</span>
                <span className={styles.itemLevel}>{option.level}</span>
              </button>
            );
          })}
        </div>
      ))}

      <form
        className={styles.customField}
        onSubmit={(e) => {
          e.preventDefault();
          submitCustom();
        }}
      >
        <div className={styles.groupLabel}>Your own spec URL</div>
        <div className={styles.customRow}>
          <input
            className={styles.customInput}
            type="text"
            value={customDraft}
            spellCheck={false}
            placeholder="https://…/openapi.yaml"
            onChange={(e) => setCustomDraft(e.target.value)}
          />
          <button type="submit" className={styles.customSubmit}>
            Render
          </button>
        </div>
      </form>
    </div>
  );
}

/** Re-exported for callers that type their resolved groups against the source. */
export type {SpecGroup};
