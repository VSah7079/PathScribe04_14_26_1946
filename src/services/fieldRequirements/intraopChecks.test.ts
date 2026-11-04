// Batch 397 (PS-359): the Intraop page's Field Requirements.
import { describe, it, expect } from 'vitest';
import { resolveFieldRequirements, FIELD_REQUIREMENT_PAGES, FIELD_GROUP_ORDER } from './fieldRequirementRules';
import {
  intraopSessionMissing, intraopSpecimenMissing, intraopQuickGrossMissing, intraopTouchPrepSkipMissing,
  intraopVerbalReportMissing, intraopMergeMissing, intraopFieldRequired, type IntraopSessionForm,
} from './intraopChecks';

const defaults = resolveFieldRequirements('intraop');
// Batch 399: a complete verbal report (who, role, read-back).
const report = (over: Record<string, unknown> = {}) => ({
  receivedBy: 'Dr. Lee', recipientRole: 'operating_surgeon', readBackConfirmed: true, critical: false,
  suggestedCriticalIds: [], suggestedCriticalNames: [], note: '', ...over,
}) as any;
const session = (over: Partial<IntraopSessionForm> = {}): IntraopSessionForm => ({
  patientName: 'Jane Doe', mrn: 'MRN-1', patientConfirmed: true, dateOfBirth: '', adtMatched: false,
  orNumber: 'OR 4', surgeon: 'Dr. Lee', facilityId: '', locationId: '', facilityHasLocations: false, ...over,
});

describe('intraop field requirements (Batch 397)', () => {
  it('the defaults reproduce what the page required before', () => {
    expect(intraopSessionMissing(session(), defaults)).toEqual([]);
    expect(intraopSessionMissing(session({ patientName: ' ', patientConfirmed: false, orNumber: '', surgeon: '' }), defaults))
      .toEqual(['patientName', 'patientConfirmed', 'orNumber', 'surgeon']);
    expect(intraopSpecimenMissing({ specimenLabel: 'A', quickGross: '2 cm nodule', frozenDiagnosis: '', frozenCategory: '' }, defaults)).toEqual([]);
    expect(intraopSpecimenMissing({ specimenLabel: '', quickGross: '', frozenDiagnosis: '', frozenCategory: '' }, defaults)).toEqual(['specimenLabel', 'quickGross']);
    expect(intraopTouchPrepSkipMissing('other', '', defaults)).toEqual([]);
    expect(intraopVerbalReportMissing(report(), defaults)).toEqual([]);
    expect(intraopMergeMissing('', defaults)).toEqual(['mergeCase']);
    expect(intraopMergeMissing('S26-1', defaults)).toEqual([]);
  });

  it('the OR number is on by default and can be switched off; the surgeon cannot', () => {
    const r = resolveFieldRequirements('intraop', { orNumber: false, surgeon: false });
    expect(intraopSessionMissing(session({ orNumber: '', surgeon: '' }), r)).toEqual(['surgeon']);
  });

  it('a date of birth, when required, is asked only of a typed-in patient', () => {
    const r = resolveFieldRequirements('intraop', { dateOfBirth: true });
    expect(intraopSessionMissing(session(), r)).toEqual(['dateOfBirth']);
    expect(intraopSessionMissing(session({ adtMatched: true }), r)).toEqual([]);
  });

  it('a location, when required, is asked only of a facility with rooms', () => {
    const r = resolveFieldRequirements('intraop', { facility: true, location: true });
    expect(intraopSessionMissing(session(), r)).toEqual(['facility', 'location']);
    expect(intraopSessionMissing(session({ facilityId: 'F1', facilityHasLocations: false }), r)).toEqual([]);
    expect(intraopSessionMissing(session({ facilityId: 'F1', facilityHasLocations: true }), r)).toEqual(['location']);
  });

  it('a category, when required, is asked only with a frozen diagnosis', () => {
    const r = resolveFieldRequirements('intraop', { frozenCategory: true });
    const form = { specimenLabel: 'A', quickGross: 'x', frozenDiagnosis: '', frozenCategory: '' };
    expect(intraopSpecimenMissing(form, r)).toEqual([]);
    expect(intraopSpecimenMissing({ ...form, frozenDiagnosis: 'Benign' }, r)).toEqual(['frozenCategory']);
  });

  it('a skip note, when required, is asked only for "Other"', () => {
    const r = resolveFieldRequirements('intraop', { touchPrepSkipNote: true });
    expect(intraopTouchPrepSkipMissing('fibrotic_scant', '', r)).toEqual([]);
    expect(intraopTouchPrepSkipMissing('other', ' ', r)).toEqual(['touchPrepSkipNote']);
  });

  it('Quick Gross on a specimen card and the verbal report note', () => {
    expect(intraopQuickGrossMissing('  ', defaults)).toEqual(['quickGross']);
    expect(intraopVerbalReportMissing(report(), resolveFieldRequirements('intraop', { verbalReportNote: true }))).toEqual(['verbalReportNote']);
    expect(intraopFieldRequired(defaults, 'surgeon')).toBe(true);
    expect(intraopFieldRequired(defaults, 'facility')).toBe(false);
  });

  it('every group in the catalog is shown on the Field Requirements screen', () => {
    const groups = new Set(Object.values(FIELD_REQUIREMENT_PAGES).flat().map(f => f.group));
    expect([...groups].filter(g => !FIELD_GROUP_ORDER.includes(g))).toEqual([]);
  });

  it('Batch 399: the verbal report needs who received it, their role and the read-back; a critical result to anyone else needs a reason', () => {
    expect(intraopVerbalReportMissing(report({ receivedBy: ' ', recipientRole: '', readBackConfirmed: false }), defaults))
      .toEqual(['verbalReportRecipient', 'verbalReportRole', 'verbalReportReadBack']);
    expect(intraopVerbalReportMissing(report({ critical: true, recipientRole: 'surgical_resident' }), defaults)).toEqual(['surgeonUnavailableReason']);
    expect(intraopVerbalReportMissing(report({ critical: true, recipientRole: 'operating_surgeon' }), defaults)).toEqual([]);
    expect(intraopVerbalReportMissing(report({ critical: true, recipientRole: 'or_staff', surgeonUnavailable: { reasonId: 'SU_OTHER', reasonName: 'Other', note: 'busy' } }), defaults)).toEqual(['surgeonUnavailableNote']);
    expect(intraopVerbalReportMissing(report({ critical: true, recipientRole: 'or_staff', surgeonUnavailable: { reasonId: 'SU_EMERGENCY', reasonName: 'Emergency' } }), defaults)).toEqual([]);
  });
});
