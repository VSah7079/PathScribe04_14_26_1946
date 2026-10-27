// @vitest-environment happy-dom
// Batch 696: an AI-suggested code row says where the code came from and which check confirmed it.
import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import '@/i18n/config';
import { AiSuggestionMeta } from './AiSuggestionMeta';

const base = { code: 'C50.9', display: 'x', system: 'ICD10', confidence: 90, rationale: '' };

describe('AiSuggestionMeta', () => {
  afterEach(cleanup);
  it('shows the part of the case and the specimen, and the dictionary check', () => {
    render(<AiSuggestionMeta sug={{ ...base, model: 'm', sourceSection: 'microscopic', specimenLabel: 'A', verifiedBy: 'dictionary' }} />);
    expect(screen.getByTestId('code-suggestion-origin').textContent).toBe('Checked origin: the microscopic description, specimen A');
    expect(screen.getByTestId('code-suggestion-verified').getAttribute('title')).toBe('Checked against the code dictionary');
  });
  it('says "Origin not stated" rather than guess when the AI gave no checked source', () => {
    render(<AiSuggestionMeta sug={{ ...base, model: 'm' }} />);
    expect(screen.getByTestId('code-suggestion-origin').textContent).toBe('Origin not stated');
  });
  it('a code taken from a template option (no model) comes from the synoptic answers', () => {
    render(<AiSuggestionMeta sug={base} />);
    expect(screen.getByTestId('code-suggestion-origin').textContent).toBe('Checked origin: the synoptic answers');
  });
  it('the documentation profile shows the plain match label, never a percentage', () => {
    render(<AiSuggestionMeta sug={{ ...base, model: 'm' }} />);
    expect(screen.getByTestId('code-match-strength').textContent).toMatch(/match/i);
    expect(document.body.textContent).not.toMatch(/90%/);
  });
});
