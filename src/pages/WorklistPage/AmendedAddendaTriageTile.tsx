// src/pages/WorklistPage/AmendedAddendaTriageTile.tsx
// ─────────────────────────────────────────────────────────────────────────────
// "Amended & Addenda Triage Framework" — high-visibility summary tile
// anchored at the top of the worklist, per spec.
//
// Inclusion criteria (exactly as specified):
//   1. Inbound LIS amendment notices awaiting clinical review.
//   2. Open (draft) amendment records — a real synoptic unlock in progress.
//   3. Open (draft) addendum records — an initialized, un-finalized addendum.
//
// Exit Gate A (clerical): handled elsewhere (SynopticReportPage's Mark
// Reviewed button) — a notice leaving 'pending_review' just means this
// tile's query for it returns nothing next load, no special handling
// needed here.
//
// Exit Gate B (clinical): an open draft keeps a case in this tile
// regardless of anything else — it only leaves once the draft is
// actually released (status flips to 'released' via re-finalize/sign-
// out), same mechanism already built for the real amendment pipeline.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../pathscribe.css';
import { lisAmendmentNoticeService, amendmentService } from '@/services';

interface TriageItem {
  caseId: string;
  kind: 'lis_notice' | 'amendment_draft' | 'addendum_draft';
  label: string;
  detail: string;
}

export const AmendedAddendaTriageTile: React.FC<{ pathologistId: string }> = ({ pathologistId }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<TriageItem[]>([]);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (!pathologistId) return;
    Promise.all([
      lisAmendmentNoticeService.getPendingForPathologist(pathologistId),
      amendmentService.getOpenDraftsForPathologist(pathologistId),
    ]).then(([noticesRes, draftsRes]) => {
      const results: TriageItem[] = [];
      if (noticesRes.ok) {
        for (const n of noticesRes.data) {
          results.push({ caseId: n.caseId, kind: 'lis_notice', label: 'LIS Amendment — Review Required', detail: n.lisAmendmentSummary });
        }
      }
      if (draftsRes.ok) {
        for (const d of draftsRes.data) {
          results.push({
            caseId: d.caseId,
            kind: d.type === 'amendment' ? 'amendment_draft' : 'addendum_draft',
            label: d.type === 'amendment' ? 'Amending Draft — In Progress' : 'Addendum — In Progress',
            detail: d.explanationOfChange || d.addendumTitle || 'Draft not yet released',
          });
        }
      }
      setItems(results);
    });
  }, [pathologistId]);

  if (items.length === 0) return null;

  return (
    <div className="ps-triage-tile">
      <button className="ps-triage-tile-header" onClick={() => setExpanded(v => !v)}>
        <span className="ps-triage-tile-title">⚠ Amended &amp; Addenda Triage ({items.length})</span>
        <span className="ps-triage-tile-toggle">{expanded ? '▾' : '▸'}</span>
      </button>
      {expanded && (
        <div className="ps-triage-tile-body">
          {items.map((item, i) => (
            <button
              key={`${item.caseId}-${item.kind}-${i}`}
              className="ps-triage-tile-row"
              onClick={() => navigate(`/case/${item.caseId}/synoptic`)}
            >
              <span className={`ps-triage-tile-badge ps-triage-tile-badge--${item.kind}`}>
                {item.kind === 'lis_notice' ? 'LIS' : item.kind === 'amendment_draft' ? 'Amending' : 'Addendum'}
              </span>
              <span className="ps-triage-tile-case">{item.caseId}</span>
              <span className="ps-triage-tile-label">{item.label}</span>
              <span className="ps-triage-tile-detail">{item.detail}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
