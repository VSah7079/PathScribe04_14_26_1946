// src/pages/SynopticReportPage/components/AmendmentDraftBanner.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Extended per feedback: this now doubles as the persistent Amendment
// Summary Box (FR-19) plus a LIVE Changed Items Summary (FR-20).
//
// Important distinction from the wizard's own Changed Items Summary:
// that one only showed fields explicitly pulled from an older version
// in the Delta step. This one shows EVERY field currently different
// from the true baseline — including ordinary edits made afterward in
// the main synoptic form, not just Delta-table overrides. Diffed
// against amendmentRecord.originalReportSnapshot.answers — the durable,
// one-time-captured baseline (see mockAmendmentService.ts's captureFields
// fix) — not the page-level preOverrideSnapshot state, which doesn't
// survive a refresh.
//
// Re-renders live off `caseData` prop changes, so edits in the main
// form update this immediately with no extra wiring needed.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import '../../../pathscribe.css';
import { amendmentService } from '@/services';
import type { AmendmentRecord } from '@/types/reports/AmendmentRecord';

const formatValue = (value: unknown): string => {
  if (value === undefined || value === null || value === '') return '(empty)';
  return String(value);
};

const formatDateTime = (iso?: string) => iso ? new Date(iso).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }) : '';

const NOTIFICATION_METHOD_LABEL: Record<string, string> = {
  verbal_phone: 'Verbal / Phone Call',
  secure_page: 'Secure Page',
  direct_lis_flag: 'Direct LIS Flag',
};

export const AmendmentDraftBanner: React.FC<{
  caseData?: any;
  activeReportInstanceId?: string | null;
  onEdit?: () => void;
}> = ({ caseData, activeReportInstanceId, onEdit }) => {
  const [record, setRecord] = useState<AmendmentRecord | undefined>(undefined);
  const [changedItemsOpen, setChangedItemsOpen] = useState(false);

  const activeInstance = (caseData?.synopticReports ?? []).find((r: any) => r.instanceId === activeReportInstanceId);
  const isDraftAmendment = !!activeInstance?.pendingAmendmentId && activeInstance?.status === 'draft' && activeInstance?.previouslyFinalizedForAmendment;

  useEffect(() => {
    if (!isDraftAmendment || !caseData?.id || !activeInstance?.pendingAmendmentId) { setRecord(undefined); return; }
    amendmentService.getByCaseId(caseData.id).then(res => {
      if (!res.ok) return;
      setRecord(res.data.find(r => r.id === activeInstance.pendingAmendmentId));
    });
  }, [isDraftAmendment, caseData?.id, activeInstance?.pendingAmendmentId, activeInstance?.answers]);

  if (!isDraftAmendment) return null;

  const baseline = (record?.originalReportSnapshot as any)?.answers as Record<string, unknown> | undefined;
  const liveAnswers = activeInstance?.answers as Record<string, unknown> | undefined;
  const changedKeys = baseline && liveAnswers
    ? Object.keys({ ...baseline, ...liveAnswers }).filter(k => JSON.stringify(baseline[k]) !== JSON.stringify(liveAnswers[k]))
    : [];

  return (
    <div className="ps-amendment-draft-banner">
      <span className="ps-amendment-draft-banner-icon">🔶</span>
      <div className="ps-amendment-draft-banner-body">
        <div className="ps-amendment-draft-banner-header-row">
          <div className="ps-amendment-draft-banner-title">{record?.type === 'correction' ? 'CORRECTION' : 'AMENDMENT'} IN PROGRESS — not yet transmitted</div>
          {onEdit && (
            <button type="button" className="ps-amendment-draft-banner-edit" onClick={onEdit}>✏️ Edit</button>
          )}
        </div>

        {record && (
          <div className="ps-amendment-summary-box ps-amendment-summary-box--compact">
            <div className="ps-amendment-summary-row"><span className="ps-amendment-summary-label">Reason</span> {record.explanationOfChange}</div>
            <div className="ps-amendment-summary-row"><span className="ps-amendment-summary-label">{record.type === 'correction' ? 'Corrected by' : 'Amended by'}</span> {record.authoringPathologist.userName}</div>
            <div className="ps-amendment-summary-row"><span className="ps-amendment-summary-label">Started</span> {formatDateTime(record.initiatedAt)}</div>
            {record.notification && (
              <div className="ps-amendment-summary-row">
                <span className="ps-amendment-summary-label">Clinician notified</span> {record.notification.clinicianName} — {NOTIFICATION_METHOD_LABEL[record.notification.method] ?? record.notification.method}, {formatDateTime(record.notification.notifiedAt)}
              </div>
            )}
          </div>
        )}

        {changedKeys.length > 0 && (
          <div className="ps-amendment-changed-items">
            <button type="button" className="ps-amendment-changed-items-toggle" onClick={() => setChangedItemsOpen(o => !o)}>
              {changedItemsOpen ? '▾' : '▸'} Changed Items Summary ({changedKeys.length} field{changedKeys.length === 1 ? '' : 's'} differ from baseline)
            </button>
            {changedItemsOpen && (
              <table className="ps-amendment-matrix">
                <thead><tr><th>Field</th><th>Baseline</th><th>Current</th></tr></thead>
                <tbody>
                  {changedKeys.map(key => (
                    <tr key={key}>
                      <td>{key}</td>
                      <td className="ps-amendment-matrix-previous">{formatValue(baseline?.[key])}</td>
                      <td className="ps-amendment-matrix-current">{formatValue(liveAnswers?.[key])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
