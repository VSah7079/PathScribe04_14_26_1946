// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { CytologyScreeningDetailsCard } from './CytologyScreeningDetailsCard';

afterEach(cleanup);
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

describe('CytologyScreeningDetailsCard (Batch 608)', () => {
  it('offers the follow-up only for a positive HPV result', () => {
    const { rerender } = render(<CytologyScreeningDetailsCard screening={{ hpvResult: 'Negative' }} onSave={vi.fn()} />);
    expect(screen.queryByLabelText('cytologyDetails.followUpLabel')).toBeNull();
    rerender(<CytologyScreeningDetailsCard screening={{ hpvResult: 'Positive' }} onSave={vi.fn()} />);
    expect(screen.getByLabelText('cytologyDetails.followUpLabel')).toBeTruthy();
  });
  it('saves the platform and the colposcopy referral dates', () => {
    const onSave = vi.fn();
    render(<CytologyScreeningDetailsCard screening={{ hpvResult: 'Positive', hpvFollowUp: { action: 'colposcopy_referral' } }} onSave={onSave} />);
    fireEvent.change(screen.getByLabelText('cytologyDetails.platformLabel'), { target: { value: 'SurePath' } });
    expect(onSave).toHaveBeenCalledWith({ liquidBasedPlatform: 'SurePath' });
    const referred = screen.getByLabelText('cytologyDetails.referredAtLabel');
    fireEvent.change(referred, { target: { value: '2026-09-01' } });
    fireEvent.blur(referred);
    expect(onSave).toHaveBeenCalledWith({ hpvFollowUp: { action: 'colposcopy_referral', referredAt: '2026-09-01' } });
  });
});
