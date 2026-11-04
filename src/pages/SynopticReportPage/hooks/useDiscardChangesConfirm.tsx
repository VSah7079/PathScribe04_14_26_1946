// src/pages/SynopticReportPage/hooks/useDiscardChangesConfirm.tsx
// Batch 639 (Pete, Oct 20, 2026, hotkey decision 7). "Discard Unsaved Changes" (Alt+U or by voice) throws away every unsaved edit on
// the report and cannot be undone, so it asks first. One dialog, one answer; the page acts only on a yes.
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ConfirmModal from '@/components/Common/ConfirmModal';

export function useDiscardChangesConfirm() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const resolver = useRef<((ok: boolean) => void) | null>(null);
  const ask = useCallback(() => new Promise<boolean>(resolve => {
    resolver.current?.(false);
    resolver.current = resolve;
    setOpen(true);
  }), []);
  const answer = (ok: boolean) => { resolver.current?.(ok); resolver.current = null; setOpen(false); };
  const modal = (
    <ConfirmModal
      show={open}
      title={t('synopticEditor.discardConfirm.title')}
      message={t('synopticEditor.discardCommandMessage')}
      confirmLabel={t('synopticEditor.discardConfirm.discardButton')}
      cancelLabel={t('synopticEditor.discardConfirm.keepEditingButton')}
      onConfirm={() => answer(true)}
      onCancel={() => answer(false)}
    />
  );
  return { ask, modal };
}
