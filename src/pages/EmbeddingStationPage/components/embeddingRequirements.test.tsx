// @vitest-environment happy-dom
// Batch 401 (PS-359): the Embedding station's comment drawer, Confirm and the
// cassette reprint dialog take what they need from the organisation's Field
// Requirements (page "embedding"). Each shows "Still required: …", stars
// required labels, keeps its button off until they are filled, and the voice
// commands do exactly what the buttons do.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key), i18n: { language: 'en' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
const { listeners } = vi.hoisted(() => ({ listeners: [] as Array<(id: string) => void> }));
vi.mock('@/services', async () => {
  const rules = await vi.importActual<typeof import('@/services/fieldRequirements/fieldRequirementRules')>('@/services/fieldRequirements/fieldRequirementRules');
  const checks = await vi.importActual<typeof import('@/services/fieldRequirements/embeddingChecks')>('@/services/fieldRequirements/embeddingChecks');
  return {
    ...rules, ...checks,
    actionRegistryService: { onAction: (cb: (id: string) => void) => { listeners.push(cb); return () => { listeners.splice(listeners.indexOf(cb), 1); }; } },
  };
});

import { resolveFieldRequirements } from '@/services/fieldRequirements/fieldRequirementRules';
import type { HistologyBlock, Specimen } from '@/types/case/Specimen';
import CommentDrawer from './CommentDrawer';
import CassetteReprintModal from './CassetteReprintModal';
import EmbeddingCenterPanel from './EmbeddingCenterPanel';

afterEach(() => { cleanup(); listeners.length = 0; });
const say = (id: string) => act(() => { listeners.forEach(cb => cb(id)); });
const reqs = (over: Record<string, boolean> = {}) => resolveFieldRequirements('embedding', over);
const noop = () => {};
const button = (text: string) => screen.getByText(text, { exact: false }).closest('button') as HTMLButtonElement;

describe('CommentDrawer (Embedding)', () => {
  const drawer = (onSubmit = vi.fn()) => {
    render(<CommentDrawer title="Comments" comments={[]} onSubmit={onSubmit} onClose={noop} requirements={reqs()} />);
    return onSubmit;
  };
  it('Add is off until there is text, and the drawer says what is still required', () => {
    drawer();
    expect(button('embeddingStation.comments.add').disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toContain('fieldRequirements.fields.embedding.commentText');
    expect(document.querySelector('.ps-conf-required')).not.toBeNull();
  });
  it('voice adds exactly as the button does: not while blank, then the trimmed text', () => {
    const onSubmit = drawer();
    say('EMBEDDING_ADD_COMMENT');
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  Curled edge ' } });
    say('EMBEDDING_ADD_COMMENT');
    expect(onSubmit).toHaveBeenCalledWith('Curled edge');
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('');
  });
  it('another page\'s voice command does nothing here', () => {
    const onSubmit = drawer();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Note' } });
    say('MICROTOMY_ADD_COMMENT');
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('CassetteReprintModal', () => {
  it('choosing a reason no longer reprints by itself; Reprint does, once a reason is chosen', () => {
    const onReprint = vi.fn();
    render(<CassetteReprintModal requirements={reqs()} onReprint={onReprint} onCancel={noop} />);
    expect(button('embeddingStation.reprintReason.reprint').disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toContain('fieldRequirements.fields.embedding.reprintReason');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Faded Barcode' } });
    expect(onReprint).not.toHaveBeenCalled();
    expect(screen.queryByRole('status')).toBeNull();
    fireEvent.click(button('embeddingStation.reprintReason.reprint'));
    expect(onReprint).toHaveBeenCalledWith('Faded Barcode');
  });
  it('shows the reasons in the user\'s language', () => {
    render(<CassetteReprintModal requirements={reqs()} onReprint={noop} onCancel={noop} />);
    expect(screen.getByText('embeddingStation.reprintReason.reason.waxBuildup')).not.toBeNull();
    expect(screen.queryByText('Wax Buildup')).toBeNull();
  });
});

describe('EmbeddingCenterPanel — Confirm', () => {
  const block = (over: Partial<HistologyBlock> = {}): HistologyBlock => ({ id: 'b1', label: '1', status: 'Grossed', pieceCount: 2, ...over } as HistologyBlock);
  const specimen = (b: HistologyBlock): Specimen => ({ id: 's1', label: 'A', blocks: [b] } as Specimen);
  const panel = (b: HistologyBlock, over: Record<string, boolean> = {}, onConfirm = vi.fn(), onClear = vi.fn(), flaggerName?: string) => {
    render(
      <EmbeddingCenterPanel
        specimen={specimen(b)} block={b} alertBadges={[]} splitBlockGroupStatus={null}
        onToggleAlertFlag={noop} onConfirmPieceCount={onConfirm} onFlagDiscrepancy={noop} onClearDiscrepancy={onClear}
        onSetMoldAndOrientation={noop} onGroupSplitBlocks={noop} onOpenComments={noop}
        requirements={reqs(over)} flaggerName={flaggerName}
      />,
    );
    return onConfirm;
  };
  const count = () => screen.getByLabelText('embeddingStation.pieceCount.observedLabel', { exact: false }) as HTMLInputElement;
  const confirm = () => button('embeddingStation.pieceCount.confirm');

  it('by default needs only an observed count (starts at grossing\'s count), and sends the orientation text with it', () => {
    const onConfirm = panel(block());
    expect(count().value).toBe('2');
    expect(confirm().disabled).toBe(false);
    fireEvent.change(screen.getByLabelText('embeddingStation.orientation.title', { exact: false }), { target: { value: 'On edge' } });
    fireEvent.click(confirm());
    expect(onConfirm).toHaveBeenCalledWith('2', 'On edge');
  });
  it('a blank or non-whole count keeps Confirm off and says so', () => {
    const onConfirm = panel(block({ pieceCount: undefined }));
    expect(confirm().disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toContain('fieldRequirements.fields.embedding.observedPieceCount');
    fireEvent.change(count(), { target: { value: '1.5' } });
    expect(confirm().disabled).toBe(true);
    say('EMBEDDING_CONFIRM_PIECE_COUNT');
    expect(onConfirm).not.toHaveBeenCalled();
  });
  it('when the organisation requires them, the mold size and orientation are starred and asked for', () => {
    const onConfirm = panel(block(), { moldSize: true, orientationInstructions: true });
    expect(confirm().disabled).toBe(true);
    const status = screen.getByRole('status').textContent ?? '';
    expect(status).toContain('fieldRequirements.fields.embedding.moldSize');
    expect(status).toContain('fieldRequirements.fields.embedding.orientationInstructions');
    expect(document.querySelectorAll('.ps-conf-required').length).toBe(3);
    say('EMBEDDING_CONFIRM_PIECE_COUNT');
    expect(onConfirm).not.toHaveBeenCalled();
  });
  it('voice confirms exactly as the button does once everything is there', () => {
    const onConfirm = panel(block({ moldSize: '15x15mm', orientationInstructions: 'Cross-section up' }), { moldSize: true, orientationInstructions: true });
    expect(confirm().disabled).toBe(false);
    say('EMBEDDING_CONFIRM_PIECE_COUNT');
    expect(onConfirm).toHaveBeenCalledWith('2', 'Cross-section up');
  });
  it('an embedded block cannot be confirmed again, and asks for nothing', () => {
    const onConfirm = panel(block({ status: 'Embedded', pieceCountAtEmbedding: 2 }), { moldSize: true });
    expect(confirm().disabled).toBe(true);
    expect(screen.queryByRole('status')).toBeNull();
    say('EMBEDDING_CONFIRM_PIECE_COUNT');
    expect(onConfirm).not.toHaveBeenCalled();
  });
  it('shows the block status, mold sizes and quick fills through locale keys', () => {
    panel(block());
    expect(screen.getByText('embeddingStation.blockStatus.grossed')).not.toBeNull();
    expect(screen.getByText('embeddingStation.mold.size.megaMold')).not.toBeNull();
    expect(screen.getByText('embeddingStation.orientation.quickFill.onEdge')).not.toBeNull();
  });

  // Batch 669 (ws-10): a discrepancy flag stops Confirm until it is cleared, in one click, and names the person.
  const flaggedBlock = () => block({ lastDiscrepancyReason: 'Extra Tissue Found', lastDiscrepancyReportedBy: 'u-17' });
  it('a flagged discrepancy keeps Confirm off (button and voice) and says why', () => {
    const onConfirm = panel(flaggedBlock());
    expect(confirm().disabled).toBe(true);
    say('EMBEDDING_CONFIRM_PIECE_COUNT');
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText('embeddingStation.discrepancy.confirmBlocked')).not.toBeNull();
  });
  it('Clear flag is one click, with no confirmation in between', () => {
    const onClear = vi.fn();
    panel(flaggedBlock(), {}, vi.fn(), onClear);
    fireEvent.click(button('embeddingStation.discrepancy.clear'));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
  it('Last flagged shows the person\'s name, not the user id', () => {
    panel(flaggedBlock(), {}, vi.fn(), vi.fn(), 'Ana Silva');
    const text = document.querySelector('.ps-embedding-discrepancy-active')?.textContent ?? '';
    expect(text).toContain('"by":"Ana Silva"');
    expect(text).not.toContain('u-17');
  });
  it('an unflagged block shows no Clear flag button', () => {
    panel(block());
    expect(screen.queryByText('embeddingStation.discrepancy.clear')).toBeNull();
  });
});
