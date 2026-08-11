// src/components/Common/SuffixSelect.tsx
// ─────────────────────────────────────────────────────────────
// Suffix (Jr./Sr./II/III/IV/V) as a dropdown for the common case, with
// an "Other…" option that reveals free text for anything else
// (professional credentials, less common generational markers). Never a
// restriction — the free-text fallback always exists.
//
// CSS-system-agnostic by design: takes selectClassName/inputClassName
// props rather than hardcoding classes, since it's reused across
// AccessionPage.tsx (ps-input-dark) and the Config screens (ps-conf-input)
// which use two different class systems.
// ─────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import '../../pathscribe.css';
import { SUFFIX_PRESETS, isPresetSuffix } from '../../utils/personName';

interface SuffixSelectProps {
  value: string;
  onChange: (v: string) => void;
  selectClassName: string;
  inputClassName: string;
  ariaLabel?: string;
}

export const SuffixSelect: React.FC<SuffixSelectProps> = ({ value, onChange, selectClassName, inputClassName, ariaLabel = 'Suffix' }) => {
  const [customMode, setCustomMode] = useState(!isPresetSuffix(value));

  if (customMode) {
    return (
      <div className="ps-suffix-custom-row">
        <input
          className={inputClassName}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="e.g. Esq., MD"
          aria-label={ariaLabel}
        />
        <button type="button" className="ps-suffix-back-link" onClick={() => { setCustomMode(false); onChange(''); }}>
          Use list
        </button>
      </div>
    );
  }

  return (
    <select
      className={selectClassName}
      value={value}
      aria-label={ariaLabel}
      onChange={e => {
        if (e.target.value === '__other__') { setCustomMode(true); onChange(''); }
        else onChange(e.target.value);
      }}
    >
      <option value="">None</option>
      {SUFFIX_PRESETS.map(s => <option key={s} value={s}>{s}</option>)}
      <option value="__other__">Other…</option>
    </select>
  );
};
