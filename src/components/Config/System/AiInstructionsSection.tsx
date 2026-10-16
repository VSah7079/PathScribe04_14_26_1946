// src/components/Config/System/AiInstructionsSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 536 (PS-554): Configuration → System → AI Instructions. The
// instructions the clinical mismatch check gives the AI, per discipline,
// governed like a protocol:
//   - "In use": the approved version the check uses;
//   - "Awaiting approval": an edited version, approved or rejected (with a
//     reason) by someone holding config:ai-prompt:approve who didn't edit it;
//   - "Edit": saves a new version, pending; the check doesn't use it yet;
//   - "Test": runs the AI on a sample case with the text in the editor, so the
//     approver can see what it does before approving;
//   - the history of every version.
// The rules and checks are in services/clinical/aiInstructions.ts and
// aiInstructionService.ts; each action is checked and audited there.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  aiInstructionService, AI_INSTRUCTION_DISCIPLINES, MAX_AI_INSTRUCTION_LENGTH,
  type AiInstructionDiscipline, type AiInstructionsView, type AiInstructionTestResult, type AiInstructionVersion,
} from '@/services';
import { AI_INSTRUCTION_SAMPLES } from '@/services/clinical/aiInstructionSamples';
import type { ClinicalMismatchInput } from '@/services/clinical/detectClinicalPathologicMismatch';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { useAuth } from '@/contexts/AuthContext';
import { formatDateTime } from '@/utils/formatDate';
import '@/pathscribe.css';

const K = 'aiInstructionsSection';

const AiInstructionsSection: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [views, setViews] = useState<AiInstructionsView[] | null>(null);
  const [refused, setRefused] = useState(false);
  const [discipline, setDiscipline] = useState<AiInstructionDiscipline>('surgical');
  const [drafts, setDrafts] = useState<Partial<Record<AiInstructionDiscipline, string>>>({});
  const [rejectReason, setRejectReason] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [samples, setSamples] = useState<Record<AiInstructionDiscipline, ClinicalMismatchInput>>({ ...AI_INSTRUCTION_SAMPLES });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<AiInstructionTestResult | null>(null);

  const load = useCallback(async () => {
    const res = await aiInstructionService.list();
    if (res.ok) setViews(res.data); else setRefused(true);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const after = (res: { ok: boolean; data?: AiInstructionsView[]; error?: string }, success: string) => {
    if (res.ok && res.data) {
      setViews(res.data); setProblem(null); setNotice(success);
      setTimeout(() => setNotice(null), 2500);
      return true;
    }
    setProblem(res.error ?? 'error');
    return false;
  };

  if (refused) {
    return (
      <div>
        <div className="ps-rbuf-header"><h2 className="ps-rbuf-title">{t(`${K}.title`)}</h2></div>
        <p className="ps-conf-field-hint" role="status">{t(`${K}.notPermitted`)}</p>
      </div>
    );
  }
  if (!views) return null;

  const view = views.find(v => v.discipline === discipline)!;
  const draft = drafts[discipline] ?? (view.pending ?? view.approved).text;
  const pending = view.pending;
  const youEdited = !!pending && !!user?.id && pending.editors.includes(user.id);
  const sample = samples[discipline];
  const setSample = (patch: Partial<ClinicalMismatchInput>) => setSamples(s => ({ ...s, [discipline]: { ...s[discipline], ...patch } }));
  const when = (iso?: string) => (iso ? formatDateTime(iso, i18n.language) : '');

  const saveDraft = async () => {
    const res = await aiInstructionService.saveDraft(discipline, draft);
    if (after(res, t(`${K}.saved`))) setDrafts(d => { const { [discipline]: _gone, ...rest } = d; return rest; });
  };
  const approve = async () => { if (pending) after(await aiInstructionService.approve(pending.id), t(`${K}.approved`)); };
  const reject = async () => {
    if (!pending) return;
    if (after(await aiInstructionService.reject(pending.id, rejectReason), t(`${K}.rejected`))) setRejectReason('');
  };
  const runTest = async () => {
    setTesting(true); setTestResult(null);
    const res = await aiInstructionService.test(discipline, draft, sample);
    setTesting(false);
    if (res.ok) setTestResult(res.data); else setProblem(res.error);
  };

  const versionLine = (v: AiInstructionVersion) => t(`${K}.history.line`, {
    version: v.version, status: t(`${K}.status.${v.status}`), editor: v.editedBy.userName, edited: when(v.editedAt),
  });

  return (
    <div>
      <div className="ps-rbuf-header">
        <h2 className="ps-rbuf-title">{t(`${K}.title`)}</h2>
        <p className="ps-rbuf-subtitle">{t(`${K}.subtitle`)}</p>
      </div>

      <div className="ps-aiinstr-tabs" role="tablist" aria-label={t(`${K}.disciplineAria`)}>
        {AI_INSTRUCTION_DISCIPLINES.map(d => (
          <button key={d} type="button" role="tab" data-config-nav aria-selected={d === discipline}
            className={`ps-aiinstr-tab${d === discipline ? ' ps-aiinstr-tab--active' : ''}`}
            onClick={() => { setDiscipline(d); setTestResult(null); setProblem(null); }}>
            {t(`${K}.disciplines.${d}`)}
            {views.find(v => v.discipline === d)?.pending && <span className="ps-aiinstr-pending-dot" aria-label={t(`${K}.pendingBadge`)}>●</span>}
          </button>
        ))}
      </div>

      <div className="ps-conf-card ps-conf-card--spaced">
        <div className="ps-conf-card-title">{t(`${K}.inUse.title`, { version: view.approved.version })}</div>
        <p className="ps-conf-card-description--tight">
          {view.approved.version === 0
            ? t(`${K}.inUse.builtIn`)
            : t(`${K}.inUse.approvedBy`, { name: view.approved.approvedBy?.userName ?? '', date: when(view.approved.approvedAt) })}
        </p>
        <pre className="ps-aiinstr-text">{view.approved.text}</pre>
      </div>

      {pending && (
        <div className="ps-conf-card ps-conf-card--spaced ps-aiinstr-pending">
          <div className="ps-conf-card-title">{t(`${K}.pending.title`, { version: pending.version })}</div>
          <p className="ps-conf-card-description--tight">{t(`${K}.pending.editedBy`, { name: pending.editedBy.userName, date: when(pending.editedAt) })}</p>
          <pre className="ps-aiinstr-text">{pending.text}</pre>
          {youEdited && <p className="ps-conf-field-hint" role="note">{t(`${K}.pending.youEdited`)}</p>}
          <div className="ps-aiinstr-actions">
            <CapabilityButton capability="config:ai-prompt:approve" className="ps-conf-btn-primary" disabled={youEdited} onClick={() => { void approve(); }}>
              {t(`${K}.pending.approve`)}
            </CapabilityButton>
            <input type="text" className="ps-conf-input ps-aiinstr-reason" value={rejectReason}
              aria-label={t(`${K}.pending.reasonLabel`)} placeholder={t(`${K}.pending.reasonPlaceholder`)}
              onChange={e => setRejectReason(e.target.value)} />
            <CapabilityButton capability="config:ai-prompt:approve" className="ps-conf-btn-secondary" disabled={!rejectReason.trim()} onClick={() => { void reject(); }}>
              {t(`${K}.pending.reject`)}
            </CapabilityButton>
          </div>
        </div>
      )}

      <div className="ps-conf-card ps-conf-card--spaced">
        <div className="ps-conf-card-title">{t(`${K}.edit.title`)}</div>
        <p className="ps-conf-card-description--tight">{t(`${K}.edit.description`)}</p>
        <textarea className="ps-conf-input ps-aiinstr-editor" rows={12} maxLength={MAX_AI_INSTRUCTION_LENGTH}
          aria-label={t(`${K}.edit.label`)} value={draft}
          onChange={e => setDrafts(d => ({ ...d, [discipline]: e.target.value }))} />
        <div className="ps-aiinstr-actions">
          <CapabilityButton capability="config:ai-prompt:edit" className="ps-conf-btn-primary" onClick={() => { void saveDraft(); }}>
            {t(`${K}.edit.save`)}
          </CapabilityButton>
          <span className="ps-conf-field-hint">{t(`${K}.edit.count`, { length: draft.length, max: MAX_AI_INSTRUCTION_LENGTH })}</span>
        </div>
      </div>

      <div className="ps-conf-card ps-conf-card--spaced">
        <div className="ps-conf-card-title">{t(`${K}.test.title`)}</div>
        <p className="ps-conf-card-description--tight">{t(`${K}.test.description`)}</p>
        <div className="ps-aiinstr-sample">
          <label className="ps-conf-label">{t(`${K}.test.indication`)}
            <textarea className="ps-conf-input" rows={2} value={sample.clinicalIndication} onChange={e => setSample({ clinicalIndication: e.target.value })} />
          </label>
          <label className="ps-conf-label">{t(`${K}.test.history`)}
            <textarea className="ps-conf-input" rows={2} value={sample.clinicalHistory} onChange={e => setSample({ clinicalHistory: e.target.value })} />
          </label>
          <label className="ps-conf-label">{t(`${K}.test.findings`)}
            <textarea className="ps-conf-input" rows={2} value={sample.microscopic} onChange={e => setSample({ microscopic: e.target.value })} />
          </label>
          <label className="ps-conf-label">{t(`${K}.test.diagnosis`)}
            <textarea className="ps-conf-input" rows={2} value={sample.diagnosis} onChange={e => setSample({ diagnosis: e.target.value })} />
          </label>
          <label className="ps-conf-toggle-label-row">
            <input type="checkbox" checked={sample.malignantNow} onChange={e => setSample({ malignantNow: e.target.checked })} />
            <span className="ps-conf-option-text">{t(`${K}.test.malignant`)}</span>
          </label>
        </div>
        <div className="ps-aiinstr-actions">
          <button type="button" className="ps-conf-btn-secondary" disabled={testing} onClick={() => { void runTest(); }}>
            {testing ? t(`${K}.test.running`) : t(`${K}.test.run`)}
          </button>
        </div>
        {testResult && (
          <p className="ps-aiinstr-result" role="status">
            {testResult.outcome === 'mismatch'
              ? t(`${K}.test.result.mismatch`, { kind: t(`clinicalMismatch.kinds.${testResult.suggestion.kind}`), confidence: testResult.suggestion.confidence, explanation: testResult.suggestion.explanation ?? '' })
              : testResult.outcome === 'unavailable'
                ? t(`${K}.test.result.unavailable`, { message: testResult.message })
                : t(`${K}.test.result.${testResult.outcome}`)}
          </p>
        )}
      </div>

      <div className="ps-conf-card ps-conf-card--spaced">
        <div className="ps-conf-card-title">{t(`${K}.history.title`)}</div>
        <ul className="ps-aiinstr-history">
          {view.history.map(v => (
            <li key={v.id}>
              {versionLine(v)}
              {v.approvedBy && v.version > 0 && <> {t(`${K}.history.approved`, { name: v.approvedBy.userName, date: when(v.approvedAt) })}</>}
              {v.rejectedBy && <> {t(`${K}.history.rejected`, { name: v.rejectedBy.userName, date: when(v.rejectedAt), reason: v.rejectionReason ?? '' })}</>}
            </li>
          ))}
        </ul>
      </div>

      {problem && <p className="ps-mmrules-problem" role="alert">{t(`${K}.problems.${problem}`, { defaultValue: t(`${K}.problems.error`) })}</p>}
      {notice && <div className="ps-concordance__saved">✓ {notice}</div>}
    </div>
  );
};

export default AiInstructionsSection;
