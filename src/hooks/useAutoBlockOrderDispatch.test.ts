import { describe, it, expect } from 'vitest';
import { blockKeys, newBlockKeys } from './useAutoBlockOrderDispatch';

describe('auto block order dispatch helpers', () => {
  const specs = [{ id: 's1', blocks: [{ id: 'b1' }, { id: 'b2' }] }, { id: 's2' }];
  it('lists block keys across specimens', () => { expect(blockKeys(specs)).toEqual(['s1::b1', 's1::b2']); expect(blockKeys(undefined)).toEqual([]); });
  it('finds only blocks not already known', () => {
    expect(newBlockKeys(new Set(['s1::b1']), specs)).toEqual(['s1::b2']);
    expect(newBlockKeys(new Set(blockKeys(specs)), specs)).toEqual([]);
  });
});
