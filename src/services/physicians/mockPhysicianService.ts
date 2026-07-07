import { IPhysicianService, Physician } from './IPhysicianService';
import { ServiceResult, ID } from '../types';
import { storageGet, storageSet } from '../mockStorage';

// firstName/lastName are always mirrored from givenNames/familyNames —
// see Physician's own doc comments (IPhysicianService.ts) for why both
// exist. withMirroredNames() keeps every write path (add/update/
// findOrCreateByNpi) consistent in one place rather than repeating the
// mirroring logic at each call site.
function withMirroredNames<T extends { givenNames: string; familyNames: string }>(p: T): T & { firstName: string; lastName: string } {
  return { ...p, firstName: p.givenNames, lastName: p.familyNames };
}

const SEED_PHYSICIANS: Physician[] = [
  { id: 'ph1', namePrefix: 'Dr.', givenNames: 'Robert',   familyNames: 'Williams', firstName: 'Robert',   lastName: 'Williams', npi: '9876543210', specialty: 'Gastroenterology',    phone: '555-1001', fax: '555-1002', email: 'rwilliams@clinic.org',  preferredContact: 'Fax',   clientIds: ['c1', 'c2'], status: 'Active'     },
  { id: 'ph2', namePrefix: 'Dr.', givenNames: 'Jennifer', familyNames: 'Davis',    firstName: 'Jennifer', lastName: 'Davis',    npi: '9876543211', specialty: 'Dermatology',         phone: '555-1003', fax: '555-1004', email: 'jdavis@clinic.org',     preferredContact: 'Email', clientIds: ['c1'],       status: 'Active'     },
  { id: 'ph3', namePrefix: 'Dr.', givenNames: 'Michael',  familyNames: 'Brown',    firstName: 'Michael',  lastName: 'Brown',    npi: '9876543212', specialty: 'General Surgery',     phone: '555-1005', fax: '555-1006', email: 'mbrown@clinic.org',     preferredContact: 'Fax',   clientIds: ['c2'],       status: 'Active'     },
  { id: 'ph4', namePrefix: 'Dr.', givenNames: 'Patricia', familyNames: 'Miller',   firstName: 'Patricia', lastName: 'Miller',   npi: '9876543213', specialty: 'Internal Medicine',   phone: '555-1007', fax: '',         email: 'pmiller@clinic.org',    preferredContact: 'Phone', clientIds: ['c3'],       status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-03-01' },
  { id: 'ph5', namePrefix: 'Dr.', givenNames: 'David',    familyNames: 'Wilson',   firstName: 'David',    lastName: 'Wilson',   npi: '9876543214', specialty: 'Urology',             phone: '555-1009', fax: '555-1010', email: 'dwilson@clinic.org',    preferredContact: 'Fax',   clientIds: ['c1', 'c3'], status: 'Active'     },
  { id: 'ph6', namePrefix: 'Dr.', givenNames: 'Susan',    familyNames: 'Taylor',   firstName: 'Susan',    lastName: 'Taylor',   npi: '9876543215', specialty: 'General',             phone: '',         fax: '',         email: '',                      preferredContact: 'Fax',   clientIds: [],           status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-03-02' },
];

const load = () => storageGet<Physician[]>('pathscribe_physicians', SEED_PHYSICIANS);
const persist = (data: Physician[]) => storageSet('pathscribe_physicians', data);
let MOCK_PHYSICIANS: Physician[] = load();

const ok    = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const err   = <T>(error: string): ServiceResult<T> => ({ ok: false, error });
const delay = () => new Promise(r => setTimeout(r, 80));

export const mockPhysicianService: IPhysicianService = {
  async getAll() {
    await delay();
    return ok([...MOCK_PHYSICIANS]);
  },

  async getById(id: ID) {
    await delay();
    const p = MOCK_PHYSICIANS.find(p => p.id === id);
    return p ? ok({ ...p }) : err(`Physician ${id} not found`);
  },

  async getByNpi(npi: string) {
    await delay();
    const p = MOCK_PHYSICIANS.find(p => p.npi === npi);
    return ok(p ? { ...p } : null);
  },

  async add(physician) {
    await delay();
    const newP: Physician = withMirroredNames({ ...physician, id: 'ph' + Date.now() });
    MOCK_PHYSICIANS = [...MOCK_PHYSICIANS, newP];
    persist(MOCK_PHYSICIANS);
    return ok({ ...newP });
  },

  async update(id, changes) {
    await delay();
    const idx = MOCK_PHYSICIANS.findIndex(p => p.id === id);
    if (idx === -1) return err(`Physician ${id} not found`);
    MOCK_PHYSICIANS = MOCK_PHYSICIANS.map(p => {
      if (p.id !== id) return p;
      const merged = { ...p, ...changes };
      return withMirroredNames(merged);
    });
    persist(MOCK_PHYSICIANS);
    return ok({ ...MOCK_PHYSICIANS[idx] });
  },

  async verify(id) {
    return mockPhysicianService.update(id, { status: 'Active' });
  },

  async deactivate(id) {
    return mockPhysicianService.update(id, { status: 'Inactive' });
  },

  async findOrCreateByNpi(npi, name) {
    await delay();
    const existing = MOCK_PHYSICIANS.find(p => p.npi === npi);
    if (existing) return ok({ ...existing });
    const newP: Physician = withMirroredNames({
      id: 'ph' + Date.now(), givenNames: name.first, familyNames: name.last,
      npi, specialty: 'General', phone: '', fax: '', email: '',
      preferredContact: 'Fax', clientIds: [], status: 'Unverified',
      autoCreated: true, autoCreatedAt: new Date().toISOString().split('T')[0],
    } as Physician);
    MOCK_PHYSICIANS = [...MOCK_PHYSICIANS, newP];
    persist(MOCK_PHYSICIANS);
    return ok({ ...newP });
  },
};
