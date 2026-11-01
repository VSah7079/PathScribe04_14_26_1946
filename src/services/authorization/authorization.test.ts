import { describe, it, expect } from 'vitest';
import {
  ALL_CAPABILITY_KEYS, CAPABILITY_CATALOG, CAPABILITY_GROUPS, capabilitiesByGroup, catalogProblems,
  type CapabilityDefinition,
} from './capabilityCatalog';
import { dependentsOf, planGrant, planRevoke, requirementsOf, unknownCapabilities, unmetRequirements } from './capabilityDependencies';
import { capabilityAuditEntry, evaluateCapability, grantedCapabilities, heldRoles, type AuthzRole, type AuthzSubject } from './evaluateCapability';
import { applyCapabilitySeeds, CAPABILITY_SEEDS, SUPERADMIN_CAPABILITY_KEYS, CONFIG_SECTIONS, CONFIG_SECTIONS_LAB_DIRECTOR, CONFIG_TEMPLATE_APPROVER, CONFIG_TEMPLATE_AUTHOR, customRoleScreenSeed, type SeedableRole } from './capabilitySeeds';
import { roleCapabilityProblem } from './roleCapabilityRules';
import { createAuthorizationService } from './authorizationService';

// A small catalog with a chain: c needs b, b needs a; d is on its own.
const T: CapabilityDefinition[] = [
  { key: 'x:a:export', labelId: 'a', group: 'qaOperations', risk: 'high', requires: [] },
  { key: 'x:b:export', labelId: 'b', group: 'qaOperations', risk: 'high', requires: ['x:a:export'] },
  { key: 'x:c:export', labelId: 'c', group: 'qaCapa', risk: 'high', requires: ['x:b:export'] },
  { key: 'x:d:view', labelId: 'd', group: 'qaCapa', risk: 'standard', requires: [] },
];

// Batch 410: signing out a cytology specimen and the Cytology Workspace's other actions.
const CYTOLOGY_WORKSPACE = [
  'cytology:report:sign-out', 'cytology:review:record', 'cytology:final-diagnosis:select', 'cytology:qc-flag:remove',
  'cytology:retrospective-review:record', 'cytology:histology-correlation:record', 'cytology:revision:request',
];

describe('capability catalog', () => {
  it('is sound: domain:object:verb keys, unique, known groups, known requirements, no cycles', () => {
    expect(catalogProblems(CAPABILITY_CATALOG)).toEqual([]);
  });
  it('has one capability per QA report export, plus the change-history export', () => {
    const qa = ALL_CAPABILITY_KEYS.filter(k => k.startsWith('qa:') && k.endsWith(':export'));
    expect(qa).toHaveLength(17); // Batch 454: + qa:follow-up:export. Batch 610: + qa:ai-discordance:export
    expect(ALL_CAPABILITY_KEYS).toContain('report:change-history:export');
  });
  it('the evidence binder requires the dashboard it lists the records of', () => {
    expect(requirementsOf('qa:inspection-evidence:export')).toEqual(['qa:activity-dashboard:export']);
  });
  it('groups for display in the set order, leaving empty groups out', () => {
    const groups = capabilitiesByGroup().map(g => g.group);
    expect(groups).toEqual(CAPABILITY_GROUPS.filter(g => groups.includes(g)));
    expect(capabilitiesByGroup().flatMap(g => g.capabilities)).toHaveLength(CAPABILITY_CATALOG.length);
  });
  it('reports a bad key, a duplicate, an unknown requirement and a cycle', () => {
    const problems = catalogProblems([
      { key: 'Bad Key', labelId: 'p', group: 'qaCapa', risk: 'high', requires: [] },
      { key: 'x:a:export', labelId: 'q', group: 'qaCapa', risk: 'high', requires: ['x:b:export'] },
      { key: 'x:b:export', labelId: 'r', group: 'qaCapa', risk: 'high', requires: ['x:a:export', 'x:zz:export'] },
    ]).concat(catalogProblems([
      { key: 'x:e:export', labelId: 's', group: 'qaCapa', risk: 'high', requires: [] },
      { key: 'x:e:export', labelId: 't', group: 'qaCapa', risk: 'high', requires: [] },
    ]));
    expect(problems.some(p => p.includes('Bad Key'))).toBe(true);
    expect(problems.some(p => p.includes('duplicate key'))).toBe(true);
    expect(problems.some(p => p.includes('requires unknown x:zz:export'))).toBe(true);
    expect(problems.some(p => p.includes('cycle'))).toBe(true);
  });
});

describe('capability dependencies', () => {
  it('follows requirements and dependents through the chain', () => {
    expect(requirementsOf('x:c:export', T)).toEqual(['x:a:export', 'x:b:export']);
    expect(dependentsOf('x:a:export', T)).toEqual(['x:b:export', 'x:c:export']);
    expect(dependentsOf('x:d:view', T)).toEqual([]);
  });
  it('turning on c offers the missing requirements, not the ones already granted', () => {
    expect(planGrant([], ['x:c:export'], T)).toEqual({
      requested: ['x:c:export'], missingRequirements: ['x:a:export', 'x:b:export'], withRequirements: ['x:a:export', 'x:b:export', 'x:c:export'],
    });
    expect(planGrant(['x:a:export'], ['x:c:export'], T).missingRequirements).toEqual(['x:b:export']);
    expect(planGrant([], ['x:d:view'], T).missingRequirements).toEqual([]);
  });
  it('turning on a group that contains the requirement needs nothing more', () => {
    expect(planGrant([], ['x:a:export', 'x:b:export'], T).missingRequirements).toEqual([]);
  });
  it('turning off a warns about granted dependents only', () => {
    expect(planRevoke(['x:a:export', 'x:b:export', 'x:d:view'], ['x:a:export'], T)).toEqual({
      requested: ['x:a:export'], affectedDependents: ['x:b:export'], withDependents: ['x:d:view'],
    });
    expect(planRevoke(['x:a:export', 'x:b:export', 'x:c:export'], ['x:b:export', 'x:c:export'], T).affectedDependents).toEqual([]);
  });
  it('finds broken pairs and unknown keys', () => {
    expect(unmetRequirements(['x:c:export', 'x:a:export'], T)).toEqual([{ capability: 'x:c:export', missing: ['x:b:export'] }]);
    expect(unmetRequirements(['x:a:export', 'x:b:export'], T)).toEqual([]);
    expect(unknownCapabilities(['x:a:export', 'nope'], T)).toEqual(['nope']);
  });
  it('the role service refuses a role holding a capability without its requirement, or an unknown key', () => {
    expect(roleCapabilityProblem(['qa:inspection-evidence:export'])).toContain('requires qa:activity-dashboard:export');
    expect(roleCapabilityProblem(['qa:inspection-evidence:export', 'qa:activity-dashboard:export'])).toBeNull();
    expect(roleCapabilityProblem(['qa:everything:export'])).toContain('Unknown capability');
  });
});

describe('evaluateCapability', () => {
  const roles: AuthzRole[] = [
    { id: 'pathologist', name: 'Pathologist', capabilities: [] },
    { id: 'qa-reviewer', name: 'QA Reviewer', capabilities: ['x:a:export', 'x:b:export'] },
    { id: 'half', name: 'Half', capabilities: ['x:c:export'] },
    { id: 'superadmin', name: 'Superadmin', capabilities: ['x:a:export', 'x:b:export', 'x:c:export', 'x:d:view'], assignable: false },
  ];
  const who = (staffRoles: string[], sessionRole = 'pathologist'): AuthzSubject => ({ userId: 'U1', userName: 'Dr A', sessionRole, staffRoles });

  it('allows what a held role grants, naming the role', () => {
    const d = evaluateCapability(who(['Pathologist', 'QA Reviewer']), 'x:b:export', roles, { caseId: 'S1' }, T);
    expect(d).toMatchObject({ allowed: true, grantedBy: [{ id: 'qa-reviewer', name: 'QA Reviewer' }], context: { caseId: 'S1' } });
  });
  it('matches staff role names without regard to case or spaces, or by id', () => {
    expect(evaluateCapability(who([' qa reviewer ']), 'x:a:export', roles, {}, T).allowed).toBe(true);
    expect(evaluateCapability(who(['qa-reviewer']), 'x:a:export', roles, {}, T).allowed).toBe(true);
  });
  it('refuses what no held role grants: Pathologist gets nothing by default', () => {
    expect(evaluateCapability(who(['Pathologist']), 'x:a:export', roles, {}, T)).toMatchObject({ allowed: false, reason: 'notGranted', grantedBy: [] });
  });
  it('refuses a granted capability whose requirement no held role grants', () => {
    const d = evaluateCapability(who(['Half']), 'x:c:export', roles, {}, T);
    expect(d).toMatchObject({ allowed: false, reason: 'requirementNotGranted', missingRequirements: ['x:a:export', 'x:b:export'] });
    // …but requirements may come from another held role.
    expect(evaluateCapability(who(['Half', 'QA Reviewer']), 'x:c:export', roles, {}, T).allowed).toBe(true);
  });
  it('refuses unknown capabilities and no user', () => {
    expect(evaluateCapability(who(['QA Reviewer']), 'x:zz:export', roles, {}, T).reason).toBe('unknownCapability');
    expect(evaluateCapability(null, 'x:a:export', roles, {}, T).reason).toBe('noUser');
  });
  it('superadmin has no bypass: only what the Superadmin role grants', () => {
    const sa = who([], 'superadmin');
    expect(evaluateCapability(sa, 'x:d:view', roles, {}, T)).toMatchObject({ allowed: true, grantedBy: [{ id: 'superadmin', name: 'Superadmin' }] });
    const trimmed = roles.map(r => r.id === 'superadmin' ? { ...r, capabilities: ['x:a:export'] } : r);
    expect(evaluateCapability(sa, 'x:d:view', trimmed, {}, T)).toMatchObject({ allowed: false, reason: 'notGranted' });
    // No Superadmin role in the catalog at all: nothing.
    expect(evaluateCapability(sa, 'x:a:export', roles.filter(r => r.id !== 'superadmin'), {}, T).allowed).toBe(false);
  });
  it('a staff record naming the Superadmin role gets nothing from it', () => {
    expect(heldRoles(who(['Superadmin']), roles)).toEqual([]);
    expect(evaluateCapability(who(['Superadmin']), 'x:d:view', roles, {}, T).allowed).toBe(false);
  });
  it('lists everything a user holds', () => {
    expect([...grantedCapabilities(who(['QA Reviewer']), roles, T)]).toEqual(['x:a:export', 'x:b:export']);
    expect(grantedCapabilities(null, roles, T).size).toBe(0);
  });
  it('the audit entry names the capability and the role that allowed it, or why it was refused', () => {
    const s = who(['QA Reviewer']);
    const allowed = capabilityAuditEntry(s, evaluateCapability(s, 'x:a:export', roles, { caseId: 'S1', facilityId: 'F1' }, T));
    expect(allowed).toMatchObject({ event: 'Capability allowed', user: 'Dr A', caseId: 'S1', facilityId: 'F1' });
    expect(allowed.detail).toBe('x:a:export allowed by role "QA Reviewer" (qa-reviewer). Session role: pathologist. Facility: F1.');
    const refused = capabilityAuditEntry(s, evaluateCapability(s, 'x:d:view', roles, {}, T));
    expect(refused).toMatchObject({ event: 'Capability refused', caseId: null });
    expect(refused.detail).toContain('refused: no role held grants it');
  });
});

describe('capability seeds', () => {
  const seeds = { admin: ['x:a:export', 'x:b:export'] };
  it('gives built-in roles their seeds once; a custom role with no access flags is offered only messaging (Batch 385)', () => {
    const { roles, changed } = applyCapabilitySeeds([
      { id: 'admin', builtIn: true },
      { id: 'mine', builtIn: false },
      { id: 'pathologist', builtIn: true },
    ], seeds);
    expect(changed).toBe(true);
    expect(roles[0]).toEqual({ id: 'admin', builtIn: true, capabilities: ['x:a:export', 'x:b:export'], seededCapabilities: ['x:a:export', 'x:b:export'] });
    expect(roles[1]).toEqual({ id: 'mine', builtIn: false, capabilities: ['message:internal:send', 'message:secure-email:send'], seededCapabilities: ['message:internal:send', 'message:secure-email:send'] });
    expect(roles[2]).toEqual({ id: 'pathologist', builtIn: true });
    expect(applyCapabilitySeeds(roles, seeds).changed).toBe(false);
  });
  it('a hospital\'s own role is offered the screens its access implies, once (Batch 374)', () => {
    const custom: SeedableRole[] = [
      { id: 'histo', builtIn: false, caseAccess: true, configAccess: false },
      { id: 'it', builtIn: false, caseAccess: false, configAccess: true },
    ];
    const { roles } = applyCapabilitySeeds(custom);
    expect(roles[0].capabilities).toContain('screen:microtomy:open');
    expect(roles[0].capabilities).not.toContain('screen:configuration:open');
    // Batch 515 (PS-290): a role with case access keeps issuing consult links.
    expect(roles[0].capabilities).toEqual(expect.arrayContaining(['case:consult-link:issue', 'case:consult-link:revoke']));
    // Batch 432: and resolving Audit Log errors (configuration access had the Audit Log).
    // Batch 437: and the Audit Log's exports (it opens the Audit Log).
    // Batch 515: and the Print Queue actions (they sit on the Audit Log).
    expect(roles[1].capabilities).toEqual(['billing:applied-code:correct', 'billing:applied-code:review', 'audit:error:resolve', 'print:job:hold', 'print:job:cancel', 'print:job:redirect', 'print:job:retry', 'audit:audit-log:export', 'audit:error-log:export', 'audit:interface-log:export', 'audit:qa-log:export', 'audit:billing-log:export', 'qa:capa-recommendation:decide', 'qa:follow-up:record', 'qa:follow-up-clinician:email', 'qa:deficiency:raise', 'qa:deficiency:escalate', 'qa:deficiency:contain', 'qa:deficiency:verify', 'qa:management-review:submit', 'message:internal:send', 'message:secure-email:send', 'screen:configuration:open', 'screen:audit-log:open', 'screen:quality-assurance:open', 'screen:registry-exceptions:open', 'screen:autopsy-dashboards:open']);
    // Batch 437: a role with case access gets Search, so the case search export too.
    expect(roles[0].capabilities).toEqual(expect.arrayContaining(['search:case-results:export', 'contribution:trainee-case-reference:export']));
    const trimmed = [{ ...roles[1], capabilities: [] }];
    expect(applyCapabilitySeeds(trimmed).changed).toBe(false);
  });
  it('built-in roles open the screens Pete chose (Batch 374)', () => {
    const open = (role: string) => CAPABILITY_SEEDS[role].filter(k => k.startsWith('screen:')).map(k => k.split(':')[1]).sort();
    // Batch 489: and the Tumor Board workspace, for the roles that nominate cases to a board.
    // Batch 491: and the margin-exception review queue, same roles.
    // Batch 720 (Pete): and the Grossing Workspace tile, for the people who gross.
    expect(open('pathologist')).toEqual(['add-on-orders', 'cytology-qc-queue', 'cytology-workspace', 'grossing', 'intraop-queue', 'margin-exception-review', 'my-contributions', 'search', 'surgical-qa-worklist', 'tumor-board', 'worklist']);
    expect(open('fellow')).toEqual(open('pathologist'));
    expect(open('resident')).toEqual(['add-on-orders', 'cytology-workspace', 'grossing', 'intraop-queue', 'margin-exception-review', 'my-contributions', 'search', 'tumor-board', 'worklist']);
    expect(open('pa')).toEqual(['accession', 'add-on-orders', 'embedding', 'grossing', 'intraop-queue', 'margin-exception-review', 'my-contributions', 'search', 'tumor-board', 'worklist']);
    // Batch 488: each bench role also opens its own dedicated bench-contribution page.
    // Batch 645: and Lockbox Drop-Off, for the morning team that picks up the overnight specimens.
    expect(open('accessioner')).toEqual(['accession', 'bench-contributions', 'lockbox-drop-off', 'search', 'worklist']);
    expect(open('histotechnologist')).toEqual(['batch-management', 'bench-contributions', 'cytology-prep', 'embedding', 'microtomy', 'search', 'slide-distribution']); // Batch 740: cytology-prep
    expect(open('cytotechnologist')).toEqual(['batch-management', 'bench-contributions', 'cytology-prep', 'cytology-workspace', 'search']);
    expect(open('molecular-technologist')).toEqual(['batch-management', 'bench-contributions', 'molecular', 'search']);
    // Batch 434: and Batch Management (the screen only).
    expect(open('admin')).toEqual(['audit-log', 'autopsy-dashboards', 'batch-management', 'configuration', 'lockbox-drop-off', 'outbound-queue', 'quality-assurance', 'registry-exceptions']);
    expect(open('template-author')).toEqual(['configuration']);
    expect(open('template-approver')).toEqual(['configuration']);
    expect(open('lab-director')).toEqual(['audit-log', 'autopsy-dashboards', 'configuration', 'my-contributions', 'quality-assurance', 'registry-exceptions', 'search']);
    expect(open('qa-reviewer')).toEqual(['audit-log', 'autopsy-dashboards', 'quality-assurance', 'registry-exceptions']);
    expect(CAPABILITY_SEEDS.physician).toBeUndefined();
    expect(CAPABILITY_SEEDS['or-staff']).toBeUndefined();
  });
  it('an administrator\'s removal sticks; a new seed still arrives', () => {
    const removed = [{ id: 'admin', builtIn: true, capabilities: [], seededCapabilities: ['x:a:export', 'x:b:export'] }];
    expect(applyCapabilitySeeds(removed, seeds).changed).toBe(false);
    const grown = applyCapabilitySeeds(removed, { admin: ['x:a:export', 'x:b:export', 'x:d:view'] }).roles[0];
    expect(grown.capabilities).toEqual(['x:d:view']);
  });
  it('day-one grants: Superadmin everything; Admin every export, administration, support access and its screens; QA Reviewer the exports and its screens', () => {
    // Batch 536 (Pete, Oct 11): everything except approving the AI instructions.
    expect(CAPABILITY_SEEDS.superadmin).toEqual(ALL_CAPABILITY_KEYS.filter(k => k !== 'config:ai-prompt:approve'));
    expect(CAPABILITY_SEEDS.superadmin).toEqual(SUPERADMIN_CAPABILITY_KEYS);
    // The change-history and QA exports (Batch 407: the disposal report export belongs to the Batch Management roles).
    const exports = ALL_CAPABILITY_KEYS.filter(k => k === 'report:change-history:export' || (k.startsWith('qa:') && k.endsWith(':export')));
    // Batch 432: and resolving Audit Log errors (everyone who opens the Audit Log).
    expect(CAPABILITY_SEEDS['qa-reviewer']).toEqual([...exports, 'config:clinical-mismatch-rules:view', 'config:ai-prompt:view', 'config:molecular-control-rules:view', 'screen:audit-log:open', 'screen:quality-assurance:open', 'screen:registry-exceptions:open', 'screen:autopsy-dashboards:open', 'billing:applied-code:correct', 'billing:applied-code:review', 'message:internal:send', 'message:secure-email:send', 'audit:error:resolve', 'print:job:hold', 'print:job:cancel', 'print:job:redirect', 'print:job:retry', 'audit:consult-links:view', 'audit:audit-log:export', 'audit:error-log:export', 'audit:interface-log:export', 'audit:qa-log:export', 'audit:billing-log:export', 'qa:capa-recommendation:decide', 'qa:follow-up:record', 'qa:follow-up-clinician:email', 'qa:deficiency:raise', 'qa:deficiency:escalate', 'qa:deficiency:contain', 'qa:deficiency:verify', 'qa:management-review:submit', 'material:block:delete-signed-out', 'material:block:flag-amended']);
    // Batch 458 (PS-71): Save mine anyway on the Edit Conflict dialog.
    // Batch 603: break-glass rebind of a downtime patient identity.
    expect(CAPABILITY_SEEDS.admin).toEqual(['patient:break-glass:rebind', ...exports, 'case:edit-conflict:override', 'case:inking-gate:override', 'config:roles:manage', 'config:staff:edit', 'config:staff-access:assign', 'config:staff-password:manage', 'config:demo-data:reset', 'config:field-requirements:manage', 'auth:mfa-enrolment:reset', 'config:intraop-critical-results:manage', 'config:or-board-demo:run', 'config:molecular-control-rules:view', 'config:molecular-control-rules:manage', 'config:screening-registry:manage', 'config:cancer-registry:manage', 'config:cytology-compliance:manage', 'registry:batch-file:generate', 'registry:submission:resend', 'registry:live-register:approve', 'config:registry-go-live:manage', 'registry:test-suite:run', 'registry:revision:review', 'config:template-governance:manage',
      'config:support-access:policy', 'config:support-access:approve', 'config:support-audit:view',
      // Batch 428: every Configuration section.
      ...CONFIG_SECTIONS,
      'screen:configuration:open', 'screen:batch-management:open', 'screen:outbound-queue:open', 'screen:lockbox-drop-off:open', 'screen:audit-log:open', 'screen:quality-assurance:open', 'screen:registry-exceptions:open', 'screen:autopsy-dashboards:open', 'billing:applied-code:correct', 'billing:applied-code:review', 'message:internal:send', 'message:secure-email:send', 'audit:error:resolve', 'print:job:hold', 'print:job:cancel', 'print:job:redirect', 'print:job:retry',
      // Batch 518: resending interface messages (PS-122) and batch label reprint (PS-123).
      'interface:outbound:resend',
      // Batch 619 (PS-800): hold, release, retract, override-release and mark-not-reportable on the Outbound Queue.
      'interface:outbound:hold', 'interface:outbound:release', 'interface:outbound:mark-not-reportable', 'interface:outbound:retract', 'interface:outbound:override-release', 'lockbox:folder:review',
      // Batch 554: interface monitoring.
      'interface:engine-status:view',
      // Batch 551: the Server jobs view (see and requeue the API server's background jobs).
      'jobs:server-job:view', 'jobs:server-job:requeue',
      'label:batch:reprint',
      // Batch 522 (PS-290): the cross-case consult link list.
      'audit:consult-links:view',
      // Batch 437: the exports on the screens it opens. Batch 438: deciding CAPA recommendations. Batch 454: follow-up outcomes and clinician emails.
      'audit:audit-log:export', 'audit:error-log:export', 'audit:interface-log:export', 'audit:qa-log:export', 'audit:billing-log:export', 'qa:capa-recommendation:decide', 'qa:follow-up:record', 'qa:follow-up-clinician:email', 'qa:deficiency:raise', 'qa:deficiency:escalate', 'qa:deficiency:contain', 'qa:deficiency:verify', 'qa:management-review:submit', 'material:block:delete-signed-out', 'patient:other-cases:decide-access', 'print:release-hold:override']);
    // Batch 437 (PS-357): the exports go with the screen they sit on.
    expect(CAPABILITY_SEEDS.pathologist).toEqual(expect.arrayContaining(['search:case-results:export', 'contribution:trainee-case-reference:export', 'contribution:case-mix-summary:export']));
    expect(CAPABILITY_SEEDS.pathologist).not.toContain('audit:audit-log:export');
    expect(CAPABILITY_SEEDS['lab-director']).toEqual(expect.arrayContaining(['audit:audit-log:export', 'search:case-results:export']));
    // Batch 434: Admin opens Batch Management but doesn't start with the scan-batch actions.
    expect(CAPABILITY_SEEDS.admin).not.toContain('wsi:scan-batch:load');
    // Batch 432 (Pete): the Cytology QC supervisor bypass starts with nobody; an administrator assigns it.
    for (const [role, set] of Object.entries(CAPABILITY_SEEDS)) if (role !== 'superadmin') expect(set, role).not.toContain('cytology:qc-review:bypass');
    // Batch 478 (Pete's own locked-in decision): the autopsy gross-exam gate
    // override starts with nobody, same as the Cytology QC bypass above.
    for (const [role, set] of Object.entries(CAPABILITY_SEEDS)) if (role !== 'superadmin') expect(set, role).not.toContain('autopsy:gross-exam-gate:override');
    expect(customRoleScreenSeed({ caseAccess: true, configAccess: true })).not.toContain('autopsy:gross-exam-gate:override');
    // Batch 529 (PS-554, Pete): changing the mismatch rules starts with nobody; reading them, Pathologist, QA Reviewer and Lab Director.
    for (const [role, set] of Object.entries(CAPABILITY_SEEDS)) if (role !== 'superadmin') expect(set, role).not.toContain('config:clinical-mismatch-rules:manage');
    expect(Object.entries(CAPABILITY_SEEDS).filter(([role, set]) => role !== 'superadmin' && set.includes('config:clinical-mismatch-rules:view')).map(([role]) => role).sort())
      .toEqual(['lab-director', 'pathologist', 'qa-reviewer']);
    expect(customRoleScreenSeed({ caseAccess: true, configAccess: true })).not.toContain('config:clinical-mismatch-rules:manage');
    // Batch 533 (Pete: who may send a cytology preliminary is "Configurable"): no built-in or hospital role starts with it.
    for (const [role, set] of Object.entries(CAPABILITY_SEEDS)) if (role !== 'superadmin') expect(set, role).not.toContain('cytology:preliminary:release');
    expect(customRoleScreenSeed({ caseAccess: true, configAccess: true })).not.toContain('cytology:preliminary:release');
    // Batch 480: the site-level inking_validation_mode toggle is a
    // group: 'configSystem' capability, so — same as its siblings
    // config:report-appearance:manage/config:organ-map-scheme:manage — it is
    // swept into CONFIG_SECTIONS and granted to Admin (and, via
    // CONFIG_SECTIONS_LAB_DIRECTOR, Lab Director) by default, not "nobody".
    expect(CAPABILITY_SEEDS.admin).toContain('config:inking-validation-mode:manage');
    expect(CAPABILITY_SEEDS['lab-director']).toContain('config:inking-validation-mode:manage');
    for (const [role, set] of Object.entries(CAPABILITY_SEEDS)) {
      if (role === 'superadmin' || role === 'admin' || role === 'lab-director') continue;
      expect(set, role).not.toContain('config:inking-validation-mode:manage');
    }
    // customRoleScreenSeed only grants screen:*:open / QUALITY_COMPLIANCE for
    // configAccess, never the underlying CONFIG_SECTIONS capabilities.
    expect(customRoleScreenSeed({ caseAccess: true, configAccess: true })).not.toContain('config:inking-validation-mode:manage');
    // Batch 433 (Pete): approving charges is assigned to whoever does billing audits; nobody has it by default.
    for (const [role, set] of Object.entries(CAPABILITY_SEEDS)) if (role !== 'superadmin') expect(set, role).not.toContain('billing:charge:approve');
    expect(customRoleScreenSeed({ caseAccess: true, configAccess: true })).not.toContain('billing:charge:approve');
    // Batch 434: a hospital role with case access (it had Batch Management) gets the WSI scan batch actions.
    expect(customRoleScreenSeed({ caseAccess: true })).toEqual(expect.arrayContaining(['wsi:scan-batch:load', 'wsi:scan-batch:send', 'wsi:scan-batch:unload']));
    expect(customRoleScreenSeed({ configAccess: true })).not.toContain('wsi:scan-batch:load');
    // Batch 438: and deciding CAPA recommendations. Batch 454: + the follow-up export, outcomes and clinician email.
    expect(CAPABILITY_SEEDS.admin.filter(k => k.startsWith('qa:'))).toHaveLength(25); // Batch 610: + qa:ai-discordance:export. Batch 649: + the four qa:deficiency:* actions
    // Batch 454: marking "follow-up expected" is for the roles that sign out surgical cases.
    for (const role of ['pathologist', 'fellow']) expect(CAPABILITY_SEEDS[role], role).toContain('case:follow-up:expect');
    for (const role of ['resident', 'pa', 'admin', 'qa-reviewer']) expect(CAPABILITY_SEEDS[role], role).not.toContain('case:follow-up:expect');
    // Batch 374: every built-in role with app access now has a seed (its screens).
    expect(Object.keys(CAPABILITY_SEEDS).sort()).toEqual(['accessioner', 'admin', 'cytotechnologist', 'fellow', 'histotechnologist', 'lab-director', 'molecular-technologist', 'pa', 'pathologist', 'qa-reviewer', 'resident', 'superadmin', 'template-approver', 'template-author']);
    // Batch 378: those who gross can also complete grossing. Batch 381: every
    // role with case access can place/release holds and delegate (Pete: keep
    // today's users).
    const caseReport = ['case:hold:place', 'case:hold:release', 'case:retention-hold:place', 'case:retention-hold:release', 'case:delegation:create', 'case:team:manage'];
    const caseAccess = ['pathologist', 'fellow', 'resident', 'pa', 'accessioner', 'histotechnologist', 'cytotechnologist', 'molecular-technologist'];
    for (const [role, set] of Object.entries(CAPABILITY_SEEDS)) if (role !== 'superadmin' && role !== 'admin' && role !== 'qa-reviewer') expect(set.filter(k => !k.startsWith('screen:')), role).toEqual([
      ...(['pathologist', 'fellow', 'resident', 'pa'].includes(role) ? ['case:grossing:complete'] : []),
      // Batch 478: and per-organ tagging during the gross exam, same roles.
      ...(['pathologist', 'fellow', 'resident', 'pa'].includes(role) ? ['autopsy:organ-tag:record'] : []),
      // Batch 480: and recording a margin's ink application during grossing, same roles.
      ...(['pathologist', 'fellow', 'resident', 'pa'].includes(role) ? ['grossing:margin-ink:record'] : []),
      // Batch 489: and flagging a case for Tumor Board/MDT, same roles (a
      // clinical judgment call, not a broader case-access action).
      ...(['pathologist', 'fellow', 'resident', 'pa'].includes(role) ? ['case:tumor-board:flag'] : []),
      // Batch 490: and resolving/dismissing a margin-distance extraction
      // exception, same roles and reasoning.
      ...(['pathologist', 'fellow', 'resident', 'pa'].includes(role) ? ['case:margin-exception:resolve'] : []),
      // Batch 491: overriding an auto-generated Tumor Board flag, same roles and reasoning.
      ...(['pathologist', 'fellow', 'resident', 'pa'].includes(role) ? ['case:tumor-board:dismiss'] : []),
      // Batch 491: Tumor Board queue management (status — Presented/Deferred/cancel) — broader, same roles as case:delegation:create etc.
      // Batch 493: and the narrower scheduling permission (board/meeting date/time/presenter), split out so a clerical/scheduling-only role could hold just this one.
      ...(caseAccess.includes(role) ? ['case:tumor-board:manage', 'case:tumor-board:schedule'] : []),
      ...(caseAccess.includes(role) ? caseReport : []),
      // Batch 382: correcting an applied billing code is its own permission, for the roles that could before.
      ...(caseAccess.includes(role) || role === 'lab-director' ? ['billing:applied-code:correct', 'billing:applied-code:review'] : []),
      // Batch 609: and linking images to a report (report:case-images:attach), same roles.
      // Batch 613: choosing related cases to send with a report (the signer's decision) and the Patient summary print (above).
      // Batch 383: releasing an autopsy body, for the roles with case access.
      // Batch 468: and recording a forensic chain-of-custody transfer.
      // Batch 469: and consent narrowing/revocation, organ-retention disposal, toxicology.
      // Batch 471: and cancelling a toxicology order, retention detail, consent reinstatement.
      ...(caseAccess.includes(role) ? ['autopsy:body:release', 'report:case-report:print', 'report:case-images:attach', 'case:attachment:upload', 'case:attachment:link', 'case:attachment:unlink', 'patient:summary:print', ...(['pathologist', 'fellow'].includes(role) ? ['report:related-cases:attach'] : []), 'autopsy:custody:transfer', 'autopsy:consent:manage', 'autopsy:retention-disposal:record', 'autopsy:toxicology:order', 'autopsy:toxicology:result', 'autopsy:toxicology:cancel', 'autopsy:retention-detail:record', 'autopsy:retention-tier:record', 'autopsy:consent:reinstate', 'patient:national-identifier:record', 'patient:registry-consent:record', 'patient:other-cases:request-access'] : []),
      ...(role === 'pa' ? ['add-on:exception:flag', 'add-on:block:mark-retrieved'] : []), // Batch 720: the PA reaches Add-On Orders
      ...(role === 'pa' ? ['batch:manifest:seal', 'batch:carrier:advance', 'station:scan-mismatch:continue', 'station:scan-history:view'] : []), // Batch 726: carriers at the workstations (the PA has Embedding)
      // Batch 621: the AI extraction of historical reports and flagging it as wrong, Pathologist, Fellow and Resident.
      ...(['pathologist', 'fellow', 'resident'].includes(role) ? ['ai:history-extraction:run', 'ai:history-extraction:flag'] : []),
      // Batch 421: resending a registry submission, Lab Director (Admin has it through the administration group).
      ...(role === 'lab-director' ? ['registry:submission:resend', 'qa:pathologist-trend:view', 'qa:pathologist-trend:decide', 'registry:live-register:approve', 'registry:revision:review'] : []),
      // Batch 428 (Pete): Lab Director keeps every Configuration section it could change; the template roles keep only theirs.
      ...(role === 'lab-director' ? CONFIG_SECTIONS_LAB_DIRECTOR : []),
      ...(role === 'template-author' ? CONFIG_TEMPLATE_AUTHOR : []),
      ...(role === 'template-approver' ? CONFIG_TEMPLATE_APPROVER : []),
      ...(['histotechnologist', 'cytotechnologist', 'molecular-technologist'].includes(role) ? ['equipment:maintenance:record'] : []),
      // Batch 409: signing out a cytology specimen, for the roles that did (Batch 410: and the workspace's other actions).
      ...(['pathologist', 'fellow', 'resident', 'cytotechnologist'].includes(role) ? CYTOLOGY_WORKSPACE : []),
      // Batch 572: signing off your own screening hours, the same built-in roles (not a hospital's own roles).
      ...(['pathologist', 'fellow', 'resident', 'cytotechnologist'].includes(role) ? ['cytology:screening-hours:sign-off'] : []),
      // Batch 415: a cytotechnologist's own sign-out.
      ...(role === 'cytotechnologist' ? ['cytology:ct-report:sign-out'] : []),
      // Batch 390 (PS-340): correcting or adding to a signed-out cytology report, Pathologist only.
      ...(role === 'pathologist' ? ['cytology:report:correct', 'cytology:report:addend'] : []),
      // Batch 411: finalizing a cytology case early, Pathologist only.
      ...(role === 'pathologist' ? ['cytology:case:finalize'] : []),
      // Batch 630: entering an hrHPV result by hand, Pathologist and Lab Director.
      ...(role === 'pathologist' || role === 'lab-director' ? ['cytology:hpv-result:record-manual'] : []),
      ...(role === 'pathologist' || role === 'lab-director' ? ['cytology:csms-eligibility:verify'] : []),
      // Batch 396: recording peer-review verdicts, for the roles that had the review queues.
      ...(['pathologist', 'fellow'].includes(role) ? ['cytology:qc-review:record', 'surgical:qa-review:record'] : []),
      // Batch 439 (PS-144, PS-145, PS-148): asking for a peer review, deciding a mismatch and assessing an
      // outside consult for the reporting roles; the independent read and the urgent-care override, Pathologist only.
      ...(['pathologist', 'fellow'].includes(role) ? ['case:peer-review:request', 'case:clinical-mismatch:record', 'case:outside-consult:assess'] : []),
      ...(role === 'pathologist' ? ['case:peer-review:record', 'case:peer-review:override'] : []),
      // Batch 440: taking a positive GYN case for review.
      ...(['pathologist', 'fellow'].includes(role) ? ['cytology:pathologist-review:take'] : []),
      // Batch 403: add-on orders, for the roles that had that screen.
      ...(['pathologist', 'fellow', 'resident'].includes(role) ? ['add-on:order:place', 'add-on:exception:approve-destructive-cut'] : []),
      // Batch 669 (ws-19): and flagging a block exception / marking a block retrieved, for the roles with the Add-On Orders or Microtome screen.
      ...(['pathologist', 'fellow', 'resident', 'histotechnologist'].includes(role) ? ['add-on:exception:flag', 'add-on:block:mark-retrieved'] : []),
      // Batch 404: Batch Management's overrides, for the roles with that screen.
      ...(['histotechnologist', 'cytotechnologist', 'molecular-technologist'].includes(role) ? ['batch:reconciliation:override', 'batch:run:abort', 'batch:cold-chain-excursion:acknowledge', 'batch:cold-chain-reading:simulate', 'retention:holds-queue:export'] : []),
      // Batch 726: carriers at the workstations and the station scan trail, for the roles with Batch Management or a bench workstation.
      ...(['histotechnologist', 'cytotechnologist', 'molecular-technologist'].includes(role) ? ['batch:manifest:seal', 'batch:carrier:advance', 'station:scan-mismatch:continue', 'station:scan-history:view'] : []),
      // Batch 407: disposing of retained material, for the same roles.
      ...(['histotechnologist', 'cytotechnologist', 'molecular-technologist'].includes(role) ? ['retention:material:dispose', 'retention:disposal-report:export', 'case:decant:delete', 'material:block:delete-in-process'] : []),
      // Batch 730: the lab workflow reports, with Batch Management.
      ...(['histotechnologist', 'cytotechnologist', 'molecular-technologist'].includes(role) ? [
        'report:workflow-turnaround:view', 'report:workflow-turnaround:export', 'report:station-volume:view', 'report:station-volume:export',
        'report:stat-performance:view', 'report:stat-performance:export', 'report:add-on-volume:view', 'report:add-on-volume:export',
        'report:recut-rework:view', 'report:recut-rework:export', 'report:reconciliation-exceptions:view', 'report:reconciliation-exceptions:export',
        'report:batch-duration:view', 'report:batch-duration:export'] : []),
      // Batch 731: item end states (Microtome or Slide Distribution), requesting re-embedding (add-on roles), completing it (Embedding).
      ...(set.includes('screen:microtomy:open') || set.includes('screen:slide-distribution:open') ? ['material:end-state:record'] : []),
      ...(['pathologist', 'fellow', 'resident'].includes(role) ? ['material:reembed:request'] : []),
      ...(set.includes('screen:embedding:open') ? ['material:reembed:complete'] : []),
      // Batch 740: handing a cell block off, for whoever opens the Cytology Preparation bench.
      ...(set.includes('screen:cytology-prep:open') ? ['cytology:cell-block:hand-off'] : []),
      // Batch 741: dividing a specimen; tracking its aliquots.
      ...(set.includes('screen:grossing:open') || set.includes('screen:cytology-prep:open') ? ['material:specimen:divide'] : []),
      ...(set.includes('screen:cytology-prep:open') || set.includes('screen:batch-management:open') ? ['material:aliquot-status:update'] : []),
      // Batch 432: referral transit status, for the same roles; resolving Audit Log errors, for Lab Director.
      ...(['histotechnologist', 'cytotechnologist', 'molecular-technologist'].includes(role) ? ['referral:transit-status:update'] : []),
      // Batch 434: WSI scan batches, for every role with the Batch Management screen.
      ...(['histotechnologist', 'cytotechnologist', 'molecular-technologist'].includes(role) ? ['wsi:scan-batch:load', 'wsi:scan-batch:send', 'wsi:scan-batch:unload'] : []),
      ...(role === 'lab-director' ? ['audit:error:resolve'] : []),
      // Batch 515: the Print Queue actions (Lab Director opens the Audit Log), and consult links for the roles with case access.
      ...(role === 'lab-director' ? ['print:job:hold', 'print:job:cancel', 'print:job:redirect', 'print:job:retry'] : []),
      ...(caseAccess.includes(role) ? ['case:consult-link:issue', 'case:consult-link:revoke'] : []),
      // Batch 669 (access-11): showing the consultant the patient's full identity, Pathologist and Lab Director.
      ...(role === 'pathologist' || role === 'lab-director' ? ['case:consult-link:reveal-identity'] : []),
      // Batch 645: Lockbox Drop-Off, the morning accessioning team (Admin gets only the folder review, above).
      ...(role === 'accessioner' ? ['lockbox:specimen:receive', 'lockbox:folder:review', 'lockbox:placeholder:resolve'] : []),
      // Batch 522 (PS-290): the cross-case consult link list, Lab Director (Admin and QA Reviewer above).
      ...(role === 'lab-director' ? ['audit:consult-links:view'] : []),
      // Batch 437 (PS-357): the exports on the screens the role opens.
      ...(set.includes('screen:audit-log:open') ? ['audit:audit-log:export', 'audit:error-log:export', 'audit:interface-log:export', 'audit:qa-log:export', 'audit:billing-log:export'] : []),
      ...(set.includes('screen:search:open') ? ['search:case-results:export', 'search:case-report:export', 'search:report-schedule:manage'] : []),
      ...(set.includes('screen:my-contributions:open') ? ['contribution:trainee-case-reference:export', 'contribution:case-mix-summary:export'] : []),
      // Batch 438: deciding CAPA recommendations, for the roles that open Quality Assurance.
      ...(set.includes('screen:quality-assurance:open') ? ['qa:capa-recommendation:decide'] : []),
      // Batch 454: follow-up outcomes and clinician emails (QA screen), and marking "follow-up expected" (surgical sign-out roles).
      ...(set.includes('screen:quality-assurance:open') ? ['qa:follow-up:record', 'qa:follow-up-clinician:email', 'qa:deficiency:raise', 'qa:deficiency:escalate', 'qa:deficiency:contain', 'qa:deficiency:verify', 'qa:management-review:submit'] : []),
      // Batch 649: creating a case (Accession screen); sign-out, codes and review requests (reporting roles); the
      // preliminary and revision releases (Pathologist, Fellow); pool and recall; flags for every case-access role.
      ...(set.includes('screen:accession:open') ? ['case:accession:create'] : []),
      ...(['pathologist', 'fellow', 'resident'].includes(role) ? ['surgical:report:sign-out', 'case:diagnosis-code:apply', 'case:informal-review:request'] : []),
      ...(['pathologist', 'fellow'].includes(role) ? ['surgical:preliminary:release', 'surgical:amendment:release', 'surgical:correction:release', 'surgical:addendum:release'] : []),
      ...(['pathologist', 'fellow', 'resident', 'cytotechnologist'].includes(role) ? ['case:pool:claim', 'case:pool:pass', 'report:release:recall'] : []),
      ...(role === 'cytotechnologist' ? ['case:diagnosis-code:apply'] : []),
      ...(caseAccess.includes(role) ? ['case:flag:apply', 'case:flag:remove'] : []),
      ...(['pathologist', 'fellow'].includes(role) ? ['case:follow-up:expect'] : []),
      // Batch 461: putting the anatomical map into the report, for the reporting roles.
      ...(['pathologist', 'fellow', 'resident'].includes(role) ? ['report:organ-map:insert'] : []),
      // Batch 458 (PS-71): Save mine anyway on the Edit Conflict dialog (Pathologist and Lab Director here; Admin above).
      ...(['pathologist', 'lab-director'].includes(role) ? ['case:edit-conflict:override'] : []),
      // Batch 516: printing a VIP/confidential case.
      ...(role === 'pathologist' ? ['report:restricted-case:print'] : []),
      // Batch 484: the Administrative Override of the Structured Inking sign-out gate (Lab Director here; Admin above — never Pathologist).
      ...(role === 'lab-director' ? ['case:inking-gate:override'] : []),
      ...(role === 'lab-director' ? ['print:release-hold:override'] : []),
      // Batch 529 (PS-554): reading the mismatch rules (QA Reviewer above).
      ...(['pathologist', 'lab-director'].includes(role) ? ['config:clinical-mismatch-rules:view'] : []),
      // Batch 536 (PS-554, Pete): approving the AI instructions starts with Lab Director.
      ...(role === 'lab-director' ? ['config:ai-prompt:view', 'config:ai-prompt:approve'] : []),
      // Batch 669 (Pete, mol-1): Control Rules are view-only for the bench; changing them is a management action (Admin has it through the administration group).
      ...(role === 'lab-director' ? ['config:molecular-control-rules:view', 'config:molecular-control-rules:manage'] : []),
      // Batch 669 (ctl): reading Control Rules without the Molecular screen: QA Reviewer, and every role that holds the Molecular screen.
      ...(role === 'qa-reviewer' || role === 'molecular-technologist' ? ['config:molecular-control-rules:view'] : []),
      // Batch 530: recording clinical history after accession.
      ...(['pathologist', 'fellow', 'resident', 'pa'].includes(role) ? ['case:clinical-history:record'] : []),
      // Batch 610 (#11): deleting a block after sign-out (Lab Director) and flagging one on an amended report (Pathologist).
      ...(role === 'lab-director' ? ['material:block:delete-signed-out'] : []),
      ...(role === 'pathologist' ? ['material:block:flag-amended'] : []),
      // Batch 611 (#189): Smart Capture review, approval and export, Pathologist only.
      ...(role === 'pathologist' ? ['billing:smart-capture:review', 'billing:smart-capture:approve', 'billing:smart-capture:send'] : []),
      // Batch 613: deciding who may see a patient's other cases (Pathologist; Admin above).
      ...(role === 'pathologist' ? ['patient:other-cases:decide-access'] : []),
      // Batch 518 (PS-123): batch label reprint, Histotechnologist (and Admin above).
      ...(role === 'histotechnologist' ? ['label:batch:reprint'] : []),
      // Batch 405: superseding a molecular run, for the roles with the Molecular screen.
      ...(role === 'molecular-technologist' ? ['molecular:batch:supersede'] : []),
      // Batch 467: the molecular Order Queue — assigning to plates, cancelling and re-routing.
      ...(role === 'molecular-technologist' ? ['molecular:order:assign-plate', 'molecular:order:cancel', 'molecular:order:set-lab'] : []),
      // Batch 385: sending messages and secure email, for every role.
      'message:internal:send', 'message:secure-email:send',
    ]);
    // Batch 428: the Configuration sections, by Pete's decisions.
    // Batch 438: and Revision Reasons. Batch 439: and the peer-review sign-out gate. Batch 442: and the discordance trend policy.
    expect(CONFIG_SECTIONS).toHaveLength(119); // Batch 736: + config:bench-reasons:manage. Batch 734: + config:direct-device-printing:manage. Batch 728: + config:research-cases:manage, config:batch-purposes:manage. Batch 621: + config:history-extraction:manage. Batch 620 (part S): + config:batch-registry-feed:manage. Batch 620 (part E): + config:us-epath:manage. Batch 620 (part C): + config:cosd-destination:manage. Batch 619: + config:delivery-schedules:manage, config:billing-release:manage. Batch 613: + config:bi-feed:manage, config:bi-feed-tokens:manage, config:bi-feed-identified:approve. Batch 612: + config:workstations:manage, config:workstation-tokens:manage. Batch 611: + config:smart-capture:manage. Batch 610: + config:cold-chain:manage. Batch 595: + config:code-systems:manage. Batch 552: + config:site-agents:enroll, config:site-agent-config:manage. Batch 536: + config:ai-vendor-policy:manage (PS-558); the ai-prompt ones have no default grant. Batch 517: + config:secure-messaging:manage (PS-143). Batch 461: + config:organ-map-scheme:manage, config:organ-map-bindings:manage. Batch 452: + config:cytology-histology-correlation:manage; Batch 453: + config:biopsy-resection-correlation:manage; Batch 454: + config:follow-up-tracking:manage; Batch 480: + config:inking-validation-mode:manage. Structured Inking Module 3 (PS-359 follow-up): + config:ink-color:manage. Batch 491: + config:tumor-board-rules:manage
    // Batch 429: recording equipment maintenance is also the bench roles'.
    expect(CONFIG_SECTIONS).toContain('equipment:maintenance:record');
    expect(CONFIG_SECTIONS_LAB_DIRECTOR).toEqual(CONFIG_SECTIONS.filter(k => k !== 'config:protocol:draft'));
    expect(CONFIG_SECTIONS).not.toContain('platform:signing-rules:manage');
    // A hospital's own role with Configuration access gets none of them until an administrator grants them.
    expect(customRoleScreenSeed({ caseAccess: true, configAccess: true }).filter(k => CONFIG_SECTIONS.includes(k))).toEqual([]);
    // Batch 390: a hospital's own role gets no cytology correction or addendum until an administrator grants it.
    expect(customRoleScreenSeed({ caseAccess: true, configAccess: true })).not.toContain('cytology:report:correct');
    expect(customRoleScreenSeed({ caseAccess: true, configAccess: true })).not.toContain('cytology:report:addend');
    // Batch 403: add-on orders for a hospital's own role with case access only.
    expect(customRoleScreenSeed({ caseAccess: true })).toEqual(expect.arrayContaining(['add-on:order:place', 'add-on:exception:approve-destructive-cut', 'add-on:exception:flag', 'add-on:block:mark-retrieved']));
    expect(customRoleScreenSeed({ configAccess: true })).not.toContain('add-on:order:place');
    expect(customRoleScreenSeed({ caseAccess: true })).toEqual(expect.arrayContaining(['batch:run:abort']));
    expect(customRoleScreenSeed({ configAccess: true })).not.toContain('batch:run:abort');
    expect(customRoleScreenSeed({ caseAccess: true })).toContain('retention:material:dispose');
    expect(customRoleScreenSeed({ caseAccess: true })).toContain('cytology:report:sign-out');
    expect(customRoleScreenSeed({ configAccess: true })).not.toContain('cytology:report:sign-out');
    // Batch 410: the Cytology Workspace's other actions go with sign-out.
    expect(customRoleScreenSeed({ caseAccess: true })).toEqual(expect.arrayContaining(CYTOLOGY_WORKSPACE));
    for (const k of CYTOLOGY_WORKSPACE) expect(customRoleScreenSeed({ configAccess: true })).not.toContain(k);
    // Batch 411: the early-finalization override isn't offered to a hospital's own roles.
    expect(customRoleScreenSeed({ caseAccess: true })).not.toContain('cytology:case:finalize');
    // Batch 572: nor signing off screening hours (a workload record the lab grants deliberately).
    expect(customRoleScreenSeed({ caseAccess: true })).not.toContain('cytology:screening-hours:sign-off');
    expect(customRoleScreenSeed({ configAccess: true })).not.toContain('retention:material:dispose');
    // A hospital's own role with case access is offered them too.
    expect(customRoleScreenSeed({ caseAccess: true })).toEqual(expect.arrayContaining(caseReport));
    expect(customRoleScreenSeed({ configAccess: true })).not.toContain('case:hold:place');
    // Batch 382: correcting an applied billing code is offered to a role with case or configuration access, apart from the case report actions.
    expect(customRoleScreenSeed({ caseAccess: true })).toContain('billing:applied-code:correct');
    expect(customRoleScreenSeed({ configAccess: true })).toContain('billing:applied-code:correct');
    expect(customRoleScreenSeed({})).not.toContain('billing:applied-code:correct');
    expect(caseReport).not.toContain('billing:applied-code:correct');
    // Batch 460 (Pete): reviewing billing codes goes to the same roles as correcting them.
    expect(customRoleScreenSeed({ caseAccess: true })).toContain('billing:applied-code:review');
    expect(customRoleScreenSeed({ configAccess: true })).toContain('billing:applied-code:review');
    expect(customRoleScreenSeed({})).not.toContain('billing:applied-code:review');
    for (const [role, caps] of Object.entries(CAPABILITY_SEEDS)) {
      expect(caps.includes('billing:applied-code:review'), role).toBe(caps.includes('billing:applied-code:correct'));
    }
    // Batch 383: releasing an autopsy body is offered to a role with case access only.
    expect(customRoleScreenSeed({ caseAccess: true })).toContain('autopsy:body:release');
    expect(customRoleScreenSeed({ caseAccess: true })).toContain('patient:national-identifier:record');
    expect(customRoleScreenSeed({ caseAccess: true })).toContain('patient:registry-consent:record');
    expect(customRoleScreenSeed({ caseAccess: true })).toContain('patient:other-cases:request-access');
    expect(customRoleScreenSeed({ caseAccess: true })).not.toContain('patient:other-cases:decide-access');
    expect(customRoleScreenSeed({ configAccess: true })).not.toContain('autopsy:body:release');
    // Batch 468: and recording a forensic chain-of-custody transfer, same roles.
    expect(customRoleScreenSeed({ caseAccess: true })).toContain('autopsy:custody:transfer');
    expect(customRoleScreenSeed({ configAccess: true })).not.toContain('autopsy:custody:transfer');
    // Batch 469: and consent narrowing/revocation, organ-retention disposal, toxicology, same roles.
    expect(customRoleScreenSeed({ caseAccess: true })).toContain('autopsy:consent:manage');
    expect(customRoleScreenSeed({ caseAccess: true })).toContain('autopsy:retention-disposal:record');
    expect(customRoleScreenSeed({ caseAccess: true })).toContain('autopsy:toxicology:order');
    expect(customRoleScreenSeed({ caseAccess: true })).toContain('autopsy:toxicology:result');
    expect(customRoleScreenSeed({ configAccess: true })).not.toContain('autopsy:consent:manage');
    // Batch 471: and cancelling a toxicology order, retention detail, consent reinstatement, same roles.
    expect(customRoleScreenSeed({ caseAccess: true })).toContain('autopsy:toxicology:cancel');
    expect(customRoleScreenSeed({ caseAccess: true })).toContain('autopsy:retention-detail:record');
    expect(customRoleScreenSeed({ caseAccess: true })).toContain('autopsy:consent:reinstate');
    expect(customRoleScreenSeed({ configAccess: true })).not.toContain('autopsy:consent:reinstate');
    // Batch 478: per-organ tagging is seeded to the built-in GROSSERS roles
    // only (same as case:grossing:complete), never to a hospital's own
    // custom role — customRoleScreenSeed has no grosser-only concept, only
    // caseAccess/configAccess, and this is deliberately narrower than that.
    expect(customRoleScreenSeed({ caseAccess: true })).not.toContain('autopsy:organ-tag:record');
    expect(customRoleScreenSeed({ configAccess: true })).not.toContain('autopsy:organ-tag:record');
    // Batch 480: same narrower-than-caseAccess posture for margin ink recording.
    expect(customRoleScreenSeed({ caseAccess: true })).not.toContain('grossing:margin-ink:record');
    expect(customRoleScreenSeed({ configAccess: true })).not.toContain('grossing:margin-ink:record');
    for (const set of Object.values(CAPABILITY_SEEDS)) expect(unmetRequirements(set)).toEqual([]);
  });
});

describe('authorization service', () => {
  const roles = [
    { id: 'qa-reviewer', name: 'QA Reviewer', capabilities: ['qa:fppe-tracking:export'] },
    { id: 'superadmin', name: 'Superadmin', capabilities: [...ALL_CAPABILITY_KEYS], assignable: false },
  ];
  const build = (session: { id: string; name: string; role: 'pathologist' | 'superadmin' } | null, staffRoles: string[] | null) => {
    const logged: { event: string; detail: string }[] = [];
    const svc = createAuthorizationService({
      roleService: { getAll: async () => ({ ok: true, data: roles as any }) },
      userService: { getById: async () => (staffRoles ? { ok: true, data: { roles: staffRoles } as any } : { ok: false, error: 'not found' }) as any },
      auditService: { logEvent: async e => { logged.push(e); return { ok: true, data: e as any }; } },
      session: () => session,
    });
    return { svc, logged };
  };

  it('enforce audits a high-risk check, allowed or refused', async () => {
    const { svc, logged } = build({ id: 'U1', name: 'Dr A', role: 'pathologist' }, ['QA Reviewer']);
    expect((await svc.enforce('qa:fppe-tracking:export')).allowed).toBe(true);
    expect((await svc.enforce('qa:drift-correction:export')).allowed).toBe(false);
    expect(logged.map(l => l.event)).toEqual(['Capability allowed', 'Capability refused']);
    expect(logged[0].detail).toContain('allowed by role "QA Reviewer"');
  });
  it('evaluate writes nothing', async () => {
    const { svc, logged } = build({ id: 'U1', name: 'Dr A', role: 'pathologist' }, ['QA Reviewer']);
    expect((await svc.evaluate('qa:fppe-tracking:export')).allowed).toBe(true);
    expect(logged).toEqual([]);
  });
  it('no staff record: only what the session brings; no session: nothing', async () => {
    expect((await build({ id: 'U9', name: 'Support', role: 'superadmin' }, null).svc.grantedCapabilities()).size).toBe(ALL_CAPABILITY_KEYS.length);
    expect((await build({ id: 'U9', name: 'Dr Z', role: 'pathologist' }, null).svc.grantedCapabilities()).size).toBe(0);
    const none = build(null, ['QA Reviewer']);
    expect(await none.svc.enforce('qa:fppe-tracking:export')).toMatchObject({ allowed: false, reason: 'noUser' });
    expect(none.logged[0].event).toBe('Capability refused');
  });
});

describe('facility scope (PS-356)', async () => {
  const { facilityScopeProblem } = await import('./evaluateCapability');
  const { qaScopeContext } = await import('../qualityAssurance/qaExport');
  const roles: AuthzRole[] = [{ id: 'qa-reviewer', name: 'QA Reviewer', capabilities: ['x:a:export'] }];
  const limited: AuthzSubject = { userId: 'U1', userName: 'Dr A', sessionRole: 'pathologist', staffRoles: ['QA Reviewer'], facilityIds: ['F1', 'F2'] };
  const everywhere: AuthzSubject = { ...limited, facilityIds: [] };

  it('an unrestricted assignment is never the reason for a refusal', () => {
    for (const ctx of [{ allFacilities: true }, { facilityId: 'F9' }, { caseId: 'S1' }, {}]) {
      expect(evaluateCapability(everywhere, 'x:a:export', roles, ctx, T).allowed).toBe(true);
    }
  });
  it('a limited assignment allows its own facilities and refuses others, naming them', () => {
    expect(evaluateCapability(limited, 'x:a:export', roles, { facilityId: 'F1' }, T).allowed).toBe(true);
    expect(evaluateCapability(limited, 'x:a:export', roles, { facilityIds: ['F1', 'F2'] }, T).allowed).toBe(true);
    expect(evaluateCapability(limited, 'x:a:export', roles, { facilityIds: ['F1', 'F3'] }, T)).toMatchObject({ allowed: false, reason: 'outOfScope', outsideFacilities: ['F3'], grantedBy: [{ id: 'qa-reviewer' }] });
  });
  it('a limited assignment refuses all-facility actions, and case actions on a case with no facility', () => {
    expect(evaluateCapability(limited, 'x:a:export', roles, { allFacilities: true }, T)).toMatchObject({ allowed: false, reason: 'outOfScope', outsideFacilities: ['all'] });
    expect(evaluateCapability(limited, 'x:a:export', roles, { caseId: 'S1' }, T)).toMatchObject({ allowed: false, reason: 'facilityUnknown' });
    expect(evaluateCapability(limited, 'x:a:export', roles, { caseId: 'S1', facilityId: 'F2' }, T).allowed).toBe(true);
  });
  it('actions with no facility dimension are not affected', () => {
    expect(facilityScopeProblem(['F1'], {})).toBeNull();
  });
  it('scope never grants: a role that does not grant it still refuses as notGranted', () => {
    expect(evaluateCapability(limited, 'x:d:view', roles, { facilityId: 'F1' }, T).reason).toBe('notGranted');
  });
  it('the audit entry says why scope refused', () => {
    const d = evaluateCapability(limited, 'x:a:export', roles, { allFacilities: true }, T);
    expect(capabilityAuditEntry(limited, d).detail).toContain("outside the user's facility assignment (the action spans all facilities)");
    const one = capabilityAuditEntry(limited, evaluateCapability(limited, 'x:a:export', roles, { facilityIds: ['F1'] }, T));
    expect(one.facilityId).toBe('F1');
  });
  it('QA scopes map to facility context: a client is one facility; anything wider is all facilities', () => {
    expect(qaScopeContext({ level: 'client', clientId: 'c1' })).toEqual({ facilityIds: ['c1'] });
    expect(qaScopeContext({ level: 'organisation', organisationId: 'ORG-1' })).toEqual({ allFacilities: true });
    expect(qaScopeContext({ level: 'enterprise' })).toEqual({ allFacilities: true });
    expect(qaScopeContext()).toEqual({ allFacilities: true });
  });
});

describe('ForMedrixAI platform capabilities (Batch 371)', async () => {
  const { lockPlatformRoles } = await import('./capabilitySeeds');
  const P: CapabilityDefinition[] = [...T, { key: 'x:p:view', labelId: 'p', group: 'platform', risk: 'high', requires: [], platformOnly: true }];
  const roles: AuthzRole[] = [
    { id: 'admin', name: 'Admin', capabilities: ['x:p:view', 'x:a:export'] },
    { id: 'superadmin', name: 'Superadmin', capabilities: ['x:p:view'], assignable: false },
  ];
  it('a platform capability counts only from the non-assignable Superadmin role', () => {
    const admin: AuthzSubject = { userId: 'U', userName: 'A', sessionRole: 'admin', staffRoles: ['Admin'] };
    expect(evaluateCapability(admin, 'x:p:view', roles, {}, P)).toMatchObject({ allowed: false, reason: 'notGranted' });
    expect(evaluateCapability(admin, 'x:a:export', roles, {}, P).allowed).toBe(true);
    const support: AuthzSubject = { userId: 'S', userName: 'Support', sessionRole: 'superadmin', staffRoles: [] };
    expect(evaluateCapability(support, 'x:p:view', roles, {}, P)).toMatchObject({ allowed: true, grantedBy: [{ id: 'superadmin' }] });
  });
  it('a hospital role can never be saved with a platform capability; the platform role can', () => {
    expect(roleCapabilityProblem(['platform:governing-bodies:manage'])).toContain('Platform-only capability on a hospital role');
    expect(roleCapabilityProblem(['platform:governing-bodies:manage'], { assignable: false })).toBeNull();
  });
  it('the Superadmin role is always put back to the whole catalog (Batch 536: but approving the AI instructions), whatever was stored', () => {
    const { roles: out, changed } = lockPlatformRoles([{ id: 'superadmin', builtIn: true, capabilities: ['qa:fppe-tracking:export'] }, { id: 'admin', builtIn: true, capabilities: [] }]);
    expect(changed).toBe(true);
    expect(out[0].capabilities).toEqual([...SUPERADMIN_CAPABILITY_KEYS]);
    expect(out[0].capabilities).not.toContain('config:ai-prompt:approve');
    expect(out[1].capabilities).toEqual([]);
    // A stored approval on Superadmin is taken away again.
    expect(lockPlatformRoles([{ id: 'superadmin', builtIn: true, capabilities: [...ALL_CAPABILITY_KEYS] }]).roles[0].capabilities).not.toContain('config:ai-prompt:approve');
    expect(lockPlatformRoles(out).changed).toBe(false);
  });
  it('the hospital seeds hold no platform capability', () => {
    for (const id of ['admin', 'qa-reviewer']) expect(CAPABILITY_SEEDS[id].filter(k => k.startsWith('platform:'))).toEqual([]);
    expect(CAPABILITY_SEEDS.superadmin).toContain('platform:cross-tenant-cases:view');
  });
});
