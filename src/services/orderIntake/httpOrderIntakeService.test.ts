import { describe, expect, it } from 'vitest';
import { expectCalls, expectEveryMethod, fakeApi, type CallCase } from '../apiServer/httpTestHelpers';
import { createHttpOrderIntakeService } from './httpOrderIntakeService';

const cases: CallCase[] = [
  ['listPendingOrders', [{ facilityId: 'f 1' }], 'POST', '/api/order-intake/order-intake/list-pending-orders', {"facilityId": "f 1"}],
  ['getOrder', ['o1'], 'GET', '/api/order-intake/order-intake/get-order?orderId=o1'],
  ['markOrderLinked', ['o1', 'S26-1'], 'POST', '/api/order-intake/order-intake/mark-order-linked', {"orderId": "o1", "caseId": "S26-1"}],
  ['receiveOrder', [{ externalOrderNumber: 'X1' }], 'POST', '/api/order-intake/order-intake/receive-order', {"externalOrderNumber": "X1"}],
  ['resolveOrder', ['o1'], 'POST', '/api/order-intake/order-intake/resolve-order', {"orderId": "o1"}],
  ['listCrosswalkEntries', ['c1'], 'GET', '/api/order-intake/order-intake/list-crosswalk-entries?clientId=c1'],
  ['addCrosswalkEntry', [{ clientId: 'c1' }], 'POST', '/api/order-intake/order-intake/add-crosswalk-entry', {"clientId": "c1"}],
  ['updateCrosswalkEntry', ['x1', { externalCode: 'E' }], 'POST', '/api/order-intake/order-intake/update-crosswalk-entry', {"id": "x1", "changes": {"externalCode": "E"}}],
];
describe('createHttpOrderIntakeService', () => {
  it('sends the contract calls', async () => {
    const { client, fetch } = fakeApi(200, {});
    const s = createHttpOrderIntakeService(client);
    expectEveryMethod(s, cases); await expectCalls(s, fetch, cases);
  });
  it('lists pending orders from { items } and a missing order is NOT_FOUND', async () => {
    expect(await createHttpOrderIntakeService(fakeApi(200, { items: [{ id: 'o1' }] }).client).listPendingOrders()).toEqual({ ok: true, data: [{ id: 'o1' }] });
    expect(await createHttpOrderIntakeService(fakeApi(404).client).getOrder('zz')).toEqual({ ok: false, error: 'NOT_FOUND' });
  });
});
