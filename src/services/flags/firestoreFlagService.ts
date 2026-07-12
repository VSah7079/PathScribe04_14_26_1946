import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  Firestore,
} from 'firebase/firestore';

import { IFlagService, Flag } from './IFlagService';
import { ServiceResult, ID } from '../types';

// ── Note for whoever wires this up to a real Firestore backend ──────────
// Flag.tagClass ('ADMINISTRATIVE' | 'COMPUTATIONAL') still exists on the
// type for backward compatibility with existing mock seed data, but it
// is functionally dead — nothing in the app reads it to make a decision
// anymore (see the comment on Flag.tagClass in IFlagService.ts for the
// full reasoning, and the FlagManagerModal fix it was blocking). Do NOT
// persist it as a real field in whatever schema/collection backs this —
// no index, no column, no required field. If a genuine need for a
// flag-type distinction resurfaces later, it deserves a fresh field and
// a fresh reason, not a revival of this one.
// ──────────────────────────────────────────────────────────────────────

const COL = 'flags';

const ok  = <T>(data: T):     ServiceResult<T> => ({ ok: true,  data  });
const err = <T>(msg: string): ServiceResult<T> => ({ ok: false, error: msg });

const toFlag = (id: string, data: Record<string, unknown>): Flag =>
  ({ id, ...data } as Flag);

export class FirestoreFlagService implements IFlagService {
  constructor(private readonly db: Firestore) {}

  async getAll(): Promise<ServiceResult<Flag[]>> {
    try {
      const snap = await getDocs(collection(this.db, COL));
      return ok(snap.docs.map(d => toFlag(d.id, d.data() as Record<string, unknown>)));
    } catch (e) {
      return err((e as Error).message);
    }
  }

  async getById(id: ID): Promise<ServiceResult<Flag>> {
    try {
      const snap = await getDoc(doc(this.db, COL, id));
      if (!snap.exists()) return err(`Flag ${id} not found`);
      return ok(toFlag(snap.id, snap.data() as Record<string, unknown>));
    } catch (e) {
      return err((e as Error).message);
    }
  }

  async add(flag: Omit<Flag, 'id'>): Promise<ServiceResult<Flag>> {
    try {
      const ref = await addDoc(collection(this.db, COL), flag);
      return ok({ id: ref.id, ...flag });
    } catch (e) {
      return err((e as Error).message);
    }
  }

  async update(id: ID, changes: Partial<Omit<Flag, 'id'>>): Promise<ServiceResult<Flag>> {
    try {
      const ref  = doc(this.db, COL, id);
      await updateDoc(ref, changes as Record<string, unknown>);
      const snap = await getDoc(ref);
      return ok(toFlag(snap.id, snap.data() as Record<string, unknown>));
    } catch (e) {
      return err((e as Error).message);
    }
  }

  async deactivate(id: ID): Promise<ServiceResult<Flag>> {
    return this.update(id, { status: 'Inactive' });
  }

  async reactivate(id: ID): Promise<ServiceResult<Flag>> {
    return this.update(id, { status: 'Active' });
  }
}
