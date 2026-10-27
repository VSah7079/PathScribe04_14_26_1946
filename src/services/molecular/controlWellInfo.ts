// src/services/molecular/controlWellInfo.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 669 (mol-10): the plate builder's control-well panel decisions, moved out of the page and fixed. Pure.
//   - Control id: it follows the lot number as it is typed (a control is identified by its lot) until someone sets a
//     different id. It used to be set once, to the FIRST character typed, and never updated, so Trace showed a
//     one-letter id.
//   - Expected value: a negative control (NTC) expects NEGATIVE; a positive control (high or low) and a calibrator
//     expect POSITIVE. It used to be NEGATIVE for every control and could not be changed. The panel offers the choice;
//     a new control well starts from the default for its type, and changing the type moves the value with it unless the
//     person had already picked another.
//   - Expiry: the date box shows the stored date, as a plain calendar date (UTC midnight, so it does not shift with the
//     computer's time zone), and clearing it clears the date (it used to throw on an empty value).
// ─────────────────────────────────────────────────────────────────────────────

import type { MolecularControlInfo, MolecularSampleType, MolecularWell } from './IMolecularBatchService';

export type ExpectedValue = MolecularControlInfo['expectedValue'];

const isControl = (t: MolecularSampleType | undefined): t is Exclude<MolecularSampleType, 'PATIENT_SPECIMEN'> => !!t && t !== 'PATIENT_SPECIMEN';

/** What a control of this type is expected to read: a no-template control NEGATIVE, positive controls and calibrators POSITIVE. */
export function defaultExpectedValue(sampleType: MolecularSampleType | undefined): ExpectedValue {
  return sampleType === 'CONTROL_NTC' || sampleType === undefined ? 'NEGATIVE' : 'POSITIVE';
}

const blank = (sampleType: MolecularSampleType | undefined): MolecularControlInfo => ({ controlId: '', controlLotNumber: '', controlExpirationDate: '', expectedValue: defaultExpectedValue(sampleType) });

/** The well with a new sample type: a control keeps what was typed (its expected value follows the type's default unless
 *  another was chosen); a patient or empty well carries no control information. */
export function withSampleType(well: MolecularWell, sampleType: MolecularSampleType | undefined): MolecularWell {
  if (!isControl(sampleType)) return { ...well, sampleType, controlInfo: undefined };
  const prior = well.controlInfo ?? blank(well.sampleType);
  const followed = prior.expectedValue === defaultExpectedValue(well.sampleType) ? defaultExpectedValue(sampleType) : prior.expectedValue;
  return { ...well, sampleType, controlInfo: { ...prior, expectedValue: followed } };
}

/** The well with its control lot number changed; the control id follows it unless the id was set to something else. */
export function withControlLotNumber(well: MolecularWell, lotNumber: string): MolecularWell {
  const prior = well.controlInfo ?? blank(well.sampleType);
  const idFollowsLot = prior.controlId === '' || prior.controlId === prior.controlLotNumber;
  return { ...well, controlInfo: { ...prior, controlLotNumber: lotNumber, controlId: idFollowsLot ? lotNumber : prior.controlId } };
}

/** The well with its control expiry changed from a date box value (yyyy-mm-dd, or empty). */
export function withControlExpiry(well: MolecularWell, dateInput: string): MolecularWell {
  const prior = well.controlInfo ?? blank(well.sampleType);
  return { ...well, controlInfo: { ...prior, controlExpirationDate: dateInputToIso(dateInput) } };
}

/** The well with its expected value chosen. */
export function withExpectedValue(well: MolecularWell, expected: ExpectedValue): MolecularWell {
  const prior = well.controlInfo ?? blank(well.sampleType);
  return { ...well, controlInfo: { ...prior, expectedValue: expected } };
}

/** yyyy-mm-dd from the date box → the stored ISO instant (UTC midnight); anything that is not a calendar date → ''. */
export function dateInputToIso(value: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)) ? `${value}T00:00:00.000Z` : '';
}

/** The stored instant → the date box value. */
export function isoToDateInput(iso: string | undefined): string {
  return iso && /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10) : '';
}

/** What the control-well panel shows for the well (a blank control when none was entered yet). */
export function controlPanelValues(well: Pick<MolecularWell, 'sampleType' | 'controlInfo'>): { lotNumber: string; expiry: string; expected: ExpectedValue } {
  return {
    lotNumber: well.controlInfo?.controlLotNumber ?? '',
    expiry: isoToDateInput(well.controlInfo?.controlExpirationDate),
    expected: well.controlInfo?.expectedValue ?? defaultExpectedValue(well.sampleType),
  };
}
