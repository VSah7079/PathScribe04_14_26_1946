// @vitest-environment happy-dom
// Batch 682: the "show confidence scores" checkbox was read by nothing, so it is gone in every profile.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', name: 'Admin One', role: 'admin' } }), useIsAdmin: () => false }));
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import '@/i18n/config';
import AiTab from './index';
import { AI_BEHAVIOR_DEFAULTS } from '@/services/aiBehavior/IAIBehaviorService';

describe('AI tab settings', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => { cleanup(); vi.unstubAllEnvs(); });
  it.each(['documentation', 'clinical_support'])('%s: no confidence-scores checkbox, the other toggles remain', async profile => {
    vi.stubEnv('VITE_REGULATORY_PROFILE', profile);
    render(<AiTab />);
    await waitFor(() => expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0));
    expect(screen.queryByText(/confidence scores/i)).toBeNull();
    expect('showConfidenceScores' in AI_BEHAVIOR_DEFAULTS).toBe(false);
  });
  it('no setting is shown that nothing reads (Batch 687)', () => {
    for (const k of ['macroSuggestions', 'subspecialtyRouting', 'showConfidenceScores']) expect(k in AI_BEHAVIOR_DEFAULTS).toBe(false);
    expect('autoInsertSuggestions' in AI_BEHAVIOR_DEFAULTS).toBe(true);
  });
});
