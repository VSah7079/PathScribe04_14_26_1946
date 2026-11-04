/**
 * services/templates/templateService.ts
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * Service layer for all synoptic template operations.
 *
 * MOCK PHASE (current):
 *   All functions return realistic mock data with simulated async latency.
 *   Components are fully wired â€” swap the implementations below when the
 *   backend is ready. Nothing in the UI layer needs to change.
 *
 * REAL PHASE (when backend is ready):
 *   Replace each function body with the corresponding fetch() call.
 *   API contracts are documented inline above each function.
 *   See also: /docs/api-contracts/templates.md (generate from this file)
 *
 * Used by:
 *   components/Config/Protocols/SynopticEditor.tsx
 *   components/Config/Templates/TemplateRenderer.tsx
 *
 * Drop-in path: src/services/templates/templateService.ts
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 */

import type { EditorTemplate } from '../../components/Config/Protocols/SynopticEditor';
import { PROTOCOL_REGISTRY, Protocol, LifecycleState, notifyRegistryChanged, saveRegistryOverride } from '../../components/Config/Protocols/protocolShared';
import { getSessionUser } from '../auth/caseAccessControl';
import { fromLegacyName, formatFullDisplayName } from '../../utils/personName';
import { inheritedCopyAttributes } from './protocolLifecycle';
import { mohsTemplateProblems } from './mohsStages';
import {
  calcTemplateCoverage, canDraftTemplates, decideApprove, decidePublish, withEditor, SNOMED_PUBLISH_THRESHOLD,
  type TemplateActor,
} from './templatePublishingRules';
import { getTemplateGovernanceSettings } from './templateGovernanceSettings';
import { dataStorage } from '../browserData/dataStorage';
import { auditService } from '../auditlog/auditServiceInstance';
import { DEMO_CHECKLIST_LOADERS } from './demoChecklistLoaders';
import { checklistCopyRefusal } from './demoChecklists';
import { templateLifecycleAuditEntry, type TemplateLifecycleEvent, type TemplateLifecycleSubject } from './templateLifecycleAudit';

// â”€â”€â”€ Shared types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type TemplateStatus = LifecycleState | 'deprecated';

/** Real, per direct guidance - mirrors protocolShared.tsx's own
 *  isDiagnosticProtocol() exactly (default true when unset - the same
 *  "effectively all CAP/RCPath/diagnostic-Custom protocols" reasoning
 *  applies here). Use this rather than reading .isDiagnostic directly. */
export function isTemplateDiagnostic(t: Pick<TemplateSummary, 'isDiagnostic'>): boolean {
  return t.isDiagnostic !== false;
}

export interface TemplateSummary {
  id:           string;
  name:         string;
  source:       string;
  version:      string;
  category:     string;
  status:       TemplateStatus;
  fields:       number;
  sections:     number;
  createdBy:    string;
  createdAt:    string;
  updatedAt:    string;
  submittedAt?: string;
  publishedAt?: string;
  /** Real, per direct guidance - whether this protocol's answers are
   *  real diagnostic content (post-microscopy) as opposed to
   *  procedural/Grossing checklist data. Mirrors
   *  Protocol.isDiagnostic exactly - undefined here means the same
   *  thing it means there (defaults true; use isTemplateDiagnostic()
   *  below rather than reading this directly). */
  isDiagnostic?: boolean;
}

export interface TemplateDetail extends TemplateSummary {
  template:     EditorTemplate;
  reviewNote?:  string;
  reviewedBy?:  string;
}

export interface SaveDraftResult {
  id:        string;
  status:    'draft';
  updatedAt: string;
}

export interface SubmitResult {
  id:          string;
  status:      'in_review';
  submittedAt: string;
}

export interface TransitionResult {
  id:          string;
  status:      TemplateStatus;
  reviewNote?: string;
  updatedAt:   string;
  /** Approve only: approvals that now count toward publishing (PS-63). */
  approvalCount?: number;
}

export interface ServiceError {
  code:    string;
  message: string;
  /** Publish refusals (PS-63): the template's SNOMED % or approval count. */
  coverage?: number;
  approvalCount?: number;
}

// â”€â”€â”€ In-memory editor state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Stores the full EditorTemplate structure keyed by id.
// PROTOCOL_REGISTRY holds the summary/status view; this holds the field data.
// Both are updated together on every write.
//
// localStorage bridge — same pattern as protocolShared.tsx's registry
// overrides, added for the same reason: this was a plain in-memory Map,
// meaning a real Build/Customise session lost all its field/section work
// on a page refresh even though the registry's lifecycle status (draft,
// in_review, etc.) survived. That mismatch was flagged directly rather
// than left implicit — a template could show "draft" in the registry
// with no real content behind it anymore. Local-only, same tradeoff as
// the registry bridge: fast, protects against accidental refresh, but
// doesn't sync across machines or survive clearing browser data. A real
// backend-backed autosave is separate, larger scope — deliberately not
// attempted here.
// Key: ps_editor_store_v1  Value: Record<id, EditorTemplate>

const editorStore = new Map<string, EditorTemplate>();

const EDITOR_STORE_KEY = 'ps_editor_store_v1';

function loadEditorStoreOverrides(): Record<string, EditorTemplate> {
  try {
    const raw = dataStorage.getItem(EDITOR_STORE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveEditorStoreOverride(id: string, template: EditorTemplate): void {
  try {
    const overrides = loadEditorStoreOverrides();
    overrides[id] = template;
    dataStorage.setItem(EDITOR_STORE_KEY, JSON.stringify(overrides));
  } catch { /* storage unavailable */ }
}

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const delay = (ms = 400) => new Promise(res => setTimeout(res, ms));

const now = () => new Date().toISOString();

// ─── PS-63 review governance helpers ────────────────────────────────────────

/** The signed-in user as the publishing rules see them: the capabilities held at the moment of the
 *  action (Batch 664: no role names). `displayName` is the name the reviewer
 *  page shows (AuthContext user.name). */
async function currentActor(displayName?: string): Promise<TemplateActor | null> {
  const session = getSessionUser();
  if (!session) return null;
  let capabilities: string[] = [];
  try { capabilities = [...await (await authz()).grantedCapabilities()]; } catch { /* none: nothing is permitted */ }
  return { id: session.id, name: displayName ?? resolveOwnerDisplayName(), capabilities };
}

/** Batch 428: the protocol capabilities are checked at each action, audited
 *  (config:protocol:draft / approve / publish / retire). */
async function authz() {
  return (await import('../authorization/defaultAuthorizationService')).authorizationService;
}

/** Whether the signed-in user may draft templates (Template Author, or
 *  Admin by inheritance). The editor uses it to open read-only. */
export async function canCurrentUserDraftTemplates(): Promise<boolean> {
  return canDraftTemplates(await currentActor());
}

/** Plain-English messages for the log; the reviewer page shows its own
 *  translated text for each code. */
const GOVERNANCE_MESSAGES: Record<string, string> = {
  NOT_TEMPLATE_AUTHOR:    'Drafting templates requires the Template Author role.',
  NOT_APPROVER:           'Approving, publishing or returning a template needs that permission (Template Approver, Lab Director and Admin hold it).',
  NOT_PERMITTED:          'Retiring or restoring a protocol needs the permission to retire protocols.',
  SELF_APPROVAL:          'This template requires independent review before publication. Please assign a reviewer or request sign-off from a Lab Director.',
  ALREADY_APPROVED:       'You have already approved this template.',
  NOT_ENOUGH_APPROVALS:   'This template does not yet have the required number of independent approvals.',
  SNOMED_BELOW_THRESHOLD: `Templates require at least ${SNOMED_PUBLISH_THRESHOLD}% SNOMED coverage before publishing.`,
  MOHS_HISTOLOGY_SOURCE:  'A Mohs stage question takes its default histology from a question that no longer exists or is not a choice question.',
  DEMO_CHECKLIST_COPY:    'A checklist with demonstration wording cannot be copied until a pathologist has reviewed it.',
};

/** Batch 463b: a template whose Mohs stage question names a missing or
 *  non-choice default-histology source can't go to review or be published. */
async function assertMohsHistologySources(id: string): Promise<void> {
  await ensureSeedTemplate(id);
  const stored = editorStore.get(id);
  if (stored && mohsTemplateProblems(stored as never).length) throw governanceError('MOHS_HISTOLOGY_SOURCE');
}

function governanceError(code: string, extra: { coverage?: number; approvalCount?: number } = {}): ServiceError {
  return {
    code,
    message: GOVERNANCE_MESSAGES[code] ?? code,
    ...(extra.coverage !== undefined ? { coverage: extra.coverage } : {}),
    ...(extra.approvalCount !== undefined ? { approvalCount: extra.approvalCount } : {}),
  };
}

/** Field-level SNOMED % used by the publish check: from the template's own
 *  content when the editor has it, else the registry's seeded figure.
 *  publishTemplate has already loaded the seed (assertMohsHistologySources). */
function publishCoverage(id: string, entry: Protocol): number {
  const stored = editorStore.get(id);
  if (stored && stored.sections?.some(sec => sec.fields.length > 0)) return calcTemplateCoverage(stored).snomed;
  return entry.snomedPct ?? 0;
}

function registryEntry(id: string): Protocol | undefined {
  return PROTOCOL_REGISTRY.find(p => p.id === id);
}

function upsertRegistry(patch: Partial<Protocol> & { id: string }): void {
  const idx = PROTOCOL_REGISTRY.findIndex(p => p.id === patch.id);
  if (idx >= 0) {
    PROTOCOL_REGISTRY[idx] = { ...PROTOCOL_REGISTRY[idx], ...patch };
  } else {
    // New entry â€” build a full Protocol from the patch
    PROTOCOL_REGISTRY.push({
      name:         patch.name         ?? 'Untitled',
      category:     patch.category     ?? 'OTHER',
      version:      patch.version      ?? '1.0.0',
      source:       (patch.source as Protocol['source']) ?? 'Custom',
      type:         patch.type         ?? 'Custom',
      status:       patch.status       ?? 'draft',
      fields:       patch.fields       ?? 0,
      snomedPct:    patch.snomedPct    ?? 0,
      icdPct:       patch.icdPct       ?? 0,
      lastModified: patch.lastModified ?? now().slice(0, 10),
      owner:        patch.owner        ?? 'Current User',
      ...patch,
    } as Protocol);
  }
  // Persist to localStorage so transitions survive page reloads (mock-phase bridge)
  saveRegistryOverride(patch);
  // Any registry change can alter a status-filtered list (e.g. an archived
  // protocol must leave the 'published' picker), so cached list results are
  // dropped. Detail entries stay: their template content is unchanged.
  templateListCache.clear();
  notifyRegistryChanged();
}

// ─── Real prefetch/cache layer ─────────────────────────────────────────────
// Added to close a real load-time gap: RightSynopticPanel.tsx couldn't
// start fetching a case's template until AFTER the case itself had
// loaded and the panel had mounted — a genuinely sequential dependency
// chain (case fetch -> mount -> template fetch) that stacks their
// artificial mock delays (30ms + 350ms) instead of overlapping them.
// These cache the actual in-flight PROMISE, not just the resolved value
// — that's what lets a prefetch triggered from the worklist (before
// navigation even completes) and the real load inside
// RightSynopticPanel.tsx share the SAME request instead of firing two,
// even if the real load's own call happens before the prefetch settles.
const templateDetailCache = new Map<string, Promise<TemplateDetail>>();
const templateListCache   = new Map<string, Promise<Protocol[]>>();

export function getTemplateCached(id: string): Promise<TemplateDetail> {
  let entry = templateDetailCache.get(id);
  if (!entry) {
    entry = getTemplate(id);
    templateDetailCache.set(id, entry);
    // A failed fetch shouldn't poison the cache forever — let a later
    // caller retry instead of being stuck replaying the same rejection.
    entry.catch(() => templateDetailCache.delete(id));
  }
  return entry;
}

export function listTemplatesCached(status?: TemplateStatus | TemplateStatus[]): Promise<Protocol[]> {
  const key = status ? (Array.isArray(status) ? status.join(',') : status) : '__all__';
  let entry = templateListCache.get(key);
  if (!entry) {
    entry = listTemplates(status);
    templateListCache.set(key, entry);
    entry.catch(() => templateListCache.delete(key));
  }
  return entry;
}

/** Real prefetch trigger — call the moment a case is clicked in the
 *  worklist, well before navigation to the report page completes, so
 *  both requests are already in flight (or resolved) by the time
 *  RightSynopticPanel.tsx actually needs them. Deliberately takes the
 *  template id directly rather than re-fetching the case to find it —
 *  the worklist already has the full case object in memory at click
 *  time, so there's no reason to pay a second round trip just to learn
 *  something already known. */
export function prefetchTemplateData(templateId: string | undefined): void {
  if (!templateId) return;
  getTemplateCached(templateId).catch(() => {});
  listTemplatesCached('approved').catch(() => {});
}

// â”€â”€â”€ GET /api/templates â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function listTemplates(
  status?: TemplateStatus | TemplateStatus[]
): Promise<Protocol[]> {
  await delay(300);

  // â”€â”€ MOCK â”€â”€
  const statuses = status ? (Array.isArray(status) ? status : [status]) : null;
  return PROTOCOL_REGISTRY.filter(p => !statuses || statuses.includes(p.status as TemplateStatus));

  // â”€â”€ REAL â”€â”€
  // const q = status ? `?status=${Array.isArray(status) ? status.join(',') : status}` : '';
  // const res = await fetch(`/api/templates${q}`);
  // if (!res.ok) throw await res.json() as ServiceError;
  // return res.json();
}

// â”€â”€â”€ GET /api/templates/:id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function getTemplate(id: string): Promise<TemplateDetail> {
  await delay(350);

  // â”€â”€ MOCK â”€â”€
  const entry = registryEntry(id);
  await ensureSeedTemplate(id);
  const storedTemplate = editorStore.get(id);

  // Fallback: template seeded directly into editorStore but not in PROTOCOL_REGISTRY
  // (e.g. skin_melanoma_bx, or any template added via editorStore.set without a registry entry)
  if (!entry && storedTemplate) {
    const tpl = storedTemplate as any;
    const fieldCount = (tpl.sections ?? []).reduce((n: number, s: any) => n + (s.fields?.length ?? 0), 0);
    return {
      id,
      name:      tpl.name ?? id,
      source:    tpl.source ?? 'Custom',
      version:   tpl.version ?? '1.0.0',
      category:  tpl.category ?? 'Other',
      status:    'approved' as TemplateStatus,
      fields:    fieldCount,
      sections:  (tpl.sections ?? []).length,
      createdBy: 'System',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      template:  storedTemplate,
      isDiagnostic: tpl.isDiagnostic,
    };
  }

  if (!entry) throw { code: 'NOT_FOUND', message: `Template ${id} not found` } as ServiceError;
  const template = storedTemplate ?? {
    id, name: entry.name, source: entry.source,
    version: entry.version, category: entry.category, sections: [],
  };
  return {
    id:          entry.id,
    name:        entry.name,
    source:      entry.source,
    version:     entry.version,
    category:    entry.category,
    status:      entry.status as TemplateStatus,
    fields:      entry.fields,
    sections:    0,
    createdBy:   entry.owner,
    createdAt:   entry.lastModified,
    updatedAt:   entry.lastModified,
    reviewNote:  entry.reviewNote,
    template,
    isDiagnostic: entry.isDiagnostic,
  };

  // â”€â”€ REAL â”€â”€
  // const res = await fetch(`/api/templates/${id}`);
  // if (!res.ok) throw await res.json() as ServiceError;
  // return res.json();
}

// â”€â”€â”€ POST /api/templates â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Real fix, found via a direct audit: this used to hardcode
// owner: 'Current User' with a `// TODO: replace with auth context`
// comment — every template ever saved through this function got
// credited to a literal, fake name regardless of who actually saved
// it. getSessionUser() already exists and is used throughout this app;
// this just wires it in here too, with an honest fallback ('Unknown
// User', not a guess) for the genuinely-unauthenticated edge case.
function resolveOwnerDisplayName(): string {
  const session = getSessionUser();
  if (!session?.firstName && !session?.lastName) return 'Unknown User';
  return formatFullDisplayName(fromLegacyName(session.firstName ?? '', session.lastName ?? ''));
}

/** Batch 609 (#39): a lifecycle step goes to the Audit Log (it used to go to the console only). Never blocks the step. */
async function auditLifecycle(event: TemplateLifecycleEvent, subject: TemplateLifecycleSubject): Promise<void> {
  try { await auditService.logEvent(templateLifecycleAuditEntry(event, subject, resolveOwnerDisplayName())); } catch { /* the audit service is best-effort here */ }
}

export async function saveDraft(template: EditorTemplate): Promise<SaveDraftResult> {
  await delay(400);
  // PS-63 (Batch 329): drafting is limited to Template Author (Admin inherits).
  const author = await currentActor();
  if (!author || !(await (await authz()).enforce('config:protocol:draft')).allowed) throw governanceError('NOT_TEMPLATE_AUTHOR');
  // Batch 755a: a first save of a copy whose source is a demonstration checklist is refused (whatever the screen allowed).
  if (!registryEntry(template.id) && checklistCopyRefusal(template.copiedFromId)) throw governanceError('DEMO_CHECKLIST_COPY');

  // â”€â”€ MOCK â”€â”€
  const ts = now();
  // A Duplicate / New Version's first save inherits its source's
  // registry-only attributes (isDiagnostic, type, group); see
  // protocolLifecycle.ts → inheritedCopyAttributes.
  const inherited = !registryEntry(template.id) && template.copiedFromId
    ? inheritedCopyAttributes(registryEntry(template.copiedFromId))
    : {};
  editorStore.set(template.id, template);
  saveEditorStoreOverride(template.id, template);
  upsertRegistry({
    ...inherited,
    id:           template.id,
    name:         template.name || 'Untitled',
    source:       template.source as Protocol['source'],
    version:      template.version,
    category:     template.category,
    status:       'draft',
    fields:       template.sections.reduce((n, s) => n + s.fields.length, 0),
    lastModified: ts.slice(0, 10),
    owner:        resolveOwnerDisplayName(),
    ...(template.supersedesId ? { supersedesId: template.supersedesId } : {}),
    // PS-63: everyone who edits a template counts as its author for the
    // self-approval rule, and an edit starts a new review round.
    editorIds:    withEditor(registryEntry(template.id)?.editorIds, author.id),
    approvals:    [],
  });

  await auditLifecycle('TEMPLATE_DRAFT_SAVED', { id: template.id, name: template.name, version: template.version, to: 'draft' });
  return { id: template.id, status: 'draft', updatedAt: ts };

  // â”€â”€ REAL â”€â”€
  // const res = await fetch('/api/templates', {
  //   method: 'POST', headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ template }),
  // });
  // if (!res.ok) throw await res.json() as ServiceError;
  // return res.json();
}

// â”€â”€â”€ POST /api/templates/:id/submit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function submitForReview(id: string, note?: string): Promise<SubmitResult> {
  await delay(500);
  if (!(await (await authz()).enforce('config:protocol:draft')).allowed) throw governanceError('NOT_TEMPLATE_AUTHOR');

  // â”€â”€ MOCK â”€â”€
  const entry = registryEntry(id);
  if (!entry) throw { code: 'NOT_FOUND', message: `Template ${id} not found` } as ServiceError;
  await assertMohsHistologySources(id);

  const ts = now();
  upsertRegistry({ id, status: 'in_review', lastModified: ts.slice(0, 10), reviewNote: note, approvals: [] });

  await auditLifecycle('TEMPLATE_SUBMITTED', { id, name: entry.name, version: entry.version, from: entry.status, to: 'in_review', noted: !!note?.trim() });
  return { id, status: 'in_review', submittedAt: ts };

  // â”€â”€ REAL â”€â”€
  // const res = await fetch(`/api/templates/${id}/submit`, {
  //   method: 'POST', headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ note }),
  // });
  // if (!res.ok) throw await res.json() as ServiceError;
  // return res.json();
}

// â”€â”€â”€ POST /api/templates/:id/approve â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function approveTemplate(id: string, note?: string, reviewedBy?: string): Promise<TransitionResult> {
  await delay(500);
  if (!(await (await authz()).enforce('config:protocol:approve')).allowed) throw governanceError('NOT_APPROVER');

  // â”€â”€ MOCK â”€â”€
  const entry = registryEntry(id);
  if (!entry) throw { code: 'NOT_FOUND', message: `Template ${id} not found` } as ServiceError;

  const ts = now();
  // PS-63: approver role, no self-approval (unless the site allows it), and
  // the template becomes 'approved' only once it has the site's required
  // number of approvals. Refusals throw ServiceError with the rule's code.
  const actor = await currentActor(reviewedBy);
  const decision = decideApprove(entry, actor, getTemplateGovernanceSettings(), ts);
  if (decision.ok === false) throw governanceError(decision.code);

  upsertRegistry({
    id, status: decision.status,
    approvals: decision.approvals,
    reviewedBy: actor?.name ?? reviewedBy ?? 'Unknown User',
    reviewedAt: ts,
    lastModified: ts.slice(0, 10), reviewNote: note,
  });

  await auditLifecycle('TEMPLATE_APPROVED', { id, name: entry.name, version: entry.version, from: entry.status, to: decision.status, approvals: decision.approvalCount, noted: !!note?.trim() });
  return { id, status: decision.status, updatedAt: ts, approvalCount: decision.approvalCount };

  // â”€â”€ REAL â”€â”€
  // const res = await fetch(`/api/templates/${id}/approve`, {
  //   method: 'POST', headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ note }),
  // });
  // if (!res.ok) throw await res.json() as ServiceError;
  // return res.json();
}

// â”€â”€â”€ POST /api/templates/:id/publish â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function publishTemplate(id: string, _note?: string, publishedBy?: string): Promise<TransitionResult> {
  await delay(600);
  if (!(await (await authz()).enforce('config:protocol:publish')).allowed) throw governanceError('NOT_APPROVER');

  // â”€â”€ MOCK â”€â”€
  const entry = registryEntry(id);
  if (!entry) throw { code: 'NOT_FOUND', message: `Template ${id} not found` } as ServiceError;

  await assertMohsHistologySources(id);
  const ts = now();
  // PS-63: approver role, no self-publishing (unless the site allows it),
  // enough approvals, and ≥80% SNOMED coverage for diagnostic templates.
  const actor = await currentActor(publishedBy);
  const decision = decidePublish(entry, actor, getTemplateGovernanceSettings(), publishCoverage(id, entry));
  if (decision.ok === false) throw governanceError(decision.code, decision);
  if (!actor) throw governanceError('NOT_APPROVER'); // decidePublish already refuses a missing actor

  upsertRegistry({ id, status: 'published', reviewNote: undefined, lastModified: ts.slice(0, 10), publishedById: actor.id, publishedAt: ts });

  // New Version lineage (PS-73): publishing a version retires the published
  // version it supersedes, so only one version of a protocol is ever live.
  const predecessor = entry.supersedesId ? registryEntry(entry.supersedesId) : undefined;
  if (predecessor && predecessor.status === 'published') {
    upsertRegistry({ id: predecessor.id, status: 'archived', archivedAt: ts, lastModified: ts.slice(0, 10) });
    await auditLifecycle('TEMPLATE_SUPERSEDED', { id: predecessor.id, name: predecessor.name, version: predecessor.version, from: 'published', to: 'archived' });
  }

  await auditLifecycle('TEMPLATE_PUBLISHED', { id, name: entry.name, version: entry.version, from: entry.status, to: 'published' });

  // Notify the requester if template was built from a request
  // Requester info stored in reviewNote as NOTIFY_REQUESTER:{...} marker
  try {
    const metaMatch = (entry.reviewNote ?? '').match(/NOTIFY_REQUESTER:({.*?})/);
    if (metaMatch) {
      const meta = JSON.parse(metaMatch[1]);
      if (meta.requesterId && meta.requesterName) {
        const { messageService } = await import('../../services');
        await messageService.send({
          senderId: 'u3', senderName: 'System Admin',
recipientId: meta.requesterId, recipientName: meta.requesterName,
subject: `Your template request is ready — ${entry.name}`,
body: `Great news — the synoptic template you requested, "${entry.name}", has been published and is now available in the Synoptic Library. You can add it to any case via "+ Add Synoptic Report".`,
timestamp: new Date(), isUrgent: false,
caseNumber: '',
        });
      }
    }
  } catch { /* notification is best-effort */ }
  return { id, status: 'published', updatedAt: ts };

  // â”€â”€ REAL â”€â”€
  // const res = await fetch(`/api/templates/${id}/publish`, {
  //   method: 'POST', headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ note }),
  // });
  // if (!res.ok) throw await res.json() as ServiceError;
  // return res.json();
}

// â”€â”€â”€ POST /api/templates/:id/request-changes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function requestChanges(id: string, note: string, reviewedBy?: string): Promise<TransitionResult> {
  await delay(500);
  // Batch 428: a reviewer's decision (it clears the round's approvals).
  if (!(await (await authz()).enforce('config:protocol:approve')).allowed) throw governanceError('NOT_APPROVER');
  // Recorded the way an approval is (the reviewer page passes the signed-in person's name).
  const reviewer = await currentActor(reviewedBy);

  // â”€â”€ MOCK â”€â”€
  const entry = registryEntry(id);
  if (!entry) throw { code: 'NOT_FOUND', message: `Template ${id} not found` } as ServiceError;

  const ts = now();
  upsertRegistry({
    id, status: 'needs_changes', reviewNote: note,
    reviewedBy: reviewer?.name ?? reviewedBy ?? 'Unknown User',
    reviewedAt: ts,
    lastModified: ts.slice(0, 10),
    approvals: [],
  });

  await auditLifecycle('TEMPLATE_CHANGES_REQUESTED', { id, name: entry.name, version: entry.version, from: entry.status, to: 'needs_changes', noted: !!note?.trim() });
  return { id, status: 'needs_changes', reviewNote: note, updatedAt: ts };

  // â”€â”€ REAL â”€â”€
  // const res = await fetch(`/api/templates/${id}/request-changes`, {
  //   method: 'POST', headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ note }),
  // });
  // if (!res.ok) throw await res.json() as ServiceError;
  // return res.json();
}

// â”€â”€â”€ POST /api/templates/:id/resubmit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function resubmitForReview(id: string, _note?: string): Promise<SubmitResult> {
  await delay(500);
  // The author resubmits; a reviewer may also move it back into review.
  {
    // Batch 428: checked against whichever of the two the person holds.
    const a = await authz();
    const granted = await a.grantedCapabilities();
    const ok = granted.has('config:protocol:draft')
      ? (await a.enforce('config:protocol:draft')).allowed
      : (await a.enforce('config:protocol:approve')).allowed;
    if (!ok) throw governanceError('NOT_TEMPLATE_AUTHOR');
  }

  // â”€â”€ MOCK â”€â”€
  const entry = registryEntry(id);
  if (!entry) throw { code: 'NOT_FOUND', message: `Template ${id} not found` } as ServiceError;

  await assertMohsHistologySources(id);
  const ts = now();
  upsertRegistry({ id, status: 'in_review', reviewNote: undefined, lastModified: ts.slice(0, 10), approvals: [] });

  await auditLifecycle('TEMPLATE_RESUBMITTED', { id, name: entry.name, version: entry.version, from: entry.status, to: 'in_review' });
  return { id, status: 'in_review', submittedAt: ts };

  // â”€â”€ REAL â”€â”€
  // const res = await fetch(`/api/templates/${id}/resubmit`, {
  //   method: 'POST', headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ note }),
  // });
  // if (!res.ok) throw await res.json() as ServiceError;
  // return res.json();
}

// â”€â”€â”€ DELETE /api/templates/:id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function deleteTemplate(id: string): Promise<{ deleted: true }> {
  await delay(300);
  if (!(await (await authz()).enforce('config:protocol:draft')).allowed) throw governanceError('NOT_TEMPLATE_AUTHOR');

  // â”€â”€ MOCK â”€â”€
  const idx = PROTOCOL_REGISTRY.findIndex(p => p.id === id);
  if (idx < 0) throw { code: 'NOT_FOUND', message: `Template ${id} not found` } as ServiceError;
  if (PROTOCOL_REGISTRY[idx].status !== 'draft') {
    throw { code: 'FORBIDDEN', message: 'Only draft templates can be deleted' } as ServiceError;
  }
  const removed = PROTOCOL_REGISTRY[idx];
  PROTOCOL_REGISTRY.splice(idx, 1);
  editorStore.delete(id);
  deletedSeeds.add(id);

  // Remove from localStorage persistence store
  try {
    const { loadRegistryOverrides } = await import('../../components/Config/Protocols/protocolShared');
    const overrides = loadRegistryOverrides();
    delete overrides[id];
    dataStorage.setItem('ps_registry_overrides_v1', JSON.stringify(overrides));
  } catch { /* storage unavailable */ }

  await auditLifecycle('TEMPLATE_DRAFT_DELETED', { id, name: removed.name, version: removed.version, from: 'draft' });
  return { deleted: true };

  // â”€â”€ REAL â”€â”€
  // const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
  // if (!res.ok) throw await res.json() as ServiceError;
  // return res.json();
}

// ─── Archive / restore (PS-73, Batch 317) ────────────────────────────────────
// Archive retires a protocol from use in any state: it drops out of every
// status-filtered list (published/approved pickers), while existing reports
// keep their content. Restore brings it back as a DRAFT, so it goes through
// review again before anyone can report with it. Rules:
// services/templates/protocolLifecycle.ts.
// Batch 431: the reviewer page no longer keeps its own copy of a protocol's
// lifecycle state (the old `ps_state_<id>` browser value), so archive,
// restore and supersede have nothing to clear; old copies are removed at
// start-up (services/browserCleanup/retiredBrowserKeys.ts).

export async function archiveTemplate(id: string): Promise<TransitionResult> {
  await delay(300);
  // Batch 428: retiring a protocol, even a published one, is its own capability.
  if (!(await (await authz()).enforce('config:protocol:retire')).allowed) throw governanceError('NOT_PERMITTED');
  const entry = registryEntry(id);
  if (!entry) throw { code: 'NOT_FOUND', message: `Template ${id} not found` } as ServiceError;
  if (entry.status === 'archived') throw { code: 'INVALID_TRANSITION', message: `Template ${id} is already archived` } as ServiceError;
  const ts = now();
  upsertRegistry({ id, status: 'archived', archivedAt: ts, lastModified: ts.slice(0, 10) });
  await auditLifecycle('TEMPLATE_ARCHIVED', { id, name: entry.name, version: entry.version, from: entry.status, to: 'archived' });
  return { id, status: 'archived', updatedAt: ts };
}

export async function restoreTemplate(id: string): Promise<TransitionResult> {
  await delay(300);
  if (!(await (await authz()).enforce('config:protocol:retire')).allowed) throw governanceError('NOT_PERMITTED');
  const entry = registryEntry(id);
  if (!entry) throw { code: 'NOT_FOUND', message: `Template ${id} not found` } as ServiceError;
  if (entry.status !== 'archived') throw { code: 'INVALID_TRANSITION', message: `Template ${id} is not archived` } as ServiceError;
  const ts = now();
  upsertRegistry({ id, status: 'draft', archivedAt: undefined, lastModified: ts.slice(0, 10) });
  await auditLifecycle('TEMPLATE_RESTORED', { id, name: entry.name, version: entry.version, from: 'archived', to: 'draft' });
  return { id, status: 'draft', updatedAt: ts };
}

// â”€â”€â”€ Convenience: lifecycle transition dispatcher â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
/** The reviewer page's Reset: back to draft, starting a new review round.
 *  (Before Batch 328 there was no handler, so Reset only changed the
 *  reviewer page's local copy and the registry never moved.) */
export async function resetToDraft(id: string): Promise<TransitionResult> {
  await delay(300);
  // Batch 428: a reviewer's decision (it clears the round's approvals).
  if (!(await (await authz()).enforce('config:protocol:approve')).allowed) throw governanceError('NOT_APPROVER');
  const entry = registryEntry(id);
  if (!entry) throw { code: 'NOT_FOUND', message: `Template ${id} not found` } as ServiceError;
  if (entry.status === 'published' || entry.status === 'archived') {
    throw { code: 'INVALID_TRANSITION', message: `A ${entry.status} template can't be reset to draft` } as ServiceError;
  }
  const ts = now();
  upsertRegistry({ id, status: 'draft', approvals: [], lastModified: ts.slice(0, 10) });
  await auditLifecycle('TEMPLATE_RESET_TO_DRAFT', { id, name: entry.name, version: entry.version, from: entry.status, to: 'draft' });
  return { id, status: 'draft', updatedAt: ts };
}

export async function transitionTemplate(
  id:         string,
  target:     TemplateStatus,
  note?:      string,
  reviewedBy?: string
): Promise<TransitionResult | SubmitResult> {
  switch (target) {
    case 'in_review':     return resubmitForReview(id, note);
    case 'approved':      return approveTemplate(id, note, reviewedBy);
    case 'published':     return publishTemplate(id, note, reviewedBy);
    case 'draft':         return resetToDraft(id);
    case 'needs_changes': return requestChanges(id, note ?? '', reviewedBy);
    case 'archived':      return archiveTemplate(id);
    default:
      throw { code: 'INVALID_TRANSITION', message: `No handler for transition to ${target}` } as ServiceError;
  }
}

// â”€â”€â”€ Terminology validation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// POST /api/v1/terminology/validate (see /docs/api/pathscribe-api-contract.yaml)
//
// Mock phase: validates against MOCK_DEPRECATED_CODES.
// Real phase: replace function body with fetch() to the backend endpoint.

export interface TermCode {
  code:    string;
  system:  'snomed' | 'icd';
  display: string;
}

export interface TerminologyAlert {
  id:           string;    // stable key for dismiss tracking: `${system}:${code}:${fieldId}`
  severity:     'error' | 'warning';
  system:       'snomed' | 'icd';
  code:         string;
  message:      string;
  fieldId?:     string;
  fieldLabel?:  string;
  optionId?:    string;
  optionLabel?: string;
  replacements?: TermCode[];
}

// Known deprecated codes â€” mock registry.
// Format: code â†’ { severity, message, replacements? }
// Replace with API call in real phase.
const MOCK_DEPRECATED_CODES: Record<string, {
  system:       'snomed' | 'icd';
  severity:     'error' | 'warning';
  message:      string;
  replacements?: TermCode[];
}> = {
  // SNOMED CT â€” retired concepts
  '363346000': {
    system: 'snomed', severity: 'error',
    message: 'SNOMED CT 363346000 (Malignant neoplastic disease) was retired on 2024-01-31.',
    replacements: [{ code: '363346001', system: 'snomed', display: 'Malignant neoplasm (disorder)' }],
  },
  '188340000': {
    system: 'snomed', severity: 'error',
    message: 'SNOMED CT 188340000 has been retired. Use the updated concept below.',
    replacements: [{ code: '254837009', system: 'snomed', display: 'Malignant neoplasm of breast (disorder)' }],
  },
  '413448000': {
    system: 'snomed', severity: 'warning',
    message: 'SNOMED CT 413448000 is flagged for deprecation in the next release (Jan 2026). Plan replacement.',
    replacements: [{ code: '413448001', system: 'snomed', display: 'Adenocarcinoma of colon (disorder)' }],
  },
  // ICD â€” retired codes
  'C18':  {
    system: 'icd', severity: 'warning',
    message: 'ICD-10 C18 (unspecified) â€” use a more specific 4th-character code (e.g. C18.0â€“C18.9) for CAP compliance.',
  },
  'D05.1': {
    system: 'icd', severity: 'error',
    message: 'ICD-10 D05.1 was retired in ICD-11. Use ICD-11 2E65.0 (Lobular carcinoma in situ of breast) instead.',
    replacements: [{ code: '2E65.0', system: 'icd', display: 'Lobular carcinoma in situ of breast' }],
  },
};

export async function validateTerminologyCodes(
  template: EditorTemplate
): Promise<TerminologyAlert[]> {
  await delay(300);

  // â”€â”€ MOCK â”€â”€
  const alerts: TerminologyAlert[] = [];

  template.sections.forEach(section => {
    section.fields.forEach(field => {

      // Field-level SNOMED
      if (field.snomed) {
        const hit = MOCK_DEPRECATED_CODES[field.snomed];
        if (hit && hit.system === 'snomed') {
          alerts.push({
            id:           `snomed:${field.snomed}:${field.id}`,
            severity:     hit.severity,
            system:       'snomed',
            code:         field.snomed,
            message:      hit.message,
            fieldId:      field.id,
            fieldLabel:   field.label || '(unlabelled field)',
            replacements: hit.replacements,
          });
        }
      }

      // Field-level ICD
      if (field.icd) {
        const hit = MOCK_DEPRECATED_CODES[field.icd];
        if (hit && hit.system === 'icd') {
          alerts.push({
            id:           `icd:${field.icd}:${field.id}`,
            severity:     hit.severity,
            system:       'icd',
            code:         field.icd,
            message:      hit.message,
            fieldId:      field.id,
            fieldLabel:   field.label || '(unlabelled field)',
            replacements: hit.replacements,
          });
        }
      }

      // Option-level SNOMED + ICD
      field.options.forEach(option => {
        if (option.snomed) {
          const hit = MOCK_DEPRECATED_CODES[option.snomed];
          if (hit && hit.system === 'snomed') {
            alerts.push({
              id:           `snomed:${option.snomed}:${field.id}:${option.id}`,
              severity:     hit.severity,
              system:       'snomed',
              code:         option.snomed,
              message:      hit.message,
              fieldId:      field.id,
              fieldLabel:   field.label || '(unlabelled field)',
              optionId:     option.id,
              optionLabel:  option.label || '(unlabelled option)',
              replacements: hit.replacements,
            });
          }
        }
        if (option.icd) {
          const hit = MOCK_DEPRECATED_CODES[option.icd];
          if (hit && hit.system === 'icd') {
            alerts.push({
              id:           `icd:${option.icd}:${field.id}:${option.id}`,
              severity:     hit.severity,
              system:       'icd',
              code:         option.icd,
              message:      hit.message,
              fieldId:      field.id,
              fieldLabel:   field.label || '(unlabelled field)',
              optionId:     option.id,
              optionLabel:  option.label || '(unlabelled option)',
              replacements: hit.replacements,
            });
          }
        }
      });
    });
  });

  return alerts;

  // â”€â”€ REAL â”€â”€
  // const res = await fetch('/api/v1/terminology/validate', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ codes: extractCodes(template) }),
  // });
  // if (!res.ok) throw await res.json() as ServiceError;
  // return res.json();
}

// ─── DEVELOPMENT SEED (generic synoptic template JSON files) ─────────────
// These were originally derived from CAP protocol content. As of the
// CAP/RCPath content-licensing cleanup, all field labels, section titles,
// and option text have been replaced with generic placeholders -- no CAP
// or RCPath content remains in these files. Structure (field types,
// section counts) is preserved so the editor/validation UI still exercises
// the same code paths. Restore real CAP-derived content only once a CAP
// license is confirmed in place.
//
// Batch 505 (PS-475): seeds load ON DEMAND. They used to be imported
// statically and put into editorStore at module load, which put about
// 420 KB of template JSON into every first page load. Now each file is
// its own small chunk, fetched the first time something asks for that id
// (ensureSeedTemplate, awaited by every function that reads editorStore).
// Saved edits still win: hydration below puts them in editorStore first,
// and a seed never overwrites an id that's already there.
// Remove when the backend API is wired in.
//
// UK generic templates were formerly RCPath-derived (same licensing
// cleanup; ids and filenames dropped the "rcpath_" prefix and RCPath's
// document numbering, e.g. rcpath_g148_breast_surgical_excision ->
// breast_surgical_excision).
//
// Grossing templates do NOT rely on the getTemplate() "in editorStore but
// not in PROTOCOL_REGISTRY" fallback: each has an explicit, published
// PROTOCOL_REGISTRY entry in protocolShared.tsx ("Grossing Templates"),
// kept in sync by id. Three peer templates (Route A/B/C), not one generic
// plus variants: Stage 0's AI assignment picks one per specimen, the way
// CAP_TO_REPORT picks a Report Template in TemplateRoutingService.ts.
type SeedLoader = () => Promise<{ default: unknown }>;
// Batch 754: the 19 demonstration checklists (demoChecklists.ts) load from demoChecklistLoaders.ts, and only in builds
// that carry them: a customer build (mode "server") leaves them, and their files, out.
const SEED_TEMPLATE_LOADERS: Record<string, SeedLoader> = {
  // The mode is written in literally (not DEMO_CHECKLISTS_IN_BUILD) so the bundler can drop the branch and its files.
  ...(import.meta.env.MODE !== 'server' ? DEMO_CHECKLIST_LOADERS : {}),
  autopsy_gross_examination:  () => import('../../data/templates/Autopsy/autopsy_gross_examination.json'),
  // Batch 463: PathScribe's own Mohs synoptic (labs copy and customise it like any other).
  mohs_micrographic_surgery:  () => import('../../data/templates/generic/mohs_micrographic_surgery.json'),
  // Batch 465: PathScribe's head and neck synoptics.
  oral_cavity_resection:      () => import('../../data/templates/generic/oral_cavity_resection.json'),
  neck_dissection:            () => import('../../data/templates/generic/neck_dissection.json'),
  // Grossing and cytology templates
  grossing_standard_tissue:    () => import('../../data/templates/Grossing/grossing_standard_tissue.json'),
  grossing_fluid_cytology:     () => import('../../data/templates/Grossing/grossing_fluid_cytology.json'),
  grossing_histology_only:     () => import('../../data/templates/Grossing/grossing_histology_only.json'),
  thyroid_fna_cytology:        () => import('../../data/templates/Cytology/cytology_thyroid_fna_cytology.json'),
  salivary_gland_fna_cytology: () => import('../../data/templates/Cytology/cytology_salivary_gland_fna_cytology.json'),
  urine_cytology:              () => import('../../data/templates/Cytology/cytology_urine_cytology.json'),
  pancreaticobiliary_cytology: () => import('../../data/templates/Cytology/cytology_pancreaticobiliary_cytology.json'),
  lymph_node_fna_cytology:     () => import('../../data/templates/Cytology/cytology_lymph_node_fna_cytology.json'),
};

/** Ids of the seed templates PathScribe ships (loaded on demand). */
export const SEED_TEMPLATE_IDS: readonly string[] = Object.keys(SEED_TEMPLATE_LOADERS);

/** Seeds deleted this session: not fetched again (before Batch 505 a deleted
 *  seed also stayed gone until the page reloaded). */
const deletedSeeds = new Set<string>();

/** Puts a seed template's content into editorStore the first time it's needed.
 *  Never overwrites what's already there (a saved edit, or a draft). */
async function ensureSeedTemplate(id: string): Promise<void> {
  if (editorStore.has(id) || deletedSeeds.has(id)) return;
  const load = SEED_TEMPLATE_LOADERS[id];
  if (!load) return;
  const content = (await load()).default as EditorTemplate;
  if (!editorStore.has(id) && !deletedSeeds.has(id)) editorStore.set(id, content);
}

// Hydrate from localStorage on module load — saved template content takes
// precedence over the seed data (ensureSeedTemplate never overwrites it), same timing and same reasoning as
// protocolShared.tsx's registry hydration: reflects prior-session edits
// immediately, and restores any template that only ever existed at
// runtime (never had a hardcoded seed import at all).
{
  const overrides = loadEditorStoreOverrides();
  Object.entries(overrides).forEach(([id, template]) => {
    editorStore.set(id, template);
  });
}
