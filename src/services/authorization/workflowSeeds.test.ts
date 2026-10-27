// src/services/authorization/workflowSeeds.test.ts
// Batch 649: the case and QA actions that gained a capability are seeded least privilege (workflowCapabilities.ts).
import { describe, expect, it } from 'vitest';
import { CAPABILITY_SEEDS, SUPERADMIN_CAPABILITY_KEYS, customRoleScreenSeed } from './capabilitySeeds';
import { SYSTEM_ROLE_IDS } from '../roles/systemRoles';
import { WORKFLOW_CAPABILITIES } from './workflowCapabilities';

const has = (role: string, key: string) => (CAPABILITY_SEEDS[role] ?? []).includes(key);
const SIGN_OUT = 'surgical:report:sign-out';
const RELEASES = ['surgical:preliminary:release', 'surgical:amendment:release', 'surgical:correction:release', 'surgical:addendum:release'];
const QA = ['qa:deficiency:raise', 'qa:deficiency:escalate', 'qa:deficiency:contain', 'qa:deficiency:verify'];

describe('Batch 649 seeds (least privilege)', () => {
  it('sign-out: the signing roles only (Pathologist, Fellow, Resident); never an administrator or a bench role', () => {
    for (const r of ['pathologist', 'fellow', 'resident']) expect(has(r, SIGN_OUT), r).toBe(true);
    for (const r of [SYSTEM_ROLE_IDS.ADMIN, SYSTEM_ROLE_IDS.LAB_DIRECTOR, SYSTEM_ROLE_IDS.QA_REVIEWER, SYSTEM_ROLE_IDS.ACCESSIONER, SYSTEM_ROLE_IDS.HISTOTECHNOLOGIST, SYSTEM_ROLE_IDS.CYTOTECHNOLOGIST, 'pa']) {
      expect(has(r, SIGN_OUT), r).toBe(false);
    }
  });

  it('preliminary and revision releases: Pathologist and Fellow, not Resident', () => {
    for (const k of RELEASES) {
      expect(has('pathologist', k)).toBe(true);
      expect(has('fellow', k)).toBe(true);
      expect(has('resident', k)).toBe(false);
      expect(has(SYSTEM_ROLE_IDS.ADMIN, k)).toBe(false);
    }
  });

  it('a hospital\'s own case-access role never gets preliminary release by default (residents do not release preliminaries independently)', () => {
    const seed = customRoleScreenSeed({ caseAccess: true, configAccess: true });
    expect(seed).not.toContain('surgical:preliminary:release');
    expect(seed).toContain('surgical:amendment:release');
  });

  it('pool claim/pass and recall: the roles that take pool cases or release reports', () => {
    for (const r of ['pathologist', 'fellow', 'resident', SYSTEM_ROLE_IDS.CYTOTECHNOLOGIST]) {
      for (const k of ['case:pool:claim', 'case:pool:pass', 'report:release:recall']) expect(has(r, k), `${r} ${k}`).toBe(true);
    }
    expect(has(SYSTEM_ROLE_IDS.ACCESSIONER, 'case:pool:claim')).toBe(false);
  });

  it('flags: every case-access role; codes and review requests: the reporting roles (and Cytotechnologist codes)', () => {
    for (const r of ['pathologist', SYSTEM_ROLE_IDS.ACCESSIONER, SYSTEM_ROLE_IDS.HISTOTECHNOLOGIST]) expect(has(r, 'case:flag:apply'), r).toBe(true);
    expect(has(SYSTEM_ROLE_IDS.ADMIN, 'case:flag:apply')).toBe(false);
    expect(has('resident', 'case:diagnosis-code:apply')).toBe(true);
    expect(has(SYSTEM_ROLE_IDS.CYTOTECHNOLOGIST, 'case:diagnosis-code:apply')).toBe(true);
    expect(has(SYSTEM_ROLE_IDS.HISTOTECHNOLOGIST, 'case:diagnosis-code:apply')).toBe(false);
    expect(has('pathologist', 'case:informal-review:request')).toBe(true);
    expect(has(SYSTEM_ROLE_IDS.ACCESSIONER, 'case:informal-review:request')).toBe(false);
  });

  it('creating a case: the roles with the Accession screen; QA deficiency actions: the roles with Quality Assurance', () => {
    expect(has(SYSTEM_ROLE_IDS.ACCESSIONER, 'case:accession:create')).toBe(true);
    expect(has('pa', 'case:accession:create')).toBe(true);
    expect(has('pathologist', 'case:accession:create')).toBe(false);
    for (const r of [SYSTEM_ROLE_IDS.ADMIN, SYSTEM_ROLE_IDS.LAB_DIRECTOR, SYSTEM_ROLE_IDS.QA_REVIEWER]) for (const k of QA) expect(has(r, k), `${r} ${k}`).toBe(true);
    for (const k of QA) expect(has('pathologist', k)).toBe(false);
  });

  it("a hospital's own case-access role keeps today's actions; Superadmin holds them as a role (no bypass)", () => {
    const custom = customRoleScreenSeed({ caseAccess: true });
    for (const k of [SIGN_OUT, 'case:pool:claim', 'case:flag:apply', 'case:diagnosis-code:apply', 'case:accession:create']) expect(custom).toContain(k);
    for (const c of WORKFLOW_CAPABILITIES) expect(SUPERADMIN_CAPABILITY_KEYS).toContain(c.key);
  });
});
