// Batch 763: the QC gate's rules.
import { describe, it, expect } from 'vitest';
import { DEFAULT_STAIN_QC_SETTINGS, distributionQcProblem, imageQcAtUnload, qcModeFor, runQcAllowsDistribution, runStatusFrom, signOffProblems, slideStatusFromQc } from './stainQcRules';

describe('stain QC rules', () => {
  it('an instrument’s own mode wins over the default', () => {
    expect(qcModeFor({ qcMode: 'vendorSignOff' }, DEFAULT_STAIN_QC_SETTINGS, 'stainer')).toBe('vendorSignOff');
    expect(qcModeFor(null, DEFAULT_STAIN_QC_SETTINGS, 'stainer')).toBe('pathscribeSignOff');
    expect(qcModeFor({}, DEFAULT_STAIN_QC_SETTINGS, 'scanner')).toBe('autoAccept');
  });

  it('a run leaves for distribution only once decided', () => {
    expect(runQcAllowsDistribution(null)).toBe(false);
    expect(runQcAllowsDistribution({ status: 'pending' })).toBe(false);
    expect(runQcAllowsDistribution({ status: 'passed' })).toBe(true);
    expect(runQcAllowsDistribution({ status: 'failed' })).toBe(true);
  });

  it('a run fails when any slide failed', () => {
    expect(runStatusFrom([{ outcome: 'pass' }, { outcome: 'fail' }])).toBe('failed');
    expect(runStatusFrom([{ outcome: 'pass' }])).toBe('passed');
  });

  it('a sign-off covers every slide, and every failed slide has its follow-up', () => {
    const slides = [{ slideId: 'a' }, { slideId: 'b' }];
    expect(signOffProblems(slides, [{ slideId: 'a', caseAccession: 'x', outcome: 'pass' }])).toEqual(['missingSlide']);
    expect(signOffProblems(slides, [{ slideId: 'a', caseAccession: 'x', outcome: 'pass' }, { slideId: 'b', caseAccession: 'x', outcome: 'fail' }])).toEqual(['missingAction']);
    expect(signOffProblems(slides, [{ slideId: 'a', caseAccession: 'x', outcome: 'pass' }, { slideId: 'b', caseAccession: 'x', outcome: 'fail', action: 'recut' }])).toEqual([]);
  });

  it('maps a QC outcome to the slide’s stain status, and the stain status to a distribution refusal', () => {
    expect(slideStatusFromQc({ outcome: 'pending' })).toBe('QC Pending');
    expect(slideStatusFromQc({ outcome: 'pass' })).toBe('Ready for Review');
    expect(slideStatusFromQc({ outcome: 'fail', action: 'restain' })).toBe('QC Failed');
    expect(slideStatusFromQc({ outcome: 'fail', action: 'recut' })).toBe('Recut Requested');
    expect(distributionQcProblem('QC Pending')).toBe('qcPending');
    expect(distributionQcProblem('QC Failed')).toBe('qcFailed');
    expect(distributionQcProblem('Recut Requested')).toBe('recutRequested');
    expect(distributionQcProblem('Coverslipped')).toBeNull();
    expect(distributionQcProblem(undefined)).toBeNull();
  });

  it('holds a scanned image at unload unless the mode releases it', () => {
    expect(imageQcAtUnload('autoAccept', false)).toBe('release');
    expect(imageQcAtUnload('vendorSignOff', true)).toBe('release');
    expect(imageQcAtUnload('vendorSignOff', undefined)).toBe('pending');
    expect(imageQcAtUnload('pathscribeSignOff', true)).toBe('pending');
  });
});
