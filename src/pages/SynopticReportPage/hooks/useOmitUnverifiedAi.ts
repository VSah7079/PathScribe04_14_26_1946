// src/pages/SynopticReportPage/hooks/useOmitUnverifiedAi.ts
// ─────────────────────────────────────────────────
// Batch 691: before the sign-out dialog opens, optional AI values nobody confirmed are cleared from the
// working draft so they cannot reach the signed report (services/aiGovernance/omitUnverifiedAi.ts).
// The AI suggestion stays, so the pathologist can cancel and Confirm to bring a value back. Verification is
// read from the store: the panel saves it there directly, so the stored copy is the current one.
// Returns how many fields were left out (0 when there was nothing to do).
// ─────────────────────────────────────────────────
import { useCallback } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { Case } from '@/types/case/Case';
import { caseRouter } from '@/services/cases/CaseRouter';
import { getTemplate } from '@/services/templates/templateService';
import { auditService } from '@/services';
import { unverifiedAiOmissions, withoutOmitted, rememberOmissions, recordAiOmittedAtGross } from '@/services/aiGovernance/omitUnverifiedAi';

interface Deps {
  caseDataRef: MutableRefObject<Case | null>;
  setCaseData: Dispatch<SetStateAction<Case | null>>;
  panelRef: MutableRefObject<{ omitFields(ids: string[]): void } | null>;
  activeReportInstanceId: string;
  markDirty: (section: 'synopticFields') => void;
  userName?: string;
}

const KEYS = ['synopticReports', 'grossingReports'] as const; // Batch 692: grossing reports follow the same rule

export function useOmitUnverifiedAi({ caseDataRef, setCaseData, panelRef, activeReportInstanceId, markDirty, userName }: Deps) {
  /** `stage: 'gross'` is the PA's Gross Complete: audited at once and not repeated at sign-out. */
  return useCallback(async (stage: 'signout' | 'gross' = 'signout'): Promise<number> => {
    const c = caseDataRef.current;
    const all = KEYS.flatMap(k => (c?.[k] ?? []) as { instanceId: string; templateId: string; aiSuggestions?: unknown }[]);
    if (!c || all.length === 0) return 0;
    const fresh = await Promise.resolve().then(() => caseRouter.getCase(c.id)).catch(() => undefined);
    const stored = new Map(KEYS.flatMap(k => (fresh?.[k] ?? []) as { instanceId: string; aiSuggestions?: unknown }[]).map(r => [r.instanceId, r.aiSuggestions]));
    const required = new Map<string, Set<string>>();
    for (const r of all) {
      if (required.has(r.templateId)) continue;
      const detail = await getTemplate(r.templateId).catch(() => null);
      required.set(r.templateId, new Set((detail?.template.sections ?? []).flatMap(s => s.fields).filter(f => f.required).map(f => f.id)));
    }
    const omissions = unverifiedAiOmissions(all as never, r => (stored.get(r.instanceId) ?? r.aiSuggestions) as never, r => required.get(r.templateId ?? '') ?? new Set());
    if (omissions.length === 0) return 0;
    if (stage === 'gross') recordAiOmittedAtGross(auditService, c.id, omissions.length, userName ?? ''); else rememberOmissions(c.id, omissions);
    setCaseData(prev => (prev ? { ...prev, ...Object.fromEntries(KEYS.filter(k => prev[k]).map(k => [k, withoutOmitted(prev[k] as never, omissions)])) } as typeof prev : prev));
    panelRef.current?.omitFields(omissions.filter(o => o.instanceId === activeReportInstanceId).map(o => o.fieldId));
    markDirty('synopticFields');
    await new Promise(resolve => setTimeout(resolve, 0)); // let the page and panel render the cleared answers before the dialog opens
    return omissions.length;
  }, [caseDataRef, setCaseData, panelRef, activeReportInstanceId, markDirty, userName]);
}
