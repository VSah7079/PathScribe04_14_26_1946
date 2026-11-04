// @vitest-environment happy-dom
//
// PS-317: regenerating a per-specimen Gross Description section (composite
// id `${templateSectionId}_${specimenId}`, created by manual entry) reports
// a clear, specific error through onError instead of silently doing nothing.
// Uses a real buildContext() context and a stub AI provider passed in.
import { describe, it, expect, vi } from 'vitest';
import '@/i18n/config';
import { buildContext } from './contextBuilder';
import { OrchestratorEngine } from './orchestratorEngine';
import { buildManualEntrySections } from '@/services/reportEditing/orchestratorSections';
import type { IAIProvider } from '@/services/ai/IAIProvider';
import type { Case } from '@/types/case/Case';

function stubProvider(): IAIProvider & { generateStream: ReturnType<typeof vi.fn> } {
  return {
    providerId: 'stub', modelId: 'stub-1', displayName: 'Stub',
    generate: vi.fn(),
    generateStream: vi.fn(async (_req: unknown, onToken: (t: string) => void) => {
      onToken('regenerated');
      return { text: 'regenerated', tokensGenerated: 1, providerId: 'stub', modelId: 'stub-1', latencyMs: 1 };
    }),
    testConnection: vi.fn(),
  } as any;
}

const caseWithTwoSpecimens = {
  id: 'PS317-CASE', status: 'in-progress',
  patient: { firstName: 'T', lastName: 'P' }, accession: { accessionNumber: 'S26-317' },
  specimens: [{ id: 'sp-A', label: 'A', description: 'Left breast' }, { id: 'sp-B', label: 'B' }],
} as unknown as Case;

describe('OrchestratorEngine.regenerateSection — PS-317 per-specimen Gross Description', () => {
  it('reports a clear message naming Gross Description through onError, and never calls the AI provider', async () => {
    const ctx = await buildContext(caseWithTwoSpecimens, null);
    const perSpecimen = buildManualEntrySections(ctx.narrativeTemplate.sections as any[], caseWithTwoSpecimens.specimens as any[])
      .find(s => s.specimenId === 'sp-A')!;
    expect(perSpecimen).toBeDefined();

    const onError = vi.fn();
    const onSectionStart = vi.fn();
    const provider = stubProvider();
    const engine = new OrchestratorEngine(undefined, ctx, { onError, onSectionStart }, provider);

    const result = await engine.regenerateSection(perSpecimen.id);

    expect(result.status).toBe('error');
    expect(onError).toHaveBeenCalledTimes(1);
    const [sectionId, message] = onError.mock.calls[0];
    expect(sectionId).toBe(perSpecimen.id);
    expect(message).toContain('Gross Description');
    expect(message).toMatch(/can't be regenerated/);
    expect(message).not.toBe('Section not found in template');
    expect(provider.generateStream).not.toHaveBeenCalled();
    expect(onSectionStart).not.toHaveBeenCalled();
  });

  it('a real template section id still regenerates normally through the provider', async () => {
    const ctx = await buildContext(caseWithTwoSpecimens, null);
    const gross = (ctx.narrativeTemplate.sections as any[]).find(s => s.sourcePartId === 'std_body_gross');
    expect(gross).toBeDefined();
    const onError = vi.fn();
    const onSectionComplete = vi.fn();
    const provider = stubProvider();
    const engine = new OrchestratorEngine(undefined, ctx, { onError, onSectionComplete }, provider);

    const result = await engine.regenerateSection(gross.id);

    expect(result.status).toBe('completed');
    expect(provider.generateStream).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
    expect(onSectionComplete).toHaveBeenCalledWith(gross.id, expect.objectContaining({ text: 'regenerated' }));
  });
});
