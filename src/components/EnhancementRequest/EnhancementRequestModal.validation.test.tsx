// @vitest-environment happy-dom
// The QA / Testing Feedback modal: the 'AI / Template validation' category shows two optional pickers
// (an active validation study, a template), saves the links with the submission, and the confirmation
// says where the feedback went. Other categories show no pickers.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, o?: Record<string, string>) => (o ? `${key} ${Object.values(o).join(' ')}` : key), i18n: { language: 'en' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'PATH-001', name: 'Pete Nimmo', role: 'superadmin' } }) }));
vi.mock('../../hooks/useScreenCapture', () => ({ useScreenCapture: () => ({ capture: async () => null, isCapturing: false }) }));
vi.mock('@/hooks/useFocusTrap', () => ({ useFocusTrap: () => {} }));

const submit = vi.fn();
vi.mock('../../services/enhancementRequestService', () => ({
  submitEnhancementRequest: (...a: unknown[]) => submit(...a),
  loadEnhancementConfigForSubmit: async () => ({}),
  captureMetadata: async () => undefined,
  replaceCaseNumbersWithReferences: vi.fn(),
}));
vi.mock('@/services', async () => {
  const real = await vi.importActual<typeof import('../../services/feedback/validationRouting')>('../../services/feedback/validationRouting');
  return {
    caseService: { getCase: async () => null }, supportReferenceService: {},
    VALIDATION_CATEGORY: real.VALIDATION_CATEGORY, templatesForStudy: real.templatesForStudy, buildValidationLinks: real.buildValidationLinks,
    loadValidationLinkOptions: async () => ({
      studies: [{ id: 'VS-1', name: 'Breast model 2026', templateIds: ['T-1'] }, { id: 'VS-2', name: 'Lung model', templateIds: [] }],
      templates: [{ id: 'T-1', name: 'Breast core', version: '3.1' }, { id: 'T-2', name: 'Lung resection', version: '1.0' }],
    }),
  };
});

import { EnhancementRequestModal } from './EnhancementRequestModal';

beforeEach(() => submit.mockReset());
afterEach(cleanup);

const fill = () => {
  fireEvent.change(screen.getByLabelText('enhancementRequestModal.titleLabel'), { target: { value: 'Grade looks wrong' } });
  fireEvent.change(screen.getByLabelText('enhancementRequestModal.descriptionLabel'), { target: { value: 'It differs from the template.' } });
};

describe('Submit QA / Testing Feedback: AI / Template validation', () => {
  it('shows no pickers until the category is chosen, then offers the active studies and templates', async () => {
    render(<EnhancementRequestModal mode="qa" onClose={() => {}} />);
    expect(screen.queryByTestId('erm-validation-links')).toBeNull();
    fireEvent.click(screen.getByText('enhancementRequestModal.categories.aiTemplateValidation'));
    const study = await screen.findByLabelText('enhancementRequestModal.validationLinks.study') as HTMLSelectElement;
    await waitFor(() => expect(study.options.length).toBe(3));
    expect((screen.getByLabelText('enhancementRequestModal.validationLinks.template') as HTMLSelectElement).options.length).toBe(3);
    fireEvent.click(screen.getByText('enhancementRequestModal.categories.uiBug'));
    expect(screen.queryByTestId('erm-validation-links')).toBeNull();
  });

  it('a chosen study narrows the templates to its own, and the links go with the submission', async () => {
    submit.mockResolvedValue({ success: true, routedTo: 'validation' });
    render(<EnhancementRequestModal mode="qa" onClose={() => {}} />);
    fill();
    fireEvent.click(screen.getByText('enhancementRequestModal.categories.aiTemplateValidation'));
    const study = await screen.findByLabelText('enhancementRequestModal.validationLinks.study') as HTMLSelectElement;
    await waitFor(() => expect(study.options.length).toBe(3));
    fireEvent.change(study, { target: { value: 'VS-1' } });
    const template = screen.getByLabelText('enhancementRequestModal.validationLinks.template') as HTMLSelectElement;
    expect(template.options.length).toBe(2);
    fireEvent.change(template, { target: { value: 'T-1' } });
    fireEvent.click(screen.getByText(/enhancementRequestModal\.submitQaFeedback/));
    await waitFor(() => expect(submit).toHaveBeenCalled());
    const payload = submit.mock.calls[0][0];
    expect(payload.category).toBe('AI / Template validation');
    expect(payload.validationLinks).toEqual({ studyId: 'VS-1', studyName: 'Breast model 2026', templateId: 'T-1', templateName: 'Breast core', templateVersion: '3.1' });
    expect(await screen.findByTestId('erm-validation-routed')).toBeTruthy();
  });

  it('the links are optional: none chosen sends none', async () => {
    submit.mockResolvedValue({ success: true, routedTo: 'qa', validationFallback: true });
    render(<EnhancementRequestModal mode="qa" onClose={() => {}} />);
    fill();
    fireEvent.click(screen.getByText('enhancementRequestModal.categories.aiTemplateValidation'));
    await screen.findByLabelText('enhancementRequestModal.validationLinks.study');
    fireEvent.click(screen.getByText(/enhancementRequestModal\.submitQaFeedback/));
    await waitFor(() => expect(submit).toHaveBeenCalled());
    expect(submit.mock.calls[0][0].validationLinks).toBeUndefined();
    expect(await screen.findByTestId('erm-validation-fallback')).toBeTruthy();
  });

  it('a failure with a code shows that code\'s fixed text', async () => {
    submit.mockResolvedValue({ success: false, error: 'No recipients configured.', errorCode: 'NO_RECIPIENTS' });
    render(<EnhancementRequestModal mode="qa" onClose={() => {}} />);
    fill();
    fireEvent.click(screen.getByText(/enhancementRequestModal\.submitQaFeedback/));
    expect(await screen.findByText(/enhancementRequestModal\.errors\.NO_RECIPIENTS/)).toBeTruthy();
  });

  it('the enhancement modal has no validation category', () => {
    render(<EnhancementRequestModal mode="enhancement" onClose={() => {}} />);
    expect(screen.queryByText('enhancementRequestModal.categories.aiTemplateValidation')).toBeNull();
  });

  it('an enhancement request sent to a website says where, or that the demo sent nothing', async () => {
    submit.mockResolvedValue({ success: true, destinationHost: 'site.test' });
    render(<EnhancementRequestModal mode="enhancement" onClose={() => {}} />);
    fill();
    fireEvent.click(screen.getByText(/enhancementRequestModal\.submitRequest/));
    expect((await screen.findByTestId('erm-delivered')).textContent).toContain('site.test');
    cleanup();
    submit.mockResolvedValue({ success: true, simulated: true, destinationHost: 'site.test' });
    render(<EnhancementRequestModal mode="enhancement" onClose={() => {}} />);
    fill();
    fireEvent.click(screen.getByText(/enhancementRequestModal\.submitRequest/));
    expect((await screen.findByTestId('erm-simulated')).textContent).toContain('simulatedDestinationNotice');
  });
});
