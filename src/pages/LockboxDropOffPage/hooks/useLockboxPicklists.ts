// src/pages/LockboxDropOffPage/hooks/useLockboxPicklists.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 645: the existing client (facility) and physician dictionaries, as picklist options for the placeholder form.
// Read once, active records only, sorted by name. Nothing is added to either dictionary from here.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { facilityService, physicianService } from '@/services';

export interface PicklistOption { id: string; label: string }

export function useLockboxPicklists(enabled: boolean) {
  const [clients, setClients] = useState<PicklistOption[]>([]);
  const [physicians, setPhysicians] = useState<PicklistOption[]>([]);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const byLabel = (a: PicklistOption, b: PicklistOption) => a.label.localeCompare(b.label);
    void facilityService.getAll().then(r => {
      if (!cancelled && r.ok === true) setClients(r.data.filter(f => f.status !== 'Inactive').map(f => ({ id: f.id, label: f.name })).sort(byLabel));
    });
    void physicianService.getAll().then(r => {
      if (!cancelled && r.ok === true) setPhysicians(r.data.filter(p => p.status === 'Active').map(p => ({ id: p.id, label: [p.givenNames, p.familyNames].filter(Boolean).join(' ') })).sort(byLabel));
    });
    return () => { cancelled = true; };
  }, [enabled]);
  return { clients, physicians };
}
