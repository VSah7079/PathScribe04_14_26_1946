// @vitest-environment happy-dom
//
// src/pages/GrossingScreenPage/GrossingScreenPage.test.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Real, per PS-260's own noted verification gap: no page-level render
// test existed for GrossingScreenPage.tsx — only the pure operations
// underneath it (grossingScreenOperations.test.ts) were covered.
//
// Mocks useGrossingScreen entirely — its own write-path behavior is
// already covered by useSpecimenBlockManagement.test.ts's triage
// suite and grossingScreenOperations.test.ts; this file is about the
// page's own rendering logic (protocol header, block table, cytology
// table, audit panel), not re-proving the write handlers.
//
// Real, first-in-codebase pattern: mocks react-i18next's useTranslation
// to return the raw key (optionally with interpolation values
// appended) rather than loading the real i18n config — standard,
// minimal-setup approach for a component test; assertions check for
// key presence, not translated text.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

vi.mock('./GrossingBenchTools', () => ({ default: () => null }));
// Batch 729: the scan trail and the wrong-case check have their own tests (services/stationScans/).
vi.mock('@/components/Workstation/ScanTrailPanel', () => ({ default: () => null }));
vi.mock('@/components/Workstation/WrongCaseScanBanner', () => ({ default: () => null }));
vi.mock('@/hooks/useWrongCaseScanCheck', () => ({ useWrongCaseScanCheck: () => ({ flag: null, choose: () => undefined }) }));
vi.mock('@/hooks/useEffectiveScanStation', () => ({ useEffectiveScanStation: () => ({ effectiveStationId: null }) }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key), i18n: { language: 'en' } }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return { ...actual, useNavigate: () => mockNavigate, useParams: () => ({ caseId: 'TEST-CASE-GROSS' }) };
});

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'tech-1', name: 'Test Tech' } }),
}));

const { getCase } = vi.hoisted(() => ({ getCase: vi.fn() }));
vi.mock('@/services/cases/CaseRouter', () => ({ caseRouter: { getCase } }));

const { protocolGetAll, stainTypeGetAll, batchGetAll } = vi.hoisted(() => ({
  protocolGetAll: vi.fn(), stainTypeGetAll: vi.fn(), batchGetAll: vi.fn(),
}));
vi.mock('@/services', () => ({
  protocolService: { getAll: protocolGetAll },
  stainTypeService: { getAll: stainTypeGetAll },
  batchService: { getAll: batchGetAll },
  // Batch 378: the page listens for the Complete grossing command.
  actionRegistryService: { setCurrentContext: vi.fn(), onAction: vi.fn(() => () => {}) },
}));

// The Complete grossing button's capability check is CapabilityButton's own concern (tested there).
// Batch 530: the clinical history line has its own tests (CaseClinicalHistoryBar.test.tsx).
vi.mock('@/components/ClinicalHistory/CaseClinicalHistoryBar', () => ({ CaseClinicalHistoryBar: () => null }));
vi.mock('@/components/Common/CapabilityButton', () => ({
  CapabilityButton: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button type="button" onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

// Batch 379: a test can change what the hook reports (the protocol confirmation).
const { hookOverrides } = vi.hoisted(() => ({ hookOverrides: { current: {} as Record<string, unknown> } }));
vi.mock('./hooks/useGrossingScreen', () => ({
  useGrossingScreen: () => ({
    handleAddBlock: vi.fn(), handleRemoveBlock: vi.fn().mockResolvedValue({ ok: true }),
    handleAddStain: vi.fn(), handleRemoveStain: vi.fn().mockResolvedValue({ ok: true }),
    pendingStainRemoval: null, confirmPendingStainRemoval: vi.fn(), cancelPendingStainRemoval: vi.fn(),
    handleUpdatePieceCount: vi.fn(),
    missingItems: [], handleCompleteGrossing: vi.fn(), completeRefusal: null,
    secondaryReviewSpecimens: [], pendingProtocolConfirmation: null, confirmCompleteWithoutProtocol: vi.fn(),
    cancelCompleteWithoutProtocol: vi.fn(), completionReview: null,
    handleRecordFixationEnded: vi.fn(), handleConfirmFixativeRatio: vi.fn(),
    handleRaiseFixationDeficiency: vi.fn(), specimensWithOpenFixationDeficiency: new Set<string>(),
    // Batch 481 (Structured Inking, Module 2).
    handleRecordMarginInk: vi.fn().mockResolvedValue({ ok: true, marginId: 'margin-1' }),
    // Structured Inking, Module 3 (PS-359 follow-up).
    inkColors: [], inkingValidation: { issues: [], blocked: false }, inkingValidationMode: 'WARN_ONLY',
    ...hookOverrides.current,
  }),
}));

const PROTOCOL = {
  id: 'proto-1', name: 'Standard Small Biopsy', requiresTriage: false, active: true, version: 3,
  updatedBy: 'admin', updatedAt: '2026-01-01T00:00:00.000Z',
  pathways: [{ id: 'p1', pathwayName: 'Track', materialKind: 'block', fixativeType: '10% NBF', requiresDecal: false, processingFormat: 'Standard', tasks: [] }],
};

const TEST_CASE = {
  id: 'TEST-CASE-GROSS',
  accession: { fullAccession: 'S26-9001' },
  specimens: [
    {
      id: 'sp1', label: 'A', description: 'Gallbladder',
      protocolSnapshot: { id: 'proto-1', version: 3, name: 'Standard Small Biopsy' },
      blocks: [
        { id: 'blk-1', label: '1', status: 'Pending', pieceCount: 2, stains: [{ id: 'st-1', stainName: 'H&E', status: 'Pending Cut' }] },
      ],
      grossingOverrides: [],
    },
  ],
};

afterEach(() => { cleanup(); vi.clearAllMocks(); hookOverrides.current = {}; });

async function renderGrossingScreen(caseData: unknown = TEST_CASE) {
  getCase.mockResolvedValue(caseData);
  protocolGetAll.mockResolvedValue({ ok: true, data: [PROTOCOL] });
  stainTypeGetAll.mockResolvedValue({ ok: true, data: [{ id: 'st-pas', name: 'PAS', active: true }] });
  batchGetAll.mockResolvedValue({ ok: true, data: [] });
  const { default: GrossingScreenPage } = await import('./GrossingScreenPage');
  const utils = render(<MemoryRouter><GrossingScreenPage /></MemoryRouter>);
  await waitFor(() => expect(screen.queryByText('common.loading')).toBeNull());
  return utils;
}

describe('GrossingScreenPage — real render smoke test', () => {
  it('shows the loading state, then the real case, protocol version, and block table', async () => {
    await renderGrossingScreen();
    expect(screen.getByText(/grossingScreen.protocolVersion/)).not.toBeNull();
    expect(screen.getByText(/S26-9001/)).not.toBeNull();
    expect(screen.getByText('H&E')).not.toBeNull();
    expect(screen.getByDisplayValue('2')).not.toBeNull(); // real pieceCount value — rendered as an editable input's value, not plain text
  });

  it('shows a real case-not-found message when the case genuinely does not resolve', async () => {
    await renderGrossingScreen(null);
    expect(screen.getByText('grossingScreen.caseNotFound')).not.toBeNull();
  });

  it('shows the real "Protocol Modified" badge only when a block has userModified: true', async () => {
    const modifiedCase = {
      ...TEST_CASE,
      specimens: [{ ...TEST_CASE.specimens[0], blocks: [{ ...TEST_CASE.specimens[0].blocks[0], userModified: true }] }],
    };
    await renderGrossingScreen(modifiedCase);
    expect(screen.getByText('grossingScreen.protocolModified')).not.toBeNull();
  });

  it('does not show the "Protocol Modified" badge when no block has been modified', async () => {
    await renderGrossingScreen();
    expect(screen.queryByText('grossingScreen.protocolModified')).toBeNull();
  });

  it('a user-added stain renders with the userAdded flag, an auto-generated one with the autoGenerated flag', async () => {
    const caseWithUserAdded = {
      ...TEST_CASE,
      specimens: [{
        ...TEST_CASE.specimens[0],
        blocks: [{
          ...TEST_CASE.specimens[0].blocks[0],
          stains: [
            { id: 'st-1', stainName: 'H&E', status: 'Pending Cut' },
            { id: 'st-2', stainName: 'PAS', status: 'Pending Cut', userAdded: true },
          ],
        }],
      }],
    };
    await renderGrossingScreen(caseWithUserAdded);
    expect(screen.getByText('grossingScreen.stainOrigin.protocol')).not.toBeNull();
    expect(screen.getByText('grossingScreen.stainOrigin.userAdded')).not.toBeNull();
  });

  // Batch 705: a specimen with no protocol must not claim its stains were auto-generated.
  it('stains on a specimen with no protocol are tagged "existing", never auto-generated', async () => {
    const { protocolSnapshot: _omit, ...noProtocolSpecimen } = TEST_CASE.specimens[0];
    void _omit;
    await renderGrossingScreen({ ...TEST_CASE, specimens: [noProtocolSpecimen] });
    expect(screen.getByText('grossingScreen.noProtocol')).not.toBeNull();
    expect(screen.getByText('grossingScreen.stainOrigin.existing')).not.toBeNull();
    expect(screen.queryByText('grossingScreen.stainOrigin.protocol')).toBeNull();
  });

  it('the audit panel toggles open to show a real logged override', async () => {
    const caseWithOverride = {
      ...TEST_CASE,
      specimens: [{
        ...TEST_CASE.specimens[0],
        grossingOverrides: [{ field: 'pieceCount', blockLabel: '1', originalValue: '(none)', newValue: '2', actor: 'tech-1', timestamp: '2026-09-10T00:00:00.000Z' }],
      }],
    };
    await renderGrossingScreen(caseWithOverride);
    const toggle = screen.getByText(/grossingScreen.auditPanelTitle/);
    expect(screen.queryByText(/grossingScreen.auditEntry/)).toBeNull(); // collapsed by default
    fireEvent.click(toggle);
    expect(screen.getByText(/grossingScreen.auditEntry/)).not.toBeNull();
  });

  it('Batch 379: with the protocol rule off, says which specimens will go for review, and confirms before completing', async () => {
    const confirm = vi.fn(); const cancel = vi.fn();
    hookOverrides.current = { secondaryReviewSpecimens: ['B'] };
    const { unmount } = await renderGrossingScreen({ ...TEST_CASE, status: 'accessioned' });
    expect(screen.getByText(/grossingScreen.complete.reviewNotice/).textContent).toContain('"specimens":"B"');
    unmount();
    hookOverrides.current = { secondaryReviewSpecimens: ['B'], pendingProtocolConfirmation: ['B'], confirmCompleteWithoutProtocol: confirm, cancelCompleteWithoutProtocol: cancel };
    await renderGrossingScreen({ ...TEST_CASE, status: 'accessioned' });
    expect(screen.getByRole('alertdialog')).not.toBeNull();
    expect(screen.getByText(/grossingScreen.complete.withoutProtocol.body/)).not.toBeNull();
    fireEvent.click(screen.getByText('grossingScreen.complete.withoutProtocol.confirm'));
    expect(confirm).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('common.cancel'));
    expect(cancel).toHaveBeenCalled();
  });

  it('Batch 379: after completing, says which specimens were routed for secondary review', async () => {
    hookOverrides.current = { completionReview: { routedForReview: ['B'], reviewNotRaised: ['C'] } };
    await renderGrossingScreen({ ...TEST_CASE, status: 'gross-complete' });
    expect(screen.getByText(/grossingScreen.complete.routedForReview/)).not.toBeNull();
    expect(screen.getByRole('alert').textContent).toContain('grossingScreen.complete.reviewNotRaised');
  });
});

// Batch 481 (Structured Inking, Module 2; PS-359 follow-up): the UI that
// calls recordMarginInkApplication.ts (Batch 480). Mocks the hook's own
// handleRecordMarginInk — the real service and its own real capability
// check are covered by recordMarginInkApplication.test.ts; this file is
// about the page rendering margins/ink correctly and wiring the forms to
// the hook with the right input shape.
describe('GrossingScreenPage — Margins & Ink Applications (Batch 481)', () => {
  it('shows the empty state for a specimen with no margins yet', async () => {
    await renderGrossingScreen();
    expect(screen.getByText('grossingScreen.margins.empty')).not.toBeNull();
  });

  it('renders a specimen-level margin with its ink history and examined status', async () => {
    const caseWithMargin = {
      ...TEST_CASE,
      specimens: [{
        ...TEST_CASE.specimens[0],
        margins: [{
          id: 'margin-1', name: 'Deep', orientation: 'posterior', laterality: 'left', examinationStatus: 'examined',
          inkApplications: [{ id: 'ink-1', colorName: 'Blue', colorCode: '#0000FF', appliedAt: '2026-10-07T00:00:00.000Z', appliedByName: 'Test Tech' }],
        }],
      }],
    };
    await renderGrossingScreen(caseWithMargin);
    expect(screen.getByText('Deep')).not.toBeNull();
    expect(screen.getByText('posterior · left')).not.toBeNull();
    expect(screen.getByText('grossingScreen.margins.status.examined')).not.toBeNull();
    expect(screen.getByText(/grossingScreen.margins.inkEntry/)).not.toBeNull();
    expect(screen.queryByText('grossingScreen.margins.empty')).toBeNull();
  });

  it('renders a block-level margin under its own block group, separate from specimen-level margins', async () => {
    const caseWithBlockMargin = {
      ...TEST_CASE,
      specimens: [{
        ...TEST_CASE.specimens[0],
        blocks: [{
          ...TEST_CASE.specimens[0].blocks[0],
          margins: [{ id: 'margin-2', name: 'Lateral', examinationStatus: 'pending', inkApplications: [] }],
        }],
      }],
    };
    await renderGrossingScreen(caseWithBlockMargin);
    expect(screen.getByText(/grossingScreen.margins.onBlock/)).not.toBeNull();
    expect(screen.queryByText('grossingScreen.margins.onSpecimen')).toBeNull(); // no specimen-level margin here
    expect(screen.getByText('Lateral')).not.toBeNull();
    expect(screen.getByText('grossingScreen.margins.status.pending')).not.toBeNull();
  });

  // Structured Inking, Module 3 (PS-359 follow-up): the margin/ink forms'
  // free-text colour inputs are now a <select> from the active ink-colour
  // palette (services/inkColors/) — these tests select by colorCode and
  // assert the hook still receives both colorCode and the matching colorName.
  const ACTIVE_INK_COLORS = [
    { id: 'ink-blue', name: 'Blue', code: '#0000FF', active: true, createdAt: '', updatedAt: '' },
    { id: 'ink-green', name: 'Green', code: '#00FF00', active: true, createdAt: '', updatedAt: '' },
  ];

  it('submits a new margin with the right input shape, attached to the specimen by default', async () => {
    const handleRecordMarginInk = vi.fn().mockResolvedValue({ ok: true, marginId: 'margin-new' });
    hookOverrides.current = { handleRecordMarginInk, inkColors: ACTIVE_INK_COLORS };
    await renderGrossingScreen();
    fireEvent.click(screen.getByText(/grossingScreen.margins.addMargin/));
    fireEvent.change(screen.getByPlaceholderText('grossingScreen.margins.namePlaceholder'), { target: { value: 'Deep' } });
    fireEvent.change(screen.getByDisplayValue('grossingScreen.margins.selectColorPlaceholder'), { target: { value: '#0000FF' } });
    fireEvent.click(screen.getByText('common.add'));
    await waitFor(() => expect(handleRecordMarginInk).toHaveBeenCalledWith(expect.objectContaining({
      specimenId: 'sp1', blockId: undefined, marginName: 'Deep', colorName: 'Blue', colorCode: '#0000FF', examined: true,
    })));
  });

  it('submitting a new margin attached to a block passes that blockId', async () => {
    const handleRecordMarginInk = vi.fn().mockResolvedValue({ ok: true, marginId: 'margin-new' });
    hookOverrides.current = { handleRecordMarginInk, inkColors: ACTIVE_INK_COLORS };
    await renderGrossingScreen();
    fireEvent.click(screen.getByText(/grossingScreen.margins.addMargin/));
    fireEvent.change(screen.getByDisplayValue('grossingScreen.margins.attachToSpecimen'), { target: { value: 'blk-1' } });
    fireEvent.change(screen.getByPlaceholderText('grossingScreen.margins.namePlaceholder'), { target: { value: 'Deep' } });
    fireEvent.change(screen.getByDisplayValue('grossingScreen.margins.selectColorPlaceholder'), { target: { value: '#0000FF' } });
    fireEvent.click(screen.getByText('common.add'));
    await waitFor(() => expect(handleRecordMarginInk).toHaveBeenCalledWith(expect.objectContaining({ specimenId: 'sp1', blockId: 'blk-1' })));
  });

  it('appends a further ink application to an existing margin, with its marginId, never re-sending the name', async () => {
    const handleRecordMarginInk = vi.fn().mockResolvedValue({ ok: true, marginId: 'margin-1' });
    hookOverrides.current = { handleRecordMarginInk, inkColors: ACTIVE_INK_COLORS };
    const caseWithMargin = {
      ...TEST_CASE,
      specimens: [{
        ...TEST_CASE.specimens[0],
        margins: [{ id: 'margin-1', name: 'Deep', examinationStatus: 'examined', inkApplications: [] }],
      }],
    };
    await renderGrossingScreen(caseWithMargin);
    fireEvent.click(screen.getByText(/grossingScreen.margins.addInk/));
    fireEvent.change(screen.getByDisplayValue('grossingScreen.margins.selectColorPlaceholder'), { target: { value: '#00FF00' } });
    fireEvent.click(screen.getByText('common.save'));
    await waitFor(() => expect(handleRecordMarginInk).toHaveBeenCalledWith(expect.objectContaining({
      specimenId: 'sp1', marginId: 'margin-1', colorName: 'Green', colorCode: '#00FF00',
    })));
    expect(handleRecordMarginInk).toHaveBeenCalledWith(expect.not.objectContaining({ marginName: expect.anything() }));
  });

  it('shows the refusal, worded from its reason code, and leaves the form open when the save fails', async () => {
    const handleRecordMarginInk = vi.fn().mockResolvedValue({ ok: false, error: 'Recording a margin ink application needs the grossing:margin-ink:record permission', reasonCode: 'notPermitted' });
    hookOverrides.current = { handleRecordMarginInk, inkColors: ACTIVE_INK_COLORS };
    await renderGrossingScreen();
    fireEvent.click(screen.getByText(/grossingScreen.margins.addMargin/));
    fireEvent.change(screen.getByPlaceholderText('grossingScreen.margins.namePlaceholder'), { target: { value: 'Deep' } });
    fireEvent.change(screen.getByDisplayValue('grossingScreen.margins.selectColorPlaceholder'), { target: { value: '#0000FF' } });
    fireEvent.click(screen.getByText('common.add'));
    // Batch 513: the service's English diagnostic is never shown; the reason code is translated.
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('grossingScreen.margins.reason.notPermitted'));
    // The form stays open on failure, not silently reset — its input is still here.
    expect(screen.getByPlaceholderText('grossingScreen.margins.namePlaceholder')).not.toBeNull();
  });

  // Structured Inking, Module 3 (PS-359 follow-up): the severity engine's
  // own advisory display — pure pass-through of the hook's inkingValidation.
  it('shows a severity badge for each real issue the hook reports against this margin', async () => {
    const caseWithMargin = {
      ...TEST_CASE,
      specimens: [{
        ...TEST_CASE.specimens[0],
        margins: [{ id: 'margin-1', name: 'Deep', examinationStatus: 'pending', inkApplications: [] }],
      }],
    };
    hookOverrides.current = {
      inkingValidation: {
        issues: [
          { severity: 2, code: 'margin_not_examined', specimenId: 'sp1', marginId: 'margin-1', marginName: 'Deep' },
          { severity: 2, code: 'margin_no_ink_applied', specimenId: 'sp1', marginId: 'margin-1', marginName: 'Deep' },
        ],
        blocked: false,
      },
    };
    await renderGrossingScreen(caseWithMargin);
    expect(screen.getByText('grossingScreen.margins.issues.margin_not_examined')).not.toBeNull();
    expect(screen.getByText('grossingScreen.margins.issues.margin_no_ink_applied')).not.toBeNull();
  });

  it('shows the Strict Enforce mode notice when the hook reports it, and Warn & Advisory otherwise', async () => {
    const caseWithMargin = {
      ...TEST_CASE,
      specimens: [{
        ...TEST_CASE.specimens[0],
        margins: [{ id: 'margin-1', name: 'Deep', examinationStatus: 'examined', inkApplications: [] }],
      }],
    };
    hookOverrides.current = { inkingValidationMode: 'STRICT_ENFORCE' };
    await renderGrossingScreen(caseWithMargin);
    expect(screen.getByText('grossingScreen.margins.validationNotice.strictEnforce')).not.toBeNull();
  });
});
