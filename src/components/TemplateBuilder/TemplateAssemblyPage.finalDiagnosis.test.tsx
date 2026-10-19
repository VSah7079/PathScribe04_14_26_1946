// @vitest-environment happy-dom
// Batch 609 (#38): the template builder shows the Final Diagnosis problem before anyone tries to publish, and Publish is held back.
import '@/i18n/config';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';

vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async () => ({ allowed: true }), evaluate: async () => ({ allowed: true }), grantedCapabilities: async () => new Set<string>() },
}));

// Batch 612: the page names the signed-in author in the audit entry of Convert to points.
vi.mock('@/contexts/AuthContext', async importOriginal => ({
  ...(await importOriginal<typeof import('@/contexts/AuthContext')>()),
  useAuth: () => ({ user: { id: 'u1', name: 'Test Author' } }),
}));

import { TemplateAssemblyPage } from './TemplateAssemblyPage';
import PartBuilderPage from './PartBuilderPage';
import { reportTemplateService, reportPartService } from '@/services';
import type { TemplateNode } from '@/types/template';
import type { AssemblySlot } from '@/types/reportPart';

const field = (id: string, designated: boolean) => ({ id, type: 'paragraph', label: id, ...(designated ? { isFinalDiagnosisField: true } : {}) }) as unknown as TemplateNode;
const slot = (partId: string, role: 'body' | 'header' | 'footer' = 'body'): AssemblySlot => ({ slotId: `s-${partId}`, partId, partName: partId, partType: role, role, order: 0, enabled: true }) as AssemblySlot;

async function setup(designatedCounts: number[]) {
  const parts = [];
  for (const [i, d] of designatedCounts.entries()) {
    const p = await reportPartService.create({ name: `Part ${i}`, type: 'body', status: 'published', nodes: Array.from({ length: d }, (_, k) => field(`p${i}f${k}`, true)) } as never);
    if (!p.ok) throw new Error('part');
    parts.push(p.data);
  }
  const t = await reportTemplateService.create({ name: 'Page test', specialty: 'x', status: 'draft', assembly: parts.map(p => slot(p.id)), orchestrationEnabled: false } as never);
  if (!t.ok) throw new Error('template');
  return { template: t.data, parts };
}
const renderAssembly = (id: string) => render(
  <MemoryRouter initialEntries={[`/admin/templates/${id}/edit`]}>
    <Routes><Route path="/admin/templates/:templateId/edit" element={<TemplateAssemblyPage />} /></Routes>
  </MemoryRouter>,
);
beforeEach(() => { localStorage.clear(); });
afterEach(cleanup);

describe('Template builder: Final Diagnosis rule', () => {
  it('two marked fields: the builder says so and Publish is disabled', async () => {
    const { template } = await setup([1, 1]);
    renderAssembly(template.id);
    expect(await screen.findByText(/2 fields in this template are marked as the Final Diagnosis/)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Publish' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('one marked field: no warning, and Publish works', async () => {
    const { template } = await setup([1]);
    renderAssembly(template.id);
    const publish = await screen.findByRole('button', { name: 'Publish' });
    await waitFor(() => expect((publish as HTMLButtonElement).disabled).toBe(false));
    expect(screen.queryByText(/marked as the Final Diagnosis/)).toBeNull();
  });

  it('the part builder warns when a saved part leaves a Final template with more than one marked field', async () => {
    const { template, parts } = await setup([1, 1]);
    render(
      <MemoryRouter initialEntries={[`/admin/parts/${parts[0].id}/edit`]}>
        <Routes><Route path="/admin/parts/:partId/edit" element={<PartBuilderPage />} /></Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText(new RegExp(`Final template “Page test” has 2 fields marked as the Final Diagnosis`))).toBeTruthy();
    expect(template.id).toBeTruthy();
  });
});
