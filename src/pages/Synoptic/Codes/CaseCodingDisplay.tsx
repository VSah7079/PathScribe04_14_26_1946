// Batch 607 (#138): the case's codes as uniform entries (system, release, source, AI detail), and ICD-10 beside ICD-11.
// The ICD-11 column comes from a small SEEDED table and is labelled Simulated; it is not the WHO mapping.
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { CodedEntry } from '@/services/coding/codedEntry';
import { sideBySide } from '@/services/coding/simulatedIcdMap';
import { systemAllowed } from '@/services/coding/codePolicyEnforcement';
import { useCodePolicy } from './useCodePolicy';

export const CaseCodingDisplay: React.FC<{ entries: readonly CodedEntry[] }> = ({ entries }) => {
  const { t } = useTranslation();
  const { policy, today } = useCodePolicy();
  const rows = sideBySide(entries);
  const hasIcd = rows.length > 0;
  return (
    <div className="acd-case-coding" data-testid="case-coding">
      {entries.length === 0 && <div className="fm-empty-hint">{t('caseCoding.empty')}</div>}
      <ul className="acd-case-coding-list">
        {entries.map(e => (
          <li key={`${e.system}|${e.release ?? ''}|${e.code}`} data-testid="coding-entry">
            <span className="fm-code-chip">{e.code}</span>
            <span>{e.display ?? ''}</span>
            <span className="fm-eyebrow">{e.system}{e.release ? ` · ${e.release}` : ''}</span>
            <span className="fm-eyebrow">{t(`caseCoding.source.${e.source}`)}</span>
            {!systemAllowed(e.system, policy, today) && <span className="ps-code-outside-policy" data-testid="outside-policy">{t('codeSystemsPolicy.outsidePolicy')}</span>}
            {e.ai && <span className="ps-conf-badge">{t('caseCoding.aiDetail', { model: e.ai.model })}</span>}
          </li>
        ))}
      </ul>
      {hasIcd && (
        <table className="acd-side-by-side" data-testid="icd-side-by-side">
          <caption>{t('caseCoding.sideBySide.title')} <span className="ps-simulated-badge">{t('caseCoding.sideBySide.simulated')}</span></caption>
          <thead><tr><th>{t('caseCoding.sideBySide.icd10')}</th><th>{t('caseCoding.sideBySide.icd11')}</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{r.icd10?.code ?? '—'}</td>
                <td>{r.icd11?.code ?? (r.mappedIcd11 ? <>{r.mappedIcd11} <span className="ps-simulated-badge">{t('caseCoding.sideBySide.suggested')}</span></> : t('caseCoding.sideBySide.noMap'))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
