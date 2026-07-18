// Stub only — real implementation pending backend cutover.
// mockParticipationTypeService.ts is the active implementation; this satisfies the
// service interface's contract so the swap to a real backend is a
// one-line change in services/index.ts when that backend exists.

// src/services/participationTypes/firestoreParticipationTypeService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Firestore implementation of IParticipationTypeService.
//
// Collection path: organisations/{orgId}/participationTypes/{typeId}
//
// Tenant provisioning seeds BUILT_IN_PARTICIPATION_TYPES into this collection
// when a new customer organisation is created. Admins can then add, edit, or
// deactivate types via System → Participation Types. The seed is a one-time
// write and never overwrites subsequent admin changes.
//
// To swap from mock → Firestore:
//   In your service router / DI container, replace:
//     mockParticipationTypeService
//   with:
//     firestoreParticipationTypeService(db, orgId)
// ─────────────────────────────────────────────────────────────────────────────

import {
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  WriteBatch,
  writeBatch,
} from 'firebase/firestore';

import type {
  IParticipationTypeService,
  ParticipationTypeRecord,
  NewParticipationType,
} from './IParticipationTypeService';
import type { ServiceResult, ID } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ok  = <T>(data: T): ServiceResult<T>    => ({ ok: true,  data });
const err = <T>(msg: string): ServiceResult<T> => ({ ok: false, error: msg });

function fromDoc(id: string, data: Record<string, any>): ParticipationTypeRecord {
  return {
    id,
    label:          data.label          ?? '',
    description:    data.description    ?? '',
    color:          data.color          ?? '#64748b',
    icon:           data.icon,
    allowsMultiple: data.allowsMultiple ?? false,
    requiresNote:   data.requiresNote   ?? false,
    active:         data.active         ?? true,
    isSystem:       data.isSystem       ?? false,
    sortOrder:      data.sortOrder      ?? 999,
  };
}

// ─── Factory ──────────────────────────────────────────────────────────────────
// Returns a service instance bound to a specific org.
// Call once per session and cache the result.

export function firestoreParticipationTypeService(
  db:    Firestore,
  orgId: string,
): IParticipationTypeService {

  const col = () => collection(db, 'organisations', orgId, 'participationTypes');

  return {

    // ── getAll ──────────────────────────────────────────────────────────────
    async getAll() {
      try {
        const snap = await getDocs(query(col(), orderBy('sortOrder')));
        const data = snap.docs.map(d => fromDoc(d.id, d.data()));
        return ok(data);
      } catch (e: any) {
        return err(`getAll failed: ${e.message}`);
      }
    },

    // ── getActive ───────────────────────────────────────────────────────────
    async getActive() {
      try {
        const snap = await getDocs(
          query(col(), where('active', '==', true), orderBy('sortOrder'))
        );
        const data = snap.docs.map(d => fromDoc(d.id, d.data()));
        return ok(data);
      } catch (e: any) {
        return err(`getActive failed: ${e.message}`);
      }
    },

    // ── getById ─────────────────────────────────────────────────────────────
    async getById(id: ID) {
      try {
        const snap = await getDoc(doc(col(), String(id)));
        if (!snap.exists()) return err(`ParticipationType ${id} not found`);
        return ok(fromDoc(snap.id, snap.data()));
      } catch (e: any) {
        return err(`getById failed: ${e.message}`);
      }
    },

    // ── add ─────────────────────────────────────────────────────────────────
    async add(type: NewParticipationType) {
      try {
        // Determine next sort order
        const snap = await getDocs(query(col(), orderBy('sortOrder')));
        const maxOrder = snap.docs.reduce((m, d) => Math.max(m, d.data().sortOrder ?? 0), 0);

        const ref  = await addDoc(col(), {
          ...type,
          isSystem:   false,
          sortOrder:  maxOrder + 1,
          createdAt:  serverTimestamp(),
          updatedAt:  serverTimestamp(),
        });
        const created = fromDoc(ref.id, { ...type, isSystem: false, sortOrder: maxOrder + 1 });
        return ok(created);
      } catch (e: any) {
        return err(`add failed: ${e.message}`);
      }
    },

    // ── update ──────────────────────────────────────────────────────────────
    async update(id: ID, changes: Partial<ParticipationTypeRecord>) {
      try {
        const ref = doc(col(), String(id));
        const snap = await getDoc(ref);
        if (!snap.exists()) return err(`ParticipationType ${id} not found`);

        // Guard: isSystem flag cannot be changed via update
        const { isSystem: _ignored, id: _id, ...safeChanges } = changes as any;

        await updateDoc(ref, { ...safeChanges, updatedAt: serverTimestamp() });

        const updated = fromDoc(id as string, { ...snap.data(), ...safeChanges });
        return ok(updated);
      } catch (e: any) {
        return err(`update failed: ${e.message}`);
      }
    },

    // ── deactivate ──────────────────────────────────────────────────────────
    async deactivate(id: ID) {
      return firestoreParticipationTypeService(db, orgId).update(id, { active: false });
    },

    // ── reactivate ──────────────────────────────────────────────────────────
    async reactivate(id: ID) {
      return firestoreParticipationTypeService(db, orgId).update(id, { active: true });
    },

    // ── remove ──────────────────────────────────────────────────────────────
    async remove(id: ID) {
      try {
        const ref  = doc(col(), String(id));
        const snap = await getDoc(ref);
        if (!snap.exists())         return err(`ParticipationType ${id} not found`);
        if (snap.data()?.isSystem)  return err(`Cannot delete system type "${id}"`);
        await deleteDoc(ref);
        return ok(undefined);
      } catch (e: any) {
        return err(`remove failed: ${e.message}`);
      }
    },
  };
}

// ─── Tenant provisioning helper ───────────────────────────────────────────────
// Call this ONCE when a new organisation is created (e.g. in your onboarding
// Cloud Function or admin provisioning script).
// It writes the built-in types as the starting configuration for the tenant.
// Safe to call with force=false on existing tenants — it checks before writing.

export async function seedParticipationTypesForOrg(
  db:                 Firestore,
  orgId:              string,
  builtInTypes:       ParticipationTypeRecord[],
  force:              boolean = false,
): Promise<void> {
  const col = collection(db, 'organisations', orgId, 'participationTypes');

  if (!force) {
    // Check if already seeded
    const existing = await getDocs(query(col, orderBy('sortOrder')));
    if (!existing.empty) {
      console.info(`[Provisioning] org ${orgId} already has participation types — skipping seed`);
      return;
    }
  }

  const batch: WriteBatch = writeBatch(db);

  for (const type of builtInTypes) {
    const ref = doc(col, type.id);
    batch.set(ref, {
      label:          type.label,
      description:    type.description,
      color:          type.color,
      icon:           type.icon ?? null,
      allowsMultiple: type.allowsMultiple,
      requiresNote:   type.requiresNote,
      active:         type.active,
      isSystem:       type.isSystem,
      sortOrder:      type.sortOrder,
      createdAt:      serverTimestamp(),
      updatedAt:      serverTimestamp(),
    });
  }

  await batch.commit();
  console.info(`[Provisioning] Seeded ${builtInTypes.length} participation types for org ${orgId}`);
}
