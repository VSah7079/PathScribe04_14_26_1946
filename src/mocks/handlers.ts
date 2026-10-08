// src/mocks/handlers.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per direct follow-up on testing PS-239's own real endpoint
// with mock data — see mockInterfaceEngineSettings.ts's own header for
// the full account of what this is and why it's safely gated. This
// file's own only job: intercept the real POST
// /api/v1/events/molecular-worklist call dispatchMolecularWorklist.ts
// already, genuinely makes, and answer it according to whatever mode
// is currently configured — read fresh on every real request, not
// cached at worker-startup, so toggling the control panel takes
// effect immediately without needing to restart anything.
// ─────────────────────────────────────────────────────────────────────────────

import { http, HttpResponse, delay } from 'msw';
import { getMockInterfaceEngineSettings } from '../services/mockInterfaceEngine/mockInterfaceEngineSettings';
import { INTERFACE_RECEIVER } from '../services/interfaceDispatch/dispatchInterfaceMessage';
import { simulateWsiScanner, type ManifestLike } from '../services/mockInterfaceEngine/simulateWsiScanner';
import { simulateMolecularInstrument } from '../services/mockInterfaceEngine/simulateMolecularInstrument';
import type { MolecularWorklistPayload } from '@/types/events/MolecularWorklistPayload';

export const handlers = [
  http.post('/api/v1/events/molecular-worklist', async ({ request }) => {
    const settings = getMockInterfaceEngineSettings();

    if (settings.mode === 'timeout') {
      // Real, per this file's own header — simulates a real, hung
      // connection (an unreachable or overloaded real Interface
      // Engine), never actually resolving. dispatchMolecularWorklist.ts
      // has no real client-side timeout of its own, so this
      // genuinely leaves the real "Dispatching…" state showing,
      // exactly matching a real hung network call would.
      await delay('infinite');
    }

    if (settings.mode === 'always_fail') {
      return new HttpResponse(null, { status: settings.failureStatus });
    }

    // Batch 467b: the instrument runs the plate and reports back (results echo each well's order id).
    const worklist = await request.json().catch(() => null) as MolecularWorklistPayload | null;
    const call = settings.molecularInstrumentCall ?? 'off';
    if (worklist?.batch_info && Array.isArray(worklist.well_mappings) && call !== 'off') simulateMolecularInstrument(worklist, call);
    return HttpResponse.json({ received: true }, { status: 200 });
  }),
  // Batch 434: the interface engine's receiving end (every outbound
  // transaction type, dispatchInterfaceMessage.ts), with the same modes.
  // After accepting a WSI_SCAN_MANIFEST it can also play the slide scanner.
  ...(INTERFACE_RECEIVER.ok ? [http.post(INTERFACE_RECEIVER.url, async ({ request }) => {
    const settings = getMockInterfaceEngineSettings();
    if (settings.mode === 'timeout') await delay('infinite');
    if (settings.mode === 'always_fail') return HttpResponse.json({ ok: false, error: 'Simulated rejection (mock interface engine)' }, { status: settings.failureStatus });
    const envelope = await request.json().catch(() => null) as { queueEntryId?: string; transactionType?: string; payload?: ManifestLike } | null;
    if (envelope?.transactionType === 'WSI_SCAN_MANIFEST' && envelope.payload && settings.simulateWsiScanner !== false) simulateWsiScanner(envelope.payload);
    return HttpResponse.json({ ok: true, id: `mock-${envelope?.queueEntryId ?? 'message'}` }, { status: 200 });
  })] : []),
];
