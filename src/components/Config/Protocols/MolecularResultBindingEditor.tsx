// src/components/Config/Protocols/MolecularResultBindingEditor.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 467: the Synoptic Editor's "Filled from an in-house molecular result"
// setting on a choice question — which molecular test answers it, and which of
// its answers a positive and a negative call mean. Renders and dispatches; the
// edits are services/templates/molecularResultBinding.ts.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { StainType } from '@/services/stains/IStainService';
import {
  MOLECULAR_CALLS, molecularBindingProblem, withMolecularAssay, withMolecularValue, type MolecularResultBinding,
} from '@/services/templates/molecularResultBinding';

type ChoiceField = { id: string; type: string; options: { id: string; label: string }[]; molecularResult?: MolecularResultBinding };

export const MolecularResultBindingEditor: React.FC<{ field: ChoiceField; onChange: (patch: { molecularResult?: MolecularResultBinding }) => void }> = ({ field, onChange }) => {
  const { t } = useTranslation();
  const [tests, setTests] = useState<StainType[]>([]);
  // Loaded when shown, so opening the Synoptic Editor doesn't load every service.
  useEffect(() => {
    let live = true;
    void import('@/services').then(({ stainTypeService, molecularAssayTypes }) => stainTypeService.getAll().then(r => { if (live && r.ok) setTests(molecularAssayTypes(r.data)); }));
    return () => { live = false; };
  }, []);
  const b = field.molecularResult;
  const problem = molecularBindingProblem(field);
  const id = `syned-molecular-${field.id}`;
  return (
    <div className="ps-syned-field-row">
      <div className="ps-syned-field-type-wrap">
        <label className="ps-syned-label" htmlFor={id}>{t('synopticEditor.field.molecular.assay')} <span className="ps-syned-label-note">{t('synopticEditor.field.optionalTag')}</span></label>
        <select id={id} value={b?.assayCodes[0] ?? ''} onChange={e => onChange(withMolecularAssay(b, e.target.value))} className="ps-syned-input ps-syned-select">
          <option value="">{t('synopticEditor.field.molecular.none')}</option>
          {tests.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      {b && MOLECULAR_CALLS.map(call => (
        <div key={call} className="ps-syned-field-type-wrap">
          <label className="ps-syned-label" htmlFor={`${id}-${call}`}>{t(`synopticEditor.field.molecular.${call}`)}</label>
          <select id={`${id}-${call}`} value={b.values[call] ?? ''} onChange={e => onChange(withMolecularValue(b, call, e.target.value))} className="ps-syned-input ps-syned-select">
            <option value="">{t('synopticEditor.field.molecular.noAnswer')}</option>
            {field.options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>
      ))}
      {problem && <div className="ps-syned-condition-warning">{t(`synopticEditor.field.molecular.problem.${problem}`)}</div>}
    </div>
  );
};
