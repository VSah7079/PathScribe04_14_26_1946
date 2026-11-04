// src/components/Config/System/RevisionReasonsSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// PS-146 (Batch 438, Pete Oct 2): Configuration → System → Revision Reasons.
// The amendment and correction reasons a pathologist picks when revising a
// released report, each with a "clinically significant" switch: releasing a
// revision for a clinically significant reason recommends a CAPA to the QA
// lead (services/reasons/revisionReasonRules.ts). A change saves at once and
// needs config:revision-reasons:manage, checked by the service.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { reasonDictionaryService, isClinicallySignificant, REVISION_REASON_CATEGORIES } from '@/services';
import type { ReasonDictionaryEntry } from '@/types/reasons/ReasonDictionaryEntry';
import '@/pathscribe.css';

const RevisionReasonsSection: React.FC = () => {
  const { t } = useTranslation();
  const K = 'revisionReasonsSection';
  const [reasons, setReasons] = useState<Record<string, ReasonDictionaryEntry[]>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    const lists = await Promise.all(REVISION_REASON_CATEGORIES.map(c => reasonDictionaryService.getAll(c)));
    setReasons(Object.fromEntries(REVISION_REASON_CATEGORIES.map((c, i) => [c, lists[i].ok ? lists[i].data : []])));
  }, []);
  useEffect(() => { void load(); }, [load]);

  const toggle = async (entry: ReasonDictionaryEntry, value: boolean) => {
    setSaving(entry.id);
    await reasonDictionaryService.update(entry.id, { clinicallySignificant: value });
    setSaving(null);
    await load();
  };

  return (
    <div>
      <div className="ps-rbuf-header">
        <h2 className="ps-rbuf-title">{t(`${K}.title`)}</h2>
        <p className="ps-rbuf-subtitle">{t(`${K}.subtitle`)}</p>
      </div>
      {REVISION_REASON_CATEGORIES.map(category => (
        <div key={category} className="ps-conf-card ps-conf-card--spaced">
          <div className="ps-conf-card-title">{t(`${K}.categories.${category}`)}</div>
          <div className="ps-conf-table-wrap">
            <table className="ps-conf-table">
              <thead>
                <tr>
                  <th className="ps-conf-th">{t(`${K}.columns.reason`)}</th>
                  <th className="ps-conf-th">{t(`${K}.columns.description`)}</th>
                  <th className="ps-conf-th">{t(`${K}.columns.clinicallySignificant`)}</th>
                </tr>
              </thead>
              <tbody>
                {(reasons[category] ?? []).map(entry => (
                  <tr key={entry.id} className="ps-conf-tr">
                    <td className="ps-conf-td">{entry.name}{entry.status === 'Inactive' && <span className="ps-specreq-meta"> · {t('common.inactive')}</span>}</td>
                    <td className="ps-conf-td"><div className="ps-specreq-meta">{entry.description}</div></td>
                    <td className="ps-conf-td">
                      <label className="ps-conf-toggle-label-row">
                        <input type="checkbox" className="ps-conf-radio-input" checked={isClinicallySignificant(entry)}
                          disabled={saving === entry.id}
                          onChange={e => { void toggle(entry, e.target.checked); }}
                          aria-label={t(`${K}.toggleAria`, { reason: entry.name })} />
                        <span className="ps-conf-option-text">{isClinicallySignificant(entry) ? t(`${K}.recommendsCapa`) : t(`${K}.noCapa`)}</span>
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RevisionReasonsSection;
