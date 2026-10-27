// src/pages/CytologyWorklistPage/components/CsmsEligibilityActions.tsx
// Batch 636 (PS-193). The CSMS QA tab's answer to "is she eligible?": one click for Verified; for Not eligible a quick-pick
// reason (no typing) and a second click. Decisions and the permission check are in services/cytology/verifyCsmsEligibility.
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { CSMS_NOT_ELIGIBLE_REASONS, type CsmsEligibilityDecision, type CsmsNotEligibleReason } from '@/services/cytology/csmsEligibility';
import { verifyCsmsEligibility } from '@/services/cytology/verifyCsmsEligibility';
import './CsmsEligibilityActions.css';

const K = 'cytologyWorklist.csms';

interface Props { caseId: string; user: { id?: string; name?: string } | null | undefined; onDone: () => Promise<void> }

const CsmsEligibilityActions: React.FC<Props> = ({ caseId, user, onDone }) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState<CsmsNotEligibleReason | ''>('');
  const [busy, setBusy] = useState(false);

  const record = async (decision: CsmsEligibilityDecision) => {
    if (!user?.id || busy) return;
    setBusy(true);
    const out = await verifyCsmsEligibility({ caseId, decision, actor: { id: user.id, name: user.name ?? user.id } });
    setBusy(false);
    if (out === 'recorded') toast.success(t(decision.kind === 'verified' ? `${K}.recordedVerified` : `${K}.recordedNotEligible`));
    else if (out === 'refused') toast.error(t(`${K}.refused`));
    else toast.error(t(`${K}.problem`));
    await onDone();
  };

  return (
    <span className="ps-csmselig" onClick={e => e.stopPropagation()}>
      <CapabilityButton capability="cytology:csms-eligibility:verify" onClick={() => { void record({ kind: 'verified' }); }} disabled={busy} className="ps-cytoworklist-action-btn--violet">{t(`${K}.verified`)}</CapabilityButton>
      <select className="ps-conf-select ps-csmselig-reason" aria-label={t(`${K}.reasonLabel`)} value={reason} onChange={e => setReason(e.target.value as CsmsNotEligibleReason | '')}>
        <option value="">{t(`${K}.reasonChoose`)}</option>
        {CSMS_NOT_ELIGIBLE_REASONS.map(r => <option key={r} value={r}>{t(`${K}.reasons.${r}`)}</option>)}
      </select>
      <CapabilityButton capability="cytology:csms-eligibility:verify" onClick={() => { if (reason) void record({ kind: 'not_eligible', reason }); }} disabled={busy || !reason} className="ps-cytoworklist-action-btn">{t(`${K}.notEligible`)}</CapabilityButton>
    </span>
  );
};

export default CsmsEligibilityActions;
