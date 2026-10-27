import { describe, it, expect } from 'vitest';
import { createMockEpathTransport, createMockEpathTransports } from './epathTransport';
import { EPATH_TRANSPORTS } from './epathProfile';

// Batch 620 (part E, PS-800): the transport adapters are a contract and mocks; nothing leaves the browser.
describe('epath transport adapters', () => {
  it('there is one adapter for every transport a profile can name', () => {
    const all = createMockEpathTransports();
    expect(Object.keys(all).sort()).toEqual([...EPATH_TRANSPORTS].sort());
    for (const k of EPATH_TRANSPORTS) expect(all[k].kind).toBe(k);
  });
  it('a mock accepts by default and can be made to fail', async () => {
    expect(await createMockEpathTransport('sftp').send({ messageControlId: 'm', message: 'MSH|' })).toEqual({ accepted: true });
    expect(await createMockEpathTransport('phinMs', { accepted: false, failure: 'UNREACHABLE' }).send({ messageControlId: 'm', message: 'x' })).toEqual({ accepted: false, failure: 'UNREACHABLE' });
  });
});
