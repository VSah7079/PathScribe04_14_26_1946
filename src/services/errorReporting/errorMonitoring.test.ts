import { afterEach, describe, expect, it, vi } from 'vitest';
import { monitoringSink, resetErrorMonitoringForTests, startErrorMonitoring } from './errorMonitoring';
import type { ClientErrorReport } from './clientErrorReporter';
import type { SentrySdk } from './sentrySink';

const DSN = 'https://k@o1.ingest.sentry.io/2';
const report: ClientErrorReport = { name: 'Error', message: 'Boom', stack: [], route: '/worklist', reference: 'ERR-ABCD-2345', source: 'render', at: 'x' };
const sdk = (): SentrySdk => ({ init: vi.fn(), captureException: vi.fn() });

afterEach(() => resetErrorMonitoringForTests());

describe('startErrorMonitoring (PS-469)', () => {
  it('stays off, and never loads the SDK, without a DSN and an environment', async () => {
    const loadSdk = vi.fn(async () => sdk());
    expect(await startErrorMonitoring({ dsn: undefined, environment: 'v', loadSdk })).toBe(false);
    expect(await startErrorMonitoring({ dsn: DSN, environment: undefined, loadSdk })).toBe(false);
    expect(await startErrorMonitoring({ dsn: 'bad', environment: 'v', loadSdk })).toBe(false);
    expect(loadSdk).not.toHaveBeenCalled();
    monitoringSink(report); // does nothing, does not throw
  });

  it('sends reports once started, and sends those that arrived while the SDK loaded', async () => {
    const s = sdk();
    let release!: () => void;
    const loading = new Promise<void>(r => { release = r; });
    const started = startErrorMonitoring({ dsn: DSN, environment: 'v', loadSdk: async () => { await loading; return s; } });
    monitoringSink(report);
    release();
    expect(await started).toBe(true);
    expect(s.captureException).toHaveBeenCalledTimes(1);
    monitoringSink({ ...report, reference: 'ERR-WXYZ-6789' });
    expect(s.captureException).toHaveBeenCalledTimes(2);
  });

  it('stays off, quietly, when the SDK cannot be loaded', async () => {
    expect(await startErrorMonitoring({ dsn: DSN, environment: 'v', loadSdk: async () => { throw new Error('offline'); } })).toBe(false);
    monitoringSink(report);
  });
});
