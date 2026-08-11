// src/pages/SynopticReportPage/components/InformalReviewBanner.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Real fix: DelegationRecord.status includes 'completed' as a valid
// lifecycle value, but nothing anywhere in this codebase ever actually
// transitioned a delegation there - every one ever created stayed
// 'pending' forever. That silently broke WorklistPage.tsx's existing
// "Delegated to Me" count (it could only ever grow), and meant
// CONSULTATION_RESPONSE/CONSULTATION_AWAITING TAT calculation
// (components/Contribution/qualityCalculations.ts) had no real
// completion signal to measure against.
//
// This banner is the real, minimal UI closing that gap: when the
// current user has a genuinely pending 'CASUAL_REVIEW' (informal
// review) delegation for this specific case, shows who asked and lets
// them mark it done — the moment they'd naturally be looking at the
// case anyway, not a separate inbox screen.
//
// Deliberately scoped to CASUAL_REVIEW only, per the real distinction
// this app's own delegation-type dictionary already draws between
// 'CASUAL_REVIEW' ("Informal Review") and 'SECOND_OPINION' (the more
// formal path) — see services/delegationTypes/mockDelegationTypeService.ts.
//
// No dedicated banner CSS exists for this yet (checked directly against
// pathscribe.css rather than assume) - uses inline styles for the
// container to avoid introducing new global classes for one banner, and
// the real, verified ps-btn-secondary class (single hyphen - not
// ps-btn--secondary) for the button, matching this codebase's actual
// button-class convention.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback } from 'react';
import { getDelegations, completeDelegation, type DelegationRecord } from '@/services/cases/mockCaseService';
import { getSessionUser } from '@/services/auth/caseAccessControl';
import { userService } from '@/services';

interface InformalReviewBannerProps {
  caseId?: string;
}

export const InformalReviewBanner: React.FC<InformalReviewBannerProps> = ({ caseId }) => {
  const [pending, setPending]             = useState<DelegationRecord | null>(null);
  const [requestorName, setRequestorName] = useState<string>('');
  const [completing, setCompleting]       = useState(false);

  const load = useCallback(() => {
    if (!caseId) { setPending(null); return; }
    const user = getSessionUser();
    if (!user) { setPending(null); return; }
    getDelegations(caseId).then(all => {
      const mine = all.find(d =>
        d.delegationType === 'CASUAL_REVIEW' && d.toUserId === user.id && d.status === 'pending'
      );
      setPending(mine ?? null);
      if (mine) {
        userService.getById(mine.fromUserId).then(res => {
          setRequestorName(res.ok ? `${res.data.firstName} ${res.data.lastName}` : mine.fromUserId);
        }).catch(() => setRequestorName(mine.fromUserId));
      }
    }).catch(() => setPending(null));
  }, [caseId]);

  useEffect(() => { load(); }, [load]);

  if (!pending) return null;

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await completeDelegation(pending.id);
      setPending(null);
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
      padding: '10px 14px', margin: '0 0 12px', borderRadius: '6px',
      background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.25)',
      color: '#e2e8f0', fontSize: '13px',
    }}>
      <span>
        📋 Informal review requested by <strong>{requestorName || pending.fromUserId}</strong>
        {pending.note ? <>: <em>{pending.note}</em></> : null}
      </span>
      <button className="ps-btn-secondary" disabled={completing} onClick={handleComplete}>
        {completing ? 'Marking complete…' : 'Mark Review Complete'}
      </button>
    </div>
  );
};
