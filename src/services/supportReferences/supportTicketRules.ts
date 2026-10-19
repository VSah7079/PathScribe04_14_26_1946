// src/services/supportReferences/supportTicketRules.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 364 (PS-349): what a support ticket may say about where the user was
// and what they typed, pure.
//   - supportPageOf: the page as its route pattern (/report/:caseId), never
//     the address itself, which carries the case number (or a consult token).
//     The query string is dropped. The case id is returned separately so the
//     caller can send the case's support reference instead.
//   - findIdentifiersInText: case numbers, MRNs and other identifiers in what
//     the user typed, so the ticket can warn before sending. It uses every
//     identifier format PathScribe knows (IDENTIFIER_FORMAT_LIBRARY), not just
//     those a lab has switched on: a false alarm costs a warning, a miss
//     sends patient data.
// ─────────────────────────────────────────────────────────────────────────────
import { IDENTIFIER_FORMAT_LIBRARY, type IdentifierFormat, type IdentifierKind } from '@/types/systemConfig';
import { SUPPORT_REFERENCE_IN_TEXT } from './supportReferenceRules';

/**
 * Every route in App.tsx, as written there. supportTicketRules.test.ts keeps
 * this in step with App.tsx.
 */
export const SUPPORT_ROUTE_PATTERNS: readonly string[] = [
  '/', '/login', '/auth/callback/:providerId', '/or-suite-dashboard', '/facility-ops-dashboard',
  '/consult', '/consult/:token', '/critical-alert/:token', '/accession', '/worklist', '/pathology-workspace',
  '/quality-compliance', '/cytology-worklist', '/cytology-worklist/:caseId', '/molecular',
  '/molecular-batch/:batchId', '/molecular-rack', '/molecular-rack/:rackId', '/molecular-control-rules',
  '/dev/mock-interface-engine', '/quality-assurance', '/batch-management', '/batch-management/disposal',
  '/batch-management/disposal-report', '/batch-management/pending-load', '/batch-management/engraver-monitor', '/batch-management/equipment-log', '/batch-management/wsi-scan', '/batch-management/label-reprint', '/batch-management/retention-holds',
  '/workstations/microtomy', '/workstations/embedding', '/workstations/slide-distribution', '/add-on-orders',
  '/intraop-queue', '/molecular-order-queue', '/cytology-qc-queue', '/surgical-qa-worklist', '/migration-jobs',
  '/search', '/audit', '/registry-exceptions', '/autopsy-dashboards', '/outbound-queue', '/my-exports', '/configuration', '/contribution', '/bench-contributions', '/tumor-board', '/margin-exception-review', '/case/:caseId/synoptic', '/case/:caseId/grossing',
  '/report/:caseId', '/admin/parts/new', '/admin/parts/:partId/edit', '/admin/templates/new',
  '/admin/templates/:templateId/edit', '/template-editor/new', '/template-editor/:templateId',
  '/template-review/:templateId', '/mock-emr', '/wsi-viewer',
];

export interface SupportPage {
  /** The route pattern, e.g. '/report/:caseId'; '(other page)' when no route matches. */
  pattern: string;
  /** The case the page is about, if any: send its support reference, not this. */
  caseId?: string;
}

export function supportPageOf(pathname: string): SupportPage {
  const parts = pathname.split('?')[0].split('#')[0].replace(/\/+$/, '').split('/').filter(Boolean);
  const candidates = SUPPORT_ROUTE_PATTERNS
    .map(p => ({ p, segs: p.split('/').filter(Boolean) }))
    .filter(({ segs }) => segs.length === parts.length)
    // literal segments beat parameters: '/admin/parts/new' before '/admin/parts/:partId/…'
    .sort((a, b) => b.segs.filter(s => !s.startsWith(':')).length - a.segs.filter(s => !s.startsWith(':')).length);
  for (const { p, segs } of candidates) {
    const params: Record<string, string> = {};
    if (segs.every((s, i) => (s.startsWith(':') ? ((params[s.slice(1)] = decodeURIComponent(parts[i])), true) : s === parts[i]))) {
      return { pattern: p, caseId: params.caseId };
    }
  }
  return { pattern: '(other page)' };
}

/** Kinds of identifier that name a patient or a case. */
const IDENTIFYING_KINDS: ReadonlySet<IdentifierKind> = new Set(['accession', 'mrn', 'requisition', 'block', 'slide']);

export interface IdentifierInText {
  text: string;
  /** Batch 604 (PS-349): 'patientName' (the open case's patient is named in the text) and
   *  'screenshot' (a screenshot is attached; it is masked automatically, check it) join the identifier kinds. */
  kind: IdentifierKind | 'patientName' | 'screenshot';
}

/**
 * Batch 604 (PS-349): the open case's patient named in the text. Any word of the name of
 * three letters or more, on its own, in any case. Over-warning is acceptable here: the
 * person can keep editing or send anyway.
 */
export function findPatientNameInText(text: string, nameParts: readonly string[]): IdentifierInText[] {
  const found = new Map<string, IdentifierInText>();
  const words = nameParts.flatMap(p => p.split(/[\s,'-]+/)).map(w => w.trim()).filter(w => w.length >= 3);
  for (const w of words) {
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'iu');
    const m = text.match(re);
    if (m && !found.has(w.toLowerCase())) found.set(w.toLowerCase(), { text: m[0], kind: 'patientName' });
  }
  return [...found.values()];
}

/**
 * Case numbers, MRNs and other identifiers inside free text, by every known
 * format, enabled for this lab or not. Support references are not identifiers.
 */
export function findIdentifiersInText(text: string, formats: readonly IdentifierFormat[] = IDENTIFIER_FORMAT_LIBRARY): IdentifierInText[] {
  const withoutRefs = text.replace(SUPPORT_REFERENCE_IN_TEXT, ' ');
  const found = new Map<string, IdentifierInText>();
  for (const f of formats) {
    if (!IDENTIFYING_KINDS.has(f.kind)) continue;
    const body = f.pattern.replace(/^\^/, '').replace(/\$$/, '');
    let re: RegExp;
    try { re = new RegExp(`(?<![\\w-])(?:${body})(?![\\w-])`, 'gi'); } catch { continue; }
    for (const m of withoutRefs.matchAll(re)) {
      const key = m[0].toUpperCase();
      if (!found.has(key)) found.set(key, { text: m[0], kind: f.kind });
    }
  }
  return [...found.values()];
}

/** The text with each identifier replaced (e.g. a case number by its support reference). */
export function replaceIdentifiers(text: string, replacements: ReadonlyMap<string, string>): string {
  let out = text;
  for (const [from, to] of replacements) {
    out = out.replace(new RegExp(`(?<![\\w-])${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`, 'gi'), to);
  }
  return out;
}

// ── The warning step (Batch 450, moved from EnhancementRequestModal.tsx) ────

/**
 * What pressing Send does with what the user typed: the identifiers to warn
 * about (stop at the warning), or null (send). "Send anyway" skips the check.
 */
export function identifierWarningOnSend(
  input: { title: string; description: string; sendAnyway: boolean },
  find: (text: string) => IdentifierInText[] = findIdentifiersInText,
): IdentifierInText[] | null {
  if (input.sendAnyway) return null;
  const found = find(`${input.title}\n${input.description}`);
  return found.length > 0 ? found : null;
}

/** Whether the warning offers "replace case numbers with support references": only when a case number was found. */
export function canReplaceCaseNumbers(found: readonly IdentifierInText[]): boolean {
  return found.some(f => f.kind === 'accession');
}

/** The case numbers among the identifiers found (the ones a support reference can replace). */
export function caseNumbersIn(found: readonly IdentifierInText[]): string[] {
  return found.filter(f => f.kind === 'accession').map(f => f.text);
}
