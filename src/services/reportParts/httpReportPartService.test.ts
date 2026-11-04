import { describe, expect, it, vi } from 'vitest';
import { expectCalls, expectEveryMethod, fakeApi, type CallCase } from '../apiServer/httpTestHelpers';
import { createHttpReportPartService } from './httpReportPartService';

const part = { id: 'p 1', name: 'P' };
const cases: CallCase[] = [
  ['getAll', [{ partType: 'diagnosis', search: 'a b' }], 'POST', '/api/report-parts/report-part/get-all', {"partType": "diagnosis", "search": "a b"}],
  ['getById', ['p 1'], 'GET', '/api/report-parts/report-part/get-by-id?id=p%201'],
  ['getByIds', [['a', 'b']], 'GET', '/api/report-parts/report-part/get-by-ids?ids=a&ids=b'],
  ['create', [{ name: 'N' }], 'POST', '/api/report-parts/report-part/create', {"name": "N"}],
  ['save', [part], 'POST', '/api/report-parts/report-part/save', part],
  ['publish', ['p1'], 'POST', '/api/report-parts/report-part/publish', {"id": "p1"}],
  ['archive', ['p1'], 'POST', '/api/report-parts/report-part/archive', {"id": "p1"}],
  ['clone', ['p1', 'Copy'], 'POST', '/api/report-parts/report-part/clone', {"id": "p1", "newName": "Copy"}],
  ['remove', ['p1'], 'POST', '/api/report-parts/report-part/remove', {"id": "p1"}],
];
describe('createHttpReportPartService', () => {
  it('sends the contract calls', async () => {
    const { client, fetch } = fakeApi(200, {});
    const s = createHttpReportPartService(client);
    expectEveryMethod(s, cases); await expectCalls(s, fetch, cases);
  });
  it('tells open screens after a change that worked, and not after a refusal', async () => {
    const changed = vi.fn();
    await createHttpReportPartService(fakeApi(200, {}).client, changed).save(part as never);
    expect(changed).toHaveBeenCalledTimes(1);
    const refused = vi.fn();
    expect(await createHttpReportPartService(fakeApi(403).client, refused).publish('p1')).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    expect(refused).not.toHaveBeenCalled();
  });
  it('a read does not fire the event', async () => {
    const changed = vi.fn();
    await createHttpReportPartService(fakeApi(200, { items: [] }).client, changed).getAll();
    expect(changed).not.toHaveBeenCalled();
  });
});
