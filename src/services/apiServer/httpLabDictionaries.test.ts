// Batch 616 (PS-507): the server versions of the lab dictionaries, against a
// fake fetch (LAB_DICTIONARIES_API.md).
import { describe, expect, it, vi } from 'vitest';
import { createApiHttpClient } from './apiHttpClient';
import { createHttpDepartmentService } from '../departments/httpDepartmentService';
import { createHttpLocationService } from '../locations/httpLocationService';
import { createHttpContainerTypeService } from '../containerTypes/httpContainerTypeService';
import { createHttpInkColorService } from '../inkColors/httpInkColorService';
import { createHttpCassetteColorService } from '../cassetteColors/httpCassetteColorService';
import { createHttpPhysicianService } from '../physicians/httpPhysicianService';
import { createHttpReasonDictionaryService } from '../reasons/httpReasonDictionaryService';

const reply = (status: number, body?: unknown): Response => new Response(body === undefined ? null : JSON.stringify(body), { status });
type F = ReturnType<typeof vi.fn>;
// a fresh Response per call (a body can be read once)
const always = (status: number, body?: unknown) => vi.fn().mockImplementation(async () => reply(status, body));
const client = (f: F) => createApiHttpClient({ baseUrl: 'https://api.test', fetch: f as unknown as typeof fetch, accessToken: async () => 't' });
const sig = (f: F) => f.mock.calls.map(c => `${(c[1] as RequestInit).method} ${(c[0] as string).replace('https://api.test', '')}`);
const ok = () => always(200, { items: [] });

describe('lab dictionaries over the API server', () => {
  it('departments', async () => {
    const f = ok(); const s = createHttpDepartmentService(client(f));
    await s.getAll(); await s.getById('d1'); await s.add({ name: 'D' } as never); await s.update('d1', {}); await s.verify('d1'); await s.deactivate('d1'); await s.findOrCreateByName('Derm', 'n');
    expect(sig(f)).toEqual(['GET /api/departments/department/get-all', 'GET /api/departments/department/get-by-id?id=d1', 'POST /api/departments/department/add', 'POST /api/departments/department/update', 'POST /api/departments/department/verify', 'POST /api/departments/department/deactivate', 'POST /api/departments/department/find-or-create-by-name']);
  });
  it('locations, with the facility filter', async () => {
    const f = ok(); const s = createHttpLocationService(client(f));
    await s.getAll(); await s.listForFacility('f 1'); await s.getById('l1'); await s.create({ name: 'L' } as never); await s.update('l1', {}); await s.deactivate('l1'); await s.reactivate('l1'); await s.verify('l1'); await s.findOrCreateByPV1({ facilityId: 'f1', pointOfCare: 'ICU' });
    expect(sig(f)).toEqual(['GET /api/locations/location/get-all', 'GET /api/locations/location/list-for-facility?facilityId=f%201', 'GET /api/locations/location/get-by-id?id=l1', 'POST /api/locations/location/create', 'POST /api/locations/location/update', 'POST /api/locations/location/deactivate', 'POST /api/locations/location/reactivate', 'POST /api/locations/location/verify', 'POST /api/locations/location/find-or-create-by-pv1']);
  });
  it('container types', async () => {
    const f = ok(); const s = createHttpContainerTypeService(client(f));
    await s.getAll(); await s.getById('c1'); await s.create({} as never); await s.update('c1', {}); await s.deactivate('c1'); await s.reactivate('c1');
    expect(sig(f)).toEqual(['GET /api/container-types/container-type/get-all', 'GET /api/container-types/container-type/get-by-id?id=c1', 'POST /api/container-types/container-type/create', 'POST /api/container-types/container-type/update', 'POST /api/container-types/container-type/deactivate', 'POST /api/container-types/container-type/reactivate']);
  });
  it('ink colours and cassette colours (by key too)', async () => {
    const f = ok(); const i = createHttpInkColorService(client(f)); const c = createHttpCassetteColorService(client(f));
    await i.getAll(); await i.getById('i1'); await i.create({} as never); await i.update('i1', {}); await i.deactivate('i1'); await i.reactivate('i1');
    await c.getAll(); await c.getById('c1'); await c.getByKey('pink/red'); await c.create({} as never); await c.update('c1', {}); await c.deactivate('c1'); await c.reactivate('c1');
    expect(sig(f)).toEqual([
      'GET /api/ink-colors/ink-color/get-all', 'GET /api/ink-colors/ink-color/get-by-id?id=i1', 'POST /api/ink-colors/ink-color/create', 'POST /api/ink-colors/ink-color/update', 'POST /api/ink-colors/ink-color/deactivate', 'POST /api/ink-colors/ink-color/reactivate',
      'GET /api/cassette-colors/cassette-color/get-all', 'GET /api/cassette-colors/cassette-color/get-by-id?id=c1', 'GET /api/cassette-colors/cassette-color/get-by-key?key=pink%2Fred', 'POST /api/cassette-colors/cassette-color/create', 'POST /api/cassette-colors/cassette-color/update', 'POST /api/cassette-colors/cassette-color/deactivate', 'POST /api/cassette-colors/cassette-color/reactivate',
    ]);
  });
  it('physicians: search text goes in the query, no match by NPI is a successful none', async () => {
    const f = always(200, { items: [] }); const s = createHttpPhysicianService(client(f));
    await s.getAll(); await s.getById('p1'); await s.search('o\'brien', 5); await s.findOrCreateByName('Dr X', 'cl1'); await s.add({} as never); await s.update('p1', {}); await s.verify('p1'); await s.deactivate('p1');
    await s.findOrCreateByStructuredName({ givenNames: 'A', familyNames: 'B' }, 'cl1'); await s.findOrCreateByNpi('123', { first: 'A', last: 'B' });
    expect(sig(f)).toEqual(['GET /api/physicians/physician/get-all', 'GET /api/physicians/physician/get-by-id?id=p1', "GET /api/physicians/physician/search?query=o'brien&limit=5", 'POST /api/physicians/physician/find-or-create-by-name', 'POST /api/physicians/physician/add', 'POST /api/physicians/physician/update', 'POST /api/physicians/physician/verify', 'POST /api/physicians/physician/deactivate', 'POST /api/physicians/physician/find-or-create-by-structured-name', 'POST /api/physicians/physician/find-or-create-by-npi']);
    const g = always(404, {});
    expect(await createHttpPhysicianService(client(g)).getByNpi('999')).toEqual({ ok: true, data: null });
    expect(sig(g)).toEqual(['GET /api/physicians/physician/get-by-npi?npi=999']);
  });
  it('reasons: a category is always sent', async () => {
    const f = ok(); const s = createHttpReasonDictionaryService(client(f));
    await s.getAll('AMENDMENT' as never); await s.add({} as never); await s.update('r1', {}); await s.deactivate('r1'); await s.reactivate('r1');
    expect(sig(f)).toEqual(['GET /api/reasons/reason-dictionary/get-all?category=AMENDMENT', 'POST /api/reasons/reason-dictionary/add', 'POST /api/reasons/reason-dictionary/update', 'POST /api/reasons/reason-dictionary/deactivate', 'POST /api/reasons/reason-dictionary/reactivate']);
  });
  it('a refused write is NOT_PERMITTED and a missing id NOT_FOUND', async () => {
    const f = vi.fn().mockResolvedValueOnce(reply(403, {})).mockResolvedValueOnce(reply(404, {}));
    const s = createHttpInkColorService(client(f));
    expect(await s.create({} as never)).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    expect(await s.getById('x')).toEqual({ ok: false, error: 'NOT_FOUND' });
  });
});
