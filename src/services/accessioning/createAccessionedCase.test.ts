// src/services/accessioning/createAccessionedCase.test.ts
// Batch 649: creating a case on the Accession screen needs case:accession:create.
import { describe, expect, it, vi } from 'vitest';
import { AccessionNotPermittedError, createAccessionedCase } from './createAccessionedCase';
import type { Case } from '@/types/case/Case';

const newCase = { id: 'O26-1' } as Case;

describe('createAccessionedCase (Batch 649)', () => {
  it('allowed: the case is created', async () => {
    const enforce = vi.fn(async () => ({ allowed: true }));
    const createCase = vi.fn(async () => undefined);
    await createAccessionedCase(newCase, { enforce, createCase });
    expect(enforce).toHaveBeenCalledWith('case:accession:create', {});
    expect(createCase).toHaveBeenCalledWith(newCase);
  });

  it('refused: nothing is saved, and the refusal says why', async () => {
    const createCase = vi.fn(async () => undefined);
    await expect(createAccessionedCase(newCase, { enforce: async () => ({ allowed: false }), createCase })).rejects.toBeInstanceOf(AccessionNotPermittedError);
    expect(createCase).not.toHaveBeenCalled();
  });
});
