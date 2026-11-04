// src/services/intraop/parseVerbalReportDictation.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 400 (Pete: "Can they dictate this information and have AI parse
// it?"). The pathologist says one sentence into the verbal report, e.g.
//   "Called results to Dr. Faulkner, operating surgeon. Read back confirmed."
// and this proposes the structured fields: who received it, their role, the
// read-back, and a "Surgeon unavailable" reason if one is mentioned. The
// pathologist checks them and taps Log; nothing is logged by this.
//
// Two engines:
//   - AI (the organisation's configured model, via callAi): understands
//     free phrasing. Patient identifiers from the session (name, MRN, date of
//     birth) are removed from the text before it is sent: the read-back
//     protocol means the pathologist may say them aloud.
//   - Rules (no model, or the model failed): keyword matching, so the feature
//     still works offline.
//
// Safety rules (Pete, Batch 399):
//   - The read-back is never inferred. It's proposed only when the words say
//     it explicitly ("read back", "repeated back", "confirmed back") and not
//     negated, whichever engine is used; the rule check has the final say.
//   - A "Surgeon unavailable" reason is only ever suggested, never chosen:
//     the pathologist picks it.
//   - The time is never taken from speech.
//
// Pure, apart from the AI call passed in.
// ─────────────────────────────────────────────────────────────────────────────

import type { VerbalReportRecipientRole } from '@/types/intraop/IntraoperativeEntry';
import { VERBAL_REPORT_RECIPIENT_ROLES } from '@/types/intraop/IntraoperativeEntry';

export interface VerbalReportDictationContext {
  /** The session's operating surgeon, so "the surgeon" or their name resolves to them. */
  sessionSurgeon: string;
  /** Patient identifiers to strip before the text leaves the page. */
  patient: { patientName?: string; mrn?: string; dateOfBirth?: string };
  /** The active "Surgeon unavailable" reason ids the AI may choose from. */
  reasonIds: readonly string[];
}

export interface VerbalReportDictationProposal {
  receivedBy?: string;
  recipientRole?: VerbalReportRecipientRole;
  /** Only ever true, and only when said explicitly. */
  readBackConfirmed?: true;
  /** A suggestion to highlight; the pathologist chooses. */
  suggestedReasonId?: string;
  engine: 'ai' | 'rules';
}

// ── Patient identifiers ───────────────────────────────────────────────────────

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The text with the session's patient name parts, MRN and date of birth replaced by [PATIENT]. */
export function redactPatientIdentifiers(text: string, patient: VerbalReportDictationContext['patient']): string {
  let out = text;
  const parts = (patient.patientName ?? '').split(/[\s,]+/).map(p => p.trim()).filter(p => p.length >= 2);
  for (const p of [patient.mrn, patient.dateOfBirth, ...parts]) {
    if (!p || !p.trim()) continue;
    out = out.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escape(p.trim())}(?![\\p{L}\\p{N}])`, 'giu'), '[PATIENT]');
  }
  return out;
}

// ── Rules ─────────────────────────────────────────────────────────────────────

const READ_BACK = /\b(?:read[\s-]?back|read\s+it\s+back|repeated\s+(?:it\s+)?back|confirmed\s+back|verified\s+back)\b/i;
const READ_BACK_NEGATED = /\b(?:no|not|without|never|didn't|did\s+not|couldn't|could\s+not)\b[^.;]{0,25}\b(?:read[\s-]?back|read\s+it\s+back|repeated|confirm)/i;

/** Whether the words explicitly say the read-back happened. */
export function saysReadBack(text: string): boolean {
  return READ_BACK.test(text) && !READ_BACK_NEGATED.test(text);
}

const ROLE_PATTERNS: [VerbalReportRecipientRole, RegExp][] = [
  ['surgical_resident', /\b(?:resident|registrar|house\s+officer)\b/i],
  ['surgical_fellow', /\bfellow\b/i],
  ['physician_assistant', /\b(?:physician\s+assistant|P\.?A\.?(?=\s|,|\.|$))\b/],
  ['or_staff', /\b(?:nurse|circulat(?:or|ing)|scrub\s+(?:nurse|tech)|OR\s+staff|theatre\s+staff|anaesthet\w*|anesthe\w*)\b/i],
  ['operating_surgeon', /\b(?:operating\s+surgeon|attending(?:\s+surgeon)?|consultant\s+surgeon|the\s+surgeon|surgeon)\b/i],
];

const REASON_PATTERNS: [string, RegExp][] = [
  ['SU_SCRUBBED', /\b(?:scrubbed|critical\s+(?:step|part|portion)|mid-?(?:anastomosis|dissection))\b/i],
  ['SU_EMERGENCY', /\b(?:emergency|bleed(?:ing)?|crash(?:ing)?|code)\b/i],
  ['SU_NOT_IN_ROOM', /\b(?:not\s+in\s+the\s+(?:room|theatre|OR)|stepped\s+out|left\s+the\s+(?:room|theatre|OR)|out\s+of\s+the\s+room)\b/i],
  ['SU_DELEGATED', /\b(?:delegat\w*|asked\s+(?:us|me)\s+to\s+(?:tell|give|call)|told\s+(?:us|me)\s+to\s+(?:tell|give|call))\b/i],
];

const NAME = /\b(?:to|with|told|informed|called|notified|gave\s+(?:it\s+)?to)\s+((?:Dr\.?|Doctor|Mr\.?|Ms\.?|Mrs\.?|Nurse)\s+[A-Z][\p{L}'-]+(?:\s+[A-Z][\p{L}'-]+)?)/u;
const TITLE_NAME = /\b((?:Dr\.?|Doctor)\s+[A-Z][\p{L}'-]+(?:\s+[A-Z][\p{L}'-]+)?)/u;

/** The surname of a name like "Dr. Emily Faulkner" → "faulkner". */
const surname = (name: string) => name.replace(/^(?:dr\.?|doctor|mr\.?|ms\.?|mrs\.?)\s+/i, '').trim().split(/\s+/).pop()?.toLowerCase() ?? '';

export function parseVerbalReportByRules(text: string, ctx: VerbalReportDictationContext): VerbalReportDictationProposal {
  const out: VerbalReportDictationProposal = { engine: 'rules' };
  const named = text.match(NAME)?.[1] ?? text.match(TITLE_NAME)?.[1];
  const surgeonSurname = surname(ctx.sessionSurgeon);
  const mentionsSurgeonByName = !!surgeonSurname && new RegExp(`\\b${escape(surgeonSurname)}\\b`, 'i').test(text);
  if (named) out.receivedBy = named.trim();
  else if (mentionsSurgeonByName) out.receivedBy = ctx.sessionSurgeon;

  const role = ROLE_PATTERNS.find(([, re]) => re.test(text))?.[0];
  if (role) out.recipientRole = role;
  else if (out.receivedBy && surname(out.receivedBy) === surgeonSurname) out.recipientRole = 'operating_surgeon';
  if (out.recipientRole === 'operating_surgeon' && !out.receivedBy) out.receivedBy = ctx.sessionSurgeon;

  if (saysReadBack(text)) out.readBackConfirmed = true;
  const reason = REASON_PATTERNS.find(([id, re]) => ctx.reasonIds.includes(id) && re.test(text))?.[0];
  if (reason) out.suggestedReasonId = reason;
  return out;
}

// ── AI ────────────────────────────────────────────────────────────────────────

export type AiCall = (opts: { system: string; prompt: string; maxTokens?: number }) => Promise<{ text: string }>;

export function verbalReportPrompt(redacted: string, ctx: VerbalReportDictationContext): string {
  return `A pathologist dictated a note about telling the surgical team a frozen section result.
Patient identifiers have been replaced with [PATIENT].

DICTATION:
${redacted}

The operating surgeon for this case is: ${ctx.sessionSurgeon || 'unknown'}.

Return ONLY a JSON object (no markdown) with these keys, each omitted when the dictation doesn't say it:
{
  "receivedBy": "the name of the person who received the result, as said",
  "recipientRole": one of ${VERBAL_REPORT_RECIPIENT_ROLES.map(r => `"${r}"`).join(', ')},
  "readBackStated": true only if the dictation explicitly says the recipient read or repeated the result back,
  "surgeonUnavailableReason": one of ${ctx.reasonIds.map(r => `"${r}"`).join(', ')}, only if the dictation says why the operating surgeon wasn't told directly
}
Rules: do not guess; if the surgeon is referred to as "the surgeon" use the operating surgeon's name; never infer a read-back.`;
}

/** Keeps only well-formed answers from the model's JSON. */
export function validateAiProposal(raw: string, ctx: VerbalReportDictationContext): Omit<VerbalReportDictationProposal, 'engine'> {
  const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
  const out: Omit<VerbalReportDictationProposal, 'engine'> = {};
  if (typeof parsed?.receivedBy === 'string' && parsed.receivedBy.trim() && !/\[PATIENT\]/.test(parsed.receivedBy)) out.receivedBy = parsed.receivedBy.trim().slice(0, 80);
  if (VERBAL_REPORT_RECIPIENT_ROLES.includes(parsed?.recipientRole)) out.recipientRole = parsed.recipientRole;
  if (parsed?.readBackStated === true) out.readBackConfirmed = true;
  if (typeof parsed?.surgeonUnavailableReason === 'string' && ctx.reasonIds.includes(parsed.surgeonUnavailableReason)) out.suggestedReasonId = parsed.surgeonUnavailableReason;
  return out;
}

/**
 * The proposal for a dictated verbal report. Tries the AI when one is given;
 * falls back to the rules on any failure. Whatever the engine, the read-back
 * is kept only when the words say it (saysReadBack).
 */
export async function parseVerbalReportDictation(
  text: string, ctx: VerbalReportDictationContext, ai?: AiCall,
): Promise<VerbalReportDictationProposal> {
  if (!text.trim()) return { engine: 'rules' };
  const rules = parseVerbalReportByRules(text, ctx);
  if (!ai) return rules;
  try {
    const redacted = redactPatientIdentifiers(text, ctx.patient);
    const { text: raw } = await ai({
      system: 'You extract structured fields from a pathologist\'s dictation. You return only valid JSON.',
      prompt: verbalReportPrompt(redacted, ctx),
      maxTokens: 300,
    });
    const fromAi = validateAiProposal(raw, ctx);
    const proposal: VerbalReportDictationProposal = {
      engine: 'ai',
      receivedBy: fromAi.receivedBy ?? rules.receivedBy,
      recipientRole: fromAi.recipientRole ?? rules.recipientRole,
      suggestedReasonId: fromAi.suggestedReasonId ?? rules.suggestedReasonId,
    };
    // Never inferred: the words must say it, whatever the model thinks.
    if (saysReadBack(text)) proposal.readBackConfirmed = true;
    if (proposal.recipientRole === 'operating_surgeon' && !proposal.receivedBy) proposal.receivedBy = ctx.sessionSurgeon;
    return proposal;
  } catch {
    return rules;
  }
}

/** Applies a proposal to the form without overwriting anything the pathologist already entered. */
export function applyDictationProposal(
  form: { receivedBy: string; recipientRole: VerbalReportRecipientRole | ''; readBackConfirmed: boolean },
  proposal: VerbalReportDictationProposal,
): { receivedBy: string; recipientRole: VerbalReportRecipientRole | ''; readBackConfirmed: boolean; filled: string[] } {
  const filled: string[] = [];
  const receivedBy = !form.receivedBy.trim() && proposal.receivedBy ? (filled.push('verbalReportRecipient'), proposal.receivedBy) : form.receivedBy;
  const recipientRole = !form.recipientRole && proposal.recipientRole ? (filled.push('verbalReportRole'), proposal.recipientRole) : form.recipientRole;
  const readBackConfirmed = !form.readBackConfirmed && proposal.readBackConfirmed ? (filled.push('verbalReportReadBack'), true) : form.readBackConfirmed;
  return { receivedBy, recipientRole, readBackConfirmed, filled };
}
