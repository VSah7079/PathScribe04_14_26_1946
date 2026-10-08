// src/services/mockInterfaceEngine/mockInterfaceEngineSettings.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per direct follow-up: "Is there a way to test the [PS-239]
// endpoint using mock data since the back end isn't finished?" —
// PS-239's own real "Backend Proxy" tier (the actual
// /api/v1/events/molecular-worklist endpoint dispatchMolecularWorklist.ts
// makes a real, honest HTTP call to) does not exist anywhere in this
// environment. This is real, separate DEV/DEMO TOOLING — it does not
// touch dispatchMolecularWorklist.ts's own real code at all. It
// intercepts the real fetch() call at the browser network layer
// (via MSW, Mock Service Worker) so a person can click "Dispatch
// Worklist" in the real, running UI and see a real, realistic
// response, without a real backend existing yet.
//
// Real, deliberate safety design: this whole mechanism is gated
// behind import.meta.env.DEV (Vite's own real, build-time flag — true
// only for `npm run dev`/local preview, false for a real production
// build) AND a separate, explicit, persisted "enabled" flag,
// defaulting to OFF. Never active by accident, never bundled into a
// real production build, and never silently masks the real, still-
// open PS-239 backend gap once a real backend actually exists — this
// mock's own control panel (MockInterfaceEnginePage.tsx) states
// plainly, every time, that it is not real functionality.
// ─────────────────────────────────────────────────────────────────────────────

import { storageGet, storageSet } from '../mockStorage';

export type MockInterfaceEngineMode = 'always_succeed' | 'always_fail' | 'timeout';

export interface MockInterfaceEngineSettings {
  enabled: boolean;
  mode: MockInterfaceEngineMode;
  /** Real, per this file's own header — the real HTTP status a
   *  'always_fail' response returns; a real, honest way to test
   *  dispatchMolecularWorklist.ts's own real "PathScribe's own backend
   *  rejected this worklist dispatch — HTTP {status}" message with a
   *  real, specific code, not just a generic failure. */
  failureStatus: number;
  /** Batch 434: after accepting a WSI_SCAN_MANIFEST, answer for the slide
   *  scanner too (each slide scanning, then scanned and passing QC), so the
   *  Slide scanning page can be shown end to end. On unless switched off. */
  simulateWsiScanner?: boolean;
  /** Batch 467b: after accepting a molecular worklist, answer for the instrument with this call for every patient
   *  sample (controls as expected), echoing each well's order id. 'off': no results come back. */
  molecularInstrumentCall?: 'POSITIVE' | 'NEGATIVE' | 'off';
}

const STORE_KEY = 'mock_interface_engine_settings';

const DEFAULT_SETTINGS: MockInterfaceEngineSettings = {
  enabled: false,
  mode: 'always_succeed',
  failureStatus: 500,
  simulateWsiScanner: true,
  molecularInstrumentCall: 'off', // nothing fills a report unless someone chooses a call
};

export function getMockInterfaceEngineSettings(): MockInterfaceEngineSettings {
  // Batch 434: settings saved before a field existed get its default.
  return { ...DEFAULT_SETTINGS, ...storageGet<Partial<MockInterfaceEngineSettings>>(STORE_KEY, DEFAULT_SETTINGS) };
}

export function setMockInterfaceEngineSettings(settings: MockInterfaceEngineSettings): void {
  storageSet(STORE_KEY, settings);
}
