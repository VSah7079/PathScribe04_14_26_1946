// @vitest-environment happy-dom
// Batch 549 (PS-539, carried over from Batch 544): a gross imaging vendor's address must be an https link.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const grossImagingVendorService = vi.hoisted(() => ({
  getAll: vi.fn().mockResolvedValue({ ok: true, data: [] }), add: vi.fn().mockResolvedValue({ ok: true }),
  update: vi.fn(), deactivate: vi.fn(), reactivate: vi.fn(),
}));
vi.mock('@/services', () => ({ grossImagingVendorService }));

import GrossImagingVendorDictionarySection from './GrossImagingVendorDictionarySection';

afterEach(() => cleanup());

describe('gross imaging vendor address (Batch 549)', () => {
  it('an http address shows the message and Save stays off; an https link or none can be saved', async () => {
    render(<GrossImagingVendorDictionarySection />);
    fireEvent.click(await screen.findByText('grossImagingVendorDictionary.addVendorBtn'));
    fireEvent.change(screen.getByLabelText('grossImagingVendorDictionary.nameLabel'), { target: { value: 'Macropath' } });
    const save = () => screen.getByText('common.save') as HTMLButtonElement;
    expect(save().disabled).toBe(false);

    fireEvent.change(screen.getByLabelText('grossImagingVendorDictionary.baseUrlLabel'), { target: { value: 'http://imaging.hospital.example' } });
    expect(screen.getByText('links.invalidHttpsLink')).toBeTruthy();
    expect(save().disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('grossImagingVendorDictionary.baseUrlLabel'), { target: { value: 'https://imaging.hospital.example' } });
    expect(screen.queryByText('links.invalidHttpsLink')).toBeNull();
    expect(save().disabled).toBe(false);
  });
});
