// src/utils/aliquotMigration.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 739 (Pete, fluid decision 6): before this batch every protocol-made decant was stored as a cell block,
// including the HPV aliquot (a liquid portion sent for an HPV test, never embedded). This retypes such a decant as
// decantType 'aliquot' with purpose 'hpv'. The demo applies it when it seeds cases (a Full Reset); the API server's
// data migration applies the same rule to stored cases (docs/architecture/CASE_WORKFLOWS_API.md). Pure.
//
// The rule: a 'cell_block' decant that has slides and whose slides are all HPV tests (their stain name starts with
// "HPV"). A real cell block always has an H&E or another section, so it is never caught.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import type { Decant } from '@/types/case/Material';

export function isLegacyHpvAliquot(d: Pick<Decant, 'decantType' | 'stains'>): boolean {
  const stains = d.stains ?? [];
  return d.decantType === 'cell_block' && stains.length > 0 && stains.every(s => /^HPV\b/i.test(s.stainName ?? ''));
}

/** The case with its legacy HPV aliquots retyped; the same object when there is nothing to change. */
export function migrateLegacyHpvAliquots<C extends Pick<Case, 'specimens'>>(c: C): C {
  let changed = false;
  const specimens = (c.specimens ?? []).map(sp => {
    const decants = (sp as { decants?: Decant[] }).decants;
    if (!decants?.some(isLegacyHpvAliquot)) return sp;
    changed = true;
    return { ...sp, decants: decants.map(d => (isLegacyHpvAliquot(d) ? { ...d, decantType: 'aliquot' as const, aliquotPurpose: 'hpv' as const, cassetteColorId: undefined } : d)) };
  });
  return changed ? { ...c, specimens } : c;
}
