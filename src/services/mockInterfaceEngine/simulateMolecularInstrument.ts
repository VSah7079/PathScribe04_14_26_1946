// src/services/mockInterfaceEngine/simulateMolecularInstrument.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 467b: DEVELOPER TOOL ONLY (see mockInterfaceEngineSettings.ts's header
// for the double gate). When the mock interface engine accepts a molecular
// worklist (POST /api/v1/events/molecular-worklist), this plays the
// instrument: after a short run, it reports the call chosen on the Mock
// Interface Engine page for every patient sample (controls as expected),
// echoing each well's order id, through the same inbound processor the real
// engine's results use (molecular/processInboundMolecularRunResults.ts).
// Nothing here runs in a production build.
// ─────────────────────────────────────────────────────────────────────────────

import type { MolecularWorklistPayload } from '@/types/events/MolecularWorklistPayload';
import type { MolecularRunResultsPayload } from '@/types/events/MolecularRunResultsPayload';

/** The instrument's results for a worklist. Pure. */
export function plannedInstrumentResults(worklist: Pick<MolecularWorklistPayload, 'batch_info' | 'well_mappings'>, call: 'POSITIVE' | 'NEGATIVE', now = () => new Date().toISOString()): MolecularRunResultsPayload {
  return {
    event_type: 'MOLECULAR_RUN_RESULTS',
    timestamp: now(),
    batch_info: { batch_uuid: worklist.batch_info.batch_uuid, instrument_id: worklist.batch_info.target_instrument_id, run_status: 'COMPLETED' },
    control_validation: { controls_passed: true, review_status: 'AUTO_PASSED' },
    results: worklist.well_mappings.map(w => {
      const patient = w.sample_type === 'PATIENT_SPECIMEN';
      return {
        well_position: w.well_position,
        specimen_uuid: w.specimen_uuid,
        ...(w.accession_number ? { accession_number: w.accession_number } : {}),
        ...(w.order_id ? { order_id: w.order_id } : {}),
        raw_data: patient ? { ct_value: call === 'POSITIVE' ? 27.4 : undefined, internal_control_ct: 28.6 } : { internal_control_ct: 28.1 },
        interpretation: patient ? call : w.control_info?.expected_value ?? 'NEGATIVE',
        flag: 'NONE' as const,
      };
    }),
  };
}

/** Schedules the run's results. */
export function simulateMolecularInstrument(worklist: Pick<MolecularWorklistPayload, 'batch_info' | 'well_mappings'>, call: 'POSITIVE' | 'NEGATIVE', runMs = 3000): void {
  setTimeout(() => {
    void import('../molecular/processInboundMolecularRunResults').then(m => m.processInboundMolecularRunResults(plannedInstrumentResults(worklist, call)));
  }, runMs);
}
