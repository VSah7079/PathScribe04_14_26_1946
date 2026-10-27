// src/pages/CytologyWorklistPage/hooks/useManualHpvResult.ts
// Batch 630: the worklist's manual hrHPV entry. Pick Positive/Negative on a row -> the dialog asks for the Result Source ->
// recordManualHpvResult (permission, audit, second sign-off when it would replace an interface result). Approve/Reject
// decide a waiting entry.
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import type { Case } from '@/types/case/Case';
import type { Specimen } from '@/types/case/Specimen';
import { decideManualHpvOverride, recordManualHpvResult } from '@/services/cytology/recordManualHpvResult';
import { holdsInterfaceResult } from '@/services/cytology/manualHpvResult';

const K = 'cytologyWorklist.manualHpv';

/** The GYN specimen a row's hrHPV result belongs to (the first with a dictionary entry, as the row's own result does). */
export function hpvSpecimenOf(c: Case): Specimen | undefined {
  return ((c.specimens ?? []) as Specimen[]).find(sp => sp.specimenDictionaryEntryId);
}

export function useManualHpvResult(user: { id?: string; name?: string } | null | undefined, reload: () => Promise<void>) {
  const { t } = useTranslation();
  const [pick, setPick] = useState<{ c: Case; result: 'Positive' | 'Negative' } | null>(null);
  const actor = user?.id ? { id: user.id, name: user.name ?? user.id } : null;

  const replacing = (() => {
    if (!pick) return null;
    const screening = hpvSpecimenOf(pick.c)?.cytologyScreening;
    if (!holdsInterfaceResult(screening)) return null;
    return t(`${K}.result${screening?.hpvResult}`, { defaultValue: String(screening?.hpvResult) });
  })();

  const confirm = useCallback(async (source: string) => {
    const current = pick; setPick(null);
    const specimen = current && hpvSpecimenOf(current.c);
    if (!current || !specimen || !actor) return;
    const out = await recordManualHpvResult({ caseId: current.c.id, specimenLetter: specimen.label, result: current.result, source, actor });
    if (out.outcome === 'recorded') toast.success(t(`${K}.recorded`));
    else if (out.outcome === 'pending-second-signoff') toast.info(t(`${K}.pendingSecondSignoff`));
    else if (out.outcome === 'refused') toast.error(t(`${K}.refused`));
    else if (out.outcome === 'already-pending') toast.warning(t(`${K}.alreadyPending`));
    else toast.error(t(`${K}.problem`));
    await reload();
  }, [pick, actor, reload, t]);

  const decide = useCallback(async (c: Case, decision: 'approved' | 'rejected') => {
    const specimen = hpvSpecimenOf(c);
    if (!specimen || !actor) return;
    const out = await decideManualHpvOverride({ caseId: c.id, specimenLetter: specimen.label, decision, actor });
    if (out.outcome === 'approved' || out.outcome === 'rejected') toast.success(t(`${K}.${out.outcome}`));
    else if (out.outcome === 'same-user') toast.warning(t(`${K}.sameUser`));
    else if (out.outcome === 'refused') toast.error(t(`${K}.refused`));
    else toast.error(t(`${K}.problem`));
    await reload();
  }, [actor, reload, t]);

  return { pick, replacing, choose: (c: Case, result: 'Positive' | 'Negative') => setPick({ c, result }), cancel: () => setPick(null), confirm, decide };
}
