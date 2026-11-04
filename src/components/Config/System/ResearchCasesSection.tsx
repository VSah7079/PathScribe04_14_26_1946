// src/components/Config/System/ResearchCasesSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 728 (Lab Workflow & Batch spec, Decision 4): Configuration → System →
// Research cases & batch purposes.
//   • Research cases: how a research case is recognised (accession prefixes,
//     the research patient's MRN prefixes), the no-charge financial class, and
//     how long its material is kept. Saving needs config:research-cases:manage.
//   • Batch purposes: the six built-in purposes (switch off, not remove) and
//     the lab's own. Saving needs config:batch-purposes:manage.
// The rules live in services/researchCases/ and services/batches/batchPurposes.ts;
// both services check the capability and the values before saving.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { getResearchCaseSettings, saveResearchCaseSettings } from '@/services/researchCases/researchCaseSettings';
import { parsePrefixList, formatPrefixList, type ResearchSettingsProblem } from '@/services/researchCases/researchCaseRules';
import {
  getBatchPurposes, saveBatchPurposes, newBatchPurposeId, batchPurposeLabelKey, DEFAULT_BATCH_PURPOSE_ID,
  type BatchPurpose, type BatchPurposeProblem,
} from '@/services/batches/batchPurposes';
import './ResearchCasesSection.css';

type Status = { kind: 'saved' } | { kind: 'refused' } | { kind: 'invalid'; problems: string[] } | null;

const ResearchCasesSection: React.FC = () => {
  const { t } = useTranslation();
  const initial = getResearchCaseSettings();
  const [enabled, setEnabled] = useState(initial.enabled);
  const [accessionText, setAccessionText] = useState(formatPrefixList(initial.accessionPrefixes));
  const [mrnText, setMrnText] = useState(formatPrefixList(initial.mrnPrefixes));
  const [financialClass, setFinancialClass] = useState(initial.noChargeFinancialClass);
  const [retentionDays, setRetentionDays] = useState(String(initial.retentionDays));
  const [researchStatus, setResearchStatus] = useState<Status>(null);

  const [purposes, setPurposes] = useState<BatchPurpose[]>(getBatchPurposes);
  const [newName, setNewName] = useState('');
  const [purposeStatus, setPurposeStatus] = useState<Status>(null);

  const saveResearch = async () => {
    const res = await saveResearchCaseSettings({
      enabled, accessionPrefixes: parsePrefixList(accessionText), mrnPrefixes: parsePrefixList(mrnText),
      noChargeFinancialClass: financialClass, retentionDays: Number(retentionDays),
    });
    if (res.ok === true) {
      setAccessionText(formatPrefixList(res.settings.accessionPrefixes));
      setMrnText(formatPrefixList(res.settings.mrnPrefixes));
      setResearchStatus({ kind: 'saved' });
    } else setResearchStatus(res.error === 'INVALID' ? { kind: 'invalid', problems: res.problems as ResearchSettingsProblem[] } : { kind: 'refused' });
  };

  const addPurpose = () => {
    if (!newName.trim()) return;
    setPurposes([...purposes, { id: newBatchPurposeId(newName, purposes), name: newName.trim(), builtIn: false, active: true }]);
    setNewName('');
    setPurposeStatus(null);
  };
  const updatePurpose = (id: string, change: Partial<BatchPurpose>) => {
    setPurposes(purposes.map(p => (p.id === id ? { ...p, ...change } : p)));
    setPurposeStatus(null);
  };
  const savePurposes = async () => {
    const res = await saveBatchPurposes(purposes);
    if (res.ok === true) { setPurposes(res.purposes); setPurposeStatus({ kind: 'saved' }); }
    else setPurposeStatus(res.error === 'INVALID' ? { kind: 'invalid', problems: res.problems as BatchPurposeProblem[] } : { kind: 'refused' });
  };

  const statusLine = (s: Status, problemPrefix: string) => {
    if (!s) return null;
    if (s.kind === 'saved') return <p className="ps-research-status" role="status">{t('researchCases.saved')}</p>;
    if (s.kind === 'refused') return <p className="ps-research-status ps-research-status--error" role="alert">{t('researchCases.notPermitted')}</p>;
    return <ul className="ps-research-status ps-research-status--error" role="alert">{s.problems.map(p => <li key={p}>{t(`${problemPrefix}.${p}`)}</li>)}</ul>;
  };

  return (
    <div className="ps-research-section">
      <h2 className="config-fonts-title">{t('researchCases.title')}</h2>
      <p className="ps-conf-section-subtitle">{t('researchCases.subtitle')}</p>

      <section className="ps-conf-card ps-research-card" aria-labelledby="research-cases-heading">
        <h3 id="research-cases-heading" className="ps-research-card-title">{t('researchCases.casesHeading')}</h3>
        <label className="ps-conf-toggle-label-row">
          <input type="checkbox" className="ps-conf-radio-input" checked={enabled} onChange={e => { setEnabled(e.target.checked); setResearchStatus(null); }} />
          <span className="ps-conf-option-text">{t('researchCases.enabled')}</span>
        </label>

        <div className="ps-research-grid">
          <div>
            <label className="ps-label" htmlFor="research-accession-prefixes">{t('researchCases.accessionPrefixes')}</label>
            <input id="research-accession-prefixes" className="ps-conf-input" value={accessionText} onChange={e => { setAccessionText(e.target.value); setResearchStatus(null); }} />
          </div>
          <div>
            <label className="ps-label" htmlFor="research-mrn-prefixes">{t('researchCases.mrnPrefixes')}</label>
            <input id="research-mrn-prefixes" className="ps-conf-input" value={mrnText} onChange={e => { setMrnText(e.target.value); setResearchStatus(null); }} />
          </div>
          <div>
            <label className="ps-label" htmlFor="research-financial-class">{t('researchCases.financialClass')}</label>
            <input id="research-financial-class" className="ps-conf-input" value={financialClass} onChange={e => { setFinancialClass(e.target.value); setResearchStatus(null); }} />
          </div>
          <div>
            <label className="ps-label" htmlFor="research-retention-days">{t('researchCases.retentionDays')}</label>
            <input id="research-retention-days" type="number" min={0} step={1} className="ps-conf-input" value={retentionDays} onChange={e => { setRetentionDays(e.target.value); setResearchStatus(null); }} />
          </div>
        </div>
        <p className="ps-conf-section-subtitle">{t('researchCases.prefixHint')}</p>

        <p className="ps-research-applies-heading">{t('researchCases.appliesHeading')}</p>
        <ul className="ps-research-applies">
          <li>{t('researchCases.applies.worklist')}</li>
          <li>{t('researchCases.applies.stats')}</li>
          <li>{t('researchCases.applies.results')}</li>
          <li>{t('researchCases.applies.charges')}</li>
          <li>{t('researchCases.applies.retention')}</li>
        </ul>

        <div className="ps-research-actions">
          <CapabilityButton capability="config:research-cases:manage" className="ps-conf-btn-primary" onClick={() => { void saveResearch(); }}>
            {t('common.save')}
          </CapabilityButton>
        </div>
        {statusLine(researchStatus, 'researchCases.problems')}
      </section>

      <section className="ps-conf-card ps-research-card" aria-labelledby="batch-purposes-heading">
        <h3 id="batch-purposes-heading" className="ps-research-card-title">{t('researchCases.purposesHeading')}</h3>
        <p className="ps-conf-section-subtitle">{t('researchCases.purposesHint')}</p>
        <ul className="ps-research-purpose-list">
          {purposes.map(p => {
            const key = batchPurposeLabelKey(p.id);
            return (
              <li key={p.id} className="ps-research-purpose-row">
                {p.builtIn && key
                  ? <span className="ps-research-purpose-name">{t(key)}</span>
                  : <input className="ps-conf-input ps-research-purpose-input" aria-label={t('researchCases.purposeName')} value={p.name} onChange={e => updatePurpose(p.id, { name: e.target.value })} />}
                {p.builtIn && <span className="ps-research-purpose-tag">{t('researchCases.builtIn')}</span>}
                <label className="ps-conf-toggle-label-row ps-research-purpose-active">
                  <input type="checkbox" className="ps-conf-radio-input" checked={p.active} disabled={p.id === DEFAULT_BATCH_PURPOSE_ID}
                    onChange={e => updatePurpose(p.id, { active: e.target.checked })} />
                  <span className="ps-conf-option-text">{t('researchCases.active')}</span>
                </label>
              </li>
            );
          })}
        </ul>
        <div className="ps-research-add-row">
          <input className="ps-conf-input" aria-label={t('researchCases.newPurpose')} placeholder={t('researchCases.newPurpose')} value={newName}
            onChange={e => setNewName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addPurpose(); }} />
          <button type="button" className="ps-conf-btn-secondary" onClick={addPurpose} disabled={!newName.trim()}>{t('researchCases.addPurpose')}</button>
        </div>
        <div className="ps-research-actions">
          <CapabilityButton capability="config:batch-purposes:manage" className="ps-conf-btn-primary" onClick={() => { void savePurposes(); }}>
            {t('common.save')}
          </CapabilityButton>
        </div>
        {statusLine(purposeStatus, 'researchCases.purposeProblems')}
      </section>
    </div>
  );
};

export default ResearchCasesSection;
