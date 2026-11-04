import { describe, expect, it, vi } from 'vitest';

vi.mock('./apiServerUrl', () => ({ apiServerUrl: vi.fn() }));
import { apiServerUrl } from './apiServerUrl';
import { chooseService, usesApiServer } from './serviceSelection';

describe('chooseService', () => {
  it('gives the mock with no API server address', () => {
    (apiServerUrl as ReturnType<typeof vi.fn>).mockReturnValue(null);
    const mock = { kind: 'mock' };
    const make = vi.fn(() => ({ kind: 'http' }));
    expect(chooseService('x', mock, make)).toBe(mock);
    expect(make).not.toHaveBeenCalled();
    expect(usesApiServer()).toBe(false);
  });
  it('gives the server version, built on a client, with an address', () => {
    (apiServerUrl as ReturnType<typeof vi.fn>).mockReturnValue('https://api.test');
    const got = chooseService<{ kind: string; hasGet?: boolean }>('x', { kind: 'mock' }, client => ({ kind: 'http', hasGet: typeof client.get === 'function' }));
    expect(got).toEqual({ kind: 'http', hasGet: true });
    expect(usesApiServer()).toBe(true);
  });
});
