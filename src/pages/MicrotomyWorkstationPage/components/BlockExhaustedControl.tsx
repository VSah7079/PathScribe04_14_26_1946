// src/pages/MicrotomyWorkstationPage/components/BlockExhaustedControl.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 610 (#16). The "Block exhausted" button on the Microtome workstation.
// The tech flags that the block has no more tissue to give. The block is marked
// Exhausted, the ordering pathologist is e-mailed (the Simulated mail outbox when
// the site has no mail server; the message holds no patient details) and cutting
// stays blocked until the pathologist answers: Approve destructive cutting lets it
// go on, Cancel or Modify puts the block's status back.
// Batch 669: the button is greyed without add-on:exception:flag (ws-19). When the slide has no ordering pathologist
// (or none who can be e-mailed) the notice goes to the Supervisor / Accessioning Desk, and the control says so (ws-3).
// Shows a banner while the flag is open. The page passes the work in; the flag
// itself goes through the same action as the Add-On Order station.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { HistologyBlock } from '@/types/case/Specimen';
import { cuttingBlockedByExhaustion, exhaustionFlagTarget } from '@/utils/blockExceptionStates';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { QuickReasonPicks } from '@/components/Common/QuickReasonPicks';
import { useBenchReasons } from '@/hooks/useBenchReasons';
import { EMPTY_BENCH_REASON, benchReasonCode, type BenchReasonChoice } from '@/services/reasons/benchReasons';

export interface BlockExhaustedControlProps {
  block: HistologyBlock;
  /** Batch 736: the reason text (picked reason and/or note) and the picked reason's code. */
  onFlag: (note: string, reasonCode?: string) => Promise<{ ok: boolean; missing?: string[]; failed?: boolean; notPermitted?: boolean; noticeToDesk?: boolean; noticeNotSent?: boolean }>;
}

const BlockExhaustedControl: React.FC<BlockExhaustedControlProps> = ({ block, onFlag }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<BenchReasonChoice>(EMPTY_BENCH_REASON);
  const reasons = useBenchReasons('BENCH_BLOCK_EXHAUSTED');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Batch 669 (ws-3): who was told, shown beside the button once the flag is saved (no extra window to dismiss). */
  const [sentNotice, setSentNotice] = useState<{ key: string; warn: boolean } | null>(null);

  const pending = block.stains.find(s => s.exception?.reason === 'Block exhausted' && s.exception.status === 'pending_pathologist_review');
  const approved = block.stains.find(s => s.exception?.reason === 'Block exhausted' && s.exception.status === 'approved_destructive_cut');
  const blocked = cuttingBlockedByExhaustion(block);
  // Batch 732: only while a slide is still waiting to be cut (the flag goes on that slide).
  const canFlag = !pending && !!exhaustionFlagTarget(block);

  const submit = async () => {
    setBusy(true); setError(null);
    const r = await onFlag(reasons.textOf(choice), benchReasonCode(choice));
    setBusy(false);
    if (r.ok) {
      setOpen(false); setChoice(EMPTY_BENCH_REASON);
      setSentNotice(r.noticeNotSent ? { key: 'microtomyWorkstation.exhausted.nobodyNotified', warn: true } : r.noticeToDesk ? { key: 'microtomyWorkstation.exhausted.sentToDesk', warn: false } : null);
      return;
    }
    setError(r.notPermitted ? t('microtomyWorkstation.exhausted.notPermitted')
      : r.missing && r.missing.length > 0 ? t('microtomyWorkstation.exhausted.noteRequired') : t('microtomyWorkstation.exhausted.failed'));
  };

  return (
    <div className="ps-exhausted-control">
      {blocked && pending?.exception && (
        <div className="ps-exhausted-banner" role="status">
          <strong>{t('microtomyWorkstation.exhausted.bannerTitle')}</strong>{' '}
          {t('microtomyWorkstation.exhausted.bannerBody', { name: pending.exception.flaggedByName })}
        </div>
      )}
      {!blocked && approved && (
        <div className="ps-exhausted-banner ps-exhausted-banner--ok" role="status">{t('microtomyWorkstation.exhausted.approved')}</div>
      )}
      {sentNotice && <div className={`ps-exhausted-banner${sentNotice.warn ? '' : ' ps-exhausted-banner--ok'}`} role="status">{t(sentNotice.key)}</div>}
      <CapabilityButton capability="add-on:exception:flag" className="ps-btn-secondary" disabled={!canFlag} onClick={() => { setOpen(true); setError(null); setSentNotice(null); }}>
        {t('microtomyWorkstation.exhausted.button')}
      </CapabilityButton>
      {open && (
        <div className="ps-overlay" onClick={() => !busy && setOpen(false)}>
          <div className="ps-modal-dark" aria-modal="true" role="dialog" aria-label={t('microtomyWorkstation.exhausted.title')} onClick={e => e.stopPropagation()}>
            <div className="ps-batch-modal-header"><div className="ps-batch-modal-title">{t('microtomyWorkstation.exhausted.title')}</div></div>
            <div className="ps-batch-modal-body">
              <p>{t('microtomyWorkstation.exhausted.body')}</p>
              <label className="ps-microtomy-field-label" htmlFor="ps-exhausted-note">{t('microtomyWorkstation.exhausted.note')}</label>
              {/* Touch spec T3; Batch 736: the lab's reasons from the Reason Dictionary, one tap; the note is optional. */}
              <QuickReasonPicks category="BENCH_BLOCK_EXHAUSTED" options={reasons.options} value={choice} onChange={setChoice} disabled={busy} />
              <textarea id="ps-exhausted-note" className="ps-microtomy-field-select" rows={3} value={choice.note} onChange={e => setChoice(c => ({ ...c, note: e.target.value }))} />
              {error && <div className="ps-microtomy-save-error" role="alert">{error}</div>}
            </div>
            <div className="ps-batch-modal-footer">
              <button type="button" className="ps-btn-secondary" disabled={busy} onClick={() => setOpen(false)}>{t('common.cancel')}</button>
              <button type="button" className="ps-btn-primary" disabled={busy} onClick={submit}>{t('microtomyWorkstation.exhausted.confirm')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlockExhaustedControl;
