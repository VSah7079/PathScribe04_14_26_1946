// src/components/Config/System/PeerReviewGateSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// PS-144 (Batch 439, Pete Oct 2): Configuration → System → Peer Review Before
// Sign-Out. Whether sign-out waits for the independent peer review of a
// first-time malignancy. Off by default; set for the organisation, then per
// performing lab (the lab that signs the case out), then per department
// (subspecialty) — most specific wins
// (services/quality/peerReviewRules.ts). With the gate off, the report page
// still recommends the review; it just doesn't stop sign-out. A change saves
// at once, is audited, and needs config:peer-review:manage (checked by the
// service).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  peerReviewSettingsService, facilityService, subspecialtyService, peerReviewGateChoice, withPeerReviewGateChoice, peerReviewPerformingLabs as performingLabs,
} from '@/services';
import type { PeerReviewGateSettings } from '@/types/quality/PeerReview';
import '@/pathscribe.css';

type Choice = 'inherit' | 'on' | 'off';
const CHOICES: Choice[] = ['inherit', 'on', 'off'];

const PeerReviewGateSection: React.FC = () => {
  const { t } = useTranslation();
  const K = 'peerReviewGateSection';
  const [settings, setSettings] = useState<PeerReviewGateSettings | null>(null);
  const [facilities, setFacilities] = useState<{ id: string; name: string }[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    const res = await peerReviewSettingsService.get();
    if (res.ok) setSettings(res.data);
  }, []);
  useEffect(() => {
    void load();
    facilityService.getAll().then(r => { if (r.ok) setFacilities(performingLabs(r.data)); }).catch(() => {});
    subspecialtyService.getAll().then(r => { if (r.ok) setDepartments(r.data.map(s => ({ id: s.id, name: s.name }))); }).catch(() => {});
  }, [load]);

  const save = async (next: PeerReviewGateSettings) => {
    const res = await peerReviewSettingsService.save(next);
    if (res.ok) { setSettings(res.data); setSaved(true); setTimeout(() => setSaved(false), 2000); }
  };

  if (!settings) return null;

  const table = (kind: 'facilities' | 'subspecialties', rows: { id: string; name: string }[]) => (
    <div className="ps-conf-card ps-conf-card--spaced">
      <div className="ps-conf-card-title">{t(`${K}.${kind}.title`)}</div>
      <p className="ps-conf-card-description--tight">{t(`${K}.${kind}.description`)}</p>
      <div className="ps-conf-table-wrap">
        <table className="ps-conf-table">
          <thead>
            <tr>
              <th className="ps-conf-th">{t(`${K}.${kind}.column`)}</th>
              <th className="ps-conf-th">{t(`${K}.gateColumn`)}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id} className="ps-conf-tr">
                <td className="ps-conf-td">{row.name}</td>
                <td className="ps-conf-td">
                  <select
                    className="ps-conf-select"
                    aria-label={t(`${K}.choiceAria`, { name: row.name })}
                    value={peerReviewGateChoice(settings, kind, row.id)}
                    onChange={e => { void save(withPeerReviewGateChoice(settings, kind, row.id, e.target.value as Choice)); }}
                  >
                    {CHOICES.map(c => <option key={c} value={c}>{t(`${K}.choices.${c}`)}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div>
      <div className="ps-rbuf-header">
        <h2 className="ps-rbuf-title">{t(`${K}.title`)}</h2>
        <p className="ps-rbuf-subtitle">{t(`${K}.subtitle`)}</p>
      </div>
      <div className="ps-conf-card ps-conf-card--spaced">
        <label className="ps-conf-toggle-label-row">
          <input type="checkbox" className="ps-conf-radio-input" checked={settings.orgDefault}
            onChange={e => { void save({ ...settings, orgDefault: e.target.checked }); }} />
          <span className="ps-conf-option-text">{t(`${K}.orgDefault`)}</span>
        </label>
        <p className="ps-conf-field-hint">{t(`${K}.orgDefaultHint`)}</p>
      </div>
      {table('facilities', facilities)}
      {table('subspecialties', departments)}
      {saved && <div className="ps-concordance__saved">✓ {t(`${K}.saved`)}</div>}
    </div>
  );
};

export default PeerReviewGateSection;
