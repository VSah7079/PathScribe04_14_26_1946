/**
 * codeManagerCoding.ts — the Code Manager (AddCodeModal) save and reopen
 * decisions, moved out of SynopticReportPage.tsx (PS-141, Batch 450).
 *
 * resolveCodeManagerSave: the modal hands back its FULL resolved set of
 * active codes (not just additions). Each ICD-10 / SNOMED / ICD-O code that
 * carries a specimenId is kept on that specimen (Specimen.coding.*); ICD-10
 * and SNOMED codes with no specimenId stay case-level (Case.coding). CPT is
 * per-specimen only, and its per-specimen diff against the stored list is
 * count-based (two identical base codes, one removed, is a real removal).
 *
 * buildCodeManagerExistingCodes: what the modal shows on reopen — case-level
 * ICD-10/SNOMED, plus each specimen's CPT, ICD-10, SNOMED and ICD-O tagged with
 * that specimen's id. Specimen ICD-10/SNOMED ids include the array index so the
 * same code applied twice to one specimen never collides.
 *
 * Pure: no services, no state, inputs never mutated.
 */

export interface CodeManagerCode {
  system: string;
  code: string;
  display: string;
  specimenId?: string | null;
}

export interface CodedEntry { code: string; description: string }

export interface CodeManagerSpecimen {
  id: string;
  coding?: {
    cpt?: string[];
    icd10?: CodedEntry[];
    snomed?: CodedEntry[];
    icdO?: CodedEntry[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface CodeManagerSaveResult<S extends CodeManagerSpecimen> {
  /** Case-level coding: only codes with no specimenId. */
  newCoding: { icd10: CodeManagerCode[]; snomed: CodeManagerCode[] };
  updatedSpecimens: S[];
  /** CPT codes newly added per specimen id (need a charge). */
  additionsBySpecimen: Map<string, string[]>;
  /** CPT codes removed per specimen id (need a credit). */
  removalsBySpecimen: Map<string, string[]>;
}

function groupBySpecimen(codes: CodeManagerCode[], system: string): Map<string, CodedEntry[]> {
  const out = new Map<string, CodedEntry[]>();
  codes.filter(c => c.system === system && c.specimenId).forEach(c => {
    const specId = c.specimenId as string;
    if (!out.has(specId)) out.set(specId, []);
    out.get(specId)!.push({ code: c.code, description: c.display });
  });
  return out;
}

export function resolveCodeManagerSave<S extends CodeManagerSpecimen>(
  codes: CodeManagerCode[],
  specimens: S[],
): CodeManagerSaveResult<S> {
  const newIcd    = codes.filter(c => c.system === 'ICD' && !c.specimenId);
  const newSnomed = codes.filter(c => c.system === 'SNOMED' && !c.specimenId);
  const newIcd10BySpecimenId  = groupBySpecimen(codes, 'ICD');
  const newSnomedBySpecimenId = groupBySpecimen(codes, 'SNOMED');
  // A case-wide (no specimenId) ICD-O code is deliberately not supported.
  const newIcdOBySpecimenId   = groupBySpecimen(codes, 'ICD-O');

  const newCptBySpecimenId = new Map<string, string[]>();
  codes.filter(c => c.system === 'CPT').forEach(c => {
    const specId = c.specimenId;
    if (!specId) return; // a CPT code with no specimen target isn't meaningful to apply
    if (!newCptBySpecimenId.has(specId)) newCptBySpecimenId.set(specId, []);
    newCptBySpecimenId.get(specId)!.push(c.code);
  });

  const additionsBySpecimen = new Map<string, string[]>();
  const removalsBySpecimen  = new Map<string, string[]>();
  const updatedSpecimens = specimens.map((sp) => {
    // A specimen has a change when the resolved set includes entries for
    // it, OR it previously had entries that are now all gone (must clear).
    const hasIcd10Change  = newIcd10BySpecimenId.has(sp.id)  || (sp.coding?.icd10 ?? []).length > 0;
    const hasSnomedChange = newSnomedBySpecimenId.has(sp.id) || (sp.coding?.snomed ?? []).length > 0;
    const hasIcdOChange   = newIcdOBySpecimenId.has(sp.id)   || (sp.coding?.icdO ?? []).length > 0;
    if (!newCptBySpecimenId.has(sp.id) && !hasIcd10Change && !hasSnomedChange && !hasIcdOChange && !(sp.coding?.cpt ?? []).length) return sp;
    const oldList = [...(sp.coding?.cpt ?? [])];
    const newList = [...(newCptBySpecimenId.get(sp.id) ?? [])];
    const remaining = [...oldList];
    const added: string[] = [];
    for (const code of newList) {
      const idx = remaining.indexOf(code);
      if (idx !== -1) remaining.splice(idx, 1); // already existed - not an addition
      else added.push(code);
    }
    if (added.length) additionsBySpecimen.set(sp.id, added);
    if (remaining.length) removalsBySpecimen.set(sp.id, remaining);
    return {
      ...sp,
      coding: {
        ...(sp.coding ?? {}),
        cpt: newList,
        icd10:  hasIcd10Change  ? newIcd10BySpecimenId.get(sp.id)  : sp.coding?.icd10,
        snomed: hasSnomedChange ? newSnomedBySpecimenId.get(sp.id) : sp.coding?.snomed,
        icdO:   hasIcdOChange   ? newIcdOBySpecimenId.get(sp.id)   : sp.coding?.icdO,
      },
    };
  });

  return { newCoding: { icd10: newIcd, snomed: newSnomed }, updatedSpecimens, additionsBySpecimen, removalsBySpecimen };
}

export interface CodeManagerExistingCode {
  id?: string;
  system: string;
  code: string;
  display: string;
  source?: string;
  specimenId?: string;
  [key: string]: unknown;
}

export function buildCodeManagerExistingCodes(
  caseCoding: { icd10?: unknown[]; snomed?: unknown[] } | undefined,
  specimens: CodeManagerSpecimen[],
): CodeManagerExistingCode[] {
  return [
    ...((caseCoding?.icd10 ?? []) as CodeManagerExistingCode[]),
    ...((caseCoding?.snomed ?? []) as CodeManagerExistingCode[]),
    ...specimens.flatMap(sp =>
      (sp.coding?.cpt ?? []).map(code => ({
        id: `cpt-${sp.id}-${code}`, system: 'CPT', code, display: code, source: 'manual', specimenId: sp.id,
      })),
    ),
    // Index-inclusive ids: the same concept can legitimately appear more
    // than once for one specimen and must never collide.
    ...specimens.flatMap(sp =>
      (sp.coding?.icd10 ?? []).map((dx, i) => ({
        id: `icd10-${sp.id}-${i}-${dx.code}`, system: 'ICD', code: dx.code, display: dx.description, source: 'manual', specimenId: sp.id,
      })),
    ),
    ...specimens.flatMap(sp =>
      (sp.coding?.snomed ?? []).map((dx, i) => ({
        id: `snomed-${sp.id}-${i}-${dx.code}`, system: 'SNOMED', code: dx.code, display: dx.description, source: 'manual', specimenId: sp.id,
      })),
    ),
    // Batch 450: a specimen's ICD-O codes too. Without them the modal opened
    // without its ICD-O codes, and the save (which takes the modal's full set)
    // treated them as removed, so every save erased them.
    ...specimens.flatMap(sp =>
      (sp.coding?.icdO ?? []).map((dx, i) => ({
        id: `icdo-${sp.id}-${i}-${dx.code}`, system: 'ICD-O', code: dx.code, display: dx.description, source: 'manual', specimenId: sp.id,
      })),
    ),
  ];
}
