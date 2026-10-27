// src/services/mockInterfaceEngine/inboundSimulator.ts
// ─────────────────────────────────────────────────
// Batch 605: the Inbound message simulator. No interface engine is connected in
// the demo, so nothing calls the real inbound processors. This lets a person
// pick or paste a sample message (an HL7 ADT message, or one of the engine's
// JSON events), runs it through the SAME processors the real listener will call,
// and reports what changed. Everything it does is labelled Simulated. When the
// server's inbound listener exists it calls the same processors and this tool
// stays as a test aid.
// ─────────────────────────────────────────────────
import { parseHL7Message, getField, getComponent } from '../hl7/hl7Parser';
import { processAdtMessage } from '../hl7/processAdtMessage';
import { processPatientManagementMessage } from '../hl7/processPatientManagementMessage';
import { processVisitMessage, VISIT_EVENT_TYPES } from '../hl7/processVisitMessage';
import { processBlockExceptionEvent } from '../hl7/processBlockExceptionEvent';
import { processMaterialLocationEvent } from '../hl7/processMaterialLocationEvent';
import { processInboundHpvResultEvent } from '../hl7/processInboundHpvResultEvent';
import { interfaceExceptionService } from '../interfaceExceptions/interfaceExceptionServiceInstance';
import { patientIndexService } from '../patients/patientServicesInstance';
import { encounterService } from '../encounters/encounterInstance';
import { auditService } from '../auditlog/auditServiceInstance';
import { caseRouter } from '../cases/CaseRouter';

export type InboundSampleId =
  | 'A01' | 'A01-nhs' | 'A08' | 'A40' | 'A24' | 'A47' | 'A43' | 'A45' | 'A50' | 'A34' | 'A40-unknown'
  | 'event-block-exception' | 'event-material-location' | 'event-hpv-result';

export const INBOUND_SAMPLE_IDS: readonly InboundSampleId[] = [
  'A01', 'A01-nhs', 'A08', 'A40', 'A24', 'A47', 'A43', 'A45', 'A50', 'A34', 'A40-unknown',
  'event-block-exception', 'event-material-location', 'event-hpv-result',
];

export interface InboundContext { organisationId: string; facilityId: string; actor: string }

export interface InboundRunResult {
  ok: boolean;
  /** 'adt' (HL7), 'visit' (A45/A50/A34) or 'event' (JSON). */
  family: 'adt' | 'visit' | 'event';
  /** E.g. 'A40' or 'block-exception'. */
  event: string;
  /** Plain English, no patient names. */
  summary: string;
  /** Label / value lines for the screen. */
  details: { label: string; value: string }[];
  /** Set when the message was routed to the Interface Exception queue. */
  exceptionQueued?: string;
  error?: string;
  /** Always true. */
  simulated: true;
}

let seq = 0;
const stamp = () => new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
const tag = () => `${Date.now().toString(36).toUpperCase()}${(seq++).toString(36).toUpperCase()}`;
const AUTH = 'SIMEHR';

const msh = (event: string) => `MSH|^~\\&|SIMENGINE|SIMADT|PATHSCRIBE|PS|${stamp()}||ADT^${event}|SIM-${tag()}|P|2.5`;

type DemoCaseLike = { accession?: { fullAccession?: string }; specimens?: { label?: string; blocks?: { label?: string }[] }[] };

async function demoPatient(ctx: InboundContext, last: string, first: string, mrn: string): Promise<string> {
  const r = await patientIndexService.resolveOrCreatePatient({
    organisationId: ctx.organisationId, mrn, assigningAuthority: AUTH, firstName: first, lastName: last, dateOfBirth: '1980-03-14',
  });
  return r.patientId;
}

/** The text of a sample. Creates the simulated demo patients and visits some samples need. */
export async function prepareInboundSample(id: InboundSampleId, ctx: InboundContext): Promise<string> {
  const t = tag();
  const name = (p: string) => `SIM${p}${t}`;
  switch (id) {
    case 'A01':
      return [msh('A01'), `EVN||${stamp()}`, `PID|1||SIMMRN${t}^^^${AUTH}^MR||${name('ADMIT')}^TEST||19800314|F`, `PV1|1|I|WARD1^101^A||||||||||||||||SIMVISIT${t}`].join('\r');
    case 'A01-nhs': {
      const nhs = '9434765919'; // a number that passes the NHS check digit
      return [msh('A01'), `EVN||${stamp()}`, `PID|1||${nhs}^^^NHS^NH||${name('NHS')}^TEST||19800314|F||||||||||||||||||||||||||||||01`, `PV1|1|I|WARD1^101^A||||||||||||||||SIMVISIT${t}`].join('\r');
    }
    case 'A08': {
      const mrn = `SIMMRN${t}`;
      await demoPatient(ctx, name('UPDATE'), 'TEST', mrn);
      return [msh('A08'), `EVN||${stamp()}`, `PID|1||${mrn}^^^${AUTH}^MR||${name('UPDATE')}^TEST||19800314|F|||1 SIM STREET^^TUCSON^AZ^85701`].join('\r');
    }
    case 'A40': case 'A24': case 'A34': {
      const keep = `SIMKEEP${t}`, gone = `SIMGONE${t}`;
      await demoPatient(ctx, name('KEEP'), 'TEST', keep);
      await demoPatient(ctx, name('GONE'), 'TEST', gone);
      return [msh(id), `EVN||${stamp()}`, `PID|1||${keep}^^^${AUTH}^MR||${name('KEEP')}^TEST||19800314|F`, `MRG|${gone}^^^${AUTH}^MR`].join('\r');
    }
    case 'A47': {
      const old = `SIMOLD${t}`;
      await demoPatient(ctx, name('FIX'), 'TEST', old);
      return [msh('A47'), `EVN||${stamp()}`, `PID|1||SIMNEW${t}^^^${AUTH}^MR||${name('FIX')}^TEST||19800314|F`, `MRG|${old}^^^${AUTH}^MR`].join('\r');
    }
    case 'A43': case 'A45': {
      const from = `SIMFROM${t}`, to = `SIMTO${t}`, visit = `SIMVISIT${t}`;
      const fromId = await demoPatient(ctx, name('FROM'), 'TEST', from);
      await demoPatient(ctx, name('TO'), 'TEST', to);
      await encounterService.resolveOrCreateEncounter({
        organisationId: ctx.organisationId, patientId: fromId, encounterNumber: visit,
        encounterClass: 'Inpatient', eventTimestamp: new Date().toISOString(), status: 'Arrived',
      });
      return [msh(id), `EVN||${stamp()}`, `PID|1||${to}^^^${AUTH}^MR||${name('TO')}^TEST||19800314|F`, `MRG|${from}^^^${AUTH}^MR||||${visit}`, `PV1|1|I|WARD1^101^A||||||||||||||||${visit}`].join('\r');
    }
    case 'A50': {
      const mrn = `SIMMRN${t}`, visit = `SIMVISIT${t}`;
      const pid = await demoPatient(ctx, name('RENUM'), 'TEST', mrn);
      await encounterService.resolveOrCreateEncounter({
        organisationId: ctx.organisationId, patientId: pid, encounterNumber: visit,
        encounterClass: 'Inpatient', eventTimestamp: new Date().toISOString(), status: 'Arrived',
      });
      return [msh('A50'), `EVN||${stamp()}`, `PID|1||${mrn}^^^${AUTH}^MR||${name('RENUM')}^TEST||19800314|F`, `MRG|${mrn}^^^${AUTH}^MR||||${visit}`, `PV1|1|I|WARD1^101^A||||||||||||||||SIMNEWVISIT${t}`].join('\r');
    }
    case 'A40-unknown':
      return [msh('A40'), `EVN||${stamp()}`, `PID|1||UNKNOWN-A${t}^^^${AUTH}^MR||${name('NOBODY')}^TEST||19800314|F`, `MRG|UNKNOWN-B${t}^^^${AUTH}^MR`].join('\r');
    default: {
      const cases = await caseRouter.getAll(undefined, { includeOrchestration: true, bypassAccessControl: true } as never);
      const c = cases.ok ? (cases.data as unknown as DemoCaseLike[]).find(x => x?.accession?.fullAccession && (x.specimens ?? []).length > 0) : undefined;
      const accession = c?.accession?.fullAccession ?? 'S26-0001';
      const spec = c?.specimens?.[0];
      const letter = spec?.label ?? 'A';
      const block = spec?.blocks?.[0]?.label ?? '1';
      const base = { messageId: `sim-${t}`, timestamp: new Date().toISOString(), organisationId: ctx.organisationId, accessionNumber: accession, specimenLetter: letter };
      if (id === 'event-block-exception') return JSON.stringify({ event: 'block-exception', payload: { ...base, blockNumber: block, status: 'Damaged', note: 'Simulated: cracked at the microtome', sourceSystem: 'OTHER' } }, null, 2);
      if (id === 'event-material-location') return JSON.stringify({ event: 'material-location', payload: { ...base, target: { level: 'block', blockNumber: block }, location: 'Simulated storage, cabinet 4', sourceSystem: 'OTHER' } }, null, 2);
      return JSON.stringify({ event: 'hpv-result', payload: { ...base, hrHpvResult: 'Positive', abnormalFlag: 'A', referenceRange: 'Not Detected' } }, null, 2);
    }
  }
}

const line = (label: string, value: unknown) => ({ label, value: value === undefined || value === null || value === '' ? '-' : String(value) });

async function audit(event: string, ok: boolean, exception: boolean, actor: string): Promise<void> {
  await auditService.logEvent({
    type: 'system', event: 'Simulated Inbound Message Processed',
    detail: `SIMULATED inbound ${event}: ${ok ? 'processed' : 'not applied'}${exception ? ', queued as an Interface Exception' : ''}. Nothing came from a real interface engine.`,
    user: actor, caseId: null, confidence: null,
  }).catch(() => {});
}

/** Runs a pasted or sample message through the real processors. Never throws. */
export async function runInboundMessage(text: string, ctx: InboundContext): Promise<InboundRunResult> {
  const trimmed = text.trim();
  const fail = (family: InboundRunResult['family'], event: string, error: string): InboundRunResult =>
    ({ ok: false, family, event, summary: error, details: [], error, simulated: true });
  try {
    if (!trimmed) return fail('adt', '?', 'Nothing to process: the message is empty.');
    // ── JSON events ──
    if (trimmed.startsWith('{')) {
      const parsed = JSON.parse(trimmed) as { event?: string; payload?: Record<string, unknown> };
      const payload = parsed.payload;
      if (!parsed.event || !payload) return fail('event', '?', 'A JSON message needs "event" and "payload".');
      const before = await interfaceExceptionService.getPending();
      let r: { outcome: string; caseId?: string; reason?: string };
      if (parsed.event === 'block-exception') r = await processBlockExceptionEvent(payload as never);
      else if (parsed.event === 'material-location') r = await processMaterialLocationEvent(payload as never);
      else if (parsed.event === 'hpv-result') r = await processInboundHpvResultEvent(payload as never);
      else return fail('event', parsed.event, `"${parsed.event}" is not a known event (block-exception, material-location, hpv-result).`);
      void before;
      const applied = r.outcome === 'applied';
      await audit(parsed.event, applied, false, ctx.actor);
      return {
        ok: applied || r.outcome === 'already-applied', family: 'event', event: parsed.event, simulated: true,
        summary: `${parsed.event}: ${r.outcome}${r.reason ? `. ${r.reason}` : ''}`,
        details: [line('Outcome', r.outcome), line('Case', r.caseId), line('Detail', (r as { targetDescription?: string; blockId?: string; specimenId?: string }).targetDescription ?? (r as { blockId?: string }).blockId ?? (r as { specimenId?: string }).specimenId), line('Reason', r.reason)],
      };
    }
    // ── HL7 ──
    const msg = parseHL7Message(trimmed);
    const head = msg.getSegment('MSH');
    if (!head) return fail('adt', '?', 'Not an HL7 message: there is no MSH segment.');
    const event = getComponent(getField(head, 9), 1);
    const pendingNow = await interfaceExceptionService.getPending();
    const pendingBefore = pendingNow.ok ? (pendingNow.data as unknown[]).length : 0;
    if (VISIT_EVENT_TYPES.includes(event)) {
      const r = await processVisitMessage(trimmed, ctx.organisationId);
      await audit(event, r.applied, !!r.routedToExceptionQueue, ctx.actor);
      return { ok: r.applied, family: 'visit', event, simulated: true, summary: r.summary, exceptionQueued: r.routedToExceptionQueue,
        details: [line('Event', event), line('Applied', r.applied ? 'yes' : 'no'), line('Visit', r.encounterId), line('Queued for review', r.routedToExceptionQueue)] };
    }
    if (['A40', 'A24', 'A47', 'A43'].includes(event)) {
      const r = await processPatientManagementMessage(trimmed, ctx.organisationId);
      await audit(event, !r.routedToExceptionQueue, !!r.routedToExceptionQueue, ctx.actor);
      return {
        ok: !r.routedToExceptionQueue, family: 'adt', event, simulated: true, exceptionQueued: r.routedToExceptionQueue,
        summary: r.routedToExceptionQueue ? `${event} was queued for review: ${r.routedToExceptionQueue}`
          : event === 'A40' ? `A40 applied: the prior patient was merged into the surviving one (${r.casesRepointed ?? 0} case(s) repointed).`
          : event === 'A24' ? 'A24 applied: the two patient records are now linked.'
          : event === 'A47' ? 'A47 applied: the corrected identifier was added to the same patient.'
          : r.caseMoved ? `A43 applied: case ${r.movedCaseId} moved to the target patient.` : 'A43 processed.',
        details: [line('Event', event), line('Patient', r.patientId), line('Cases repointed', r.casesRepointed), line('Case moved', r.movedCaseId), line('Queued for review', r.routedToExceptionQueue)],
      };
    }
    const r = await processAdtMessage(trimmed, ctx.organisationId, ctx.facilityId);
    await audit(event, true, false, ctx.actor);
    void pendingBefore;
    return {
      ok: true, family: 'adt', event, simulated: true,
      summary: `${event} applied: patient ${r.mpiOutcome}${r.encounterId ? `, visit recorded` : ''}${r.demographicsApplied === false ? ', demographics not applied (older than what is on file)' : ''}.`,
      details: [line('Event', event), line('Patient result', r.mpiOutcome), line('Patient', r.patientId), line('Visit', r.encounterId), line('Location', r.locationId), line('Demographics applied', r.demographicsApplied ? 'yes' : 'no')],
    };
  } catch (e) {
    return fail('adt', '?', e instanceof Error ? e.message : 'The message could not be processed.');
  }
}
