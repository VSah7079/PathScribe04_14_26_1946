// Batch 669 (ctl): Control Rules has its own view capability; who holds it and manage by default.
import { describe, it, expect } from 'vitest';
import { CAPABILITY_CATALOG, capabilityDefinition } from './capabilityCatalog';
import { CAPABILITY_SEEDS, SUPERADMIN_CAPABILITY_KEYS } from './capabilitySeeds';

const VIEW = 'config:molecular-control-rules:view';
const MANAGE = 'config:molecular-control-rules:manage';

describe('molecular control rules: view and manage (Batch 669, ctl)', () => {
  it('view is standard risk, manage is high risk and needs view', () => {
    expect(CAPABILITY_CATALOG.find(c => c.key === VIEW)?.risk).toBe('standard');
    const manage = CAPABILITY_CATALOG.find(c => c.key === MANAGE);
    expect(manage?.risk).toBe('high');
    expect(manage?.requires).toEqual([VIEW]);
    expect(capabilityDefinition(VIEW)).toBeDefined();
  });
  it('Admin, Lab Director, QA Reviewer and the Molecular Technologist hold view without the Molecular screen where they never had it', () => {
    for (const role of ['admin', 'lab-director', 'qa-reviewer', 'molecular-technologist']) expect(CAPABILITY_SEEDS[role], role).toContain(VIEW);
    expect(CAPABILITY_SEEDS.admin).not.toContain('screen:molecular:open');
    expect(CAPABILITY_SEEDS['lab-director']).not.toContain('screen:molecular:open');
  });
  it('manage stays with Admin and Lab Director; the bench and QA Reviewer are view-only', () => {
    expect(CAPABILITY_SEEDS.admin).toContain(MANAGE);
    expect(CAPABILITY_SEEDS['lab-director']).toContain(MANAGE);
    for (const role of ['qa-reviewer', 'molecular-technologist', 'histotechnologist', 'pathologist']) expect(CAPABILITY_SEEDS[role], role).not.toContain(MANAGE);
  });
  it('roles without the Molecular screen or a reason to read the rules do not get view', () => {
    for (const role of ['pathologist', 'histotechnologist', 'accessioner']) expect(CAPABILITY_SEEDS[role], role).not.toContain(VIEW);
  });
  it('Superadmin holds both, like any other grant (no bypass)', () => {
    expect(SUPERADMIN_CAPABILITY_KEYS).toEqual(expect.arrayContaining([VIEW, MANAGE]));
  });
});
