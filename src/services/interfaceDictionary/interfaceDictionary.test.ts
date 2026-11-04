// src/services/interfaceDictionary/interfaceDictionary.test.ts
// Batch 612: paths, scope guard, mapping engine, profile life, service, text helpers.
import { describe, expect, it } from 'vitest';
import { parseSourcePath, parseVendorMessage, readSourceValue, isZSegment } from './messagePath';
import { targetRefusal, SCOPE_HANDLED_BY_MAPPER, SCOPE_NEEDS_CODE_RELEASE } from './scopeGuard';
import { applyMappings, applyPassed, validateMappings, hl7DateToIso, hl7DateTimeToIso, contentHash } from './mappingEngine';
import {
  createProfile, startDraft, withMappings, withTestResult, withPublished, withRollback, withRetired, rollbackTarget, publishedVersion,
  workingVersion, messageTypeValid, blankMapping,
} from './profileLifecycle';
import { codeKey, formatValueMap, parseValueMap } from './interfaceDictionaryText';
import { createInterfaceDictionaryService, type InterfaceDictionaryDeps } from './interfaceDictionaryService';
import type { FieldMapping, VendorProfile } from './interfaceDictionaryTypes';
import type { NewAuditLog } from '../auditlog/IAuditService';

const HL7 = ['MSH|^~\\&|VENDOR|LAB|PS|HOSP|20260101||ORU^R01|1|P|2.5', 'PID|1||123||DOE^JANE', 'ZAB|1|LOT-77|M|20260105103000'].join('\r');
const m = (o: Partial<FieldMapping>): FieldMapping => ({
  id: 'm1', sourcePath: 'ZAB-2', target: 'ext.lotNumber', label: 'Lot number', dataType: 'text', transform: 'none', ...o,
});

describe('message paths', () => {
  it('reads a Z-segment field', () => {
    const msg = parseVendorMessage('hl7v2', HL7); const p = parseSourcePath('hl7v2', 'ZAB-2');
    if (!msg.ok || !p.ok) throw new Error('parse');
    expect(readSourceValue(msg.message, p.path)).toEqual({ found: true, value: 'LOT-77' });
    expect(isZSegment('ZAB')).toBe(true); expect(isZSegment('PID')).toBe(false);
  });
  it('refuses bad syntax and empty text without throwing', () => {
    expect(parseSourcePath('hl7v2', '')).toEqual({ ok: false, reason: 'EMPTY' });
    expect(parseSourcePath('hl7v2', 'nonsense')).toMatchObject({ ok: false });
    expect(parseVendorMessage('json', '{bad')).toEqual({ ok: false, reason: 'BAD_MESSAGE' });
    expect(parseVendorMessage('fhir', '{"a":1}')).toEqual({ ok: false, reason: 'BAD_MESSAGE' });
  });
  it('reads JSON and FHIR paths with selectors', () => {
    const j = parseVendorMessage('json', '{"result":{"lot":"A1","items":[{"k":"x","v":"1"},{"k":"y","v":"2"}]}}');
    const p = parseSourcePath('json', 'result.items[k=y].v');
    if (!j.ok || !p.ok) throw new Error('parse');
    expect(readSourceValue(j.message, p.path).value).toBe('2');
    const f = parseVendorMessage('fhir', '{"resourceType":"Observation","component":[{"valueString":"Q"}]}');
    const fp = parseSourcePath('fhir', 'Observation.component[0].valueString');
    if (!f.ok || !fp.ok) throw new Error('parse');
    expect(readSourceValue(f.message, fp.path).value).toBe('Q');
    const wrong = parseSourcePath('fhir', 'Patient.name');
    if (!wrong.ok) throw new Error('parse');
    expect(readSourceValue(f.message, wrong.path).problem).toBe('WRONG_RESOURCE');
  });
});

describe('scope guard', () => {
  it('refuses core structure, non-extensions and bad names; allows ext.name', () => {
    expect(targetRefusal('')).toBe('EMPTY');
    expect(targetRefusal('patient.name')).toBe('CORE_STRUCTURE');
    expect(targetRefusal('Diagnosis.text')).toBe('CORE_STRUCTURE');
    expect(targetRefusal('specimens[0]')).toBe('CORE_STRUCTURE');
    expect(targetRefusal('lotNumber')).toBe('NOT_AN_EXTENSION');
    expect(targetRefusal('ext.Bad')).toBe('BAD_NAME');
    expect(targetRefusal('ext.lotNumber')).toBeNull();
  });
  it('lists both sides of the boundary', () => {
    expect(SCOPE_HANDLED_BY_MAPPER.length).toBeGreaterThan(0); expect(SCOPE_NEEDS_CODE_RELEASE.length).toBeGreaterThan(0);
  });
});

describe('mapping engine', () => {
  it('validates definitions', () => {
    const codes = validateMappings('hl7v2', [m({ target: 'patient.name' }), m({ id: 'm2', label: '' }), m({ id: 'm3', transform: 'hl7Date' })]).map(p => p.code);
    expect(codes).toEqual(expect.arrayContaining(['TARGET_CORE_STRUCTURE', 'LABEL_REQUIRED', 'TRANSFORM_TYPE']));
    expect(validateMappings('hl7v2', [m({})])).toEqual([]);
  });
  it('flags a duplicate target', () => {
    expect(validateMappings('hl7v2', [m({}), m({ id: 'm2' })]).map(p => p.code)).toContain('TARGET_DUPLICATE');
  });
  it('converts HL7 dates', () => {
    expect(hl7DateToIso('20260105')).toBe('2026-01-05');
    expect(hl7DateToIso('2026')).toBeNull();
    expect(hl7DateTimeToIso('20260105103000')).toMatch(/^2026-01-05T10:30:00/);
  });
  it('applies mappings: translation, defaults, required, problems', () => {
    const msg = parseVendorMessage('hl7v2', HL7); if (!msg.ok) throw new Error('parse');
    const r = applyMappings('hl7v2', [
      m({}),
      m({ id: 'm2', sourcePath: 'ZAB-3', target: 'ext.sex', label: 'Sex', dataType: 'code', valueMap: { M: 'Male' } }),
      m({ id: 'm3', sourcePath: 'ZAB-9', target: 'ext.absent', label: 'Absent', required: true }),
      m({ id: 'm4', sourcePath: 'ZAB-9', target: 'ext.dflt', label: 'Dflt', defaultValue: 'n/a' }),
      m({ id: 'm5', sourcePath: 'ZAB-2', target: 'ext.num', label: 'Num', dataType: 'number' }),
    ], msg.message);
    expect(r.values.map(v => v.value)).toEqual(['LOT-77', 'Male', 'n/a']);
    expect(r.missingRequired).toBe(1); expect(r.problems).toBe(1);
    expect(r.outcomes.find(o => o.mappingId === 'm5')?.problem).toBe('BAD_NUMBER');
    expect(applyPassed(r)).toBe(false);
  });
  it('skips a target outside the extension namespace even if saved', () => {
    const msg = parseVendorMessage('hl7v2', HL7); if (!msg.ok) throw new Error('parse');
    const r = applyMappings('hl7v2', [m({ target: 'patient.mrn' })], msg.message);
    expect(r.values).toEqual([]); expect(r.outcomes[0].problem).toBe('DEFINITION');
  });
  it('hash changes with content', () => { expect(contentHash([m({})])).not.toBe(contentHash([m({ label: 'x' })])); });
});

describe('profile life', () => {
  const base = () => createProfile({ id: 'p1', name: 'Acme', format: 'hl7v2', messageType: 'ORU^R01', by: 'a', at: 't1' }, []) as VendorProfile;
  const testedWith = (p: VendorProfile, maps: FieldMapping[], at: string) => {
    const saved = withMappings(p, maps) as VendorProfile;
    return withTestResult(saved, { at, by: 'a', passed: true, mapped: 1, missingRequired: 0, problems: 0, contentHash: contentHash(maps) }) as VendorProfile;
  };
  it('creates with checks', () => {
    expect(createProfile({ id: 'x', name: ' ', format: 'hl7v2', messageType: 'ORU^R01', by: 'a', at: 't' }, [])).toBe('NAME_REQUIRED');
    expect(createProfile({ id: 'x', name: 'acme', format: 'hl7v2', messageType: 'ORU^R01', by: 'a', at: 't' }, [base()])).toBe('DUPLICATE_NAME');
    expect(createProfile({ id: 'x', name: 'B', format: 'hl7v2', messageType: 'bad', by: 'a', at: 't' }, [])).toBe('BAD_MESSAGE_TYPE');
    expect(messageTypeValid('fhir', 'Observation')).toBe(true); expect(messageTypeValid('json', 'anything')).toBe(true);
  });
  it('needs a passing, current test to publish', () => {
    const p = base();
    expect(withPublished(p, 'a', 't2')).toBe('NO_MAPPINGS');
    const saved = withMappings(p, [m({})]) as VendorProfile;
    expect(withPublished(saved, 'a', 't2')).toBe('NOT_TESTED');
    const tested = testedWith(p, [m({})], 't2');
    expect(workingVersion(tested)?.status).toBe('tested');
    const edited = withMappings(tested, [m({ label: 'Changed' })]) as VendorProfile;
    expect(workingVersion(edited)?.status).toBe('draft');
    expect(withPublished(edited, 'a', 't3')).toBe('TEST_STALE');
    expect(withPublished(withMappings(tested, [m({})]) as VendorProfile, 'a', 't3')).toMatchObject({ versions: [{ status: 'published' }] });
  });
  it('flags a stale test', () => {
    const tested = testedWith(base(), [m({})], 't2');
    const w = workingVersion(tested)!;
    const stale = { ...tested, versions: [{ ...w, mappings: [m({ label: 'x' })] }] };
    expect(withPublished(stale, 'a', 't3')).toBe('TEST_STALE');
  });
  it('rolls back by copying the earlier version as a new one', () => {
    let p = withPublished(testedWith(base(), [m({})], 't2'), 'a', 't3') as VendorProfile;
    expect(withRollback(p, 'a', 't4')).toBe('NOTHING_TO_ROLL_BACK_TO');
    p = startDraft(p, 'a', 't5') as VendorProfile;
    p = withPublished(testedWith(p, [m({ label: 'Second' })], 't6'), 'a', 't7') as VendorProfile;
    expect(publishedVersion(p)?.version).toBe(2);
    expect(rollbackTarget(p)?.version).toBe(1);
    const back = withRollback(p, 'a', 't8') as VendorProfile;
    expect(back.versions).toHaveLength(3);
    expect(publishedVersion(back)).toMatchObject({ version: 3, rolledBackFrom: 1 });
    expect(publishedVersion(back)?.mappings[0].label).toBe('Lot number');
    expect(back.versions.find(v => v.version === 2)?.rolledBackAt).toBe('t8');
    expect(startDraft(back, 'a', 't9')).toMatchObject({ versions: expect.any(Array) });
  });
  it('retires the live version', () => {
    const p = withPublished(testedWith(base(), [m({})], 't2'), 'a', 't3') as VendorProfile;
    expect(publishedVersion(withRetired(p, 'a', 't4') as VendorProfile)).toBeUndefined();
    expect(withRetired(base(), 'a', 't4')).toBe('NOT_PUBLISHED');
  });
  it('blankMapping gives the next free id', () => { expect(blankMapping([m({ id: 'm3' })]).id).toBe('m4'); });
});

describe('text helpers', () => {
  it('codeKey', () => {
    expect(codeKey('TARGET_CORE_STRUCTURE')).toBe('targetCoreStructure'); expect(codeKey('BAD_DATETIME')).toBe('badDatetime');
    expect(codeKey('NOT_FOUND')).toBe('notFound');
  });
  it('value map round trip', () => {
    expect(parseValueMap('F=Female, M=Male')).toEqual({ F: 'Female', M: 'Male' });
    expect(formatValueMap({ F: 'Female' })).toBe('F=Female');
    expect(parseValueMap('')).toBeUndefined();
    expect(parseValueMap('X')).toEqual({ X: '' });
  });
});

describe('service', () => {
  function make(cases: string[] = ['c1']) {
    const store: Record<string, unknown> = {}; const audits: NewAuditLog[] = []; let n = 0;
    const deps: InterfaceDictionaryDeps = {
      load: <T,>(k: string, f: T) => (k in store ? (store[k] as T) : f),
      save: <T,>(k: string, v: T) => { store[k] = v; },
      audit: async e => { audits.push(e); }, actor: () => ({ name: 'Staff' }), now: () => `2026-01-0${++n}T00:00:00Z`,
      newId: () => `id${n}`, caseExists: async id => cases.includes(id),
    };
    return { svc: createInterfaceDictionaryService(deps), store, audits };
  }
  const setup = async () => {
    const t = make();
    const p = await t.svc.createProfile({ name: 'Acme', format: 'hl7v2', messageType: 'ORU^R01' });
    if (!p.ok) throw new Error('create');
    await t.svc.saveMappings(p.data.id, [m({})]);
    return { ...t, id: p.data.id };
  };
  it('creates, tests, publishes and applies to a case; audit holds no message content', async () => {
    const { svc, audits, id, store } = await setup();
    const tested = await svc.testProfile(id, HL7);
    expect(tested.ok && tested.data.result.passed).toBe(true);
    expect(JSON.stringify(store)).not.toContain('LOT-77');
    expect((await svc.publish(id)).ok).toBe(true);
    const applied = await svc.simulateReceive(id, 'c1', HL7);
    expect(applied).toEqual({ ok: true, data: { applied: 1, problems: 0 } });
    const fields = await svc.getCaseFields('c1');
    expect(fields.ok && fields.data[0]).toMatchObject({ target: 'ext.lotNumber', value: 'LOT-77', simulated: true });
    const text = JSON.stringify(audits);
    expect(text).not.toContain('LOT-77'); expect(text).not.toContain('DOE');
    expect(audits.map(a => a.event)).toEqual(expect.arrayContaining(['Interface Profile Created', 'Interface Profile Tested', 'Interface Profile Published', 'Vendor Fields Applied']));
    expect(audits.find(a => a.event === 'Vendor Fields Applied')?.caseId).toBe('c1');
  });
  it('refuses with codes', async () => {
    const { svc, id } = await setup();
    expect(await svc.publish(id)).toEqual({ ok: false, error: 'NOT_TESTED' });
    expect(await svc.testProfile(id, '')).toEqual({ ok: false, error: 'EMPTY_MESSAGE' });
    expect(await svc.testProfile(id, 'PID|1')).toEqual({ ok: false, error: 'WRONG_MESSAGE_TYPE' });
    expect(await svc.get('nope')).toEqual({ ok: false, error: 'NOT_FOUND' });
    expect(await svc.simulateReceive(id, 'c1', HL7)).toEqual({ ok: false, error: 'NO_PUBLISHED_VERSION' });
    expect(await svc.simulateReceive(id, ' ', HL7)).toEqual({ ok: false, error: 'CASE_REQUIRED' });
    expect(await svc.rollback(id)).toEqual({ ok: false, error: 'NOT_PUBLISHED' });
  });
  it('refuses a mapping onto core structure at publish', async () => {
    const { svc, id } = await setup();
    await svc.saveMappings(id, [m({ target: 'patient.mrn' })]);
    expect(await svc.testProfile(id, HL7)).toMatchObject({ ok: true, data: { result: { passed: false } } });
    expect(await svc.publish(id)).toEqual({ ok: false, error: 'MAPPING_PROBLEM' });
  });
  it('unknown case is refused', async () => {
    const { svc, id } = await setup();
    await svc.testProfile(id, HL7); await svc.publish(id);
    expect(await svc.simulateReceive(id, 'missing', HL7)).toEqual({ ok: false, error: 'NOT_FOUND' });
  });
});
