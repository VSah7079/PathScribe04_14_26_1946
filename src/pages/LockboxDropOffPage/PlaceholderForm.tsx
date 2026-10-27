// src/pages/LockboxDropOffPage/PlaceholderForm.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 645: state B, a barcode with no pending order. The barcode is already scanned; everything here is optional, so a drop is
// never refused for lack of details. The ordering client and physician come from the existing dictionaries (picklists), with
// free text for a client that is not listed. Time dropped defaults to now. Enter records the drop; Escape cancels.
// No patient fields are asked. Rendering only.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { PlaceholderFormState } from './hooks/useLockboxScan';
import type { PicklistOption } from './hooks/useLockboxPicklists';

interface Props {
  barcode: string;
  form: PlaceholderFormState;
  clients: PicklistOption[];
  physicians: PicklistOption[];
  busy: boolean;
  onChange: (changes: Partial<PlaceholderFormState>) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export const PlaceholderForm: React.FC<Props> = ({ barcode, form, clients, physicians, busy, onChange, onSubmit, onCancel }) => {
  const { t } = useTranslation();
  const first = useRef<HTMLSelectElement>(null);
  useEffect(() => { first.current?.focus(); }, []);
  return (
    <form
      className="ps-lbx-placeholder"
      onSubmit={e => { e.preventDefault(); onSubmit(); }}
      onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); onCancel(); } }}
    >
      <h2 className="ps-lbx-receipt-title">{t('lockboxDropOff.placeholder.title')}</h2>
      <p className="ps-lbx-note">{t('lockboxDropOff.placeholder.intro')}</p>
      <p className="ps-lbx-note">{t('lockboxDropOff.placeholder.barcode')} <strong className="ps-lbx-ref" data-phi="true">{barcode}</strong></p>

      <label className="ps-lbx-field">
        <span>{t('lockboxDropOff.placeholder.client')}</span>
        <select ref={first} value={form.facilityId} onChange={e => onChange({ facilityId: e.target.value })}>
          <option value="">{t('lockboxDropOff.placeholder.notListed')}</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </label>
      <label className="ps-lbx-field">
        <span>{t('lockboxDropOff.placeholder.clientFreeText')}</span>
        <input type="text" value={form.clientFreeText} maxLength={120} autoComplete="off" onChange={e => onChange({ clientFreeText: e.target.value })} />
      </label>
      <label className="ps-lbx-field">
        <span>{t('lockboxDropOff.placeholder.physician')}</span>
        <select value={form.physicianId} onChange={e => onChange({ physicianId: e.target.value })}>
          <option value="">{t('lockboxDropOff.placeholder.notListed')}</option>
          {physicians.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </label>
      <label className="ps-lbx-field">
        <span>{t('lockboxDropOff.placeholder.droppedAt')}</span>
        <input type="datetime-local" value={form.droppedAtLocal} onChange={e => onChange({ droppedAtLocal: e.target.value })} />
        <small>{t('lockboxDropOff.placeholder.droppedAtHint')}</small>
      </label>

      <div className="ps-lbx-actions">
        <button type="submit" className="ps-lbx-primary" disabled={busy}>{t('lockboxDropOff.placeholder.save')}</button>
        <button type="button" className="ps-lbx-secondary" onClick={onCancel}>{t('lockboxDropOff.placeholder.cancel')}</button>
      </div>
    </form>
  );
};
