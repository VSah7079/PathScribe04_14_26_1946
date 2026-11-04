/**
 * orchestratorSections.ts — Report Draft (orchestrator) section decisions
 * moved out of OrchestratorSectionEditor.tsx and useReportGeneration.ts
 * (PS-317, Batch 450). Behaviour unchanged.
 *
 * regenerateSectionsSequentially: "Regen All" regenerates sections one at a
 * time in list order, waiting for each to finish before starting the next.
 * (A plain forEach used to start every regeneration at once.)
 *
 * buildManualEntrySections: the blank, dictation-ready sections opened by
 * "Start manual entry". Gross Description (sourcePartId 'std_body_gross')
 * gets one section per specimen, labelled with the section title first,
 * then the specimen ("Gross Description — Specimen A: Left breast"); every
 * other section stays a single case-wide section.
 */

export async function regenerateSectionsSequentially(
  sectionIds: readonly string[],
  regenerate: (sectionId: string) => void | Promise<void>,
): Promise<void> {
  for (const id of sectionIds) {
    await regenerate(id);
  }
}

export const GROSS_BODY_PART_ID = 'std_body_gross';

export interface ManualEntryTemplateSection {
  id: string;
  title: string;
  enabled?: boolean;
  order: number;
  sourcePartId?: string;
}

export interface ManualEntrySpecimen {
  id: string;
  label: string;
  description?: string | null;
}

export interface ManualEntrySection {
  id: string;
  label: string;
  type: 'narrative';
  text: string;
  aiGenerated: string;
  userEdited: boolean;
  isStreaming: boolean;
  sourcePartId?: string;
  specimenId?: string;
}

/** Label for one per-specimen Gross Description section. */
export function perSpecimenSectionLabel(sectionTitle: string, specimen: ManualEntrySpecimen): string {
  // NOTE: the " — Specimen " joiner is English text built here (pre-existing);
  // see the Batch 450 report — it needs a locale template key.
  return specimen.description
    ? `${sectionTitle} — Specimen ${specimen.label}: ${specimen.description}`
    : `${sectionTitle} — Specimen ${specimen.label}`;
}

export function buildManualEntrySections(
  templateSections: readonly ManualEntryTemplateSection[],
  specimens: readonly ManualEntrySpecimen[],
): ManualEntrySection[] {
  const enabled = templateSections
    .filter(s => s.enabled)
    .slice()
    .sort((a, b) => a.order - b.order);
  return enabled.flatMap((s): ManualEntrySection[] => {
    if (s.sourcePartId === GROSS_BODY_PART_ID && specimens.length > 0) {
      return specimens.map(sp => ({
        id: `${s.id}_${sp.id}`,
        label: perSpecimenSectionLabel(s.title, sp),
        type: 'narrative' as const,
        text: '', aiGenerated: '', userEdited: false, isStreaming: false,
        sourcePartId: s.sourcePartId,
        specimenId: sp.id,
      }));
    }
    return [{
      id: s.id, label: s.title, type: 'narrative' as const,
      text: '', aiGenerated: '', userEdited: false, isStreaming: false,
      sourcePartId: s.sourcePartId,
    }];
  });
}
