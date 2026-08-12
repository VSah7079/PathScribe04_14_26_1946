import { IPhysicianService, Physician } from './IPhysicianService';
import { ServiceResult, ID } from '../types';
import { storageGet, storageSet } from '../mockStorage';

<<<<<<< HEAD
const SEED_PHYSICIANS: Physician[] = [
  { id: 'ph1', firstName: 'Robert',   lastName: 'Williams', npi: '9876543210', specialty: 'Gastroenterology',    phone: '555-1001', fax: '555-1002', email: 'rwilliams@clinic.org',  preferredContact: 'Fax',   clientIds: ['c1', 'c2'], status: 'Active'     },
  { id: 'ph2', firstName: 'Jennifer', lastName: 'Davis',    npi: '9876543211', specialty: 'Dermatology',         phone: '555-1003', fax: '555-1004', email: 'jdavis@clinic.org',     preferredContact: 'Email', clientIds: ['c1'],       status: 'Active'     },
  { id: 'ph3', firstName: 'Michael',  lastName: 'Brown',    npi: '9876543212', specialty: 'General Surgery',     phone: '555-1005', fax: '555-1006', email: 'mbrown@clinic.org',     preferredContact: 'Fax',   clientIds: ['c2'],       status: 'Active'     },
  { id: 'ph4', firstName: 'Patricia', lastName: 'Miller',   npi: '9876543213', specialty: 'Internal Medicine',   phone: '555-1007', fax: '',         email: 'pmiller@clinic.org',    preferredContact: 'Phone', clientIds: ['c3'],       status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-03-01' },
  { id: 'ph5', firstName: 'David',    lastName: 'Wilson',   npi: '9876543214', specialty: 'Urology',             phone: '555-1009', fax: '555-1010', email: 'dwilson@clinic.org',    preferredContact: 'Fax',   clientIds: ['c1', 'c3'], status: 'Active'     },
  { id: 'ph6', firstName: 'Susan',    lastName: 'Taylor',   npi: '9876543215', specialty: 'General',             phone: '',         fax: '',         email: '',                      preferredContact: 'Fax',   clientIds: [],           status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-03-02' },
=======
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

  // ── Backfilled from existing seed case data (2026-07-16) ──────────────
  // These 52 physicians were referenced as order.requestingProvider free
  // text across mockCaseService.ts / mockOrchestratorCaseService.ts with
  // no corresponding directory record at all until now — the gap that
  // findOrCreateByName (added this same session) now prevents going
  // forward for NEW cases. This is a one-time catch-up for existing seed
  // data, which never goes through AccessionPage.tsx and so would never
  // have triggered that auto-create path.
  { id: 'ph7', namePrefix: 'Dr.', givenNames: 'Amanda', familyNames: 'Chen', firstName: 'Amanda', lastName: 'Chen', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c1'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph8', namePrefix: 'Dr.', givenNames: 'Angela', familyNames: 'Brooks', firstName: 'Angela', lastName: 'Brooks', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c-westside'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph9', namePrefix: 'Dr.', givenNames: 'Anil', familyNames: 'Sharma', firstName: 'Anil', lastName: 'Sharma', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c4'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph10', namePrefix: 'Dr.', givenNames: 'Carol', familyNames: 'Simmons', firstName: 'Carol', lastName: 'Simmons', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c-westside'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph11', namePrefix: 'Dr.', givenNames: 'Carolyn', familyNames: 'Johnston', firstName: 'Carolyn', lastName: 'Johnston', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c-hfhs-07'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph12', namePrefix: 'Dr.', givenNames: 'Felicity', familyNames: 'Adeyemi', firstName: 'Felicity', lastName: 'Adeyemi', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c-westside'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph13', namePrefix: 'Dr.', givenNames: 'Harvey', familyNames: 'Pass', firstName: 'Harvey', lastName: 'Pass', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c-hfhs-01'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph14', namePrefix: 'Dr.', givenNames: 'Helen', familyNames: 'Marsden', firstName: 'Helen', lastName: 'Marsden', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c-mft-03'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph15', namePrefix: 'Dr.', givenNames: 'Helen', familyNames: 'Marsh', firstName: 'Helen', lastName: 'Marsh', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c-stcatherines'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph16', namePrefix: 'Dr.', givenNames: 'Henry', familyNames: 'Okoye', firstName: 'Henry', lastName: 'Okoye', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c-royal-manchester'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph17', namePrefix: 'Dr.', givenNames: 'James', familyNames: 'Fowler', firstName: 'James', lastName: 'Fowler', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c1'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph18', namePrefix: 'Dr.', givenNames: 'James', familyNames: 'Nguyen', firstName: 'James', lastName: 'Nguyen', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c3'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph19', namePrefix: 'Dr.', givenNames: 'James', familyNames: 'Orringer', firstName: 'James', lastName: 'Orringer', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c-mpa-02'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph20', namePrefix: 'Dr.', givenNames: 'James', familyNames: 'Park', firstName: 'James', lastName: 'Park', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c3'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph21', namePrefix: 'Dr.', givenNames: 'Jennifer', familyNames: 'Moss', firstName: 'Jennifer', lastName: 'Moss', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c-stcatherines'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph22', namePrefix: 'Dr.', givenNames: 'Karen', familyNames: 'Shapiro', firstName: 'Karen', lastName: 'Shapiro', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c1'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph23', namePrefix: 'Dr.', givenNames: 'Kevin', familyNames: 'Ng', firstName: 'Kevin', lastName: 'Ng', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c1'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph24', namePrefix: 'Dr.', givenNames: 'Lisa', familyNames: 'Fontaine', firstName: 'Lisa', lastName: 'Fontaine', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c-stcatherines'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph25', namePrefix: 'Dr.', givenNames: 'Lisa', familyNames: 'Kaminski', firstName: 'Lisa', lastName: 'Kaminski', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c-mpa-01'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph26', namePrefix: 'Dr.', givenNames: 'Lisa', familyNames: 'Wong', firstName: 'Lisa', lastName: 'Wong', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c1'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph27', namePrefix: 'Dr.', givenNames: 'Mani', familyNames: 'Menon', firstName: 'Mani', lastName: 'Menon', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c-mpa-03'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph28', namePrefix: 'Dr.', givenNames: 'Martin', familyNames: 'Osei', firstName: 'Martin', lastName: 'Osei', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c-royal-manchester'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph29', namePrefix: 'Dr.', givenNames: 'Mazen', familyNames: 'Iskandar', firstName: 'Mazen', lastName: 'Iskandar', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c-hfhs-03'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph30', namePrefix: 'Dr.', givenNames: 'Michael', familyNames: 'Torres', firstName: 'Michael', lastName: 'Torres', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c2'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph31', namePrefix: 'Dr.', givenNames: 'Michelle', familyNames: 'Foster', firstName: 'Michelle', lastName: 'Foster', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c_outreach_derm'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph32', namePrefix: 'Dr.', givenNames: 'Nancy', familyNames: 'Graves', firstName: 'Nancy', lastName: 'Graves', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c1'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph33', namePrefix: 'Dr.', givenNames: 'Nathan', familyNames: 'Briggs', firstName: 'Nathan', lastName: 'Briggs', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c_outreach_urology'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph34', namePrefix: 'Dr.', givenNames: 'Pamela', familyNames: 'Winters', firstName: 'Pamela', lastName: 'Winters', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c1'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph35', namePrefix: 'Dr.', givenNames: 'Patricia', familyNames: 'Moore', firstName: 'Patricia', lastName: 'Moore', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c2'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph36', namePrefix: 'Dr.', givenNames: 'Patricia', familyNames: 'Owens', firstName: 'Patricia', lastName: 'Owens', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c1'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph37', namePrefix: 'Dr.', givenNames: 'Priya', familyNames: 'Nair', firstName: 'Priya', lastName: 'Nair', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c1'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph38', namePrefix: 'Dr.', givenNames: 'Rachel', familyNames: 'Kim', firstName: 'Rachel', lastName: 'Kim', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c-westside'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph39', namePrefix: 'Dr.', givenNames: 'Samuel', familyNames: 'Ortega', firstName: 'Samuel', lastName: 'Ortega', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c-westside'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph40', namePrefix: 'Dr.', givenNames: 'Sandra', familyNames: 'Okafor', firstName: 'Sandra', lastName: 'Okafor', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c1'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph41', namePrefix: 'Dr.', givenNames: 'Sarah', familyNames: 'Chen', firstName: 'Sarah', lastName: 'Chen', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c1'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph42', namePrefix: 'Dr.', givenNames: 'Susan', familyNames: 'Park', firstName: 'Susan', lastName: 'Park', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c2'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph43', namePrefix: 'Dr.', givenNames: 'Thomas', familyNames: 'Walsh', firstName: 'Thomas', lastName: 'Walsh', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c-stcatherines'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph44', namePrefix: 'Dr.', givenNames: 'Victor', familyNames: 'Anand', firstName: 'Victor', lastName: 'Anand', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c-westside'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph45', namePrefix: 'Dr.', givenNames: 'Wendy', familyNames: 'Castillo', firstName: 'Wendy', lastName: 'Castillo', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c-stcatherines'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph46', namePrefix: 'Miss', givenNames: 'Fiona', familyNames: 'Radcliffe', firstName: 'Fiona', lastName: 'Radcliffe', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c-royal-manchester'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph47', namePrefix: 'Mr.', givenNames: 'Alistair', familyNames: 'Drummond', firstName: 'Alistair', lastName: 'Drummond', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c-royal-manchester'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph48', namePrefix: 'Mr.', givenNames: 'Andrew', familyNames: 'Pearce', firstName: 'Andrew', lastName: 'Pearce', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c-stcatherines'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph49', namePrefix: 'Mr.', givenNames: 'David', familyNames: 'Holloway', firstName: 'David', lastName: 'Holloway', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c-royal-manchester'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph50', namePrefix: 'Mr.', givenNames: 'David', familyNames: 'Whitmore', firstName: 'David', lastName: 'Whitmore', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c-mft-02'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph51', namePrefix: 'Mr.', givenNames: 'Edward', familyNames: 'Kingsley', firstName: 'Edward', lastName: 'Kingsley', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c-royal-manchester'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph52', namePrefix: 'Mr.', givenNames: 'Gavin', familyNames: 'Fletcher', firstName: 'Gavin', lastName: 'Fletcher', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c-royal-manchester'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph53', namePrefix: 'Mr.', givenNames: 'James', familyNames: 'Caldwell', firstName: 'James', lastName: 'Caldwell', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c-stcatherines'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph54', namePrefix: 'Mr.', givenNames: 'James', familyNames: 'Whitfield', firstName: 'James', lastName: 'Whitfield', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: [], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph55', namePrefix: 'Mr.', givenNames: 'Nicholas', familyNames: 'Farrow', firstName: 'Nicholas', lastName: 'Farrow', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c-royal-manchester'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph56', namePrefix: 'Mr.', givenNames: 'Oliver', familyNames: 'Bancroft', firstName: 'Oliver', lastName: 'Bancroft', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c-royal-manchester'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph57', namePrefix: 'Mr.', givenNames: 'Peter', familyNames: 'Thornton', firstName: 'Peter', lastName: 'Thornton', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c-mft-01'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
  { id: 'ph58', namePrefix: 'Mr.', givenNames: 'Simon', familyNames: 'Hartley', firstName: 'Simon', lastName: 'Hartley', npi: '', specialty: 'General', phone: '', fax: '', email: '', preferredContact: 'Fax', clientIds: ['c-stcatherines'], status: 'Unverified', autoCreated: true, autoCreatedAt: '2026-07-16' },
>>>>>>> upstream/main
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

<<<<<<< HEAD
  async add(physician) {
    await delay();
    const newP: Physician = { ...physician, id: 'ph' + Date.now() };
=======
  async search(query: string, limit = 8) {
    await delay();
    // Strip a leading title — callers frequently search with a full
    // free-text name that includes one (e.g. requestingProvider strings
    // like "Dr. Lisa Wong"), but givenNames/familyNames never store the
    // title (namePrefix is separate) — without this, "Dr. Lisa Wong"
    // would never match a physician actually named "Lisa Wong".
    const q = query.trim().toLowerCase().replace(/^(dr\.?|mr\.?|mrs\.?|ms\.?|miss)\s+/, '');
    const matches = !q
      ? MOCK_PHYSICIANS
      : MOCK_PHYSICIANS.filter(p =>
          `${p.givenNames} ${p.familyNames}`.toLowerCase().includes(q) ||
          p.specialty?.toLowerCase().includes(q) ||
          p.npi?.includes(q)
        );
    return ok(matches.slice(0, limit).map(p => ({ ...p })));
  },

  async add(physician) {
    await delay();
    const newP: Physician = withMirroredNames({ ...physician, id: 'ph' + Date.now() });
>>>>>>> upstream/main
    MOCK_PHYSICIANS = [...MOCK_PHYSICIANS, newP];
    persist(MOCK_PHYSICIANS);
    return ok({ ...newP });
  },

  async update(id, changes) {
    await delay();
    const idx = MOCK_PHYSICIANS.findIndex(p => p.id === id);
    if (idx === -1) return err(`Physician ${id} not found`);
<<<<<<< HEAD
    MOCK_PHYSICIANS = MOCK_PHYSICIANS.map(p => p.id === id ? { ...p, ...changes } : p);
    persist(MOCK_PHYSICIANS);
    return ok({ ...MOCK_PHYSICIANS[idx], ...changes });
=======
    MOCK_PHYSICIANS = MOCK_PHYSICIANS.map(p => {
      if (p.id !== id) return p;
      const merged = { ...p, ...changes };
      return withMirroredNames(merged);
    });
    persist(MOCK_PHYSICIANS);
    return ok({ ...MOCK_PHYSICIANS[idx] });
>>>>>>> upstream/main
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
<<<<<<< HEAD
    const newP: Physician = {
      id: 'ph' + Date.now(), firstName: name.first, lastName: name.last,
      npi, specialty: 'General', phone: '', fax: '', email: '',
      preferredContact: 'Fax', clientIds: [], status: 'Unverified',
      autoCreated: true, autoCreatedAt: new Date().toISOString().split('T')[0],
    };
=======
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

  async findOrCreateByName(name: string, clientId?: string) {
    await delay();
    const trimmed = name.trim();
    if (!trimmed) return err('Cannot resolve an empty provider name');

    // Best-effort parse: strip a leading title (Dr./Mr./Mrs./Ms./Miss),
    // last whitespace-separated token is the family name, everything
    // else in between is the given name(s). Matches the free-text
    // shape requestingProvider actually arrives in (e.g. "Dr. Sarah
    // Chen", "Mr. Ian Faulkner") — there's no structured name data at
    // intake to do better than this with.
    const titleMatch = trimmed.match(/^(Dr\.?|Mr\.?|Mrs\.?|Ms\.?|Miss)\s+/i);
    const namePrefix = titleMatch ? titleMatch[0].trim() : undefined;
    const rest = titleMatch ? trimmed.slice(titleMatch[0].length) : trimmed;
    const parts = rest.trim().split(/\s+/);
    const familyNames = parts.length > 1 ? parts[parts.length - 1] : parts[0];
    const givenNames = parts.length > 1 ? parts.slice(0, -1).join(' ') : '';

    const existing = MOCK_PHYSICIANS.find(p =>
      `${p.givenNames} ${p.familyNames}`.trim().toLowerCase() === `${givenNames} ${familyNames}`.trim().toLowerCase()
    );
    if (existing) {
      if (clientId && !existing.clientIds.includes(clientId)) {
        return mockPhysicianService.update(existing.id, { clientIds: [...existing.clientIds, clientId] });
      }
      return ok({ ...existing });
    }

    const newP: Physician = withMirroredNames({
      id: 'ph' + Date.now(), namePrefix, givenNames, familyNames,
      npi: '', specialty: 'General', phone: '', fax: '', email: '',
      preferredContact: 'Fax', clientIds: clientId ? [clientId] : [], status: 'Unverified',
      autoCreated: true, autoCreatedAt: new Date().toISOString().split('T')[0],
    } as Physician);
>>>>>>> upstream/main
    MOCK_PHYSICIANS = [...MOCK_PHYSICIANS, newP];
    persist(MOCK_PHYSICIANS);
    return ok({ ...newP });
  },
};
