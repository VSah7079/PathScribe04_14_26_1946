// src/services/cytology/cytologySynopticTemplateRegistry.ts
// ─────────────────────────────────────────────────────────────────────────────
// The Non-GYN cytology synoptic templates the Cytology screens use.
//
// Batch 519 (PS-273): they come from the Synoptic Library. Cytology's
// templates are on the shared template model (types/cytology/
// SynopticTemplate.ts), so a lab edits them in Configuration → Synoptic
// Library like any other protocol: Duplicate or New Version, review, publish.
// What the Cytology screens offer is then:
//   • the picker: every *published* protocol in a Non-GYN cytology category
//     (CYTOLOGY_NONGYN…), by name — a lab's own published cytology protocol
//     appears; a retired one (archived, deprecated) no longer does;
//   • a saved review: the template it was recorded against, by id, whatever
//     that protocol's status is now (an archived version still resolves, so
//     its review, narrative and translation check still read correctly).
// Before this batch the Cytology screens read the five bundled JSONs
// directly, so a lab's edits in the Synoptic Library never reached them.
//
// The five bundled templates (data/templates/Cytology/) are the fallback
// until the library has been read (`refreshCytologySynopticTemplates`), and
// for a review whose template the library no longer has.
//
// Several callers are synchronous (the sign-out gate, the sign-out audit
// event), so the library's content is held here once read; screens call
// `refreshCytologySynopticTemplates` when they open, and the sign-out service
// calls `ensureCytologySynopticTemplate` for the review's template before it
// signs out.
// ─────────────────────────────────────────────────────────────────────────────

import type { SynopticTemplate } from '@/types/cytology/SynopticTemplate';
import { normalizeSynopticTemplate, type LooseTemplate } from '@/services/templates/normalizeSynopticTemplate';
import thyroid from '@/data/templates/Cytology/cytology_thyroid_fna_cytology.json';
import pancreaticobiliary from '@/data/templates/Cytology/cytology_pancreaticobiliary_cytology.json';
import salivaryGland from '@/data/templates/Cytology/cytology_salivary_gland_fna_cytology.json';
import lymphNode from '@/data/templates/Cytology/cytology_lymph_node_fna_cytology.json';
import urine from '@/data/templates/Cytology/cytology_urine_cytology.json';

/** The five templates PathScribe ships (the Synoptic Library's seeds for these ids). */
export const CYTOLOGY_SYNOPTIC_TEMPLATES: SynopticTemplate[] = [
  thyroid, pancreaticobiliary, salivaryGland, lymphNode, urine,
].map(t => normalizeSynopticTemplate(t as unknown as LooseTemplate));

/** A protocol in the Synoptic Library, as far as this registry needs it. */
export interface CytologyProtocolSummary { id: string; name: string; category: string; status: string; supersedesId?: string }

export interface CytologySynopticTemplateChoice { id: string; name: string }

/** Whether a protocol category is a Non-GYN cytology one (the Synoptic Library groups it as "Non-GYN Cytology"). */
export const isCytologySynopticCategory = (category: string | undefined): boolean => !!category && category.startsWith('CYTOLOGY_NONGYN');

/** The picker's choices: published Non-GYN cytology protocols, by name. */
export function cytologySynopticChoices(protocols: readonly CytologyProtocolSummary[]): CytologySynopticTemplateChoice[] {
  return protocols
    .filter(p => p.status === 'published' && isCytologySynopticCategory(p.category))
    .map(p => ({ id: p.id, name: p.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Which protocols' content to read: every Non-GYN cytology protocol a review could have been recorded against
 *  (published, archived or deprecated; never a draft or one in review, which can't be picked). */
export function cytologyProtocolsToLoad(protocols: readonly CytologyProtocolSummary[]): CytologyProtocolSummary[] {
  return protocols.filter(p => isCytologySynopticCategory(p.category) && ['published', 'archived', 'deprecated'].includes(p.status));
}

/** The published protocol that is now the current version of a protocol (following New Version lineage,
 *  `supersedesId`), for the voice and keyboard shortcuts that name the five PathScribe templates by their
 *  original ids. Undefined when none of that lineage is published. */
export function currentVersionOf(rootId: string, protocols: readonly CytologyProtocolSummary[]): string | undefined {
  const byId = new Map(protocols.map(p => [p.id, p]));
  const rootOf = (p: CytologyProtocolSummary) => {
    let cur = p;
    const seen = new Set<string>();
    while (cur.supersedesId && byId.has(cur.supersedesId) && !seen.has(cur.id)) { seen.add(cur.id); cur = byId.get(cur.supersedesId)!; }
    return cur.supersedesId && !byId.has(cur.supersedesId) ? cur.supersedesId : cur.id;
  };
  return protocols.find(p => p.status === 'published' && isCytologySynopticCategory(p.category) && rootOf(p) === rootId)?.id;
}

const DEFAULT_CHOICES: CytologySynopticTemplateChoice[] = CYTOLOGY_SYNOPTIC_TEMPLATES
  .map(t => ({ id: t.id, name: t.name }))
  .sort((a, b) => a.name.localeCompare(b.name));

const fromLibrary = new Map<string, SynopticTemplate>();
let libraryChoices: CytologySynopticTemplateChoice[] | null = null;
let libraryProtocols: readonly CytologyProtocolSummary[] | null = null;

/** The template a review was recorded against: the library's content once read, else the bundled template. */
export function resolveCytologySynopticTemplateById(templateId: string): SynopticTemplate | undefined {
  return fromLibrary.get(templateId) ?? CYTOLOGY_SYNOPTIC_TEMPLATES.find(t => t.id === templateId);
}

/** What a shortcut naming one of the five PathScribe templates opens: the current published version once the
 *  library is read (undefined if that template has been retired), else the bundled template. */
export function cytologySynopticTemplateForShortcut(rootId: string): string | undefined {
  return libraryProtocols ? currentVersionOf(rootId, libraryProtocols) : rootId;
}

/** The picker's choices: the library's published cytology protocols once read, else the five bundled ones. */
export function cytologySynopticTemplateChoices(): CytologySynopticTemplateChoice[] {
  return libraryChoices ?? DEFAULT_CHOICES;
}

export interface CytologyTemplateLibraryDeps {
  listProtocols: () => Promise<readonly CytologyProtocolSummary[]>;
  /** The protocol's content (EditorTemplate). */
  getTemplate: (id: string) => Promise<unknown>;
}

/** Reads the Synoptic Library: the picker's choices and the content of every cytology protocol a review can
 *  name. A protocol whose content can't be read keeps its bundled template (if any). Returns the choices. */
export async function refreshCytologySynopticTemplates(deps: CytologyTemplateLibraryDeps): Promise<CytologySynopticTemplateChoice[]> {
  const protocols = await deps.listProtocols();
  await Promise.all(cytologyProtocolsToLoad(protocols).map(p => loadInto(p.id, deps)));
  libraryChoices = cytologySynopticChoices(protocols);
  libraryProtocols = protocols;
  return libraryChoices;
}

/** Makes sure one template's library content is held (before a sign-out reads it synchronously). */
export async function ensureCytologySynopticTemplate(templateId: string, deps: Pick<CytologyTemplateLibraryDeps, 'getTemplate'>): Promise<SynopticTemplate | undefined> {
  if (!fromLibrary.has(templateId)) await loadInto(templateId, deps);
  return resolveCytologySynopticTemplateById(templateId);
}

async function loadInto(id: string, deps: Pick<CytologyTemplateLibraryDeps, 'getTemplate'>): Promise<void> {
  try {
    const content = await deps.getTemplate(id) as LooseTemplate | undefined;
    if (content?.sections?.length) fromLibrary.set(id, normalizeSynopticTemplate(content));
  } catch { /* not in the library: the bundled template, if any, stands */ }
}

/** Tests only: forget what was read from the library. */
export function resetCytologySynopticTemplateLibrary(): void {
  fromLibrary.clear();
  libraryChoices = null;
  libraryProtocols = null;
}
