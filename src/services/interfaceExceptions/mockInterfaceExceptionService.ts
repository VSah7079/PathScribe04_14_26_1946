// src/services/interfaceExceptions/mockInterfaceExceptionService.ts
import { ServiceResult, ID } from '../types';
import { storageGet, storageSet } from '../mockStorage';
import type { InterfaceException, IInterfaceExceptionService } from './IInterfaceExceptionService';

const load    = (): InterfaceException[] => storageGet<InterfaceException[]>('pathscribe_interface_exceptions', []);
const persist = (data: InterfaceException[]) => storageSet('pathscribe_interface_exceptions', data);

const ok    = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const err   = <T>(error: string): ServiceResult<T> => ({ ok: false, error });
const delay = () => new Promise(r => setTimeout(r, 80));

export const mockInterfaceExceptionService: IInterfaceExceptionService = {
  async getAll() { await delay(); return ok([...load()]); },

  async getPending() {
    await delay();
    return ok(load().filter(e => e.status === 'pending'));
  },

  async getById(id: ID) {
    await delay();
    const e = load().find(e => e.id === id);
    return e ? ok({ ...e }) : err(`Interface exception ${id} not found`);
  },

  async create(input) {
    await delay();
    const exceptions = load();
    const nowIso = new Date().toISOString();
    const created: InterfaceException = { ...input, id: `iex-${Date.now().toString(36)}`, status: 'pending', createdAt: nowIso };
    persist([...exceptions, created]);
    return ok({ ...created });
  },

  async resolve(id, resolvedBy, note) {
    await delay();
    const exceptions = load();
    const idx = exceptions.findIndex(e => e.id === id);
    if (idx === -1) return err(`Interface exception ${id} not found`);
    exceptions[idx] = { ...exceptions[idx], status: 'resolved', resolvedAt: new Date().toISOString(), resolvedBy, resolutionNote: note };
    persist(exceptions);
    return ok({ ...exceptions[idx] });
  },

  async dismiss(id, resolvedBy, note) {
    await delay();
    const exceptions = load();
    const idx = exceptions.findIndex(e => e.id === id);
    if (idx === -1) return err(`Interface exception ${id} not found`);
    exceptions[idx] = { ...exceptions[idx], status: 'dismissed', resolvedAt: new Date().toISOString(), resolvedBy, resolutionNote: note };
    persist(exceptions);
    return ok({ ...exceptions[idx] });
  },
};
