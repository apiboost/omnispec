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

function ChevronIcon({open}: {open: boolean}): ReactNode {
  return (
    <svg
      className={`${styles.toggleIcon} ${open ? styles.toggleIconOpen : ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

/**
 * The primary spec picker: a grouped list (one section per spec family) ordered
 * basic → advanced, that drives the renderer. Mobile-first — collapses behind a
 * disclosure button and scrolls horizontally; on desktop it becomes a persistent
 * left column. A paste-your-own-URL field is pinned to the bottom.
 */
export default function SpecSidebar({groups, selected, onSelect}: SpecSidebarProps): ReactNode {
  const [open, setOpen] = useState(false);

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
    <aside className={styles.sidebar} aria-label="Spec picker">
      <div className={styles.sidebarHeader}>
        <h2 className={styles.sidebarTitle}>Choose a spec</h2>
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="spec-sidebar-body"
        >
          {open ? 'Hide' : 'Browse'}
          <ChevronIcon open={open} />
        </button>
      </div>

      <div
        id="spec-sidebar-body"
        className={`${styles.body} ${open ? '' : styles.bodyCollapsed}`}
      >
        {groups.map((group) => (
          <div key={group.label} className={styles.group}>
            <h3 className={styles.groupLabel}>{group.label}</h3>
            <div className={styles.items}>
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
          </div>
        ))}

        <form
          className={styles.customField}
          onSubmit={(e) => {
            e.preventDefault();
            submitCustom();
          }}
        >
          <label className={styles.customLabel} htmlFor="spec-sidebar-custom">
            Your own spec URL
          </label>
          <div className={styles.customRow}>
            <input
              id="spec-sidebar-custom"
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
    </aside>
  );
}

/** Re-exported for callers that type their resolved groups against the source. */
export type {SpecGroup};
