// @vitest-environment happy-dom
// Batch 388 (PS-359): the Microtome workstation's comment drawer and slide grid
// take what they need from the organisation's Field Requirements (page
// "microtomy"). Each shows "Still required: …", stars required labels, keeps
// its button off until they are filled, and its voice command does exactly what
// the button does.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key), i18n: { language: 'en' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
const { listeners } = vi.hoisted(() => ({ listeners: [] as Array<(id: string) => void> }));
vi.mock('@/services', async () => {
  const rules = await vi.importActual<typeof import('@/services/fieldRequirements/fieldRequirementRules')>('@/services/fieldRequirements/fieldRequirementRules');
  const checks = await vi.importActual<typeof import('@/services/fieldRequirements/microtomyChecks')>('@/services/fieldRequirements/microtomyChecks');
  return {
    ...rules, ...checks,
    actionRegistryService: { onAction: (cb: (id: string) => void) => { listeners.push(cb); return () => { listeners.splice(listeners.indexOf(cb), 1); }; } },
  };
});

import { resolveFieldRequirements } from '@/services/fieldRequirements/fieldRequirementRules';
import CommentDrawer from './CommentDrawer';
import SlideGridPanel from './SlideGridPanel';

afterEach(() => { cleanup(); listeners.length = 0; });
const say = (id: string) => listeners.forEach(cb => cb(id));
const reqs = (over: Record<string, boolean> = {}) => resolveFieldRequirements('microtomy', over);
const noop = () => {};

function drawer(over: Partial<React.ComponentProps<typeof CommentDrawer>> = {}) {
  return render(<CommentDrawer title="Comments" comments={[]} showPrintToggle onSubmit={noop} onClose={noop} requirements={reqs()} {...over} />);
}
const type = (text: string) => fireEvent.change(screen.getByRole('textbox'), { target: { value: text } });
const addBtn = () => screen.getByText('microtomyWorkstation.comments.add').closest('button') as HTMLButtonElement;

describe('CommentDrawer', () => {
  it('Add is off until there is text, and the drawer says what is still required', () => {
    drawer();
    expect(addBtn().disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toContain('fieldRequirements.fields.microtomy.commentText');
    expect(document.querySelector('.ps-conf-required')).not.toBeNull();
  });
  it('a blank comment still does not count', () => {
    drawer();
    type('   ');
    expect(addBtn().disabled).toBe(true);
  });
  it('adds the trimmed comment with the print-on-label choice, then clears', () => {
    const onSubmit = vi.fn();
    drawer({ onSubmit });
    type('  Fragile edge ');
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.queryByRole('status')).toBeNull();
    fireEvent.click(addBtn());
    expect(onSubmit).toHaveBeenCalledWith('Fragile edge', true);
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('');
  });
  it('"add comment" by voice adds when there is text, and does nothing when there is none', () => {
    const onSubmit = vi.fn();
    drawer({ onSubmit });
    say('MICROTOMY_ADD_COMMENT');
    expect(onSubmit).not.toHaveBeenCalled();
    type('Tiny biopsy');
    say('MICROTOMY_ADD_STAIN');
    expect(onSubmit).not.toHaveBeenCalled();
    say('MICROTOMY_ADD_COMMENT');
    expect(onSubmit).toHaveBeenCalledWith('Tiny biopsy', false);
  });
  it('lists earlier comments with a locale-formatted time', () => {
    drawer({ comments: [{ id: 'c1', text: 'Earlier note', authorName: 'Ana', createdAt: '2026-09-29T10:00:00.000Z' } as any] });
    expect(screen.getByText(/Earlier note/)).toBeTruthy();
    expect(screen.getByText(/microtomyWorkstation\.comments\.meta/).textContent).toContain('Ana');
  });
});

const stainTypes = [
  { id: 's1', name: 'PAS', category: 'Special Stain' },
  { id: 's2', name: 'CK7', category: 'IHC' },
] as any[];
const stain = (over: Record<string, unknown> = {}) => ({ id: 'o1', stainName: 'H&E', printStatus: 'Printed', status: 'Ordered', ...over }) as any;
function grid(over: Partial<React.ComponentProps<typeof SlideGridPanel>> = {}) {
  return render(<SlideGridPanel stains={[]} stainTypes={stainTypes} printMode="on_demand" batchSelection={new Set()}
    onToggleSelect={noop} onPrintOne={noop} onReprint={noop} onAddLevel={noop} onRemove={noop} onAddStain={noop}
    onOpenComments={noop} onReorder={noop} supportsControlPairing={false} requirements={reqs()} {...over} />);
}
const chooseStain = (id: string) => fireEvent.change(screen.getByLabelText('fieldRequirements.fields.microtomy.stainType'), { target: { value: id } });
const gridAdd = () => screen.getByText(/common\.add/).closest('button') as HTMLButtonElement;

describe('SlideGridPanel', () => {
  it('Add is off until a stain is chosen, and says so', () => {
    grid();
    expect(gridAdd().disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toContain('stainType');
    chooseStain('s1');
    expect(gridAdd().disabled).toBe(false);
    expect(screen.queryByRole('status')).toBeNull();
  });
  it('a level depth an organisation requires holds Add off until it is filled', () => {
    grid({ requirements: reqs({ levelDepth: true }) });
    chooseStain('s1');
    expect(gridAdd().disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toContain('levelDepth');
    fireEvent.change(screen.getByLabelText(/microtomyWorkstation\.slideGrid\.levelDepth/), { target: { value: '4' } });
    expect(gridAdd().disabled).toBe(false);
  });
  it('adds the chosen stain with the options', () => {
    const onAddStain = vi.fn();
    grid({ onAddStain, requirements: reqs({ levelDepth: true }) });
    chooseStain('s1');
    fireEvent.change(screen.getByLabelText(/microtomyWorkstation\.slideGrid\.levelDepth/), { target: { value: '5' } });
    fireEvent.click(gridAdd());
    expect(onAddStain).toHaveBeenCalledTimes(1);
    expect(onAddStain.mock.calls[0][0].id).toBe('s1');
    expect(onAddStain.mock.calls[0][1]).toMatchObject({ levelDepthMicrons: 5 });
  });
  it('"add stain" by voice adds only when the picker is ready', () => {
    const onAddStain = vi.fn();
    grid({ onAddStain });
    say('MICROTOMY_ADD_STAIN');
    expect(onAddStain).not.toHaveBeenCalled();
    chooseStain('s1');
    say('MICROTOMY_ADD_COMMENT');
    expect(onAddStain).not.toHaveBeenCalled();
    say('MICROTOMY_ADD_STAIN');
    expect(onAddStain).toHaveBeenCalledTimes(1);
  });
  it('shows the stain categories and the reprint reasons through t()', () => {
    grid({ stains: [stain()] });
    expect(screen.getByText('microtomyWorkstation.slideGrid.categories.special')).toBeTruthy();
    fireEvent.click(screen.getByText('microtomyWorkstation.slideGrid.reprint'));
    expect(screen.getByText('microtomyWorkstation.reasons.jam')).toBeTruthy();
    expect(screen.getByText('microtomyWorkstation.reasons.scratchedGlass')).toBeTruthy();
  });
  it('a reprint sends the chosen reason', () => {
    const onReprint = vi.fn();
    grid({ stains: [stain()], onReprint });
    fireEvent.click(screen.getByText('microtomyWorkstation.slideGrid.reprint'));
    fireEvent.change(screen.getByRole('combobox', { name: 'a11y.fields.reprintReason' }) as HTMLSelectElement, { target: { value: 'Jam' } });
    expect(onReprint).toHaveBeenCalledWith('o1', 'Jam');
  });
});
