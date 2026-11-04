/**
 * services/enhancementRequestService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles routing of enhancement request submissions.
 * Supports two modes: Email and Portal (API/webhook).
 *
 * Mock phase: logs to console, simulates latency.
 * Real phase: swap bodies below — nothing in the UI layer changes.
 *
 * Drop-in path: src/services/enhancementRequestService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 */

const CONFIG_KEY = 'ps_enhancement_config_v1';

import { recordSimulatedEmail } from './communications/simulatedMailOutbox';
import { feedbackSettingsService } from './feedback/feedbackSettingsServiceInstance';
import type { IFeedbackSettingsService } from './feedback/IFeedbackSettingsService';
import { isCaseAddressReference } from './caseAddresses/caseAddresses';
import { sendEmailDetailed }                                from './communications/notificationService';
import { supportPageOf, caseNumbersIn, findIdentifiersInText, replaceIdentifiers, type IdentifierInText } from './supportReferences/supportTicketRules';
import { supportReferenceService }                          from './supportReferences/supportReferenceServiceInstance';
import type { ISupportReferenceService }                    from './supportReferences/ISupportReferenceService';
import type { ICaseService }                                from './cases/ICaseService';
import { buildEnhancementSubject, buildEnhancementHtml, buildEnhancementText }
                                                            from './communications/emailTemplates/enhancementEmailTemplates';
import { dataStorage } from './browserData/dataStorage';
import { auditService } from './auditlog/auditServiceInstance';
import { readSessionProfile } from './auth/sessionProfile';
import { effectiveEnhancementUrl, destinationHost, enhancementDeliveryBody, deliverToDestination } from './feedback/enhancementDestination';
import {
  VALIDATION_CATEGORY, FEEDBACK_ROUTED_TO_VALIDATION, validationRecipientsFor, validationAuditDetail, hasValidationLinks, type ValidationLinks,
} from './feedback/validationRouting';
import { appEnv } from '@/services/runtimeConfig/runtimeEnv';

// ─── Types ────────────────────────────────────────────────────────────────────

export type RoutingMode     = 'email' | 'portal';
export type RequestCategory =
  // Enhancement categories
  | 'UI' | 'Workflow' | 'Reporting' | 'Integrations' | 'Other'
  // QA / testing categories
  | 'UI Bug' | 'Functional Issue' | 'Data Issue' | 'Performance'
  // QA feedback about an AI model or a template under validation: goes to the validation recipients
  | typeof VALIDATION_CATEGORY;
export type RequestPriority = 'Low' | 'Medium' | 'High';

export interface EnhancementRequestConfig {
  mode:              RoutingMode;
  emailRecipients:   string[];       // enhancement request recipients
  /** Batch 447: from Configuration → System → Feedback (feedback/), not a build setting. */
  qaEmailRecipients: string[];       // QA feedback recipients
  qaAdminCc:         string[];       // admin cc for QA submissions
  /** From Configuration → System → Feedback: where 'AI / Template validation' feedback goes (empty: the QA recipients). */
  validationRecipients: string[];
  qaEnabled:         boolean;        // show QA feedback button in nav
  emailConfirmation: boolean;
  portalUrl:         string;
  portalApiKey:      string;         // memory only — never persisted
  portalProjectKey:  string;
}

export interface EnhancementRequestPayload {
  title:         string;
  description:   string;
  category:      RequestCategory;
  priority?:     RequestPriority;
  attachments:      File[];
  includeSystem:    boolean;
  mode?:            'enhancement' | 'qa';   // controls email routing
  /** The validation study and template an 'AI / Template validation' item is about (all optional). */
  validationLinks?: ValidationLinks;
  screenshotDataUrl?: string;               // base64 dataUrl — embedded in email body
  metadata?: {
    userId:      string;
    userName:    string;
    userRole:    string;
    timestamp:   string;
    appVersion:  string;
    browser:     string;
    os:          string;
    /** Batch 364 (PS-349): the page's route pattern ('/report/:caseId'), never its address. */
    currentPage: string;
    /** The case the page is about, as its support reference (never the case number). */
    caseSupportReference?: string;
  };
}

export interface SubmissionResult {
  success:    boolean;
  messageId?: string;
  ticketUrl?: string;
  error?:     string;
  /** Batch 604: true when no real mail service or ticket portal took it: the message sits in the Simulated mail outbox. */
  simulated?: boolean;
  /** A fixed code for a failure the screen words itself (NO_RECIPIENTS, DELIVERY_FAILED, NO_DESTINATION). */
  errorCode?: 'NO_RECIPIENTS' | 'DELIVERY_FAILED' | 'NO_DESTINATION';
  /** Validation feedback: which list took it, and whether that is the QA list because no validation recipients are set. */
  routedTo?: 'validation' | 'qa';
  validationFallback?: boolean;
  /** Enhancement requests sent (or, when simulated, not sent) to a website: its host, for the confirmation. */
  destinationHost?: string;
}

// ─── Config persistence ───────────────────────────────────────────────────────

export function loadEnhancementConfig(): EnhancementRequestConfig {
  try {
    const raw = dataStorage.getItem(CONFIG_KEY);
    if (raw) return { ...defaultConfig(), ...JSON.parse(raw) };
  } catch {}
  return defaultConfig();
}

function defaultConfig(): EnhancementRequestConfig {
  return {
    mode:              'email',
    // Enhancement requests — product team
    emailRecipients:   appEnv().VITE_ENHANCEMENT_EMAIL
                         ? [appEnv().VITE_ENHANCEMENT_EMAIL as string]
                         : [],
    // QA / testing feedback: filled from the feedback settings when sending
    // (loadEnhancementConfigForSubmit), Batch 447.
    qaEmailRecipients: [],
    qaAdminCc:         [],
    validationRecipients: [],
    qaEnabled:         false,
    emailConfirmation: true,
    portalUrl:         '',
    portalApiKey:      '',
    portalProjectKey:  '',
  };
}

/**
 * Batch 447: the configuration to send with, the QA recipients and button
 * taken from Configuration → System → Feedback.
 */
export async function loadEnhancementConfigForSubmit(
  settings: Pick<IFeedbackSettingsService, 'get' | 'qaButtonShown'> = feedbackSettingsService,
): Promise<EnhancementRequestConfig> {
  const base = loadEnhancementConfig();
  const [r, shown] = await Promise.all([settings.get(), settings.qaButtonShown()]);
  if (r.ok === false) return base;
  // The destination (the administrator's address, else the deployment's default) turns enhancement
  // requests into website deliveries; with neither they stay email.
  const portalUrl = effectiveEnhancementUrl(r.data.enhancementUrl);
  return {
    ...base,
    qaEmailRecipients: r.data.qaRecipients, qaAdminCc: r.data.qaAdminCc, validationRecipients: r.data.validationRecipients ?? [], qaEnabled: shown,
    ...(portalUrl ? { mode: 'portal' as const, portalUrl } : {}),
  };
}

export function saveEnhancementConfig(config: EnhancementRequestConfig): void {
  // Never persist API key to localStorage
  const safe = { ...config, portalApiKey: '' };
  dataStorage.setItem(CONFIG_KEY, JSON.stringify(safe));
}

// ─── Metadata capture ─────────────────────────────────────────────────────────

// Batch 364 (PS-349): the page used to be sent as its address
// (window.location.pathname + search), which on a case is e.g.
// /report/S26-4403: the case number reached the support inbox even though
// the screenshot was redacted. It is now the route pattern, and the case
// goes as its support reference (services/supportReferences/).
export async function captureMetadata(
  user: { id: string; name: string; role: string },
  deps: { supportReferenceService: ISupportReferenceService; pathname: string } = { supportReferenceService, pathname: window.location.pathname },
): Promise<EnhancementRequestPayload['metadata']> {
  const page = supportPageOf(deps.pathname);
  // Batch 446: case pages are addressed by the reference already; an old
  // accession address still gets its reference looked up.
  const caseRef = !page.caseId ? null
    : isCaseAddressReference(page.caseId) ? { ok: true as const, data: { ref: page.caseId } }
    : await deps.supportReferenceService.forRecord('case', page.caseId);
  const ua = navigator.userAgent;
  const browser = /Edg/.test(ua)     ? 'Edge'
    : /Chrome/.test(ua)  ? 'Chrome'
    : /Firefox/.test(ua) ? 'Firefox'
    : /Safari/.test(ua)  ? 'Safari'
    : 'Unknown';
  const os = /Windows/.test(ua) ? 'Windows'
    : /Mac/.test(ua)    ? 'macOS'
    : /Linux/.test(ua)  ? 'Linux'
    : 'Unknown';

  return {
    userId:      user.id,
    userName:    user.name,
    userRole:    user.role,
    timestamp:   new Date().toISOString(),
    appVersion:  (appEnv().VITE_APP_VERSION as string) ?? '1.0.0',
    browser,
    os,
    currentPage: page.pattern,
    caseSupportReference: caseRef?.ok ? caseRef.data.ref : undefined,
  };
}

/**
 * Batch 364 (PS-349): support references for the case numbers a user typed,
 * so the ticket can say "SR-7K2Q-9MXD" instead. Only numbers that name a
 * case PathScribe holds get one; others are left for the user to remove.
 */
export async function supportReferencesForCaseNumbers(
  caseNumbers: readonly string[],
  deps: { caseService: Pick<ICaseService, 'getCase'>; supportReferenceService: ISupportReferenceService },
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (const n of caseNumbers) {
    const found = await deps.caseService.getCase(n.toUpperCase()).catch(() => null);
    if (!found) continue;
    const ref = await deps.supportReferenceService.forRecord('case', found.id);
    if (ref.ok) out.set(n, ref.data.ref);
  }
  return out;
}

/**
 * Batch 450 (PS-349, moved from EnhancementRequestModal.tsx): the warning's
 * "replace case numbers" choice. Each typed case number PathScribe holds is
 * replaced by its support reference in the title and description; the rest
 * of the text is checked again, and `remaining` is what still needs a warning
 * (null when nothing identifying is left).
 */
export async function replaceCaseNumbersWithReferences(
  input: { title: string; description: string; found: readonly IdentifierInText[] },
  deps: { caseService: Pick<ICaseService, 'getCase'>; supportReferenceService: ISupportReferenceService },
): Promise<{ title: string; description: string; replacedCount: number; remaining: IdentifierInText[] | null }> {
  const refs = await supportReferencesForCaseNumbers(caseNumbersIn(input.found), deps);
  const title = replaceIdentifiers(input.title, refs);
  const description = replaceIdentifiers(input.description, refs);
  const remaining = findIdentifiersInText(`${title}\n${description}`);
  return { title, description, replacedCount: refs.size, remaining: remaining.length > 0 ? remaining : null };
}

// ─── Submission ───────────────────────────────────────────────────────────────

/** What submitting uses besides the payload; tests pass their own. */
export interface SubmitDeps {
  sendEmail: typeof sendEmailDetailed;
  deliver: typeof deliverToDestination;
  recordSimulated: typeof recordSimulatedEmail;
  logAudit: (event: string, detail: string, user: string) => Promise<unknown>;
  /** True in the demo build, which never sends to a real destination. */
  demoBuild: boolean;
}

const defaultSubmitDeps = (): SubmitDeps => ({
  sendEmail: sendEmailDetailed,
  deliver: deliverToDestination,
  recordSimulated: recordSimulatedEmail,
  logAudit: (event, detail, user) => auditService.logEvent({ type: 'user', event, detail, user, caseId: null, confidence: null }).catch(() => {}),
  demoBuild: __DEMO_TOOLS__,
});

export async function submitEnhancementRequest(
  payload: EnhancementRequestPayload,
  config:  EnhancementRequestConfig,
  deps:    Partial<SubmitDeps> = {},
): Promise<SubmissionResult> {
  const d = { ...defaultSubmitDeps(), ...deps };
  // QA / testing feedback is always emailed; the website destination is for enhancement requests.
  return config.mode === 'portal' && payload.mode !== 'qa'
    ? submitViaPortal(payload, config, d)
    : submitViaEmail(payload, config, d);
}

// ─── Email mode ───────────────────────────────────────────────────────────────

async function submitViaEmail(
  payload: EnhancementRequestPayload,
  config:  EnhancementRequestConfig,
  d:       SubmitDeps,
): Promise<SubmissionResult> {
  const isQA = payload.mode === 'qa';
  const isValidation = isQA && payload.category === VALIDATION_CATEGORY;
  const routing = isValidation ? validationRecipientsFor(config) : null;
  const to   = routing ? routing.to : isQA ? config.qaEmailRecipients : config.emailRecipients;
  const cc   = isQA ? config.qaAdminCc         : [];

  if (to.length === 0) {
    console.warn('[enhancementRequestService] No recipients configured — check VITE_ENHANCEMENT_EMAIL, or the QA and validation recipients in Configuration → System → Feedback');
    return { success: false, error: 'No recipients configured.', errorCode: 'NO_RECIPIENTS' };
  }

  const outcome = await d.sendEmail({
    to,
    cc,
    subject:  buildEnhancementSubject(payload),
    bodyHtml: buildEnhancementHtml(payload),
    bodyText: buildEnhancementText(payload),
    metadata: {
      mode:     payload.mode ?? 'enhancement',
      category: payload.category,
      ...(isValidation && hasValidationLinks(payload.validationLinks)
        ? { ...(payload.validationLinks.studyId ? { studyId: payload.validationLinks.studyId } : {}), ...(payload.validationLinks.templateId ? { templateId: payload.validationLinks.templateId } : {}) }
        : {}),
      ...(payload.metadata ?? {}),
    },
  });

  if (!outcome.accepted) return { success: false, error: 'The mail service refused the message.' };
  if (routing) {
    await d.logAudit(
      FEEDBACK_ROUTED_TO_VALIDATION,
      validationAuditDetail({ title: payload.title, links: payload.validationLinks, usedFallback: routing.usedFallback, recipientCount: to.length }),
      readSessionProfile()?.id ?? payload.metadata?.userId ?? 'unknown',
    );
  }
  return {
    success: true, messageId: `email-${Date.now()}`, simulated: outcome.simulated,
    ...(routing ? { routedTo: routing.usedFallback ? 'qa' as const : 'validation' as const, validationFallback: routing.usedFallback } : {}),
  };
}

// ─── Portal mode: delivery to the website address (feedback/enhancementDestination.ts) ──────

async function submitViaPortal(
  payload: EnhancementRequestPayload,
  config:  EnhancementRequestConfig,
  d:       SubmitDeps,
): Promise<SubmissionResult> {
  if (!config.portalUrl) return { success: false, error: 'No destination is configured.', errorCode: 'NO_DESTINATION' };
  const host = destinationHost(config.portalUrl);

  // The demo build never sends to a real destination: the request is kept in the labelled
  // Simulated mail outbox, and the screen says nothing was sent.
  if (d.demoBuild) {
    d.recordSimulated({
      to: [], subject: buildEnhancementSubject(payload), bodyHtml: buildEnhancementHtml(payload), bodyText: buildEnhancementText(payload),
      metadata: { source: 'enhancement-destination', mode: payload.mode ?? 'enhancement', category: payload.category, destinationHost: host },
    }, payload.metadata?.userName ?? 'system');
    return { success: true, messageId: `SIMULATED-${Math.floor(Math.random() * 9000) + 1000}`, simulated: true, destinationHost: host };
  }

  const sent = await d.deliver(config.portalUrl, enhancementDeliveryBody(payload, new Date().toISOString())).catch(() => ({ ok: false as const }));
  if (sent.ok === false) {
    return { success: false, error: 'The request could not be delivered to the destination. Nothing was sent.', errorCode: 'DELIVERY_FAILED', destinationHost: host };
  }
  return { success: true, messageId: `portal-${Date.now()}`, destinationHost: host, ...(sent.ticketUrl ? { ticketUrl: sent.ticketUrl } : {}) };
}
