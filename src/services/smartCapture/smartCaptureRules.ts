// src/services/smartCapture/smartCaptureRules.ts
// ─────────────────────────────────────────────────
// Batch 611 (queue entry #189): the Smart Capture prototype's suggestion rules.
//
// PROTOTYPE, NOT COMPLIANCE-REVIEWED, SIMULATED. This is a small, fixed,
// versioned rule set that reads only what a case's specimens and blocks hold
// about the work done (the kind of specimen, how many blocks, which stains were
// ordered). It never reads a patient identifier, and it calls no AI model: the
// same case always gives the same suggestions. It exists so the review flow
// (suggested, reviewed, approved, exported) can be shown and tested before
// anything real sits behind it. The suggestions are not coding advice.
//
// Every suggestion carries the rule id, the rule-set version and the evidence it
// came from (words matched, block and stain counts), so a reviewer can see why
// it was offered and the audit trail can name the rule version in force.
// ─────────────────────────────────────────────────
import type { Specimen } from '@/types/case/Specimen';

/** Bump when any rule changes; a saved review made under an older version is shown as stale. */
export const SMART_CAPTURE_RULE_VERSION = 'sim-rules-1.0';

export type SmartCaptureRuleId = 'SC-LEVEL' | 'SC-SPECIAL' | 'SC-IHC-FIRST' | 'SC-IHC-ADDL' | 'SC-DECAL';

export const SMART_CAPTURE_RULES: readonly { id: SmartCaptureRuleId; cpt: readonly string[] }[] = [
  { id: 'SC-LEVEL', cpt: ['88302', '88304', '88305', '88307', '88309'] },
  { id: 'SC-SPECIAL', cpt: ['88312'] },
  { id: 'SC-IHC-FIRST', cpt: ['88342'] },
  { id: 'SC-IHC-ADDL', cpt: ['88341'] },
  { id: 'SC-DECAL', cpt: ['88311'] },
];

/** Plain descriptors for the suggestion list (a reference label, not a billing dictionary entry). */
export const SMART_CAPTURE_CPT_LABELS: Record<string, string> = {
  '88302': 'Surgical pathology, level II',
  '88304': 'Surgical pathology, level III',
  '88305': 'Surgical pathology, level IV',
  '88307': 'Surgical pathology, level V',
  '88309': 'Surgical pathology, level VI',
  '88311': 'Decalcification procedure',
  '88312': 'Special stain, group I',
  '88341': 'Immunohistochemistry, each additional antibody',
  '88342': 'Immunohistochemistry, first antibody',
};

/** The part of the case the rules read. No patient identifier, no free text beyond the kind of specimen. */
export interface SmartCaptureSpecimenInput {
  id: string;
  label: string;
  /** The specimen description; read for a matched word only and never copied into a suggestion. */
  description: string;
  blockCount: number;
  decalBlockCount: number;
  specialStainCount: number;
  ihcStainCount: number;
}

export type SmartCaptureEvidence =
  | { kind: 'keyword'; value: string }
  | { kind: 'blocks'; value: number }
  | { kind: 'stains'; value: number }
  | { kind: 'default'; value: string };

export interface SmartCaptureSuggestion {
  /** Stable within a case: specimen, rule and ordinal. */
  key: string;
  specimenId: string;
  specimenLabel: string;
  cpt: string;
  units: number;
  ruleId: SmartCaptureRuleId;
  ruleVersion: string;
  evidence: SmartCaptureEvidence[];
}

const MAJOR = /\b(colectomy|mastectomy|gastrectomy|nephrectomy|lobectomy|pneumonectomy|prostatectomy|hysterectomy|esophagectomy|oesophagectomy|whipple|pancreaticoduodenectomy|cystectomy|hepatectomy|laryngectomy|glossectomy)\b/i;
const RESECTION = /\b(resection|excision|appendectomy|appendicectomy|cholecystectomy|hernia|tonsil|amputation|thyroidectomy|splenectomy|salpingo|oophorectomy|segment|wedge|lumpectomy|mass)\b/i;
const SMALL = /\b(biops\w*|punch|polyp\w*|curettage|curettings|shave|fragments?|endometrial|endoscopic|brushing|core)\b/i;

/** The first word the level rule matched, with the level it chose. Pure. */
export function levelFor(description: string): { cpt: string; keyword: string | null } {
  const text = description || '';
  const major = text.match(MAJOR);
  if (major) return { cpt: '88309', keyword: major[0].toLowerCase() };
  const resection = text.match(RESECTION);
  if (resection) return { cpt: '88307', keyword: resection[0].toLowerCase() };
  const small = text.match(SMALL);
  if (small) return { cpt: '88305', keyword: small[0].toLowerCase() };
  return { cpt: '88304', keyword: null };
}

const HE = /^(h\s*&\s*e|h&e|he|hematoxylin)/i;
const SPECIAL = /\b(PAS|GMS|AFB|Ziehl|Gram|Congo|Trichrome|Masson|Reticulin|Alcian|Mucicarmine|Giemsa|Prussian|Iron|Fite|Silver|Elastic|Verhoeff|Jones|Steiner|Grocott|Diastase|Warthin)\b/i;

/** What a stain order is, from its name. A simple fixed list, part of the simulated rule set. Pure. */
export function classifyStain(name: string): 'he' | 'special' | 'ihc' {
  const n = (name || '').trim();
  if (HE.test(n)) return 'he';
  if (SPECIAL.test(n)) return 'special';
  return 'ihc';
}

/** Reads the work done from a case's specimens. Skips cancelled blocks and stains. Pure. */
export function toSmartCaptureInput(specimens: readonly Specimen[] | undefined): SmartCaptureSpecimenInput[] {
  return (specimens ?? []).map(sp => {
    const blocks = (sp.blocks ?? []).filter(b => b.status !== 'Cancelled' && b.status !== 'Deleted' && b.status !== 'Invalidated');
    let special = 0;
    let ihc = 0;
    for (const b of blocks) {
      for (const s of b.stains ?? []) {
        if (s.status === 'Cancelled') continue;
        const kind = classifyStain(s.stainName);
        if (kind === 'special') special += 1;
        else if (kind === 'ihc') ihc += 1;
      }
    }
    return {
      id: sp.id,
      label: sp.label,
      description: sp.description ?? '',
      blockCount: blocks.length,
      decalBlockCount: blocks.filter(b => b.requiresDecal).length,
      specialStainCount: special,
      ihcStainCount: ihc,
    };
  });
}

/** The suggestions for a case, in specimen order. Deterministic; nothing here leaves the browser. Pure. */
export function suggestSmartCaptureLines(input: readonly SmartCaptureSpecimenInput[]): SmartCaptureSuggestion[] {
  const out: SmartCaptureSuggestion[] = [];
  const v = SMART_CAPTURE_RULE_VERSION;
  for (const sp of input) {
    if (sp.blockCount === 0) continue;
    const level = levelFor(sp.description);
    out.push({
      key: `${sp.id}:SC-LEVEL:1`, specimenId: sp.id, specimenLabel: sp.label, cpt: level.cpt, units: 1, ruleId: 'SC-LEVEL', ruleVersion: v,
      evidence: [level.keyword ? { kind: 'keyword', value: level.keyword } : { kind: 'default', value: 'level III' }, { kind: 'blocks', value: sp.blockCount }],
    });
    if (sp.specialStainCount > 0) {
      out.push({
        key: `${sp.id}:SC-SPECIAL:1`, specimenId: sp.id, specimenLabel: sp.label, cpt: '88312', units: sp.specialStainCount, ruleId: 'SC-SPECIAL', ruleVersion: v,
        evidence: [{ kind: 'stains', value: sp.specialStainCount }],
      });
    }
    if (sp.ihcStainCount > 0) {
      out.push({
        key: `${sp.id}:SC-IHC-FIRST:1`, specimenId: sp.id, specimenLabel: sp.label, cpt: '88342', units: 1, ruleId: 'SC-IHC-FIRST', ruleVersion: v,
        evidence: [{ kind: 'stains', value: sp.ihcStainCount }],
      });
    }
    if (sp.ihcStainCount > 1) {
      out.push({
        key: `${sp.id}:SC-IHC-ADDL:1`, specimenId: sp.id, specimenLabel: sp.label, cpt: '88341', units: sp.ihcStainCount - 1, ruleId: 'SC-IHC-ADDL', ruleVersion: v,
        evidence: [{ kind: 'stains', value: sp.ihcStainCount }],
      });
    }
    if (sp.decalBlockCount > 0) {
      out.push({
        key: `${sp.id}:SC-DECAL:1`, specimenId: sp.id, specimenLabel: sp.label, cpt: '88311', units: sp.decalBlockCount, ruleId: 'SC-DECAL', ruleVersion: v,
        evidence: [{ kind: 'blocks', value: sp.decalBlockCount }],
      });
    }
  }
  return out;
}

/** A short signature of what the rules read, to tell whether the case changed after a review. Pure. */
export function smartCaptureSignature(input: readonly SmartCaptureSpecimenInput[]): string {
  const text = JSON.stringify(input.map(s => [s.id, levelFor(s.description).cpt, s.blockCount, s.decalBlockCount, s.specialStainCount, s.ihcStainCount]));
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
