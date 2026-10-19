import { describe, expect, it, vi } from 'vitest';
import { createClientErrorReporter, type ClientErrorReport } from './clientErrorReporter';
import { createSentrySink, isSendableReport, sentryBeforeSend, type SentrySdk } from './sentrySink';

const CFG = { dsn: 'https://k@o1.ingest.sentry.io/2', environment: 'validation' };

function fakeSdk() {
  const captured: { error: Error; tags?: Record<string, string> }[] = [];
  const sdk: SentrySdk & { options?: Record<string, unknown> } = {
    init: vi.fn((o: Record<string, unknown>) => { sdk.options = o; }),
    captureException: vi.fn((error: unknown, hint?: { tags?: Record<string, string> }) => { captured.push({ error: error as Error, tags: hint?.tags }); }),
  };
  return { sdk, captured };
}

/** The app's real reporter with the Sentry sink as its only sink. */
function reporterWithSink() {
  const { sdk, captured } = fakeSdk();
  const sink = createSentrySink(CFG, sdk);
  const reporter = createClientErrorReporter({ sinks: [sink], now: () => 1_000_000, pathname: () => '/case/SR-26-4401/synoptic', newReference: () => 'ERR-ABCD-2345' });
  return { sdk, captured, reporter, sink };
}

describe('Sentry sink (PS-469)', () => {
  it('starts Sentry with its own collectors off', () => {
    const { sdk } = reporterWithSink();
    expect(sdk.options).toMatchObject({
      dsn: CFG.dsn, environment: 'validation', defaultIntegrations: false, integrations: [], sendDefaultPii: false, tracesSampleRate: 0,
    });
    expect((sdk.options!.beforeBreadcrumb as () => unknown)()).toBeNull();
  });

  it('a crash holding a patient name, an MRN and a case number reaches Sentry with none of them', () => {
    const { captured, reporter } = reporterWithSink();
    const err = new Error('Cannot read mrn 8675309 of "Jane Doe" for SR-26-4401 jane.doe@hospital.example');
    err.stack = `Error: ${err.message}\n    at render (https://app.example/assets/index-1a2b.js:10:5?patient=Jane%20Doe)`;
    reporter.report(err, 'render', 'route');
    expect(captured).toHaveLength(1);
    const sent = JSON.stringify({ message: captured[0].error.message, stack: captured[0].error.stack, tags: captured[0].tags });
    for (const secret of ['Jane', 'Doe', '8675309', 'SR-26-4401', 'jane.doe@', '26-4401', 'patient=']) expect(sent).not.toContain(secret);
    expect(captured[0].tags).toMatchObject({ source: 'render', boundary: 'route', route: '/case/:id/synoptic', reference: 'ERR-ABCD-2345' });
  });

  it('drops a report that does not have the scrubbed shape (fails closed)', () => {
    const { sdk, sink } = reporterWithSink();
    const good: ClientErrorReport = { name: 'TypeError', message: 'Cannot read property of undefined', stack: ['at f (a.js:1:2)'], route: '/worklist', reference: 'ERR-ABCD-2345', source: 'render', at: 'x' };
    const bad: unknown[] = [
      { ...good, route: '/case/SR-26-4401/synoptic' },       // an unscrubbed path
      { ...good, message: 'Jane Doe mrn 123456' },           // digits in the message
      { ...good, message: 'contact a@b.example' },           // an e-mail address
      { ...good, stack: ['at f (a.js:1:2?name=Jane)'] },     // a query string in a frame
      { ...good, reference: 'free text' },
      { ...good, source: 'other' },
      { ...good, name: 'Jane Doe' },
      { ...good, stack: 'not an array' },
      null, 'text', {},
    ];
    for (const b of bad) { sink(b as ClientErrorReport); expect(isSendableReport(b)).toBe(false); }
    expect(sdk.captureException).not.toHaveBeenCalled();
    sink(good);
    expect(sdk.captureException).toHaveBeenCalledTimes(1);
  });

  it('removes request, user, extra, contexts and breadcrumbs from any event Sentry builds', () => {
    const event = sentryBeforeSend({ message: 'x', request: { url: '/case/SR-1' }, user: { id: 'u' }, extra: { a: 1 }, contexts: { c: 1 }, breadcrumbs: [{ message: 'clicked Jane Doe' }] });
    expect(event).toEqual({ message: 'x', breadcrumbs: [] });
  });

  it('drops the event if cleaning it throws', () => {
    const frozen = Object.freeze({ request: {}, user: {} });
    expect(sentryBeforeSend(frozen as Record<string, unknown>)).toBeNull();
  });
});
