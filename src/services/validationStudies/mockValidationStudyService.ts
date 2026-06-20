// src/services/validationStudies/mockValidationStudyService.ts
import type { IValidationStudyService, ValidationStudy, CommitteeSubmission, CommitteeApproval } from './IValidationStudyService';
import { storageGet, storageSet } from '../mockStorage';

const KEY = 'pathscribe_validation_studies_v1';

function load(): ValidationStudy[] {
  const stored = storageGet<ValidationStudy[]>(KEY);
  if (stored && stored.length > 0) return stored;
  // Seed demo study if nothing stored yet
  const now   = new Date();
  const start = new Date(now); start.setDate(start.getDate() - 21);
  const SEED: ValidationStudy[] = [
    {
      id:          'vs-demo-001',
      name:        'Metro General — AI Narrative Validation Q2 2026',
      description: 'Parallel run validation of AI-assisted surgical pathology reporting across breast and GI subspecialties. Advisory mode throughout — all AI output reviewed and signed by pathologist.',
      status:      'active',
      clientIds:        ['c1'],
      pathologistIds:   ['PATH-001', 'PATH-SJ-001'],
      subspecialtyIds:  ['breast', 'gi'],
      templateIds:      ['tmpl-breast', 'tmpl-gi'],
      startDate:        start.toISOString(),
      targetCaseCount:  50,
      targetAcceptanceRate: 0.70,
      targetMaxEditRatio:   0.30,
      principalInvestigatorId: 'PATH-001',
      committeeSubmission: {
        submittedAt:        start.toISOString(),
        submittedBy:        'Pete Nimmo',
        committeeName:      'MGH Clinical Ethics & Research Committee',
        expectedReviewDate: start.toISOString(),
      },
      committeeApproval: {
        approvedAt:           start.toISOString(),
        approvedBy:           'Pete Nimmo',
        irbReference:         'MGH-IRB-2026-0042',
        committeeMinutesRef:  'MGH-CERC-MIN-2026-Q2-04',
        conditions:           'Advisory mode only. No AI-direct LIS submission. Monthly progress reports to committee.',
      },
      validationMode:  'advisory',
      createdAt:       start.toISOString(),
      createdBy:       'admin',
      updatedAt:       start.toISOString(),
    },
    {
      id:          'vs-demo-002',
      name:        'MPA Surgical Pathology — AI Narrative Pilot',
      description: 'Amber Fehrs-Battey leading a focused pilot of AI-assisted narrative generation across breast and urological subspecialties. Demonstrates full study lifecycle for prospective customers.',
      status:      'active',
      clientIds:        ['c2'],
      pathologistIds:   ['PATH-US-001'],
      subspecialtyIds:  ['breast', 'uro'],
      templateIds:      ['tmpl-breast', 'tmpl-uro'],
      startDate:        (() => { const d = new Date(now); d.setDate(d.getDate() - 14); return d.toISOString(); })(),
      targetCaseCount:  30,
      targetAcceptanceRate: 0.65,
      targetMaxEditRatio:   0.35,
      principalInvestigatorId: 'PATH-US-001',
      approvedById:    'u3',
      approvedAt:      (() => { const d = new Date(now); d.setDate(d.getDate() - 14); return d.toISOString(); })(),
      irbReference:    'MPA-IRB-2026-0017',
      validationMode:  'advisory',
      createdAt:       (() => { const d = new Date(now); d.setDate(d.getDate() - 14); return d.toISOString(); })(),
      createdBy:       'admin',
      updatedAt:       (() => { const d = new Date(now); d.setDate(d.getDate() - 14); return d.toISOString(); })(),
    },
    {
      id:          'vs-demo-003',
      name:        'Metro General — GI Pathology AI Validation (Closed)',
      description: 'Completed validation study for GI subspecialty. Demonstrates the closed study and report generation workflow.',
      status:      'closed',
      clientIds:        ['c1'],
      pathologistIds:   ['PATH-001', 'PATH-SJ-001'],
      subspecialtyIds:  ['gi'],
      templateIds:      ['tmpl-gi'],
      startDate:        (() => { const d = new Date(now); d.setDate(d.getDate() - 60); return d.toISOString(); })(),
      endDate:           (() => { const d = new Date(now); d.setDate(d.getDate() - 5);  return d.toISOString(); })(),
      targetCaseCount:  25,
      targetAcceptanceRate: 0.70,
      targetMaxEditRatio:   0.30,
      principalInvestigatorId: 'PATH-001',
      approvedById:    'u3',
      approvedAt:      (() => { const d = new Date(now); d.setDate(d.getDate() - 60); return d.toISOString(); })(),
      irbReference:    'MGH-IRB-2026-0031',
      validationMode:  'advisory',
      createdAt:       (() => { const d = new Date(now); d.setDate(d.getDate() - 65); return d.toISOString(); })(),
      createdBy:       'admin',
      updatedAt:       (() => { const d = new Date(now); d.setDate(d.getDate() - 5);  return d.toISOString(); })(),
    },
  ];
  save(SEED);
  return SEED;
}
function save(s: ValidationStudy[]): void { storageSet(KEY, s); }
function genId(): string { return `vs-${Date.now()}-${Math.random().toString(36).slice(2,6)}`; }
function ok<T>(d: T) { return { ok: true, data: d } as any; }
function err(m: string) { return { ok: false, error: m } as any; }

export const mockValidationStudyService: IValidationStudyService = {
  async getAll()         { return ok(load()); },
  async getActive()      { return ok(load().filter(s => s.status === 'active')); },
  async getById(id)      {
    const s = load().find(s => s.id === id);
    return s ? ok(s) : err(`Study ${id} not found`);
  },
  async create(study) {
    const now = new Date().toISOString();
    const s: ValidationStudy = { ...study, id: genId(), createdAt: now, updatedAt: now };
    save([...load(), s]);
    return ok(s);
  },
  async update(id, changes) {
    const studies = load();
    const idx = studies.findIndex(s => s.id === id);
    if (idx < 0) return err(`Study ${id} not found`);
    const updated = { ...studies[idx], ...changes, updatedAt: new Date().toISOString() };
    studies[idx] = updated;
    save(studies);
    return ok(updated);
  },
  async submitForReview(id, submission: CommitteeSubmission) {
    return mockValidationStudyService.update(id, {
      status: 'pending_approval',
      committeeSubmission: submission,
    });
  },
  async recordApproval(id, approval: CommitteeApproval) {
    return mockValidationStudyService.update(id, {
      status: 'approved',
      committeeApproval: approval,
    });
  },
  async activate(id, activatedBy: string) {
    const study = load().find(s => s.id === id);
    if (!study?.committeeApproval?.irbReference) {
      return err('Cannot activate study without recorded committee approval and IRB reference');
    }
    return mockValidationStudyService.update(id, { status: 'active' });
  },
  async close(id)        { return mockValidationStudyService.update(id, { status: 'closed', endDate: new Date().toISOString() }); },
  async remove(id)       { save(load().filter(s => s.id !== id)); return ok(undefined as void); },
  async getStudyForCase(clientId, pathologistId, subspecialtyId) {
    const active = load().filter(s => s.status === 'active');
    const match  = active.find(s => {
      const clientMatch      = s.clientIds.length === 0 || s.clientIds.includes(clientId);
      const pathMatch        = s.pathologistIds.length === 0 || s.pathologistIds.includes(pathologistId);
      const subspecialtyMatch = !s.subspecialtyIds?.length || !subspecialtyId || s.subspecialtyIds.includes(subspecialtyId);
      return clientMatch && pathMatch && subspecialtyMatch;
    });
    return ok(match ?? null);
  },
};
