// src/services/narrativeSignals/mockNarrativeSignalService.ts
import type { INarrativeSignalService, NarrativeEditSignal, SectionStats } from './INarrativeSignalService';
import { deidentifySignal } from './deidentification';
import type { StructuralEditType } from './deidentification';
import { storageGet, storageSet } from '../mockStorage';

const KEY = 'pathscribe_narrative_signals_v2';

function load(): NarrativeEditSignal[] {
  const stored = storageGet<NarrativeEditSignal[]>(KEY, []);
  if (stored && stored.length > 0) return stored;

  // Seed realistic demo signals for the demo validation study
  const studyId        = 'vs-demo-001';
  const templateId     = 'tmpl-breast';
  const templateName   = 'Breast Pathology Report';
  const now            = new Date();
  // eslint-disable-next-line no-restricted-properties -- Real, honest justification: generates FAKE, illustrative timestamps for seeded demo data ("N days ago from right now"), not bucketing a real, stored clinical event by facility timezone. Result is a real, absolute UTC instant (toISOString()) regardless of runtime timezone.
  const daysAgo = (d: number) => { const dt = new Date(now); dt.setDate(dt.getDate() - d); return dt.toISOString(); };

  const SEED = ([
    // admin_header — mostly accepted
    { caseId: 'case-001', accessionNumber: 'S26-4401-BX-001', reportTemplateId: templateId, templateName, sectionId: 'admin_header',        sectionTitle: 'Administrative & Clinical Header', aiGeneratedClean: 'Clinical context for breast pathology reviewed. Indication [VALUE] noted.', finalTextClean: 'Clinical context for breast pathology reviewed. Indication [VALUE] noted.', structuralEditType: 'none',           editRatio: 0,    wasAccepted: true,  subspecialtyId: 'breast', studyId, replacementCount: 1, capturedAt: daysAgo(20) },
    { caseId: 'case-002', accessionNumber: 'S26-4402-BX-001', reportTemplateId: templateId, templateName, sectionId: 'admin_header',        sectionTitle: 'Administrative & Clinical Header', aiGeneratedClean: 'Clinical history for breast procedure documented.', finalTextClean: 'Clinical history for breast procedure documented.', structuralEditType: 'none',           editRatio: 0,    wasAccepted: true,  subspecialtyId: 'breast', studyId, replacementCount: 0, capturedAt: daysAgo(18) },
    { caseId: 'case-003', accessionNumber: 'S26-4403-BX-001', reportTemplateId: templateId, templateName, sectionId: 'admin_header',        sectionTitle: 'Administrative & Clinical Header', aiGeneratedClean: 'Pre-operative diagnosis of [VALUE] recorded per requisition.', finalTextClean: 'Pre-operative diagnosis of [VALUE] recorded per requisition. Multidisciplinary input noted.', structuralEditType: 'added_content',  editRatio: 0.18, wasAccepted: false, subspecialtyId: 'breast', studyId, replacementCount: 1, capturedAt: daysAgo(15) },
    // gross_description — moderate editing
    { caseId: 'case-001', accessionNumber: 'S26-4401-BX-001', reportTemplateId: templateId, templateName, sectionId: 'gross_description',   sectionTitle: 'Specimen & Gross Description',    aiGeneratedClean: 'Specimen received in formalin labelled [VALUE]. [DIMENSIONS] mass identified [VALUE] from margin.', finalTextClean: 'Specimen received in formalin labelled [VALUE]. [DIMENSIONS] mass identified [VALUE] from margin.', structuralEditType: 'none',           editRatio: 0,    wasAccepted: true,  subspecialtyId: 'breast', studyId, replacementCount: 3, capturedAt: daysAgo(20) },
    { caseId: 'case-002', accessionNumber: 'S26-4402-BX-001', reportTemplateId: templateId, templateName, sectionId: 'gross_description',   sectionTitle: 'Specimen & Gross Description',    aiGeneratedClean: 'Mastectomy specimen [MEASUREMENT] in length. Tumour [MEASUREMENT] diameter.', finalTextClean: 'Mastectomy specimen [MEASUREMENT] in length with overlying skin ellipse [DIMENSIONS]. Tumour [MEASUREMENT] diameter centrally located.', structuralEditType: 'added_content',  editRatio: 0.24, wasAccepted: false, subspecialtyId: 'breast', studyId, replacementCount: 2, capturedAt: daysAgo(18) },
    { caseId: 'case-003', accessionNumber: 'S26-4403-BX-001', reportTemplateId: templateId, templateName, sectionId: 'gross_description',   sectionTitle: 'Specimen & Gross Description',    aiGeneratedClean: 'Core biopsy specimen [VALUE] cores. Adequate for histological evaluation.', finalTextClean: 'Core biopsy specimen [VALUE] cores submitted in entirety. Adequate for histological evaluation.', structuralEditType: 'minor_wording',  editRatio: 0.09, wasAccepted: false, subspecialtyId: 'breast', studyId, replacementCount: 1, capturedAt: daysAgo(15) },
    { caseId: 'case-004', accessionNumber: 'S26-4404-BX-001', reportTemplateId: templateId, templateName, sectionId: 'gross_description',   sectionTitle: 'Specimen & Gross Description',    aiGeneratedClean: 'Wide local excision [MEASUREMENT]. Margins inked per protocol.', finalTextClean: 'Wide local excision [MEASUREMENT]. Margins inked per protocol.', structuralEditType: 'none',           editRatio: 0,    wasAccepted: true,  subspecialtyId: 'breast', studyId, replacementCount: 1, capturedAt: daysAgo(12) },
    // synoptic_summary — high acceptance
    { caseId: 'case-001', accessionNumber: 'S26-4401-BX-001', reportTemplateId: templateId, templateName, sectionId: 'synoptic_summary',   sectionTitle: 'Synoptic Data Summary',           aiGeneratedClean: 'Histologic type [VALUE]. Grade [VALUE]. Tumour size [MEASUREMENT]. Margins [VALUE]. Lymphovascular invasion [VALUE]. [pTNM_STAGE].', finalTextClean: 'Histologic type [VALUE]. Grade [VALUE]. Tumour size [MEASUREMENT]. Margins [VALUE]. Lymphovascular invasion [VALUE]. [pTNM_STAGE].', structuralEditType: 'none',           editRatio: 0,    wasAccepted: true,  subspecialtyId: 'breast', studyId, replacementCount: 5, capturedAt: daysAgo(20) },
    { caseId: 'case-002', accessionNumber: 'S26-4402-BX-001', reportTemplateId: templateId, templateName, sectionId: 'synoptic_summary',   sectionTitle: 'Synoptic Data Summary',           aiGeneratedClean: 'Invasive carcinoma of no special type. [VALUE] grade. Size [MEASUREMENT]. [VALUE] margins. No lymphovascular invasion. [pTNM_STAGE].', finalTextClean: 'Invasive carcinoma of no special type. [VALUE] grade. Size [MEASUREMENT]. [VALUE] margins. No lymphovascular invasion. [pTNM_STAGE].', structuralEditType: 'none',           editRatio: 0,    wasAccepted: true,  subspecialtyId: 'breast', studyId, replacementCount: 3, capturedAt: daysAgo(18) },
    { caseId: 'case-003', accessionNumber: 'S26-4403-BX-001', reportTemplateId: templateId, templateName, sectionId: 'synoptic_summary',   sectionTitle: 'Synoptic Data Summary',           aiGeneratedClean: 'Core biopsy: invasive carcinoma [VALUE] type. Grade [VALUE]. [BIOMARKER_RESULT] [BIOMARKER_RESULT].', finalTextClean: 'Core biopsy: invasive carcinoma [VALUE] type, grade [VALUE]. [BIOMARKER_RESULT] [BIOMARKER_RESULT]. Ki-67 [BIOMARKER_PERCENT].', structuralEditType: 'added_content',  editRatio: 0.14, wasAccepted: false, subspecialtyId: 'breast', studyId, replacementCount: 4, capturedAt: daysAgo(15) },
    // biomarkers — mostly accepted
    { caseId: 'case-001', accessionNumber: 'S26-4401-BX-001', reportTemplateId: templateId, templateName, sectionId: 'biomarkers',         sectionTitle: 'Biomarker Results',               aiGeneratedClean: '[BIOMARKER_RESULT] [BIOMARKER_RESULT] [BIOMARKER_RESULT]. [BIOMARKER_PERCENT] Ki-67 index.', finalTextClean: '[BIOMARKER_RESULT] [BIOMARKER_RESULT] [BIOMARKER_RESULT]. [BIOMARKER_PERCENT] Ki-67 index.', structuralEditType: 'none',           editRatio: 0,    wasAccepted: true,  subspecialtyId: 'breast', studyId, replacementCount: 4, capturedAt: daysAgo(20) },
    { caseId: 'case-002', accessionNumber: 'S26-4402-BX-001', reportTemplateId: templateId, templateName, sectionId: 'biomarkers',         sectionTitle: 'Biomarker Results',               aiGeneratedClean: 'Immunohistochemistry performed. [BIOMARKER_RESULT] [BIOMARKER_RESULT] [BIOMARKER_RESULT] by [VALUE] methodology.', finalTextClean: 'Immunohistochemistry performed on [BLOCK_ID]. [BIOMARKER_RESULT] [BIOMARKER_RESULT] [BIOMARKER_RESULT] by [VALUE] methodology.', structuralEditType: 'minor_wording',  editRatio: 0.07, wasAccepted: false, subspecialtyId: 'breast', studyId, replacementCount: 4, capturedAt: daysAgo(18) },
    // ancillary_and_diagnosis — more editing
    { caseId: 'case-001', accessionNumber: 'S26-4401-BX-001', reportTemplateId: templateId, templateName, sectionId: 'ancillary_and_diagnosis', sectionTitle: 'Ancillary Testing & Final Diagnosis', aiGeneratedClean: 'Final diagnosis: invasive carcinoma [VALUE] type [VALUE] grade. [BIOMARKER_RESULT] [BIOMARKER_RESULT]. [pTNM_STAGE].', finalTextClean: 'Final diagnosis: invasive carcinoma [VALUE] type [VALUE] grade. [BIOMARKER_RESULT] [BIOMARKER_RESULT]. [pTNM_STAGE]. Reported in conjunction with [VALUE] multidisciplinary team.', structuralEditType: 'added_content',  editRatio: 0.22, wasAccepted: false, subspecialtyId: 'breast', studyId, replacementCount: 4, capturedAt: daysAgo(20) },
    { caseId: 'case-002', accessionNumber: 'S26-4402-BX-001', reportTemplateId: templateId, templateName, sectionId: 'ancillary_and_diagnosis', sectionTitle: 'Ancillary Testing & Final Diagnosis', aiGeneratedClean: 'Diagnosis: [VALUE] invasive breast carcinoma. Complete excision achieved. [pTNM_STAGE].', finalTextClean: 'Diagnosis: [VALUE] invasive breast carcinoma. Complete excision achieved. [pTNM_STAGE].', structuralEditType: 'none',           editRatio: 0,    wasAccepted: true,  subspecialtyId: 'breast', studyId, replacementCount: 1, capturedAt: daysAgo(18) },

    // ── Amber's MPA pilot study (vs-demo-002) ─────────────────────────────
    { caseId: 'case-010', accessionNumber: 'S26-4410-BX-001', reportTemplateId: 'tmpl-breast',  templateName: 'Breast Pathology Report',   sectionId: 'admin_header',        sectionTitle: 'Administrative & Clinical Header',    aiGeneratedClean: 'Clinical context documented per requisition.', finalTextClean: 'Clinical context documented per requisition.', structuralEditType: 'none',          editRatio: 0,    wasAccepted: true,  subspecialtyId: 'breast', studyId: 'vs-demo-002', replacementCount: 0, capturedAt: daysAgo(13) },
    { caseId: 'case-010', accessionNumber: 'S26-4410-BX-001', reportTemplateId: 'tmpl-breast',  templateName: 'Breast Pathology Report',   sectionId: 'gross_description',   sectionTitle: 'Specimen & Gross Description',        aiGeneratedClean: 'Specimen received labelled [VALUE]. [DIMENSIONS] mass noted.', finalTextClean: 'Specimen received labelled [VALUE]. [DIMENSIONS] mass noted.', structuralEditType: 'none',          editRatio: 0,    wasAccepted: true,  subspecialtyId: 'breast', studyId: 'vs-demo-002', replacementCount: 2, capturedAt: daysAgo(13) },
    { caseId: 'case-010', accessionNumber: 'S26-4410-BX-001', reportTemplateId: 'tmpl-breast',  templateName: 'Breast Pathology Report',   sectionId: 'synoptic_summary',   sectionTitle: 'Synoptic Data Summary',               aiGeneratedClean: '[VALUE] invasive carcinoma grade [VALUE]. [MEASUREMENT]. [VALUE] margins. [pTNM_STAGE].', finalTextClean: '[VALUE] invasive carcinoma grade [VALUE]. [MEASUREMENT]. [VALUE] margins. [pTNM_STAGE].', structuralEditType: 'none',          editRatio: 0,    wasAccepted: true,  subspecialtyId: 'breast', studyId: 'vs-demo-002', replacementCount: 4, capturedAt: daysAgo(13) },
    { caseId: 'case-010', accessionNumber: 'S26-4410-BX-001', reportTemplateId: 'tmpl-breast',  templateName: 'Breast Pathology Report',   sectionId: 'biomarkers',         sectionTitle: 'Biomarker Results',                   aiGeneratedClean: '[BIOMARKER_RESULT] [BIOMARKER_RESULT] [BIOMARKER_RESULT]. Ki-67 [BIOMARKER_PERCENT].', finalTextClean: '[BIOMARKER_RESULT] [BIOMARKER_RESULT] [BIOMARKER_RESULT]. Ki-67 [BIOMARKER_PERCENT]. Interpretation consistent with luminal B subtype.', structuralEditType: 'added_content', editRatio: 0.21, wasAccepted: false, subspecialtyId: 'breast', studyId: 'vs-demo-002', replacementCount: 4, capturedAt: daysAgo(13) },
    { caseId: 'case-010', accessionNumber: 'S26-4410-BX-001', reportTemplateId: 'tmpl-breast',  templateName: 'Breast Pathology Report',   sectionId: 'ancillary_and_diagnosis', sectionTitle: 'Ancillary Testing & Final Diagnosis', aiGeneratedClean: 'Final diagnosis: [VALUE] invasive carcinoma. [pTNM_STAGE].', finalTextClean: 'Final diagnosis: [VALUE] invasive carcinoma. [pTNM_STAGE].', structuralEditType: 'none',          editRatio: 0,    wasAccepted: true,  subspecialtyId: 'breast', studyId: 'vs-demo-002', replacementCount: 1, capturedAt: daysAgo(13) },
    { caseId: 'case-011', accessionNumber: 'S26-4411-RP-001', reportTemplateId: 'tmpl-uro',     templateName: 'Urological Pathology Report', sectionId: 'gross_description',   sectionTitle: 'Specimen & Gross Description',        aiGeneratedClean: 'Prostatectomy specimen [MEASUREMENT] weight. [VALUE] zones sampled.', finalTextClean: 'Prostatectomy specimen [MEASUREMENT] weight. [VALUE] zones sampled per Stanford protocol.', structuralEditType: 'minor_wording', editRatio: 0.11, wasAccepted: false, subspecialtyId: 'uro',    studyId: 'vs-demo-002', replacementCount: 2, capturedAt: daysAgo(10) },
    { caseId: 'case-011', accessionNumber: 'S26-4411-RP-001', reportTemplateId: 'tmpl-uro',     templateName: 'Urological Pathology Report', sectionId: 'synoptic_summary',   sectionTitle: 'Synoptic Data Summary',               aiGeneratedClean: 'Prostatic adenocarcinoma. [GLEASON_SCORE] [GRADE_GROUP]. [pTNM_STAGE]. Margins [VALUE].', finalTextClean: 'Prostatic adenocarcinoma. [GLEASON_SCORE] [GRADE_GROUP]. [pTNM_STAGE]. Margins [VALUE].', structuralEditType: 'none',          editRatio: 0,    wasAccepted: true,  subspecialtyId: 'uro',    studyId: 'vs-demo-002', replacementCount: 3, capturedAt: daysAgo(10) },
    { caseId: 'case-011', accessionNumber: 'S26-4411-RP-001', reportTemplateId: 'tmpl-uro',     templateName: 'Urological Pathology Report', sectionId: 'ancillary_and_diagnosis', sectionTitle: 'Ancillary Testing & Final Diagnosis', aiGeneratedClean: 'Diagnosis: prostatic adenocarcinoma [GLEASON_SCORE]. [pTNM_STAGE]. Extraprostatic extension [VALUE].', finalTextClean: 'Diagnosis: prostatic adenocarcinoma [GLEASON_SCORE]. [pTNM_STAGE]. Extraprostatic extension [VALUE].', structuralEditType: 'none',          editRatio: 0,    wasAccepted: true,  subspecialtyId: 'uro',    studyId: 'vs-demo-002', replacementCount: 2, capturedAt: daysAgo(10) },

    // ── Closed GI study (vs-demo-003) — for report generation demo ────────
    { caseId: 'case-020', accessionNumber: 'S26-4420-RS-001', reportTemplateId: 'tmpl-gi', templateName: 'Gastrointestinal Pathology Report', sectionId: 'admin_header',        sectionTitle: 'Administrative & Clinical Header',    aiGeneratedClean: 'GI clinical context documented.', finalTextClean: 'GI clinical context documented.', structuralEditType: 'none',          editRatio: 0,    wasAccepted: true,  subspecialtyId: 'gi', studyId: 'vs-demo-003', replacementCount: 0, capturedAt: daysAgo(30) },
    { caseId: 'case-020', accessionNumber: 'S26-4420-RS-001', reportTemplateId: 'tmpl-gi', templateName: 'Gastrointestinal Pathology Report', sectionId: 'gross_description',   sectionTitle: 'Specimen & Gross Description',        aiGeneratedClean: 'Right hemicolectomy [MEASUREMENT]. Tumour [DIMENSIONS] [VALUE] from ileocaecal valve.', finalTextClean: 'Right hemicolectomy [MEASUREMENT]. Tumour [DIMENSIONS] [VALUE] from ileocaecal valve.', structuralEditType: 'none',          editRatio: 0,    wasAccepted: true,  subspecialtyId: 'gi', studyId: 'vs-demo-003', replacementCount: 3, capturedAt: daysAgo(30) },
    { caseId: 'case-020', accessionNumber: 'S26-4420-RS-001', reportTemplateId: 'tmpl-gi', templateName: 'Gastrointestinal Pathology Report', sectionId: 'synoptic_summary',    sectionTitle: 'Synoptic Data Summary',               aiGeneratedClean: 'Colorectal adenocarcinoma [VALUE] grade. [MEASUREMENT]. [VALUE] margins. [pTNM_STAGE]. [VALUE] lymph nodes positive.', finalTextClean: 'Colorectal adenocarcinoma [VALUE] grade. [MEASUREMENT]. [VALUE] margins. [pTNM_STAGE]. [VALUE] lymph nodes positive.', structuralEditType: 'none',          editRatio: 0,    wasAccepted: true,  subspecialtyId: 'gi', studyId: 'vs-demo-003', replacementCount: 4, capturedAt: daysAgo(30) },
    { caseId: 'case-021', accessionNumber: 'S26-4421-RS-001', reportTemplateId: 'tmpl-gi', templateName: 'Gastrointestinal Pathology Report', sectionId: 'gross_description',   sectionTitle: 'Specimen & Gross Description',        aiGeneratedClean: 'Sigmoid colectomy [MEASUREMENT]. Tumour [DIMENSIONS].', finalTextClean: 'Sigmoid colectomy [MEASUREMENT] with intact mesorectum. Tumour [DIMENSIONS].', structuralEditType: 'minor_wording', editRatio: 0.12, wasAccepted: false, subspecialtyId: 'gi', studyId: 'vs-demo-003', replacementCount: 2, capturedAt: daysAgo(25) },
    { caseId: 'case-021', accessionNumber: 'S26-4421-RS-001', reportTemplateId: 'tmpl-gi', templateName: 'Gastrointestinal Pathology Report', sectionId: 'ancillary_and_diagnosis', sectionTitle: 'Ancillary Testing & Final Diagnosis', aiGeneratedClean: 'MMR IHC: proficient. Final diagnosis: colorectal adenocarcinoma [VALUE] grade [pTNM_STAGE].', finalTextClean: 'MMR IHC: proficient mismatch repair. Final diagnosis: colorectal adenocarcinoma [VALUE] grade [pTNM_STAGE].', structuralEditType: 'minor_wording', editRatio: 0.08, wasAccepted: false, subspecialtyId: 'gi', studyId: 'vs-demo-003', replacementCount: 1, capturedAt: daysAgo(25) },
    { caseId: 'case-022', accessionNumber: 'S26-4422-RS-001', reportTemplateId: 'tmpl-gi', templateName: 'Gastrointestinal Pathology Report', sectionId: 'synoptic_summary',    sectionTitle: 'Synoptic Data Summary',               aiGeneratedClean: 'Rectal adenocarcinoma [VALUE] grade post [VALUE] therapy. [pTNM_STAGE]. Tumour regression grade [VALUE].', finalTextClean: 'Rectal adenocarcinoma [VALUE] grade post [VALUE] therapy. [pTNM_STAGE]. Tumour regression grade [VALUE].', structuralEditType: 'none',          editRatio: 0,    wasAccepted: true,  subspecialtyId: 'gi', studyId: 'vs-demo-003', replacementCount: 3, capturedAt: daysAgo(20) },
  ] satisfies Omit<NarrativeEditSignal, 'id'>[]).map((s, i) => ({ ...s, id: `ns-seed-${i}` }));

  save(SEED);
  return SEED;
}
function save(s: NarrativeEditSignal[]): void { storageSet(KEY, s); }
function ok<T>(data: T) { return { ok: true, data } as any; }

// ── Edit ratio ────────────────────────────────────────────────────────────────
// Approximation — Levenshtein is expensive client-side
export function computeEditRatio(original: string, edited: string): number {
  if (original === edited) return 0;
  const strip = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const a = strip(original);
  const b = strip(edited);
  if (!a && !b) return 0;
  if (!a || !b) return 1;
  const longer  = Math.max(a.length, b.length);
  let matches   = 0;
  const shorter = a.length < b.length ? a : b;
  for (let i = 0; i < shorter.length; i++) {
    if (a[i] === b[i]) matches++;
  }
  return Math.round((1 - matches / longer) * 100) / 100;
}

export const mockNarrativeSignalService: INarrativeSignalService = {

  async recordSignals(rawSignals) {
    const existing = load();
    const now      = new Date().toISOString();

    const processed: NarrativeEditSignal[] = rawSignals.map((s, i) => {
      // De-identify at capture time — raw clinical text never stored
      const deid = deidentifySignal(s.aiGeneratedClean ?? '', s.finalTextClean ?? '', s.editRatio);

      return {
        ...s,
        id:                 `ns-${Date.now()}-${i}`,
        aiGeneratedClean:   deid.aiGeneratedClean,
        finalTextClean:     deid.finalTextClean,
        structuralEditType: deid.structuralEditType,
        replacementCount:   deid.replacementCount,
        capturedAt:         now,
      };
    });

    save([...existing, ...processed]);
    console.info(`[NarrativeSignals] Recorded ${processed.length} signal(s) — de-identified`);
    return ok(undefined);
  },

  async getAll()                { return ok(load()); },
  async getByTemplate(id)       { return ok(load().filter(s => s.reportTemplateId === id)); },
  async getByStudy(studyId)     { return ok(load().filter(s => s.studyId === studyId)); },
  async getAccepted(id)         { return ok(load().filter(s => s.wasAccepted && (!id || s.reportTemplateId === id))); },

  async getStats(studyId) {
    const signals = studyId ? load().filter(s => s.studyId === studyId) : load();

    const bySection:  Record<string, SectionStats>  = {};
    const byTemplate: Record<string, { total: number; accepted: number }> = {};
    const byEditType: Record<string, number>        = {};

    for (const s of signals) {
      // Section
      if (!bySection[s.sectionId]) bySection[s.sectionId] = { total: 0, accepted: 0, avgEditRatio: 0, editTypes: {} };
      bySection[s.sectionId].total++;
      bySection[s.sectionId].avgEditRatio += s.editRatio;
      if (s.wasAccepted) bySection[s.sectionId].accepted++;
      bySection[s.sectionId].editTypes[s.structuralEditType] =
        (bySection[s.sectionId].editTypes[s.structuralEditType] ?? 0) + 1;

      // Template
      if (!byTemplate[s.reportTemplateId]) byTemplate[s.reportTemplateId] = { total: 0, accepted: 0 };
      byTemplate[s.reportTemplateId].total++;
      if (s.wasAccepted) byTemplate[s.reportTemplateId].accepted++;

      // Edit type
      byEditType[s.structuralEditType] = (byEditType[s.structuralEditType] ?? 0) + 1;
    }

    // Finalise averages
    for (const sec of Object.values(bySection)) {
      sec.avgEditRatio = sec.total ? Math.round((sec.avgEditRatio / sec.total) * 100) / 100 : 0;
    }

    const accepted = signals.filter(s => s.wasAccepted).length;
    return ok({
      totalSignals:   signals.length,
      acceptedCount:  accepted,
      acceptanceRate: signals.length ? Math.round((accepted / signals.length) * 100) / 100 : 0,
      bySection,
      byTemplate,
      byEditType: byEditType as Record<StructuralEditType, number>,
    });
  },
};
