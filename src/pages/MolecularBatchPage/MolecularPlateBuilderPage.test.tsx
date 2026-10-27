// @vitest-environment happy-dom
//
// src/pages/MolecularBatchPage/MolecularPlateBuilderPage.test.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 451: what the plate builder (/molecular-batch/:batchId) does on screen.
// The decisions are tested in their services (plateBuilderWells, plateWellScan,
// resolveMolecularReagentLotGating, resolveMolecularControlRequirementValidation,
// molecularDispatchPanel, resolveMolecularHistoricalTrace); here the page's
// own wiring: the well grid and well panel, auto-fill, scan-to-well, the
// Create gate and its reasons, view-only mode, the label buttons, the
// dispatch panel and the inline trace. Data services are mocked; the pure
// decision functions run for real.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act, waitFor, within } from '@testing-library/react';
import type { MolecularBatch } from '../../services/molecular/IMolecularBatchService';
import { resolveMolecularWorklistPayload } from '../../services/molecular/resolveMolecularWorklistPayload';
import { formatDateTime } from '../../utils/formatDate';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key), i18n: { language: 'en' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const { route, navigate } = vi.hoisted(() => ({ route: { batchId: 'new' }, navigate: vi.fn() }));
vi.mock('react-router', () => ({ useNavigate: () => navigate, useParams: () => route }));

const { batchSvc, rackSvc, ruleSvc, supersede } = vi.hoisted(() => ({
  batchSvc: { getById: vi.fn(), create: vi.fn(), cloneAndSupersede: vi.fn() },
  supersede: vi.fn(),
  rackSvc: { findPositionByContainerBarcode: vi.fn() },
  ruleSvc: { getAll: vi.fn() },
}));
vi.mock('@/services', async () => ({
  ...(await vi.importActual<typeof import('@/services/fieldRequirements/molecularBatchChecks')>('@/services/fieldRequirements/molecularBatchChecks')),
  ...(await vi.importActual<typeof import('@/services/molecular/deckSlots')>('@/services/molecular/deckSlots')),
  ...(await vi.importActual<typeof import('@/services/molecular/resolveMolecularMovementRecord')>('@/services/molecular/resolveMolecularMovementRecord')),
  ...(await vi.importActual<typeof import('@/services/molecular/molecularBatchErrors')>('@/services/molecular/molecularBatchErrors')),
  supersedeMolecularBatchNow: supersede,
  molecularBatchService: batchSvc,
  molecularExtractionRackService: rackSvc,
  molecularAssayControlRuleService: ruleSvc,
  equipmentService: { getActive: async () => ({ ok: true, data: [{ id: 'eq1', code: 'PANTHER_02', name: 'Panther 2', kind: 'analyser', status: 'Active' }] }) },
  equipmentLogService: { list: async () => ({ ok: true, data: [] }) },
  scanStationService: { getById: async () => ({ ok: true, data: { id: 'station-3', name: 'Molecular Bench 3' } }) },
  stainTypeService: { getAll: async () => ({ ok: true, data: [{ id: 'st-hpv', name: 'HPV PCR', category: 'Molecular', active: true }] }) },
  actionRegistryService: { setCurrentContext: () => {}, onAction: () => () => {} },
}));
vi.mock('@/hooks/useFieldRequirements', async () => {
  const { MOLECULAR_BATCH_DEFAULT_REQUIREMENTS } = await vi.importActual<typeof import('@/services/fieldRequirements/molecularBatchChecks')>('@/services/fieldRequirements/molecularBatchChecks');
  return { useFieldRequirements: () => MOLECULAR_BATCH_DEFAULT_REQUIREMENTS };
});
vi.mock('@/hooks/useCurrentScanStation', () => ({ useCurrentScanStation: () => ({ stationId: 'station-3' }) }));
vi.mock('@/contexts/SystemConfigContext', () => ({ useSystemConfig: () => ({ config: { facilityTimezone: 'UTC' } }) }));
vi.mock('@/components/Common/CapabilityButton', () => ({
  CapabilityButton: ({ children, onClick, disabled, className }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; className: string }) =>
    <button className={className} disabled={disabled} onClick={onClick}>{children}</button>,
}));
const { printLabels } = vi.hoisted(() => ({ printLabels: { plate: vi.fn(), deck: vi.fn(), specimen: vi.fn() } }));
vi.mock('@/utils/labels/printMolecularLabels', () => ({
  printMolecularPlateLabel: printLabels.plate,
  printMolecularDeckLocationLabel: printLabels.deck,
  printMolecularSpecimenLabels: printLabels.specimen,
}));
vi.mock('@/pages/MolecularWorkcenterPage/MolecularWorkcenterPage', () => ({ workcenterTabForStatus: () => 'active' }));
const SESSION = { id: 'u7', firstName: 'Ana', lastName: 'Ruiz' };
vi.mock('@/services/auth/caseAccessControl', () => ({ getSessionUser: () => SESSION }));
const { dispatchMolecularWorklist } = vi.hoisted(() => ({ dispatchMolecularWorklist: vi.fn() }));
vi.mock('@/services/molecular/dispatchMolecularWorklist', () => ({ dispatchMolecularWorklist }));

import MolecularPlateBuilderPage from './MolecularPlateBuilderPage';

const K = 'molecularPlateBuilderPage.';
// Batch 467b: a well's tooltip key and values, as the mocked t() renders them.
const wt = (key: string, values: Record<string, unknown>) => `${K}wellTitle.${key}:${JSON.stringify(values)}`;
const NTC_RULE = { id: 'r1', assayCode: 'st-hpv', requiredControls: [{ sampleType: 'CONTROL_NTC', positionMode: 'fixed', fixedWellPosition: 'A01' }], createdAt: '' };

const BATCH: MolecularBatch = {
  id: 'b1', batchBarcode: 'BATCH-20260906-0001', batchUuid: 'bu-1', assayCode: 'st-hpv', assayName: 'HPV PCR',
  targetInstrumentId: 'PANTHER_02', deckSlot: 'SLOT_A1', plateUuid: 'plate-uuid-1', plateBarcode: 'PLT-HPV-20260906-012', plateLayout: '6_well',
  reagentLots: [{ componentType: 'MASTER_MIX', lotNumber: 'LOT-7', expirationDate: '2030-01-01T00:00:00.000Z', qcStatus: 'signed_off' }],
  wells: [
    { wellPosition: 'A01', sampleType: 'CONTROL_NTC', controlInfo: { controlId: 'c1', controlLotNumber: 'NTC-1', controlExpirationDate: '2030-01-01T00:00:00.000Z', expectedValue: 'NEGATIVE' } },
    {
      wellPosition: 'A02', sampleType: 'PATIENT_SPECIMEN', containerBarcode: 'SPEC-1', accessionNumber: 'PS26-1',
      movementHistory: [{ fromLevel: 'primary_vial', toLevel: 'plate_well', fromBarcode: 'SPEC-1', toBarcode: 'well:A02', at: '2026-09-06T10:00:00.000Z', byUserId: 'u7', byUserName: 'Ana Ruiz', stationId: 'station-3', stationName: 'Molecular Bench 3' }],
    },
  ],
  status: 'active', createdAt: '2026-09-06T09:00:00.000Z', createdByUserId: 'u7', createdByUserName: 'Ana Ruiz',
} as MolecularBatch;

beforeEach(() => {
  route.batchId = 'new';
  ruleSvc.getAll.mockResolvedValue({ ok: true, data: [] });
  rackSvc.findPositionByContainerBarcode.mockResolvedValue({ ok: true, data: null });
  batchSvc.getById.mockResolvedValue({ ok: true, data: BATCH });
  batchSvc.create.mockResolvedValue({ ok: true, data: { id: 'b-new' } });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

async function renderPage() {
  render(<MolecularPlateBuilderPage />);
  await act(async () => {});
}
const well = (pos: string) => screen.getByRole('button', { name: pos });
const sampleTypeSelect = () => screen.getByText(`${K}unassignedOption`).closest('select') as HTMLSelectElement;
const createButton = () => screen.getByText(`${K}createBatch`).closest('button') as HTMLButtonElement;
const containing = (fragment: string) => (_: string, el: Element | null) => !!el && el.children.length === 0 && (el.textContent ?? '').includes(fragment);
const inputAfter = (labelKey: string) => {
  const label = Array.from(document.querySelectorAll('label')).find(l => (l.textContent ?? '').startsWith(`${K}${labelKey}`));
  if (!label) throw new Error(`no label ${labelKey}`);
  return label.nextElementSibling as HTMLInputElement;
};
const scan = async (raw: string, matchedAccession?: string) => {
  await act(async () => { window.dispatchEvent(new CustomEvent('PATHSCRIBE_SCAN', { detail: { raw, matchedAccession } })); });
};

describe('MolecularPlateBuilderPage (PS-229) — building a new plate', () => {
  it('clicking a well in the grid opens its panel, where the sample type, control lot or specimen barcode is set', async () => {
    await renderPage();
    expect(screen.getAllByRole('button').filter(b => b.classList.contains('mb-well-btn'))).toHaveLength(96);
    expect(screen.queryByText(`${K}sampleTypeLabel`)).toBeNull();

    fireEvent.click(well('A01'));
    expect(screen.getByText(`${K}wellHeading:{"position":"A01"}`)).not.toBeNull();
    expect(well('A01').className).toContain('mb-well-btn--selected');

    fireEvent.change(sampleTypeSelect(), { target: { value: 'CONTROL_NTC' } });
    expect(well('A01').getAttribute('title')).toBe(wt('sample', { well: 'A01', type: `${K}sampleType.CONTROL_NTC` }));
    const lotInput = inputAfter('controlLotNumberLabel');
    fireEvent.change(lotInput, { target: { value: 'NTC-LOT-1' } });
    expect(lotInput.value).toBe('NTC-LOT-1');

    fireEvent.click(well('A02'));
    fireEvent.change(sampleTypeSelect(), { target: { value: 'PATIENT_SPECIMEN' } });
    const barcodeInput = inputAfter('containerBarcodeLabel');
    fireEvent.change(barcodeInput, { target: { value: 'SPEC-42' } });
    expect(barcodeInput.value).toBe('SPEC-42');
    expect(screen.getByText(`${K}scanToFill`)).not.toBeNull();

    // Back on A01, the control lot entered earlier is still there.
    fireEvent.click(well('A01'));
    expect(inputAfter('controlLotNumberLabel').value).toBe('NTC-LOT-1');
  });

  it('Auto-fill (row-major) marks every empty well as a patient well ready for scan-in, leaving an assigned control alone', async () => {
    await renderPage();
    fireEvent.click(well('A01'));
    fireEvent.change(sampleTypeSelect(), { target: { value: 'CONTROL_NTC' } });
    fireEvent.click(screen.getByText(`${K}autoFillRowMajor`));
    const wells = screen.getAllByRole('button').filter(b => b.classList.contains('mb-well-btn'));
    expect(wells.filter(b => b.getAttribute('title') === wt('sample', { well: b.textContent, type: `${K}sampleType.PATIENT_SPECIMEN` }))).toHaveLength(95);
    expect(well('A01').getAttribute('title')).toBe(wt('sample', { well: 'A01', type: `${K}sampleType.CONTROL_NTC` }));
    // Ready for scan-in: a filled well offers Scan, and the page lists the wells still lacking a specimen.
    fireEvent.click(well('B05'));
    expect(screen.getByText(`${K}scanToFill`)).not.toBeNull();
    expect(screen.getByText(containing(`${K}wellsMissingSpecimen`))).not.toBeNull();
  });

  it('Auto-fill (column-major) marks the empty wells as patient wells too', async () => {
    await renderPage();
    fireEvent.click(well('A01'));
    fireEvent.change(sampleTypeSelect(), { target: { value: 'CONTROL_NTC' } });
    fireEvent.click(screen.getByText(`${K}autoFillColumnMajor`));
    const wells = screen.getAllByRole('button').filter(b => b.classList.contains('mb-well-btn'));
    expect(wells.filter(b => (b.getAttribute('title') ?? '').includes(`${K}sampleType.PATIENT_SPECIMEN`))).toHaveLength(95);
    expect(well('A01').getAttribute('title')).toBe(wt('sample', { well: 'A01', type: `${K}sampleType.CONTROL_NTC` }));
  });

  it('a PATHSCRIBE_SCAN while armed assigns the scanned barcode to the selected well, records the movement, and moves on to the next empty patient well', async () => {
    await renderPage();
    fireEvent.click(screen.getByText(`${K}autoFillRowMajor`));
    fireEvent.click(well('A01'));

    // Not armed yet: a scan does nothing.
    await scan('SPEC-0');
    expect(rackSvc.findPositionByContainerBarcode).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText(`${K}scanToFill`));
    expect(screen.getByText(`${K}waitingForScan`)).not.toBeNull();
    await scan('SPEC-1', 'PS26-1');
    await waitFor(() => expect(well('A01').getAttribute('title')).toBe(wt('sample', { well: 'A01', type: `${K}sampleType.PATIENT_SPECIMEN` })));
    expect(rackSvc.findPositionByContainerBarcode).toHaveBeenCalledWith('SPEC-1');

    // Auto-advanced to A02, still armed for the next tube.
    expect(screen.getByText(`${K}wellHeading:{"position":"A02"}`)).not.toBeNull();
    expect(screen.getByText(`${K}waitingForScan`)).not.toBeNull();
    await scan('SPEC-2', 'PS26-2');
    await waitFor(() => expect(well('A02').getAttribute('title')).toBe(wt('sample', { well: 'A02', type: `${K}sampleType.PATIENT_SPECIMEN` })));

    // The scanned barcode is what the well panel shows for A01.
    fireEvent.click(well('A01'));
    expect(inputAfter('containerBarcodeLabel').value).toBe('SPEC-1');
  });

  it('Create Batch is off, with the specific reasons shown, for an expired reagent lot, a missing or misplaced required control, and a patient well with no specimen; it turns on once they are fixed', async () => {
    ruleSvc.getAll.mockResolvedValue({ ok: true, data: [NTC_RULE] });
    const { container } = render(<MolecularPlateBuilderPage />);
    await act(async () => {});
    fireEvent.change(container.querySelector('#mb-assay-code')!, { target: { value: 'st-hpv' } });
    fireEvent.change(container.querySelector('#mb-instrument')!, { target: { value: 'PANTHER_02' } });

    // Expired reagent lot.
    fireEvent.click(screen.getByText(`${K}addReagentLot`));
    const lotRow = container.querySelector('.mb-reagent-row') as HTMLElement;
    const [lotNumber, expiry] = Array.from(lotRow.querySelectorAll('input'));
    fireEvent.change(lotNumber, { target: { value: 'LOT-7' } });
    fireEvent.change(expiry, { target: { value: '2020-01-01' } });
    fireEvent.change(lotRow.querySelectorAll('select')[1], { target: { value: 'signed_off' } });
    expect(screen.getByText(containing(`${K}gatingReason.expired`))).not.toBeNull();
    expect(screen.getByText(containing('"lotNumber":"LOT-7"'))).not.toBeNull();
    // Required NTC control missing.
    expect(screen.getByText(containing(`${K}controlMissing:{"sampleType":"CONTROL_NTC"}`))).not.toBeNull();
    expect(createButton().disabled).toBe(true);

    // The control is in the wrong well.
    fireEvent.click(well('B01'));
    fireEvent.change(sampleTypeSelect(), { target: { value: 'CONTROL_NTC' } });
    expect(screen.queryByText(containing(`${K}controlMissing`))).toBeNull();
    expect(screen.getByText(containing(`${K}controlMismatch:{"sampleType":"CONTROL_NTC","expectedPosition":"A01","actualPosition":"B01"}`))).not.toBeNull();
    expect(createButton().disabled).toBe(true);

    // Move it to A01 with its lot; add a patient well with no specimen.
    fireEvent.change(sampleTypeSelect(), { target: { value: '' } });
    fireEvent.click(well('A01'));
    fireEvent.change(sampleTypeSelect(), { target: { value: 'CONTROL_NTC' } });
    fireEvent.change(inputAfter('controlLotNumberLabel'), { target: { value: 'NTC-1' } });
    fireEvent.change(inputAfter('controlExpirationLabel'), { target: { value: '2030-01-01' } });
    expect(screen.queryByText(containing(`${K}controlMismatch`))).toBeNull();
    fireEvent.click(well('A02'));
    fireEvent.change(sampleTypeSelect(), { target: { value: 'PATIENT_SPECIMEN' } });
    expect(screen.getByText(`${K}wellsMissingSpecimen:{"wells":"A02"}`)).not.toBeNull();
    expect(createButton().disabled).toBe(true);

    // Fix the specimen and the lot: Create turns on.
    fireEvent.change(inputAfter('containerBarcodeLabel'), { target: { value: 'SPEC-1' } });
    expect(screen.queryByText(containing(`${K}wellsMissingSpecimen`))).toBeNull();
    expect(createButton().disabled).toBe(true);
    fireEvent.change(expiry, { target: { value: '2030-01-01' } });
    expect(screen.queryByText(containing(`${K}gatingReason`))).toBeNull();
    expect(createButton().disabled).toBe(false);
    expect(batchSvc.create).not.toHaveBeenCalled();
  });
});

describe('MolecularPlateBuilderPage (PS-246) — aliquot volume on a patient well', () => {
  it('the volume typed into a patient well is saved on the well and reaches the outbound worklist as aliquot_volume_ul', async () => {
    const { container } = render(<MolecularPlateBuilderPage />);
    await act(async () => {});
    fireEvent.change(container.querySelector('#mb-assay-code')!, { target: { value: 'st-hpv' } });
    fireEvent.change(container.querySelector('#mb-instrument')!, { target: { value: 'PANTHER_02' } });
    fireEvent.click(well('A01'));
    fireEvent.change(sampleTypeSelect(), { target: { value: 'PATIENT_SPECIMEN' } });
    fireEvent.change(inputAfter('containerBarcodeLabel'), { target: { value: 'SPEC-1' } });
    const volume = inputAfter('aliquotVolumeLabel');
    expect(volume.type).toBe('number');
    fireEvent.change(volume, { target: { value: '200' } });

    fireEvent.click(createButton());
    await waitFor(() => expect(batchSvc.create).toHaveBeenCalledTimes(1));
    const sent = batchSvc.create.mock.calls[0][0];
    expect(sent.wells).toEqual([{ wellPosition: 'A01', sampleType: 'PATIENT_SPECIMEN', containerBarcode: 'SPEC-1', aliquotVolumeUl: 200 }]);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/molecular-batch/b-new'));

    const payload = resolveMolecularWorklistPayload({ ...BATCH, ...sent, plateLayout: '96_well' } as MolecularBatch);
    expect(payload.well_mappings).toEqual([expect.objectContaining({ well_position: 'A01', container_barcode: 'SPEC-1', aliquot_volume_ul: 200 })]);
  });

  it('clearing the volume leaves the well with no volume rather than zero', async () => {
    await renderPage();
    fireEvent.click(well('A01'));
    fireEvent.change(sampleTypeSelect(), { target: { value: 'PATIENT_SPECIMEN' } });
    const volume = inputAfter('aliquotVolumeLabel');
    fireEvent.change(volume, { target: { value: '150' } });
    expect(volume.value).toBe('150');
    fireEvent.change(volume, { target: { value: '' } });
    expect(volume.value).toBe('');
  });
});

describe('MolecularPlateBuilderPage (PS-229 / PS-231) — an existing batch', () => {
  it('opens view-only: no batch form, auto-fill or Create; clicking a filled well shows its facts, never an editor', async () => {
    route.batchId = 'b1';
    await renderPage();
    expect(batchSvc.getById).toHaveBeenCalledWith('b1');
    expect(screen.getByText('BATCH-20260906-0001 — HPV PCR')).not.toBeNull();
    for (const key of ['batchInfoTitle', 'reagentLotsTitle', 'autoFillRowMajor', 'autoFillColumnMajor', 'createBatch']) {
      expect(screen.queryByText(`${K}${key}`)).toBeNull();
    }
    const wells = screen.getAllByRole('button').filter(b => b.classList.contains('mb-well-btn'));
    expect(wells.length).toBeGreaterThan(0);
    // Batch 467b: empty wells stay inert; a filled well can be selected to see what it holds.
    expect(wells.filter(b => !b.classList.contains('mb-well-btn--readonly')).map(b => b.textContent)).toEqual(BATCH.wells.filter(w => w.sampleType).map(w => w.wellPosition).sort());
    expect(well('A02').getAttribute('title')).toBe(wt('sample', { well: 'A02', type: `${K}sampleType.PATIENT_SPECIMEN` }));
    fireEvent.click(well('A02'));
    expect(screen.queryByText(containing(`${K}wellHeading`))).not.toBeNull();
    expect(screen.queryByText(`${K}sampleTypeLabel`)).not.toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull(); // no editor
    expect(screen.queryByText(`${K}orderLabel`)).toBeNull(); // this well holds no order
  });

  it('Batch 467b: a well holding an in-house order names it, marked and in its facts', async () => {
    route.batchId = 'b1';
    batchSvc.getById.mockResolvedValue({ ok: true, data: { ...BATCH, wells: BATCH.wells.map(w => (w.wellPosition === 'A02' ? { ...w, orderId: 'MO-1' } : w)) } });
    await renderPage();
    expect(well('A02').getAttribute('title')).toBe(wt('order', { well: 'A02', order: 'MO-1', type: `${K}sampleType.PATIENT_SPECIMEN` }));
    expect(well('A02').className).toContain('mb-well-btn--order');
    fireEvent.click(well('A02'));
    expect(screen.queryByText(`${K}orderLabel`)).not.toBeNull();
    expect(screen.queryByText('MO-1')).not.toBeNull();
    expect(well('A02').getAttribute('title')).not.toContain('PS26-1'); // a tooltip can't be redacted
    expect(screen.getByText('PS26-1').getAttribute('data-phi')).toBe('accession');
  });

  it('view-only mode has Plate Label, Deck Location Label and Specimen Labels buttons that print that batch', async () => {
    route.batchId = 'b1';
    await renderPage();
    fireEvent.click(screen.getByText(`${K}plateLabel`));
    fireEvent.click(screen.getByText(`${K}deckLocationLabel`));
    fireEvent.click(screen.getByText(`${K}specimenLabels`));
    expect(printLabels.plate).toHaveBeenCalledWith(BATCH);
    expect(printLabels.deck).toHaveBeenCalledWith(BATCH);
    expect(printLabels.specimen).toHaveBeenCalledWith(BATCH);
  });

  it('a new plate has no label buttons', async () => {
    await renderPage();
    for (const key of ['plateLabel', 'deckLocationLabel', 'specimenLabels']) expect(screen.queryByText(`${K}${key}`)).toBeNull();
  });
});

describe('MolecularPlateBuilderPage (PS-236) — dispatching the worklist', () => {
  it('Dispatch Worklist opens the scan panel; after both scans and a successful dispatch the dispatched-at timestamp replaces the action', async () => {
    route.batchId = 'b1';
    const dispatchedAt = '2026-09-06T12:00:00.000Z';
    batchSvc.getById.mockResolvedValueOnce({ ok: true, data: BATCH }).mockResolvedValueOnce({ ok: true, data: { ...BATCH, worklistDispatchedAt: dispatchedAt } });
    dispatchMolecularWorklist.mockResolvedValue({ dispatched: true, payload: {} });
    await renderPage();

    expect(screen.queryByText(`${K}dispatchPanelTitle`)).toBeNull();
    fireEvent.click(screen.getByText(`${K}dispatchWorklist`));
    expect(screen.getByText(`${K}dispatchPanelTitle`)).not.toBeNull();
    const confirm = () => screen.getByText(`${K}confirmDispatch`).closest('button') as HTMLButtonElement;
    expect(confirm().disabled).toBe(true);

    const [scanPlate, scanDeck] = screen.getAllByText(`${K}scan`);
    fireEvent.click(scanPlate);
    await scan('PLT-HPV-20260906-012');
    expect(screen.getByText('PLT-HPV-20260906-012')).not.toBeNull();
    expect(confirm().disabled).toBe(true);
    fireEvent.click(scanDeck);
    await scan('LOC-INST-PANTHER_02-SLOT_A1');
    expect(confirm().disabled).toBe(false);

    fireEvent.click(confirm());
    await waitFor(() => expect(dispatchMolecularWorklist).toHaveBeenCalledWith(BATCH, 'PLT-HPV-20260906-012', 'LOC-INST-PANTHER_02-SLOT_A1', SESSION, 'station-3'));
    // Batch 513: the timestamp is formatted for the user's language (formatDateTime).
    await waitFor(() => expect(screen.getByText(`${K}worklistDispatchedAt:${JSON.stringify({ date: formatDateTime(dispatchedAt, 'en') })}`)).not.toBeNull());
    expect(screen.queryByText(`${K}dispatchWorklist`)).toBeNull();
    expect(screen.queryByText(`${K}dispatchPanelTitle`)).toBeNull();
  });

  it('an already-dispatched batch shows its dispatched-at timestamp and no Dispatch Worklist action', async () => {
    route.batchId = 'b1';
    batchSvc.getById.mockResolvedValue({ ok: true, data: { ...BATCH, worklistDispatchedAt: '2026-09-06T12:00:00.000Z' } });
    await renderPage();
    expect(screen.getByText(containing(`${K}worklistDispatchedAt`))).not.toBeNull();
    expect(screen.queryByText(`${K}dispatchWorklist`)).toBeNull();
  });
});

describe('MolecularPlateBuilderPage (PS-235) — the results table\'s Trace action', () => {
  it('Trace expands the full trace for that well inline (plate, deck location, creator, reagent lots, movement history) and Hide collapses it', async () => {
    route.batchId = 'b1';
    batchSvc.getById.mockResolvedValue({
      ok: true,
      data: {
        ...BATCH, reviewStatus: 'AUTO_PASSED',
        results: [{ well_position: 'A02', specimen_uuid: null, accession_number: 'PS26-1', raw_data: { ct_value: 22.4 }, interpretation: 'POSITIVE', flag: 'NONE' }],
      },
    });
    await renderPage();
    expect(screen.getByText(`${K}runResultsTitle`)).not.toBeNull();
    expect(screen.queryByText(`${K}tracePlateUuid`)).toBeNull();

    fireEvent.click(screen.getByText(`${K}trace`));
    const cell = screen.getByText(`${K}tracePlateUuid`).closest('td') as HTMLElement;
    expect(cell.getAttribute('colspan')).toBe('7');
    const text = cell.textContent ?? '';
    expect(text).toContain('plate-uuid-1');
    expect(text).toContain('PLT-HPV-20260906-012');
    expect(text).toContain('PANTHER_02 / SLOT_A1');
    expect(text).toContain('Ana Ruiz (u7)');
    expect(text).toContain('MASTER_MIX (LOT-7)');
    expect(within(cell).getByText(`${K}traceMovementHistory`)).not.toBeNull();
    // Batch 513: one template key, translated level names, locale-formatted time.
    expect(text).toContain(`${K}movementLine:`);
    expect(text).toContain(`"from":"${K}movementLevel.primary_vial","to":"${K}movementLevel.plate_well","user":"Ana Ruiz","station":"Molecular Bench 3"`);

    fireEvent.click(screen.getByText(`${K}hide`));
    expect(screen.queryByText(`${K}tracePlateUuid`)).toBeNull();
  });
});

describe('Batch 669 (mol-10): the control well panel', () => {
  it('the expected result follows the control type (negative for a no-template control, positive for a positive control) and can be changed', async () => {
    await renderPage();
    fireEvent.click(well('A01'));
    fireEvent.change(sampleTypeSelect(), { target: { value: 'CONTROL_NTC' } });
    const expected = () => screen.getByLabelText(`${K}controlExpectedLabel`) as HTMLSelectElement;
    expect(expected().value).toBe('NEGATIVE');
    fireEvent.change(sampleTypeSelect(), { target: { value: 'CONTROL_PTC_HIGH' } });
    expect(expected().value).toBe('POSITIVE');
    fireEvent.change(expected(), { target: { value: 'NEGATIVE' } });
    expect(expected().value).toBe('NEGATIVE');
  });

  it('the expiry box shows the date again when the well is selected again, and clearing it does not throw', async () => {
    await renderPage();
    fireEvent.click(well('A01'));
    fireEvent.change(sampleTypeSelect(), { target: { value: 'CONTROL_NTC' } });
    const expiry = () => screen.getByLabelText(`${K}controlExpirationLabel`) as HTMLInputElement;
    expect(expiry().value).toBe('');
    fireEvent.change(expiry(), { target: { value: '2027-03-02' } });
    fireEvent.click(well('A02'));
    fireEvent.click(well('A01'));
    expect(expiry().value).toBe('2027-03-02');
    fireEvent.change(expiry(), { target: { value: '' } });
    expect(expiry().value).toBe('');
  });
});

describe('Batch 669 (mol-7, mol-9): refusals are shown translated', () => {
  const openDispatch = async () => {
    route.batchId = 'b1';
    await renderPage();
    fireEvent.click(screen.getByText(`${K}dispatchWorklist`));
    const [scanPlate, scanDeck] = screen.getAllByText(`${K}scan`);
    fireEvent.click(scanPlate); await scan('PLT-HPV-20260906-012');
    fireEvent.click(scanDeck); await scan('LOC-INST-PANTHER_02-SLOT_A1');
    fireEvent.click(screen.getByText(`${K}confirmDispatch`));
  };

  it('a dispatch that did not go says why through a locale key, not the service\'s English text', async () => {
    dispatchMolecularWorklist.mockResolvedValue({ dispatched: false, reason: 'Could not reach PathScribe\'s own backend: Failed to fetch', failure: { code: 'unreachable', detail: 'Failed to fetch' } });
    await openDispatch();
    expect(await screen.findByText(`${K}dispatchFailure.unreachable:{"status":""}`)).not.toBeNull();
    expect(screen.queryByText(/Could not reach/)).toBeNull();
  });

  it('a refused Clone & Supersede shows its translated reason; a good one opens the replacement', async () => {
    route.batchId = 'b1';
    await renderPage();
    fireEvent.click(screen.getByText(`${K}cloneAndSupersede`));
    fireEvent.change(document.getElementById('mb-clone-reason') as HTMLTextAreaElement, { target: { value: 'Mis-scanned' } });
    supersede.mockResolvedValueOnce({ ok: false, error: 'lotGatingFailed' });
    fireEvent.click(screen.getByText(`${K}confirmCloneAndSupersede`));
    expect(await screen.findByText(`${K}batchErrors.lotGatingFailed`)).not.toBeNull();
    supersede.mockResolvedValueOnce({ ok: false, error: 'Batch rejected — one or more reagent/control lots failed gating: MASTER_MIX (X)' });
    fireEvent.click(screen.getByText(`${K}confirmCloneAndSupersede`));
    expect(await screen.findByText(`${K}batchErrors.generic`)).not.toBeNull();
    supersede.mockResolvedValueOnce({ ok: true, data: { clone: { id: 'b2' }, ordersMoved: 1 } });
    fireEvent.click(screen.getByText(`${K}confirmCloneAndSupersede`));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/molecular-batch/b2'));
  });
});
