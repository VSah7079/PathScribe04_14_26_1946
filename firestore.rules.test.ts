// firestore.rules.test.ts
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { setDoc, getDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

const PROJECT_ID = 'demo-pathscribe';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8085,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

const orgAUser = () => testEnv.authenticatedContext('user-org-a', { organisationId: 'org-a' });
const orgBUser = () => testEnv.authenticatedContext('user-org-b', { organisationId: 'org-b' });
const vendorStaff = () => testEnv.authenticatedContext('formedrix-staff-1', { vendorStaff: true, organisationId: null });
const serviceAccount = () => testEnv.authenticatedContext('svc-reflab-1', { serviceAccount: 'reflab-integration-1' });
const anonymous = () => testEnv.unauthenticatedContext();

async function seedCase(caseId: string, data: Record<string, any>) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'cases', caseId), data);
  });
}

describe('firestore.rules - /cases/{caseId}', () => {
  it('a user can read a case in their own organisation', async () => {
    await seedCase('C1', { organisationId: 'org-a', status: 'draft', version: 1 });
    const db = orgAUser().firestore();
    await assertSucceeds(getDoc(doc(db, 'cases', 'C1')));
  });

  it('a user CANNOT read a case in a different organisation', async () => {
    await seedCase('C1', { organisationId: 'org-a', status: 'draft', version: 1 });
    const db = orgBUser().firestore();
    await assertFails(getDoc(doc(db, 'cases', 'C1')));
  });

  it('an unauthenticated caller cannot read anything', async () => {
    await seedCase('C1', { organisationId: 'org-a', status: 'draft', version: 1 });
    const db = anonymous().firestore();
    await assertFails(getDoc(doc(db, 'cases', 'C1')));
  });

  it('a same-org user can update a draft case with a matching version', async () => {
    await seedCase('C1', { organisationId: 'org-a', status: 'draft', version: 1 });
    const db = orgAUser().firestore();
    await assertSucceeds(updateDoc(doc(db, 'cases', 'C1'), { orchSections: [], version: 2 }));
  });

  it('a same-org user CANNOT update with a stale/mismatched version', async () => {
    await seedCase('C1', { organisationId: 'org-a', status: 'draft', version: 3 });
    const db = orgAUser().firestore();
    await assertFails(updateDoc(doc(db, 'cases', 'C1'), { orchSections: [], version: 3 }));
  });

  it('a client CANNOT write LIS-owned fields (patient) even within their own org', async () => {
    await seedCase('C1', { organisationId: 'org-a', status: 'draft', version: 1, patient: { firstName: 'Real' } });
    const db = orgAUser().firestore();
    await assertFails(updateDoc(doc(db, 'cases', 'C1'), { patient: { firstName: 'Hacked' }, version: 2 }));
  });

  it('a finalized case narrative write is hard-locked for regular users', async () => {
    await seedCase('C1', { organisationId: 'org-a', status: 'finalized', version: 5 });
    const db = orgAUser().firestore();
    await assertFails(updateDoc(doc(db, 'cases', 'C1'), { orchSections: [{ text: 'late edit' }], version: 6 }));
  });

  it('a status transition OFF finalized is allowed', async () => {
    await seedCase('C1', { organisationId: 'org-a', status: 'finalized', version: 5 });
    const db = orgAUser().firestore();
    await assertSucceeds(updateDoc(doc(db, 'cases', 'C1'), { status: 'draft', version: 6 }));
  });

  it('cases are never hard-deleted, even by a same-org user', async () => {
    await seedCase('C1', { organisationId: 'org-a', status: 'draft', version: 1 });
    const db = orgAUser().firestore();
    await assertFails(deleteDoc(doc(db, 'cases', 'C1')));
  });

  it('a service account has no direct write path to /cases at all', async () => {
    await seedCase('C1', { organisationId: 'org-a', status: 'draft', version: 1 });
    const db = serviceAccount().firestore();
    await assertFails(updateDoc(doc(db, 'cases', 'C1'), { version: 2 }));
  });
});

describe('firestore.rules - /ancillaryResultsStaging/{entryId}', () => {
  it('a service account can create a staging entry for its own identity', async () => {
    const db = serviceAccount().firestore();
    await assertSucceeds(setDoc(doc(db, 'ancillaryResultsStaging', 'S1'), {
      caseId: 'C1', serviceAccountId: 'reflab-integration-1', payload: {},
    }));
  });

  it('a service account CANNOT create a staging entry claiming a different identity', async () => {
    const db = serviceAccount().firestore();
    await assertFails(setDoc(doc(db, 'ancillaryResultsStaging', 'S1'), {
      caseId: 'C1', serviceAccountId: 'someone-elses-identity', payload: {},
    }));
  });

  it('a regular interactive user cannot create a staging entry at all', async () => {
    const db = orgAUser().firestore();
    await assertFails(setDoc(doc(db, 'ancillaryResultsStaging', 'S1'), {
      caseId: 'C1', serviceAccountId: 'user-org-a', payload: {},
    }));
  });

  it('a staging entry can never be updated or deleted by anyone', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'ancillaryResultsStaging', 'S1'), {
        caseId: 'C1', serviceAccountId: 'reflab-integration-1', payload: {},
      });
    });
    const db = serviceAccount().firestore();
    await assertFails(updateDoc(doc(db, 'ancillaryResultsStaging', 'S1'), { payload: { edited: true } }));
    await assertFails(deleteDoc(doc(db, 'ancillaryResultsStaging', 'S1')));
  });
});

describe('firestore.rules - /auditLog/{entryId}', () => {
  it('a signed-in user can create an audit entry', async () => {
    const db = orgAUser().firestore();
    await assertSucceeds(setDoc(doc(db, 'auditLog', 'A1'), { event: 'case.read', caseId: 'C1' }));
  });

  it('vendor staff can read audit entries; a regular customer user cannot', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'auditLog', 'A1'), { event: 'case.read', caseId: 'C1' });
    });
    await assertSucceeds(getDoc(doc(vendorStaff().firestore(), 'auditLog', 'A1')));
    await assertFails(getDoc(doc(orgAUser().firestore(), 'auditLog', 'A1')));
  });

  it('an existing audit entry can never be updated or deleted', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'auditLog', 'A1'), { event: 'case.read', caseId: 'C1' });
    });
    const db = vendorStaff().firestore();
    await assertFails(updateDoc(doc(db, 'auditLog', 'A1'), { event: 'edited' }));
    await assertFails(deleteDoc(doc(db, 'auditLog', 'A1')));
  });
});

describe('firestore.rules - platform-level admin config', () => {
  it('vendor staff can write to Governing Bodies', async () => {
    const db = vendorStaff().firestore();
    await assertSucceeds(setDoc(doc(db, 'governingBodies', 'CAP'), { name: 'College of American Pathologists' }));
  });

  it('a regular customer admin CANNOT write to Governing Bodies', async () => {
    const db = orgAUser().firestore();
    await assertFails(setDoc(doc(db, 'governingBodies', 'CAP'), { name: 'Attempted overwrite' }));
  });

  it('any signed-in user can still read Governing Bodies', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'governingBodies', 'CAP'), { name: 'College of American Pathologists' });
    });
    await assertSucceeds(getDoc(doc(orgAUser().firestore(), 'governingBodies', 'CAP')));
  });

  it('the same vendor-staff gate applies to Terminology Service config', async () => {
    await assertFails(
      setDoc(doc(orgAUser().firestore(), 'terminologyServiceConfig', 'icd10'), { variant: 'tampered' })
    );
    await assertSucceeds(
      setDoc(doc(vendorStaff().firestore(), 'terminologyServiceConfig', 'icd10'), { variant: 'icd10cm' })
    );
  });
});

describe('firestore.rules - default deny', () => {
  it('an unmatched collection is denied entirely', async () => {
    const db = vendorStaff().firestore();
    await assertFails(setDoc(doc(db, 'someUnlistedCollection', 'X1'), { anything: true }));
  });
});
