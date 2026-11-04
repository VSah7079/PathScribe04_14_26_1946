// Batch 428: the Configuration write guard.
import { describe, expect, it, vi } from 'vitest';
import { capabilityByMethod, CONFIG_NOT_PERMITTED, guardConfigWrites, isConfigRefusal, onConfigRefused, permitConfigChange } from './guardConfigWrites';

const make = () => {
  const calls: string[] = [];
  const service = {
    async getAll() { calls.push('getAll'); return { ok: true, data: [1] }; },
    async add(x: number) { calls.push(`add:${x}`); return { ok: true, data: x }; },
    async deactivate(id: number) { calls.push(`deactivate:${id}`); return this.add(-id); },
    async approve() { calls.push('approve'); return { ok: true, data: 'ok' }; },
  };
  return { calls, service };
};

describe('guardConfigWrites', () => {
  it('checks each listed method against its own capability, and lets reads through unchecked', async () => {
    const { calls, service } = make();
    const enforce = vi.fn(async (c: string) => ({ allowed: c === 'config:a:manage' }));
    const g = guardConfigWrites(service, [['config:a:manage', ['add', 'deactivate']], ['config:a:approve', ['approve']]], { enforce });
    expect(await g.getAll()).toEqual({ ok: true, data: [1] });
    expect(await g.add(2)).toEqual({ ok: true, data: 2 });
    expect(await g.approve()).toEqual({ ok: false, error: CONFIG_NOT_PERMITTED });
    expect(calls).toEqual(['getAll', 'add:2']);
    expect(enforce.mock.calls.map(c => c[0])).toEqual(['config:a:manage', 'config:a:approve']);
  });
  it('a method calling another on the same service is checked once, not twice', async () => {
    const { service } = make();
    const enforce = vi.fn(async () => ({ allowed: true }));
    const g = guardConfigWrites(service, [['config:a:manage', ['add', 'deactivate']]], { enforce });
    expect(await g.deactivate(4)).toEqual({ ok: true, data: -4 });
    expect(enforce).toHaveBeenCalledTimes(1);
  });
  it('a refusal changes nothing, tells the screen, and can throw for services without a result', async () => {
    const { calls, service } = make();
    const heard: string[] = [];
    const stop = onConfigRefused(c => heard.push(c));
    const g = guardConfigWrites(service, [['config:a:manage', ['add']]], { enforce: async () => ({ allowed: false }), refuse: 'throw' });
    await expect(g.add(1)).rejects.toThrow(CONFIG_NOT_PERMITTED);
    expect(calls).toEqual([]);
    expect(heard).toEqual(['config:a:manage']);
    stop();
    expect(isConfigRefusal(new Error(CONFIG_NOT_PERMITTED))).toBe(true);
    expect(isConfigRefusal(new Error('other'))).toBe(false);
  });
  it('works on a class instance (methods on the prototype)', async () => {
    class Svc { n = 0; async bump() { this.n += 1; return { ok: true, data: this.n }; } }
    const inst = new Svc();
    const g = guardConfigWrites(inst, [['config:a:manage', ['bump']]], { enforce: async () => ({ allowed: true }) });
    expect(await g.bump()).toEqual({ ok: true, data: 1 });
    expect(inst.n).toBe(1);
  });
  it('a method can\'t be listed under two capabilities', () => {
    expect(() => capabilityByMethod([['a:b:c', ['x']], ['a:b:d', ['x']]] as never)).toThrow();
  });
  it('permitConfigChange reports a refusal once', async () => {
    const heard: string[] = [];
    const stop = onConfigRefused(c => heard.push(c));
    expect(await permitConfigChange(Promise.resolve({ allowed: true }), 'k:a:b')).toBe(true);
    expect(await permitConfigChange(Promise.resolve({ allowed: false }), 'k:a:c')).toBe(false);
    stop();
    expect(heard).toEqual(['k:a:c']);
  });
});
