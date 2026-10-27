// Batch 669 (mol-10): control id, expected value and expiry in the plate builder's control-well panel.
import { describe, it, expect } from 'vitest';
import type { MolecularWell } from './IMolecularBatchService';
import {
  defaultExpectedValue, withSampleType, withControlLotNumber, withControlExpiry, withExpectedValue, dateInputToIso, isoToDateInput, controlPanelValues,
} from './controlWellInfo';

const well = (over: Partial<MolecularWell> = {}): MolecularWell => ({ wellPosition: 'A01', sampleType: 'CONTROL_NTC', ...over });

describe('control id follows the lot number', () => {
  it('typing the lot one character at a time ends with the whole lot as the id (it used to stay the first letter)', () => {
    let w = well();
    for (const typed of ['N', 'NT', 'NTC', 'NTC-', 'NTC-4', 'NTC-44', 'NTC-441']) w = withControlLotNumber(w, typed);
    expect(w.controlInfo).toMatchObject({ controlLotNumber: 'NTC-441', controlId: 'NTC-441' });
  });

  it('an id that was set to something else is kept', () => {
    const w = withControlLotNumber(well({ controlInfo: { controlId: 'HOUSE-NTC', controlLotNumber: 'L1', controlExpirationDate: '', expectedValue: 'NEGATIVE' } }), 'L2');
    expect(w.controlInfo).toMatchObject({ controlLotNumber: 'L2', controlId: 'HOUSE-NTC' });
  });
});

describe('expected value', () => {
  it('a no-template control expects NEGATIVE; positive controls and calibrators POSITIVE', () => {
    expect(defaultExpectedValue('CONTROL_NTC')).toBe('NEGATIVE');
    for (const t of ['CONTROL_PTC_HIGH', 'CONTROL_PTC_LOW', 'CALIBRATOR'] as const) expect(defaultExpectedValue(t)).toBe('POSITIVE');
  });

  it('a new positive control starts at POSITIVE, and typing its lot keeps that (it used to become NEGATIVE)', () => {
    const w = withControlLotNumber(withSampleType(well({ sampleType: undefined }), 'CONTROL_PTC_HIGH'), 'PTC-902');
    expect(w.controlInfo?.expectedValue).toBe('POSITIVE');
  });

  it('changing the type moves the default with it, but a value the person chose is kept', () => {
    const typed = withSampleType(withControlLotNumber(well(), 'X'), 'CONTROL_PTC_LOW');
    expect(typed.controlInfo?.expectedValue).toBe('POSITIVE');
    const chosen = withSampleType(withExpectedValue(well(), 'POSITIVE'), 'CONTROL_PTC_HIGH');
    expect(chosen.controlInfo?.expectedValue).toBe('POSITIVE');
    const keptNegative = withSampleType(withExpectedValue(well({ sampleType: 'CONTROL_PTC_HIGH' }), 'NEGATIVE'), 'CONTROL_NTC');
    expect(keptNegative.controlInfo?.expectedValue).toBe('NEGATIVE');
  });

  it('can be set either way', () => {
    expect(withExpectedValue(well(), 'POSITIVE').controlInfo?.expectedValue).toBe('POSITIVE');
    expect(withExpectedValue(well({ sampleType: 'CONTROL_PTC_HIGH' }), 'NEGATIVE').controlInfo?.expectedValue).toBe('NEGATIVE');
  });

  it('a patient or empty well carries no control information', () => {
    expect(withSampleType(withControlLotNumber(well(), 'L'), 'PATIENT_SPECIMEN').controlInfo).toBeUndefined();
    expect(withSampleType(withControlLotNumber(well(), 'L'), undefined).controlInfo).toBeUndefined();
  });
});

describe('expiry date box', () => {
  it('stores a calendar date as UTC midnight and shows it back the same, in any time zone', () => {
    expect(dateInputToIso('2027-01-15')).toBe('2027-01-15T00:00:00.000Z');
    expect(isoToDateInput('2027-01-15T00:00:00.000Z')).toBe('2027-01-15');
  });

  it('clearing the box clears the date instead of throwing; nonsense reads as empty', () => {
    expect(dateInputToIso('')).toBe('');
    expect(dateInputToIso('2027-13-45')).toBe('');
    expect(isoToDateInput(undefined)).toBe('');
    expect(withControlExpiry(well(), '').controlInfo?.controlExpirationDate).toBe('');
  });

  it('the panel shows the stored date when the well is selected again', () => {
    const w = withControlExpiry(withControlLotNumber(well(), 'L1'), '2027-03-02');
    expect(controlPanelValues(w)).toEqual({ lotNumber: 'L1', expiry: '2027-03-02', expected: 'NEGATIVE' });
    expect(controlPanelValues(well({ sampleType: 'CALIBRATOR' }))).toEqual({ lotNumber: '', expiry: '', expected: 'POSITIVE' });
  });
});
