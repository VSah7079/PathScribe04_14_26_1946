// src/components/TumorBoard/FlagForMdtModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 489 (Module 1 of Pete's Tumor Board / MDT Workspace spec). The
// manual "Flag for MDT" action, reached from the report page at sign-out
// (SynopticReportPage.tsx) — the real fix for the previously-dead
// 'delegation.tumorBoard' voice/keyboard action (declared in
// constants/systemActions.ts, never wired to a handler anywhere). Deliberately
// a small, standalone modal here rather than routed through DelegateModal.tsx:
// a board nomination has no person/pool recipient, which that modal's
// DelegationRequest shape always requires (see services/tumorBoard/
// ITumorBoardService.ts's own header for the full reasoning).
//
// Batch 494 (PS-359 follow-up — MDT Self-Service Assignment & Batching
// redesign, Pete, Oct 8): "When a case is identified for multidisciplinary
// tumor board review, it is tagged with an 'MDT' status and assigned a
// date and time slot" — up front, at flag time, with the PHYSICIAN
// assignment left unassigned (Null) until someone claims it later from the
// workspace's own self-service dashboard. This modal gains optional
// meeting-date/meeting-time fields so a case enters a real batch
// immediately when flagged, instead of landing in an "Unscheduled" pool
// every time — left blank, it still lands there, same as before (useful
// when the flagger genuinely doesn't know which date yet).
//
// No business logic here (CLAUDE.md rule 2) — board/date selection is just
// which option is picked; the actual create() call, its one-active-
// listing-per-case rule, and the batch-lock cut-off check all live in
// mockTumorBoardService.ts.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { tumorBoardService } from '@/services';
import { useSystemConfig } from '@/contexts/SystemConfigContext';
import { TUMOR_BOARD_NAMES, type TumorBoardName } from '@/services/tumorBoard/ITumorBoardService';
import { isServiceOk } from '@/services/types';

interface FlagForMdtModalProps {
  caseId: string;
  caseAccession: string;
  byUserId: string;
  byUserName: string;
  onClose: () => void;
  /** Called after a successful nomination, so the caller can toast/refresh. */
  onFlagged: (board: TumorBoardName) => void;
}

export function FlagForMdtModal({ caseId, caseAccession, byUserId, byUserName, onClose, onFlagged }: FlagForMdtModalProps) {
  const { t } = useTranslation();
  const { config } = useSystemConfig();
  const [board, setBoard] = useState<TumorBoardName>(TUMOR_BOARD_NAMES[0]);
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const res = await tumorBoardService.create({
      caseId, caseAccession, board,
      meetingDate: meetingDate || undefined,
      meetingTime: meetingTime || undefined,
      createdByUserId: byUserId, createdByUserName: byUserName,
    }, config.facilityTimezone);
    setBusy(false);
    // Plain `res.ok` ternary/else does not narrow the else branch under
    // this project's strictNullChecks: false (see services/types.ts) —
    // isServiceOk() instead.
    if (isServiceOk(res)) { onFlagged(board); onClose(); }
    else setError(t(`flagForMdtModal.errors.${res.error}`, { defaultValue: t('flagForMdtModal.errors.saveFailed') }));
  };

  return (
    <div data-capture-hide="true" className="ps-conf-backdrop" onClick={onClose}>
      <div className="ps-conf-modal" onClick={e => e.stopPropagation()}>
        <div className="ps-conf-modal-header">{t('flagForMdtModal.title')}</div>
        <div className="ps-conf-modal-body">
          <label className="ps-conf-label" htmlFor="flag-for-mdt-board">{t('flagForMdtModal.boardLabel')}</label>
          <select
            id="flag-for-mdt-board"
            className="ps-conf-select"
            value={board}
            onChange={e => setBoard(e.target.value as TumorBoardName)}
            disabled={busy}
          >
            {TUMOR_BOARD_NAMES.map(b => <option key={b} value={b}>{t(`tumorBoard.boards.${b}`)}</option>)}
          </select>
          <label className="ps-conf-label" htmlFor="flag-for-mdt-date">{t('flagForMdtModal.meetingDateLabel')}</label>
          <input
            id="flag-for-mdt-date"
            type="date"
            className="ps-conf-input"
            value={meetingDate}
            onChange={e => setMeetingDate(e.target.value)}
            disabled={busy}
          />
          <label className="ps-conf-label" htmlFor="flag-for-mdt-time">{t('flagForMdtModal.meetingTimeLabel')}</label>
          <input
            id="flag-for-mdt-time"
            type="time"
            className="ps-conf-input"
            value={meetingTime}
            onChange={e => setMeetingTime(e.target.value)}
            disabled={busy || !meetingDate}
            title={!meetingDate ? t('tumorBoard.row.meetingTimeNeedsDate') : undefined}
          />
          <p className="ps-conf-hint">{t('flagForMdtModal.meetingDateHint')}</p>
          {error && <div className="ps-conf-hint ps-conf-hint--warning">{error}</div>}
        </div>
        <div className="ps-conf-modal-footer">
          <button className="ps-conf-btn-secondary" onClick={onClose} disabled={busy}>{t('flagForMdtModal.cancelBtn')}</button>
          <button className="ps-conf-btn-primary" onClick={() => void submit()} disabled={busy}>{t('flagForMdtModal.submitBtn')}</button>
        </div>
      </div>
    </div>
  );
}

export default FlagForMdtModal;
