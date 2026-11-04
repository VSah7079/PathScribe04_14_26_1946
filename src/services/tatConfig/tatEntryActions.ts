// src/services/tatConfig/tatEntryActions.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 450 (PS-38): the TAT settings screen's add, edit, switch-on/off and
// delete actions, moved out of TATConfigSection.tsx so they can be tested.
//
// PS-38 found two competing implementations in that screen, the live one
// without audit logging. Each action here calls the TAT target service and,
// only when the service accepts the change, writes its audit entry. A refused
// change (a system default cannot be deleted; the user lacks
// config:tat-targets:manage) writes nothing.
// ─────────────────────────────────────────────────────────────────────────────
import type { ServiceResult } from '../types';
import type { TATEntry } from '@/types/quality/TatConfigEntry';
import type { ITatTargetService } from './ITatTargetService';

/** The audit entries these actions write (the payloads of useAuditLog's catalogue). */
export interface TatAuditLog {
  (action: 'tat_entry_created', payload: { type: string; targetHours: number; facilityId: string | null; roleId: string | null }): void;
  (action: 'tat_entry_updated', payload: { id: string; type: string; changes: string[] }): void;
  (action: 'tat_entry_toggled', payload: { id: string; type: string; active: boolean }): void;
  (action: 'tat_entry_deleted', payload: { id: string; type: string }): void;
}

type TatService = Pick<ITatTargetService, 'add' | 'update' | 'remove'>;

/** Saves from the editor: 'edit' updates, 'add' (including a duplicate) adds. */
export async function saveTatEntry(service: TatService, log: TatAuditLog, entry: TATEntry, mode: 'add' | 'edit'): Promise<ServiceResult<TATEntry>> {
  const res = mode === 'edit' ? await service.update(entry) : await service.add(entry);
  if (res.ok) {
    if (mode === 'edit') log('tat_entry_updated', { id: entry.id, type: entry.type, changes: [`targetHours: ${entry.targetHours}h`] });
    else log('tat_entry_created', { type: entry.type, targetHours: entry.targetHours, facilityId: entry.facilityId ?? null, roleId: entry.roleId ?? null });
  }
  return res;
}

/** Switches a target on or off. System defaults can be switched off. Null when the id is unknown. */
export async function toggleTatEntry(service: TatService, log: TatAuditLog, entries: readonly TATEntry[], id: string): Promise<ServiceResult<TATEntry> | null> {
  const target = entries.find(e => e.id === id);
  if (!target) return null;
  const res = await service.update({ ...target, active: !target.active });
  if (res.ok) log('tat_entry_toggled', { id, type: target.type, active: !target.active });
  return res;
}

/** Deletes a target; the service refuses a system default ('systemDefault'). */
export async function deleteTatEntry(service: TatService, log: TatAuditLog, entries: readonly TATEntry[], id: string): Promise<ServiceResult<void>> {
  const target = entries.find(e => e.id === id);
  const res = await service.remove(id);
  if (res.ok && target) log('tat_entry_deleted', { id, type: target.type });
  return res;
}
