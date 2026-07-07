// src/services/cases/caseFilterUtils.ts
// ─────────────────────────────────────────────────────────────
// Shared case-filtering pipeline.
//
// Extracted verbatim from mockCaseService.ts's getAll() so that
// mockOrchestratorCaseService.ts's getAll() can apply the exact same
// filters instead of a thinner, separately-maintained copy. Both
// mockCaseService.getAll() and mockOrchestratorCaseService.getAll() now
// call applyCaseFilters() — one filter pipeline, not two that will
// inevitably drift (the same class of bug this codebase has hit
// repeatedly: IAIProvider/aiProviderService, protocolRegistry/
// protocolShared, the reportingMode type mismatch, etc.).
//
// Deliberately pure: takes a Case[] and params, returns a filtered
// Case[]. No side effects, no delay(), no CASES-reseed logic — those
// stay local to each service's own getAll(), since they're specific to
// how each service manages its own store.
// ─────────────────────────────────────────────────────────────

import type { Case } from '../../types/case/Case';
import type { CaseFilterParams } from './ICaseService';

const ALL_CLIENTS_MAP: Record<string, string> = {
  'c1': 'Metro General', 'c2': 'Riverside', 'c3': 'Westside', 'c4': 'Bayview',
  'c5': 'Catherine',     'c6': 'Manchester', 'c7': 'Midwest',  'c8': 'Henry Ford',
};

export function applyCaseFilters(cases: Case[], params?: CaseFilterParams): Case[] {
  let results = [...cases];

  // ── Worklist-style filters ─────────────────────────────────────────────
  if ((params as any)?.status) {
    const statuses = Array.isArray((params as any).status) ? (params as any).status : [(params as any).status];
    results = results.filter(c => statuses.includes((c as any).status));
  }
  if (params?.search) {
    const q = params.search.toLowerCase();
    results = results.filter(c =>
      c.accession?.fullAccession?.toLowerCase().includes(q) ||
      `${c.patient?.firstName} ${c.patient?.lastName}`.toLowerCase().includes(q)
    );
  }
  if ((params as any)?.specialty) {
    results = results.filter(c => (c as any).specialty === (params as any).specialty);
  }

  // ── SearchPage CaseFilterParams ────────────────────────────────────────
  if (params?.statusList?.length) {
    const sl = (params.statusList as string[]).map((s: string) => s.toLowerCase());
    results = results.filter(c => sl.includes(((c as any).status ?? '').toLowerCase()));
  }
  if ((params as any)?.priorityList?.length) {
    const pl = ((params as any).priorityList as string[]).map((s: string) => s.toLowerCase());
    results = results.filter(c => {
      const priority = ((c as any).priority ?? 'routine').toLowerCase();
      return pl.some((p: string) => priority.includes(p.toLowerCase()));
    });
  }
  if (params?.dateFrom || params?.dateTo) {
    const from = params?.dateFrom ? new Date(params.dateFrom as string).getTime() : 0;
    const to   = params?.dateTo   ? new Date(params.dateTo as string).getTime() + 86400000 : Infinity;
    results = results.filter(c => {
      // Use first specimen receivedAt as the case accession date
      const specimens = (c as any).specimens ?? [];
      const raw = specimens[0]?.receivedAt ?? specimens[0]?.collectedAt ?? (c as any).createdAt ?? '';
      const d = raw ? new Date(raw).getTime() : NaN;
      if (isNaN(d)) return true; // don't exclude cases with no date
      return d >= from && d <= to;
    });
  }
  if ((params as any)?.patientName) {
    const q = ((params as any).patientName as string).toLowerCase();
    results = results.filter(c =>
      `${c.patient?.firstName} ${c.patient?.lastName}`.toLowerCase().includes(q)
    );
  }
  if ((params as any)?.accessionNo) {
    const q = ((params as any).accessionNo as string).toLowerCase();
    results = results.filter(c =>
      c.accession?.fullAccession?.toLowerCase().includes(q)
    );
  }
  if ((params as any)?.genderList?.length) {
    // Normalise both sides so 'M'|'male'|'Male' all resolve to 'male', etc.
    // Case data stores single-letter codes ('M','F'); SearchPage sends full words ('Male','Female').
    const toFull = (s: string): string => {
      const l = s.toLowerCase();
      if (l === 'm' || l === 'male')       return 'male';
      if (l === 'f' || l === 'female')     return 'female';
      if (l === 'x' || l === 'non-binary') return 'non-binary';
      if (l === 'u' || l === 'unknown')    return 'unknown';
      if (l === 'o' || l === 'other')      return 'other';
      return l;
    };
    const gl = ((params as any).genderList as string[]).map(toFull);
    // Use c.patient.sex (the actual field) — NOT c.patient.gender (does not exist)
    results = results.filter(c => gl.includes(toFull(c.patient?.sex ?? '')));
  }

  // Age range — no stored 'age' field; compute from patient.dateOfBirth at query time
  if ((params as any)?.ageMin !== undefined || (params as any)?.ageMax !== undefined) {
    const minAge = (params as any).ageMin ?? 0;
    const maxAge = (params as any).ageMax ?? 150;
    const now = new Date();
    results = results.filter(c => {
      const dob = c.patient?.dateOfBirth;
      if (!dob) return true; // don't exclude cases with no DOB on record
      const birth = new Date(dob);
      const age =
        now.getFullYear() - birth.getFullYear() -
        (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0);
      return age >= minAge && age <= maxAge;
    });
  }

  // DOB date range (separate from accession dateFrom/dateTo)
  if ((params as any)?.dobFrom || (params as any)?.dobTo) {
    const from = (params as any).dobFrom ? new Date((params as any).dobFrom as string).getTime() : 0;
    const to   = (params as any).dobTo   ? new Date((params as any).dobTo   as string).getTime() + 86_400_000 : Infinity;
    results = results.filter(c => {
      const dob = c.patient?.dateOfBirth;
      if (!dob) return true;
      const d = new Date(dob).getTime();
      return !isNaN(d) && d >= from && d <= to;
    });
  }
  if (params?.specimenList?.length) {
    const sl = params.specimenList as string[];
    results = results.filter(c =>
      (c.specimens ?? []).some((sp: any) =>
        sl.some((s: string) => (sp.description ?? sp.label ?? '').toLowerCase().includes(s.toLowerCase()))
      )
    );
  }
  if (params?.diagnosisList?.length) {
    const dl = params.diagnosisList as string[];
    results = results.filter(c =>
      dl.some((d: string) =>
        ((c as any).diagnosis ?? '').toLowerCase().includes(d.toLowerCase()) ||
        ((c as any).microscopicDescription ?? '').toLowerCase().includes(d.toLowerCase())
      )
    );
  }
  if (params?.pathologistIds?.length) {
    const ids = params.pathologistIds as string[];
    results = results.filter(c => ids.includes(c.order?.assignedTo ?? ''));
  }
  if (params?.synopticProtocolIds?.length) {
    // SearchPage passes resolved templateIds (e.g. 'breast_invasive'), not the UI p01 keys.
    // Match against synopticReports[].templateId — specimens never had a synopticTemplateId field.
    const ids = (params.synopticProtocolIds as string[]).map((s: string) => s.toLowerCase());
    results = results.filter(c =>
      ((c as any).synopticReports ?? []).some((sr: any) => {
        const t = (sr.templateId ?? '').toLowerCase();
        // Exact match OR common-prefix match (lung_adeno ↔ lung_resection, melanoma_resection ↔ skin_melanoma_bx)
        return ids.some((id: string) => t === id || t.startsWith(id.replace(/_[^_]+$/, '_')));
      })
    );
  }
  if (params?.flagIds?.length) {
    // SearchPage sends flag display names (e.g. 'STAT — Rush Processing'), not ID keys.
    const search = (params.flagIds as string[]).map((s: string) => s.toLowerCase());
    results = results.filter(c =>
      ((c as any).caseFlags ?? []).some((f: any) =>
        search.some((s: string) =>
          (f.name ?? '').toLowerCase().includes(s) || s.includes((f.name ?? '').toLowerCase())
        )
      )
    );
  }

  if (params?.clientIds?.length) {
    const ids = params.clientIds as string[];
    results = results.filter(c =>
      ids.includes((c as any).order?.clientId ?? '') ||
      ids.some((id: string) => (c as any).order?.clientName?.toLowerCase().includes(
        ALL_CLIENTS_MAP[id]?.toLowerCase() ?? ''
      ))
    );
  }

  // SNOMED CT — SearchPage passes s.code (e.g. '413448000'); match c.coding.snomed[]
  if ((params as any)?.snomedCodes?.length) {
    const codes: string[] = (params as any).snomedCodes;
    results = results.filter(c => {
      const caseCodes: string[] = (c as any).coding?.snomed ?? [];
      return codes.some((code: string) => caseCodes.includes(code));
    });
  }

  // ICD-10/11 — SearchPage passes s.code (e.g. 'C50.412'); match c.coding.icd10[]
  if ((params as any)?.icdCodes?.length) {
    const codes: string[] = (params as any).icdCodes;
    results = results.filter(c => {
      const caseCodes: string[] = (c as any).coding?.icd10 ?? [];
      // Trim trailing sub-category so 'C50' matches 'C50.412'
      return codes.some((code: string) =>
        caseCodes.some((cc: string) => cc.startsWith(code) || code.startsWith(cc))
      );
    });
  }

  // Attending / Requesting Provider — SearchPage maps attendingId → full name before passing
  if ((params as any)?.attendingNames?.length) {
    const strip = (s: string) => s.toLowerCase().replace(/^(dr\.|mr\.|ms\.|mrs\.)\s*/i, '').trim();
    const names: string[] = ((params as any).attendingNames as string[]).map(strip);
    results = results.filter(c => {
      const prov = strip(c.order?.requestingProvider ?? '');
      return names.some((n: string) => prov.includes(n) || n.includes(prov));
    });
  }

  return results;
}
