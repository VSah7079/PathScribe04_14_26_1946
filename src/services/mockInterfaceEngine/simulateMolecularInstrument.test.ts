// Batch 467b: the mock interface engine's molecular instrument.
import { describe, it, expect } from 'vitest';
import { plannedInstrumentResults } from './simulateMolecularInstrument';
import type { MolecularWorklistPayload } from '@/types/events/MolecularWorklistPayload';

const worklist = {
  batch_info: { batch_id: 'B', batch_uuid: 'uuid-1', assay_code: 'st-egfr-pcr', assay_name: 'EGFR', target_instrument_id: 'PCR_01' },
  well_mappings: [
    { well_position: 'A01', sample_type: 'CONTROL_NTC', specimen_uuid: null, control_info: { control_id: 'NTC', expected_value: 'NEGATIVE' } },
    { well_position: 'A02', sample_type: 'CONTROL_PTC_HIGH', specimen_uuid: null, control_info: { control_id: 'PTC', expected_value: 'POSITIVE' } },
    { well_position: 'A03', sample_type: 'PATIENT_SPECIMEN', specimen_uuid: 'sp1', accession_number: 'S26-4493', order_id: 'MO-1' },
  ],
} as unknown as Pick<MolecularWorklistPayload, 'batch_info' | 'well_mappings'>;

describe('plannedInstrumentResults', () => {
  it('reports the chosen call for patient samples, controls as expected, and echoes each order id', () => {
    const r = plannedInstrumentResults(worklist, 'POSITIVE', () => 'T');
    expect(r.batch_info).toEqual({ batch_uuid: 'uuid-1', instrument_id: 'PCR_01', run_status: 'COMPLETED' });
    expect(r.control_validation.controls_passed).toBe(true);
    expect(r.results.map(x => [x.well_position, x.interpretation, x.order_id])).toEqual([['A01', 'NEGATIVE', undefined], ['A02', 'POSITIVE', undefined], ['A03', 'POSITIVE', 'MO-1']]);
    expect(r.results[2]).toMatchObject({ accession_number: 'S26-4493', specimen_uuid: 'sp1', flag: 'NONE' });
    expect(plannedInstrumentResults(worklist, 'NEGATIVE').results[2].interpretation).toBe('NEGATIVE');
  });
});
