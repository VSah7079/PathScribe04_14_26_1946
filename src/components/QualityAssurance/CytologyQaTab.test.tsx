// @vitest-environment happy-dom
//
// Batch 450 (PS-216, PS-217) and Batch 451 (PS-204): the Cytology QA tab's Post-Sign-Out Peer Review
// and Secondary Screening Audit tiles. Each fetches its report for the scope
// chosen and shows it. The report service is replaced with a stub; what goes
// into each report is tested in services/cytology/mockCytologyQaReportService.scope.test.ts.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react';

vi.mock('@/contexts/SystemConfigContext', () => ({ useSystemConfig: () => ({ config: { facilityTimezone: 'America/Phoenix' } }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const svc = vi.hoisted(() => {
  const aggregate = {
    totalCompared: 4, exactCount: 2, minorDiscrepancyCount: 1, majorDiscrepancyCount: 1,
    majorFalseNegativeCount: 1, majorFalsePositiveCount: 0, adequacyDiscrepancyCount: 0,
    overallAgreementPercent: 50, majorConcordancePercent: 75, falseNegativeRatePercent: 25,
    diagnosticUpgradeCount: 2, diagnosticDowngradeCount: 0,
    comparisons: [{
      caseId: 'CASE-PEER-1', specimenId: 'S1', initialInterpretationId: 'nilm', initialInterpretationLabel: 'NILM-FD', initialReviewerName: 'Dr Final',
      initialRecordedAt: '', followUpInterpretationId: 'hsil', followUpInterpretationLabel: 'HSIL-PEER', followUpReviewerName: 'Dr Peer',
      followUpRecordedAt: '', level: 'major_discrepancy', majorSubtype: 'false_negative', adequacyDiscrepancy: false, shiftDirection: 'upgrade',
    }],
  };
  const empty = { ...aggregate, totalCompared: 0, exactCount: 0, minorDiscrepancyCount: 0, majorDiscrepancyCount: 0, majorFalseNegativeCount: 0, overallAgreementPercent: 0, majorConcordancePercent: 0, falseNegativeRatePercent: 0, diagnosticUpgradeCount: 0, comparisons: [] };
  const record = {
    id: 'qa-1', activityTypeId: 'qa-activity-gyn-cytology-secondary-screening', caseId: 'CASE-SEC-1', specimenId: 'S1', caseType: 'Pap',
    fieldValues: { trigger: 'qc_targeted_high_risk', addedByEvent: 'hsil', missedByEvent: 'nilm' }, outcome: 'discordant',
    recordedBy: { userId: 'CT2', userName: 'CT Two' }, recordedAt: '',
  };
  // Batch 451 (PS-204): one row per new report table, with figures chosen so
  // each formatted cell is unique on screen.
  const ctStatsRow = {
    ctUserId: 'CT1', ctUserName: 'CT Alpha', totalScreened: 120, unsatRatePercent: 1.26, nilmRatePercent: 80.5,
    ascusRatePercent: 6.75, aschRatePercent: 0.4, lsilRatePercent: 3.3, hsilPlusRatePercent: 0.9,
    ascusLsilRatio: 2.046, labAvgAscusLsilRatio: 1.5, varianceFlag: true,
  };
  const ascusHpvRow = {
    ctUserId: 'CT2', ctUserName: 'CT Beta', totalAscusCases: 17, reflexHpvOrdered: 15, reflexOrderRatePercent: 88.24,
    hpvPositiveCount: 7, ascusHpvPosPercent: 46.67, outlierStatus: 'over_calling',
  };
  const workloadRow = {
    ctUserId: 'CT3', shiftDate: '2026-09-14', hoursScreened: 7.5, recordedHours: 6.5, signedOffHours: 7.5, signOffFlagged: true, signOffStale: false, signOffReasonId: 'microscopeOffScreen', manualSlidesCount: 61, imagerSlidesCount: 33,
    totalEquivSlides: 77.5, maxAllowedVolume: 70, exceedanceFlag: true,
  };
  const transmissionRow = (registryId: string) => ({
    caseId: `CASE-${registryId}`, accessionNumber: `ACC-${registryId}`, patientMrn: `MRN-${registryId}`, hpvResultCode: 'HPV16',
    cytologyResultCode: `CYT-${registryId}`, transmissionTimestamp: '2026-09-15T10:00:00Z', transmissionStatus: 'FAILED',
    errorReasonCode: 'E42', registryStatus: undefined, responseCode: undefined, sentAt: undefined,
  });
  const ok = <T,>(data: T) => async () => ({ ok: true, data });
  return {
    aggregate, empty, record, ctStatsRow, ascusHpvRow, workloadRow, transmissionRow,
    cytologyQaReportService: {
      get10PercentRandomRescreeningReport: vi.fn(ok(empty)),
      getDirectedHighRiskRescreeningReport: vi.fn(ok(empty)),
      getCtVsPathologistCorrelationReport: vi.fn(ok(empty)),
      getPostSignOutPeerReviewCorrelationReport: vi.fn(async () => ({ ok: true, data: aggregate })),
      getPrimaryVsFinalDiagnosisReport: vi.fn(ok(empty)),
      getCtStatisticalComparisonReport: vi.fn(ok([ctStatsRow])),
      getAscusHpvReflexReport: vi.fn(ok([ascusHpvRow])),
      getWorkloadTrackingReport: vi.fn(ok([workloadRow])),
      // The service filters by registry (tested in resolveCytologyRegistryTransmissionAuditReport.test.ts);
      // the stub returns one dispatch named after the registry it was asked for.
      getRegistryTransmissionAuditReport: vi.fn(async (_scope: unknown, registryId: string) => ({ ok: true, data: [transmissionRow(registryId)] })),
      getGynCytologySecondaryScreeningAuditReport: vi.fn(async () => ({ ok: true, data: [record] })),
      getFiveYearRetrospectiveLookbackReport: vi.fn(ok({ rows: [], totalFlagged: 0, pendingCount: 0, completedCount: 0, completedPercent: 0, correctiveActionRatePercent: undefined, byOutcome: { confirmed_negative: 0, screening_error: 0, interpretation_error: 0, sampling_error: 0 } })),
      getHistologyCorrelationReport: vi.fn(ok({ rows: [], totalCorrelated: 0, concordantCount: 0, correlationRatePercent: 0 })),
      getUnscreenedBacklogReport: vi.fn(ok([])),
      getPrimaryHpvFailsafeAuditReport: vi.fn(ok([])),
      getEuComplianceMatrixReport: vi.fn(ok([])),
      getHpvPositivityMonitorReport: vi.fn(ok([])),
      getMolecularQcFailureRateReport: vi.fn(ok([])),
      getMolecularLotToLotTrendReport: vi.fn(ok([])),
      getApacProficiencyTestReport: vi.fn(ok({ rows: [], totalEvents: 0, satisfactoryCount: 0, satisfactoryRatePercent: 0 })),
    },
  };
});

vi.mock('@/services', () => ({
  cytologyQaReportService: svc.cytologyQaReportService,
  auditService: { logEvent: vi.fn(async () => undefined) },
  authorizationService: { enforce: vi.fn(async () => ({ allowed: true })) },
  exportQaReport: vi.fn(),
  // Batch 608: the PT panel card on the APAC report.
  cytologyProficiencyPanelService: { getAll: vi.fn(async () => ({ ok: true, data: [] })), submit: vi.fn(), applySimulatedResult: vi.fn() },
}));
vi.mock('@/services/auth/caseAccessControl', () => ({ getSessionUser: () => null, canViewCrossTenantQaData: () => false }));
vi.mock('@/components/Common/CapabilityButton', () => ({ CapabilityButton: () => null }));
vi.mock('./CytologyHistologyCorrelationPrintView', () => ({ CytologyHistologyCorrelationPrintView: () => null }));
vi.mock('./QaScopeSwitcher', () => ({
  QaScopeSwitcher: ({ onChange }: { onChange: (s: unknown) => void }) => (
    <button type="button" onClick={() => onChange({ level: 'client', clientId: 'F1' })}>choose-client-F1</button>
  ),
}));

import { CytologyQaTab } from './CytologyQaTab';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const openTile = (labelKey: string) => fireEvent.click(screen.getByText(labelKey, { exact: false }).closest('button')!);

describe('CytologyQaTab report tiles (PS-216, PS-217)', () => {
  it('the Post-Sign-Out Peer Review tile fetches that report and shows its rates, counts and comparisons', async () => {
    render(<CytologyQaTab />);
    openTile('cytologyQaTab.tiles.peerReview');
    await screen.findByText('cytologyQaTab.reportTitle.peerReview');
    expect(svc.cytologyQaReportService.getPostSignOutPeerReviewCorrelationReport).toHaveBeenCalledWith({ level: 'enterprise' });
    expect(screen.getByText('50.0%')).toBeTruthy();   // overall agreement
    expect(screen.getByText('75.0%')).toBeTruthy();   // major concordance
    expect(screen.getByText('(25.0%)', { exact: false })).toBeTruthy(); // false-negative rate
    expect(screen.getByText('4')).toBeTruthy();       // cases compared
    const row = screen.getByText('CASE-PEER-1').closest('tr')!;
    expect(within(row).getByText('NILM-FD')).toBeTruthy();
    expect(within(row).getByText('HSIL-PEER')).toBeTruthy();
  });

  it('changing the scope re-fetches the Post-Sign-Out Peer Review report for that client', async () => {
    render(<CytologyQaTab />);
    openTile('cytologyQaTab.tiles.peerReview');
    await screen.findByText('cytologyQaTab.reportTitle.peerReview');
    fireEvent.click(screen.getByText('choose-client-F1'));
    await waitFor(() => expect(svc.cytologyQaReportService.getPostSignOutPeerReviewCorrelationReport).toHaveBeenLastCalledWith({ level: 'client', clientId: 'F1' }));
  });

  it('the Secondary Screening Audit tile lists the records for the chosen scope: trigger, outcome, added and missed', async () => {
    render(<CytologyQaTab />);
    openTile('cytologyQaTab.tiles.secondaryScreeningAudit');
    const caseCell = await screen.findByText('CASE-SEC-1');
    expect(svc.cytologyQaReportService.getGynCytologySecondaryScreeningAuditReport).toHaveBeenCalledWith({ level: 'enterprise' });
    const row = caseCell.closest('tr')!;
    expect(within(row).getByText('qc_targeted_high_risk')).toBeTruthy();
    expect(within(row).getByText('cytologyQaTab.discordantBadge')).toBeTruthy();
    expect(within(row).getByText('hsil')).toBeTruthy();
    expect(within(row).getByText('nilm')).toBeTruthy();
    expect(within(row).getByText('CT Two')).toBeTruthy();
    fireEvent.click(screen.getByText('choose-client-F1'));
    await waitFor(() => expect(svc.cytologyQaReportService.getGynCytologySecondaryScreeningAuditReport).toHaveBeenLastCalledWith({ level: 'client', clientId: 'F1' }));
  });
});

// Batch 451 (PS-204): every report has its own tile; clicking a tile fetches
// and shows that report. Each entry: tile label key → service method → text
// only that report shows (its title, or its empty-table message).
const TILES: [string, string, string][] = [
  ['cytologyQaTab.tiles.random', 'get10PercentRandomRescreeningReport', 'cytologyQaTab.reportTitle.random'],
  ['cytologyQaTab.tiles.highRisk', 'getDirectedHighRiskRescreeningReport', 'cytologyQaTab.reportTitle.highRisk'],
  ['cytologyQaTab.tiles.ctPath', 'getCtVsPathologistCorrelationReport', 'cytologyQaTab.reportTitle.ctPath'],
  ['cytologyQaTab.tiles.peerReview', 'getPostSignOutPeerReviewCorrelationReport', 'cytologyQaTab.reportTitle.peerReview'],
  ['cytologyQaTab.tiles.finalDx', 'getPrimaryVsFinalDiagnosisReport', 'cytologyQaTab.reportTitle.finalDx'],
  ['cytologyQaTab.tiles.ctStats', 'getCtStatisticalComparisonReport', 'cytologyQaTab.ctStatsTable.totalScreened'],
  ['cytologyQaTab.tiles.ascusHpv', 'getAscusHpvReflexReport', 'cytologyQaTab.ascusHpvTable.totalAscus'],
  ['cytologyQaTab.tiles.workload', 'getWorkloadTrackingReport', 'cytologyQaTab.workloadTable.shiftDate'],
  ['cytologyQaTab.tiles.transmission', 'getRegistryTransmissionAuditReport', 'cytologyQaTab.transmissionTable.cytologyResult'],
  ['cytologyQaTab.tiles.secondaryScreeningAudit', 'getGynCytologySecondaryScreeningAuditReport', 'cytologyQaTab.secondaryScreeningTable.trigger'],
  ['cytologyQaTab.tiles.fiveYearLookback', 'getFiveYearRetrospectiveLookbackReport', 'cytologyQaTab.fiveYearLookbackTable.noneFlaggedYet'],
  ['cytologyQaTab.tiles.histologyCorrelation', 'getHistologyCorrelationReport', 'cytologyQaTab.histologyTable.noCorrelationsYet'],
  ['cytologyQaTab.tiles.unscreenedBacklog', 'getUnscreenedBacklogReport', 'cytologyQaTab.unscreenedBacklogTable.noBacklogYet'],
  ['cytologyQaTab.tiles.ukFailsafe', 'getPrimaryHpvFailsafeAuditReport', 'cytologyQaTab.ukFailsafeTable.noDataYet'],
  ['cytologyQaTab.tiles.euCompliance', 'getEuComplianceMatrixReport', 'cytologyQaTab.euComplianceTable.noDataYet'],
  ['cytologyQaTab.tiles.hpvPositivity', 'getHpvPositivityMonitorReport', 'cytologyQaTab.hpvPositivityTable.noDataYet'],
  ['cytologyQaTab.tiles.molQcFailure', 'getMolecularQcFailureRateReport', 'cytologyQaTab.molQcFailureTable.noDataYet'],
  ['cytologyQaTab.tiles.molLotTrend', 'getMolecularLotToLotTrendReport', 'cytologyQaTab.molLotTrendTable.noLotChangeoversYet'],
  ['cytologyQaTab.tiles.apacPt', 'getApacProficiencyTestReport', 'cytologyQaTab.apacPtTable.noGradesYet'],
];
type SvcKey = keyof typeof svc.cytologyQaReportService;
const tileButton = (labelKey: string) => screen.getByText(labelKey, { exact: false }).closest('button')!;

describe('CytologyQaTab report tiles: one tile per report (PS-204)', () => {
  it('renders one .ps-wl-filter-tile button per report, the first (10% random rescreen) active and shown on open', async () => {
    const { container } = render(<CytologyQaTab />);
    const tiles = container.querySelectorAll('button.ps-wl-filter-tile');
    expect(tiles.length).toBe(TILES.length);
    for (const [labelKey] of TILES) expect(tileButton(labelKey).classList.contains('ps-wl-filter-tile')).toBe(true);
    expect(tileButton('cytologyQaTab.tiles.random').classList.contains('ps-wl-filter-tile--hued-active')).toBe(true);
    await screen.findByText('cytologyQaTab.reportTitle.random', { exact: false });
    expect(svc.cytologyQaReportService.get10PercentRandomRescreeningReport).toHaveBeenCalledTimes(1);
  });

  for (const [labelKey, method, marker] of TILES.slice(1)) {
    it(`clicking ${labelKey} fetches that report (${method}), marks the tile active and shows it`, async () => {
      render(<CytologyQaTab />);
      await screen.findByText('cytologyQaTab.reportTitle.random', { exact: false });
      fireEvent.click(tileButton(labelKey));
      await screen.findByText(marker, { exact: false });
      expect(svc.cytologyQaReportService[method as SvcKey]).toHaveBeenCalledTimes(1);
      expect(tileButton(labelKey).classList.contains('ps-wl-filter-tile--hued-active')).toBe(true);
      expect(tileButton('cytologyQaTab.tiles.random').classList.contains('ps-wl-filter-tile--hued-active')).toBe(false);
      expect(screen.queryByText('cytologyQaTab.reportTitle.random', { exact: false })).toBeNull();
    });
  }
});

describe('CytologyQaTab aggregate report card (PS-204)', () => {
  it('shows the false-negative count and rate and the diagnostic upgrade/downgrade counts', async () => {
    render(<CytologyQaTab />);
    openTile('cytologyQaTab.tiles.peerReview');
    await screen.findByText('cytologyQaTab.reportTitle.peerReview');
    const breakdownItem = (labelKey: string) => screen.getByText(labelKey, { exact: false }).closest('span')!;
    const fn = breakdownItem('cytologyQaTab.reportCard.falseNegative');
    expect(within(fn).getByText('1').tagName).toBe('B');       // majorFalseNegativeCount
    expect(fn.textContent).toContain('(25.0%)');                 // falseNegativeRatePercent
    expect(within(breakdownItem('cytologyQaTab.reportCard.diagnosticUpgrade')).getByText('2')).toBeTruthy();
    expect(within(breakdownItem('cytologyQaTab.reportCard.diagnosticDowngrade')).getByText('0')).toBeTruthy();
  });
});

describe('CytologyQaTab new report tables show the report figures (PS-204)', () => {
  const rowOf = (text: string) => screen.getByText(text).closest('tr')!;

  it('CYT-QA-01 CT Statistical Comparison: screened count, category rates, ASC-US:LSIL ratio vs lab average, outlier flag', async () => {
    render(<CytologyQaTab />);
    openTile('cytologyQaTab.tiles.ctStats');
    await screen.findByText('CT Alpha');
    const cells = Array.from(rowOf('CT Alpha').querySelectorAll('td')).map(td => td.textContent);
    expect(cells).toEqual(['CT Alpha', '120', '1.3%', '80.5%', '6.8%', '0.4%', '3.3%', '0.9%', '2.05', '1.50', 'cytologyQaTab.outlierBadge']);
  });

  it('MOL-QA-03 ASC-US / HPV Reflex: ASC-US cases, reflexes ordered and rate, HPV+ count and rate, outlier status', async () => {
    render(<CytologyQaTab />);
    openTile('cytologyQaTab.tiles.ascusHpv');
    await screen.findByText('CT Beta');
    const cells = Array.from(rowOf('CT Beta').querySelectorAll('td')).map(td => td.textContent);
    expect(cells).toEqual(['CT Beta', '17', '15', '88.2%', '7', '46.7%', 'cytologyQaTab.ascusHpvTable.outlier.overCalling']);
  });

  it('CYT-QA-05 Workload Tracking: shift, hours, manual/imager slides, equivalent total vs cap, exceedance flag', async () => {
    render(<CytologyQaTab />);
    openTile('cytologyQaTab.tiles.workload');
    await screen.findByText('CT3');
    const cells = Array.from(rowOf('CT3').querySelectorAll('td')).map(td => td.textContent);
    // Batch 572: the hours that count (signed off, with a flagged correction) beside the recorded hours. Batch 574: the reason.
    expect(cells).toEqual(['CT3', '09/14/2026', '7.5 cytologyQaTab.workloadTable.signedOffcytologyQaTab.workloadTable.correctionFlaggedcytologyQaTab.workloadTable.correctionReason', '6.5', '61', '33', '77.5', '70.0', 'cytologyQaTab.exceededBadge']);
  });

  it('ANZ-QA-01 Registry Transmission Audit: accession, MRN (PHI-tagged), results, timestamp, status, error code', async () => {
    render(<CytologyQaTab />);
    openTile('cytologyQaTab.tiles.transmission');
    await screen.findByText('ACC-ncsr_australia');
    const row = rowOf('ACC-ncsr_australia');
    const cells = Array.from(row.querySelectorAll('td')).map(td => td.textContent);
    expect(cells).toEqual([
      'ACC-ncsr_australia', 'MRN-ncsr_australia', 'HPV16', 'CYT-ncsr_australia', '2026-09-15T10:00:00Z',
      'cytologyQaTab.transmissionTable.status.failed', 'E42', '—', '—', '—',
    ]);
    expect(within(row).getByText('MRN-ncsr_australia').getAttribute('data-phi')).toBe('mrn');
    expect(within(row).getByText('ACC-ncsr_australia').getAttribute('data-phi')).toBe('accession');
  });
});

describe('CytologyQaTab transmission-audit registry selector (PS-204)', () => {
  it('is shown only on the transmission tile, lists every registry, and choosing one shows only that registry\'s dispatches', async () => {
    render(<CytologyQaTab />);
    await screen.findByText('cytologyQaTab.reportTitle.random', { exact: false });
    expect(screen.queryByLabelText('cytologyQaTab.registryLabel')).toBeNull();

    openTile('cytologyQaTab.tiles.transmission');
    await screen.findByText('ACC-ncsr_australia');
    const select = screen.getByLabelText('cytologyQaTab.registryLabel') as HTMLSelectElement;
    expect(Array.from(select.options).map(o => o.value)).toEqual([
      'ncsr_australia', 'kncsp_kccr_korea', 'csms_uk', 'cervicalcheck_ireland', 'palga_netherlands', 'nicsp_northern_ireland',
    ]);
    expect(select.value).toBe('ncsr_australia');
    expect(svc.cytologyQaReportService.getRegistryTransmissionAuditReport).toHaveBeenLastCalledWith({ level: 'enterprise' }, 'ncsr_australia');

    fireEvent.change(select, { target: { value: 'palga_netherlands' } });
    await screen.findByText('ACC-palga_netherlands');
    expect(svc.cytologyQaReportService.getRegistryTransmissionAuditReport).toHaveBeenLastCalledWith({ level: 'enterprise' }, 'palga_netherlands');
    expect(screen.queryByText('ACC-ncsr_australia')).toBeNull();
    expect(screen.getAllByText(/^ACC-/)).toHaveLength(1);
  });
});
