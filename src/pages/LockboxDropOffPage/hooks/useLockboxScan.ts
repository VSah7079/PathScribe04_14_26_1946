// src/pages/LockboxDropOffPage/hooks/useLockboxScan.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 645: the state of the Drop-Off kiosk, one scan at a time. Glue only: what a barcode means (a pending order, an
// earlier receipt, nothing) is the service's answer, and the step that follows is scanStepFor (services/lockbox).
//
//   ready -> (scan, Enter) -> checking -> received            state A: a pending order; the receipt is written at once
//                                      -> duplicate           an earlier receipt; nothing is written
//                                      -> placeholder         state B: ask the few placeholder details, then received
//   Urgent is armed before a scan and applies to the next receipt only (A or B); it clears once that receipt is written.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useRef, useState } from 'react';
import { lockboxService, dropTimeFromLocalInput, localInputValueFromDate, normalizeBarcode, scanStepFor } from '@/services';
import type { LockboxReceipt } from '@/services';

export type ScanPhase = 'ready' | 'checking' | 'placeholder' | 'received' | 'duplicate';

export interface PlaceholderFormState { facilityId: string; clientFreeText: string; physicianId: string; droppedAtLocal: string }
export const emptyPlaceholderForm = (): PlaceholderFormState => ({ facilityId: '', clientFreeText: '', physicianId: '', droppedAtLocal: localInputValueFromDate(new Date()) });

export function useLockboxScan() {
  const [phase, setPhase] = useState<ScanPhase>('ready');
  const [barcode, setBarcode] = useState('');
  const [scanned, setScanned] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [callback, setCallback] = useState('');
  const [receipt, setReceipt] = useState<LockboxReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<PlaceholderFormState>(emptyPlaceholderForm);
  const working = useRef(false);

  const fail = (code: string) => { setError(code); setPhase(prev => (prev === 'checking' ? 'ready' : prev)); };

  const showEarlier = async (code: string): Promise<boolean> => {
    const again = await lockboxService.lookupBarcode(code);
    if (again.ok !== true || again.data.kind !== 'duplicate') return false;
    setReceipt(again.data.receipt); setPhase('duplicate'); setBarcode('');
    return true;
  };

  const write = useCallback(async (code: string, placeholder?: PlaceholderFormState) => {
    const result = await lockboxService.receiveSpecimen({
      barcode: code,
      urgent,
      callbackNumber: urgent && callback.trim() ? callback.trim() : undefined,
      placeholder: placeholder ? {
        facilityId: placeholder.facilityId || undefined,
        clientFreeText: placeholder.clientFreeText.trim() || undefined,
        physicianId: placeholder.physicianId || undefined,
        reportedDropAt: dropTimeFromLocalInput(placeholder.droppedAtLocal),
      } : undefined,
    });
    if (result.ok === true) {
      setReceipt(result.data); setPhase('received'); setBarcode(''); setScanned('');
      setUrgent(false); setCallback('');
      return;
    }
    if (result.error === 'CONFLICT' && await showEarlier(code)) return;
    fail(result.error);
  }, [urgent, callback]);

  const submitScan = useCallback(async () => {
    if (working.current) return;
    const code = normalizeBarcode(barcode);
    if (!code) { setError('INVALID'); return; }
    working.current = true; setError(null); setPhase('checking');
    try {
      const look = await lockboxService.lookupBarcode(code);
      if (look.ok !== true) { fail(look.error); return; }
      const step = scanStepFor(look.data);
      if (step === 'showEarlierReceipt' && look.data.kind === 'duplicate') { setReceipt(look.data.receipt); setPhase('duplicate'); setBarcode(''); }
      else if (step === 'receive') await write(code);
      else { setScanned(code); setForm(emptyPlaceholderForm()); setPhase('placeholder'); }
    } finally { working.current = false; }
  }, [barcode, write]);

  const submitPlaceholder = useCallback(async () => {
    if (working.current || !scanned) return;
    working.current = true; setError(null);
    try { await write(scanned, form); } finally { working.current = false; }
  }, [scanned, form, write]);

  const cancelPlaceholder = useCallback(() => { setPhase('ready'); setScanned(''); setBarcode(''); setError(null); }, []);

  return {
    phase, barcode, setBarcode, scanned, urgent, setUrgent, callback, setCallback, receipt, error, form,
    setForm: (changes: Partial<PlaceholderFormState>) => setForm(f => ({ ...f, ...changes })),
    submitScan, submitPlaceholder, cancelPlaceholder,
  };
}
