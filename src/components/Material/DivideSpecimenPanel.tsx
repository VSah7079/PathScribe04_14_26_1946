// src/components/Material/DivideSpecimenPanel.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 741 (Pete, fluid decisions 2 and 3): Divide specimen, on the Grossing screen and the Cytology Preparation
// bench. Before a division: the starting volume and one row per aliquot (purpose, volume, destination), pre-filled
// from the specimen's protocol, with the volume accounted for ("Split 8 mL of 30 mL; 22 mL remaining"). After it:
// the record, and each aliquot with its destination and status (Not sent → Sent → Received → Result back; the
// receiving department's accession number is asked for at Result back). Rules: services/material/specimenDivision.ts.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ALIQUOT_PURPOSES, ALIQUOT_STATUSES, type AliquotPurpose, type AliquotStatus, type Decant } from '@/types/case/Material';
import { defaultDestinationFor, divisionTotals, prefillRows, type DivisionRow } from '@/services/material/specimenDivision';
import { decantTypeText } from '@/utils/decantTypeText';
import { formatDateTime } from '@/utils/formatDate';
import type { DivisionMessage } from '@/hooks/useSpecimenDivision';
import './DivideSpecimenPanel.css';

export interface DivideSpecimenPanelProps {
  specimen: { id: string; label: string; decants?: Decant[]; division?: { startingVolumeMl: number; dividedAt: string; dividedByName: string; splitMl: number; remainingMl: number } };
  /** The specimen's protocol's suggested aliquots (Protocol.divisionPurposes). */
  suggestedPurposes?: AliquotPurpose[];
  busy: boolean;
  message: DivisionMessage | null;
  onDivide: (specimenId: string, startingVolumeMl: number, rows: DivisionRow[]) => Promise<boolean>;
  onStatus: (aliquotId: string, next: AliquotStatus, receivingAccession?: string) => void;
}

const K = 'divideSpecimen';

const DivideSpecimenPanel: React.FC<DivideSpecimenPanelProps> = ({ specimen, suggestedPurposes, busy, message, onDivide, onStatus }) => {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState('');
  const [rows, setRows] = useState<DivisionRow[]>([]);
  const [receiving, setReceiving] = useState<Record<string, string>>({});
  const startMl = Number(start);
  const totals = useMemo(() => divisionTotals(startMl > 0 ? startMl : 0, rows), [startMl, rows]);
  const aliquots = (specimen.decants ?? []).filter(d => d.decantType === 'aliquot');
  const setRow = (i: number, patch: Partial<DivisionRow>) => setRows(r => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const addRow = () => setRows(r => [...r, { purpose: 'flow_cytometry', volumeMl: 0, destination: defaultDestinationFor('flow_cytometry') }]);

  return (
    <div className="ps-divide">
      <div className="ps-divide-head">
        <span className="ps-divide-title">{t(`${K}.title`, { label: specimen.label })}</span>
        {!specimen.division && !open && <button type="button" className="ps-btn-secondary" onClick={() => { if (rows.length === 0) setRows(prefillRows(suggestedPurposes, defaultDestinationFor)); setOpen(true); }}>{t(`${K}.open`)}</button>}
      </div>
      {message && (
        <p className={message.kind === 'ok' ? 'ps-divide-ok' : 'ps-divide-error'} role={message.kind === 'ok' ? 'status' : 'alert'}>
          {message.kind === 'ok' ? t(`${K}.done.${message.key}`, message.values) : t(`${K}.problem.${message.key}`)}
        </p>
      )}
      {specimen.division && (
        <p className="ps-divide-record">{t(`${K}.record`, { start: specimen.division.startingVolumeMl, split: specimen.division.splitMl, remaining: specimen.division.remainingMl, name: specimen.division.dividedByName, when: formatDateTime(specimen.division.dividedAt, i18n.language) })}</p>
      )}
      {open && !specimen.division && (
        <div className="ps-divide-form">
          <label className="ps-divide-field">
            <span>{t(`${K}.startingVolume`)}</span>
            <input type="number" min={0} step="0.1" inputMode="decimal" value={start} onChange={e => setStart(e.target.value)} aria-label={t(`${K}.startingVolume`)} />
          </label>
          {rows.map((r, i) => (
            <div key={i} className="ps-divide-row">
              <select aria-label={t(`${K}.purpose`)} value={r.purpose} onChange={e => { const p = e.target.value as AliquotPurpose; setRow(i, { purpose: p, destination: defaultDestinationFor(p) }); }}>
                {ALIQUOT_PURPOSES.map(p => <option key={p} value={p}>{t(`cytologyScreening.materialDrawer.aliquotPurpose.${p}`)}</option>)}
              </select>
              <input type="number" min={0} step="0.1" inputMode="decimal" aria-label={t(`${K}.volume`)} placeholder={t(`${K}.volume`)} value={r.volumeMl || ''} onChange={e => setRow(i, { volumeMl: Number(e.target.value) })} />
              <select aria-label={t(`${K}.destinationKind`)} value={r.destination.kind} onChange={e => setRow(i, { destination: { ...r.destination, kind: e.target.value as 'department' | 'reference_lab' } })}>
                <option value="department">{t(`${K}.kind.department`)}</option>
                <option value="reference_lab">{t(`${K}.kind.reference_lab`)}</option>
              </select>
              <input aria-label={t(`${K}.destination`)} placeholder={t(`${K}.destination`)} value={r.destination.name} onChange={e => setRow(i, { destination: { ...r.destination, name: e.target.value } })} />
              <button type="button" className="ps-btn-secondary" onClick={() => setRows(x => x.filter((_, j) => j !== i))}>{t(`${K}.remove`)}</button>
            </div>
          ))}
          <button type="button" className="ps-btn-secondary" onClick={addRow}>{t(`${K}.add`)}</button>
          <p className={totals.splitMl > startMl && startMl > 0 ? 'ps-divide-error' : 'ps-divide-totals'}>{t(`${K}.totals`, { split: totals.splitMl, start: startMl > 0 ? startMl : 0, remaining: totals.remainingMl })}</p>
          <div className="ps-divide-actions">
            <button type="button" className="ps-btn-secondary" onClick={() => setOpen(false)}>{t('common.cancel')}</button>
            <button type="button" className="ps-btn-primary" disabled={busy} onClick={async () => { if (await onDivide(specimen.id, startMl, rows)) setOpen(false); }}>{t(`${K}.divide`)}</button>
          </div>
        </div>
      )}
      {aliquots.length > 0 && (
        <ul className="ps-divide-aliquots">
          {aliquots.map(a => {
            const at = ALIQUOT_STATUSES.indexOf((a.aliquotStatus ?? 'not_sent') as AliquotStatus);
            const next = ALIQUOT_STATUSES[at + 1];
            return (
              <li key={a.id} className="ps-divide-aliquot">
                <span className="ps-divide-aliquot-label">{t('cytologyScreening.materialDrawer.decantHeading', { label: `${specimen.label}${a.label}`, type: decantTypeText(t, a) })}</span>
                <span>{t(`${K}.aliquotLine`, { volume: a.volumeMl ?? '—', destination: a.destination?.name ?? '—' })}</span>
                <span className="ps-divide-status" data-phi="accession">{a.receivingAccession ? t(`${K}.statusWithReceiving`, { status: t(`${K}.status.${a.aliquotStatus ?? 'not_sent'}`), accession: a.receivingAccession }) : t(`${K}.status.${a.aliquotStatus ?? 'not_sent'}`)}</span>
                {next && (
                  <span className="ps-divide-next">
                    {next === 'result_back' && (
                      <input aria-label={t(`${K}.receivingAccession`)} placeholder={t(`${K}.receivingAccession`)} value={receiving[a.id] ?? ''} onChange={e => setReceiving(m => ({ ...m, [a.id]: e.target.value }))} />
                    )}
                    <button type="button" className="ps-btn-secondary" disabled={busy} onClick={() => onStatus(a.id, next, receiving[a.id])}>{t(`${K}.markAs`, { status: t(`${K}.status.${next}`) })}</button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default DivideSpecimenPanel;
