// src/pages/LockboxDropOffPage/DropOffPanel.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 645: the Drop-Off kiosk. Scan first: one large field that keeps focus, Enter submits, no confirmation dialogs.
// A pending order is received at once (state A); an unknown barcode asks the few placeholder details (state B); Urgent, armed
// before the scan, applies to either and is cleared once the receipt is written. Rendering only: the flow is useLockboxScan.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useImperativeHandle, useRef, forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLockboxScan } from './hooks/useLockboxScan';
import { useLockboxPicklists } from './hooks/useLockboxPicklists';
import { ReceiptCard } from './ReceiptCard';
import { PlaceholderForm } from './PlaceholderForm';
import { lockboxErrorKey } from './lockboxMessages';

export interface DropOffHandle { focusScan: () => void; toggleUrgent: () => void }

export const DropOffPanel = forwardRef<DropOffHandle>(function DropOffPanel(_props, ref) {
  const { t } = useTranslation();
  const scan = useLockboxScan();
  const { clients, physicians } = useLockboxPicklists(scan.phase === 'placeholder');
  const field = useRef<HTMLInputElement>(null);
  const focusScan = () => field.current?.focus();

  useImperativeHandle(ref, () => ({ focusScan, toggleUrgent: () => scan.setUrgent(!scan.urgent) }), [scan]);
  // The field is where the next scan lands: take focus on opening and whenever a scan finishes or a form is closed.
  useEffect(() => { if (scan.phase !== 'placeholder' && scan.phase !== 'checking') focusScan(); }, [scan.phase]);

  const busy = scan.phase === 'checking';
  return (
    <div className="ps-lbx-panel">
      <form className="ps-lbx-scan" onSubmit={e => { e.preventDefault(); void scan.submitScan(); }}>
        <label className="ps-lbx-scan-label" htmlFor="ps-lbx-scan-field">{t('lockboxDropOff.scan.label')}</label>
        <div className="ps-lbx-scan-row">
          <input
            id="ps-lbx-scan-field" ref={field} className="ps-lbx-scan-field" type="text" autoFocus autoComplete="off" spellCheck={false}
            value={scan.barcode} onChange={e => scan.setBarcode(e.target.value)} disabled={scan.phase === 'placeholder'} aria-describedby="ps-lbx-scan-hint" data-phi="true"
          />
          <button type="submit" className="ps-lbx-primary" disabled={busy || scan.phase === 'placeholder'}>{t(busy ? 'lockboxDropOff.scan.checking' : 'lockboxDropOff.scan.submit')}</button>
        </div>
        <p id="ps-lbx-scan-hint" className="ps-lbx-note">{t('lockboxDropOff.scan.hint')}</p>

        <div className="ps-lbx-urgent">
          <button type="button" className="ps-lbx-toggle" aria-pressed={scan.urgent} onClick={() => scan.setUrgent(!scan.urgent)}>{t('lockboxDropOff.urgent.toggle')}</button>
          {scan.urgent && (
            <label className="ps-lbx-field ps-lbx-field--inline">
              <span>{t('lockboxDropOff.urgent.callback')}</span>
              <input type="tel" value={scan.callback} maxLength={32} autoComplete="off" onChange={e => scan.setCallback(e.target.value)} data-phi="true" />
            </label>
          )}
        </div>
      </form>

      {scan.error && <p className="ps-lbx-error" role="alert">{t(lockboxErrorKey(scan.error))}</p>}

      {scan.phase === 'placeholder' && (
        <PlaceholderForm
          barcode={scan.scanned} form={scan.form} clients={clients} physicians={physicians} busy={busy}
          onChange={scan.setForm} onSubmit={() => void scan.submitPlaceholder()} onCancel={scan.cancelPlaceholder}
        />
      )}
      {scan.receipt && (scan.phase === 'received' || scan.phase === 'duplicate') && <ReceiptCard receipt={scan.receipt} duplicate={scan.phase === 'duplicate'} />}
    </div>
  );
});
