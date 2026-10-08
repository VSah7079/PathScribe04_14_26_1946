// src/pages/SynopticReportPage/hooks/useWarningConfirm.tsx
// Batch 465b: a warning the person can go past (Pete: a hand-entered total that differs from its grid —
// "reconcile before proceeding"), asked from a save or sign-out that awaits the answer.
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ConfirmModal from '@/components/Common/ConfirmModal';

export function useWarningConfirm() {
  const { t } = useTranslation();
  const [message, setMessage] = useState<string | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);
  const pending = useRef<string | null>(null);
  // The same warning, once gone past, isn't asked again on this page (a sign-out resumed after another gate,
  // the next draft save) — a different total or count asks afresh.
  const accepted = useRef(new Set<string>());
  const confirm = useCallback((text: string) => new Promise<boolean>(resolve => {
    if (accepted.current.has(text)) { resolve(true); return; }
    resolver.current?.(false);
    resolver.current = resolve;
    pending.current = text;
    setMessage(text);
  }), []);
  const answer = (ok: boolean) => {
    if (ok && pending.current) accepted.current.add(pending.current);
    resolver.current?.(ok); resolver.current = null; pending.current = null; setMessage(null);
  };
  const modal = (
    <ConfirmModal
      show={message !== null}
      title={t('synopticChecks.totalsTitle')}
      message={<span className="ps-synoptic-checks-message">{message}</span>}
      confirmLabel={t('synopticChecks.continueAnyway')}
      cancelLabel={t('synopticChecks.goBack')}
      onConfirm={() => answer(true)}
      onCancel={() => answer(false)}
    />
  );
  return { confirm, modal };
}
