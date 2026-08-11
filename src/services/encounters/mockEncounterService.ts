// src/services/encounters/mockEncounterService.ts
import type { IEncounterService, Encounter, EncounterStatus } from './IEncounterService';
import type { ServiceResult } from '../types';
import { mockPatientEventBus } from '../events/mockPatientEventBus';

const STORAGE_KEY = 'pathscribe_encounters';
const delay = (ms = 60) => new Promise(res => setTimeout(res, ms));

function loadEncounters(): Encounter[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveEncounters(encounters: Encounter[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(encounters)); } catch { /* non-critical */ }
}

let idCounter = 0;
function generateEncounterId(): string {
  idCounter += 1;
  return `ENC-${Date.now().toString(36)}-${idCounter}`;
}

export const mockEncounterService: IEncounterService = {
  async getById(encounterId: string): Promise<ServiceResult<Encounter | null>> {
    await delay();
    return { ok: true, data: loadEncounters().find(e => e.id === encounterId) ?? null };
  },

  async listForPatient(patientId: string): Promise<ServiceResult<Encounter[]>> {
    await delay();
    const results = loadEncounters()
      .filter(e => e.patientId === patientId)
      .sort((a, b) => (b.admitTime ?? b.createdAt).localeCompare(a.admitTime ?? a.createdAt));
    return { ok: true, data: results };
  },

  async getByEncounterNumber(organisationId: string, encounterNumber: string): Promise<ServiceResult<Encounter | null>> {
    await delay();
    const match = loadEncounters().find(
      e => e.organisationId === organisationId && e.encounterNumber === encounterNumber
    );
    return { ok: true, data: match ?? null };
  },

  async resolveOrCreateEncounter(input): Promise<ServiceResult<Encounter>> {
    await delay();
    const encounters = loadEncounters();

    // Real fix: never a silent duplicate for a repeat reference to the
    // same real visit - the same (organisationId, encounterNumber)
    // pair always resolves to the one, real, existing encounter.
    const existing = encounters.find(
      e => e.organisationId === input.organisationId && e.encounterNumber === input.encounterNumber
    );
    if (existing) return { ok: true, data: existing };

    const now = new Date().toISOString();
    const created: Encounter = {
      id: generateEncounterId(),
      organisationId: input.organisationId,
      patientId: input.patientId,
      encounterNumber: input.encounterNumber,
      encounterClass: input.encounterClass,
      status: input.status ?? 'Planned',
      admitTime: input.admitTime,
      facility: input.facility,
      department: input.department,
      ward: input.ward,
      room: input.room,
      bed: input.bed,
      locationId: input.locationId,
      attendingProvider: input.attendingProvider,
      sourceAccession: input.sourceAccession,
      createdAt: now,
      updatedAt: now,
      // Real bug found and fixed, per direct confirmation while
      // working through the full list of ADT trigger events: without
      // this, a newly-created encounter's very first follow-up event
      // (even a genuinely stale/out-of-order one) was silently ALWAYS
      // accepted, since every sequence-control check below only fires
      // once lastEventAt is already set. See Encounter.lastEventAt's
      // own doc comment for the full story.
      lastEventAt: input.eventTimestamp,
    };
    saveEncounters([...encounters, created]);
    mockPatientEventBus.publish({ type: 'Encounter.Created', encounter: created });
    return { ok: true, data: created };
  },

  async updateStatus(
    encounterId: string,
    status: EncounterStatus,
    eventTimestamp: string,
    dischargeTime?: string,
    dischargeDisposition?: string
  ): Promise<ServiceResult<{ encounter: Encounter; applied: boolean }>> {
    await delay();
    const encounters = loadEncounters();
    const idx = encounters.findIndex(e => e.id === encounterId);
    if (idx === -1) return { ok: false, error: `Encounter ${encounterId} not found` };

    const current = encounters[idx];

    // Real, critical sequence-control check - same real reasoning as
    // mockPatientIndexService.updateDemographics: a genuinely stale
    // event (older than, or a re-delivery of, the one already
    // applied) is honestly rejected, never silently applied over
    // newer state.
    if (current.lastEventAt && eventTimestamp <= current.lastEventAt) {
      return { ok: true, data: { encounter: current, applied: false } };
    }

    const updated: Encounter = {
      ...current,
      status,
      dischargeTime: dischargeTime ?? current.dischargeTime,
      dischargeDisposition: dischargeDisposition ?? current.dischargeDisposition,
      lastEventAt: eventTimestamp,
      updatedAt: new Date().toISOString(),
    };
    encounters[idx] = updated;
    saveEncounters(encounters);
    mockPatientEventBus.publish({ type: 'Encounter.StatusChanged', encounter: updated, previousStatus: current.status });
    return { ok: true, data: { encounter: updated, applied: true } };
  },

  // Real feature, per direct confirmation: working through the full
  // list of ADT trigger events — A02 (Transfer), A09/A10 (Patient
  // Tracking). Same real sequence-control discipline as updateStatus.
  // Automatically captures the current locationId as
  // previousLocationId before applying the new one — see
  // Encounter.previousLocationId's own doc comment.
  async updateLocation(encounterId, locationId, eventTimestamp) {
    await delay();
    const encounters = loadEncounters();
    const idx = encounters.findIndex(e => e.id === encounterId);
    if (idx === -1) return { ok: false, error: `Encounter ${encounterId} not found` };

    const current = encounters[idx];
    if (current.lastEventAt && eventTimestamp <= current.lastEventAt) {
      return { ok: true, data: { encounter: current, applied: false } };
    }

    const updated: Encounter = {
      ...current,
      previousLocationId: current.locationId,
      locationId,
      lastEventAt: eventTimestamp,
      updatedAt: new Date().toISOString(),
    };
    encounters[idx] = updated;
    saveEncounters(encounters);
    return { ok: true, data: { encounter: updated, applied: true } };
  },

  // Real feature, per direct confirmation — A06/A07 (patient class
  // change). Same real sequence-control discipline as updateStatus.
  async updateClass(encounterId, encounterClass, eventTimestamp) {
    await delay();
    const encounters = loadEncounters();
    const idx = encounters.findIndex(e => e.id === encounterId);
    if (idx === -1) return { ok: false, error: `Encounter ${encounterId} not found` };

    const current = encounters[idx];
    if (current.lastEventAt && eventTimestamp <= current.lastEventAt) {
      return { ok: true, data: { encounter: current, applied: false } };
    }

    const updated: Encounter = {
      ...current,
      encounterClass,
      lastEventAt: eventTimestamp,
      updatedAt: new Date().toISOString(),
    };
    encounters[idx] = updated;
    saveEncounters(encounters);
    return { ok: true, data: { encounter: updated, applied: true } };
  },

  // Real feature, per direct confirmation — A08's real, previously-
  // missing metadata effect (PV1-7/10/14/20). Only the fields
  // genuinely present in `changes` are applied; an A08 carrying only
  // a new attending shouldn't blank out an existing hospital service.
  async updateMetadata(encounterId, changes, eventTimestamp) {
    await delay();
    const encounters = loadEncounters();
    const idx = encounters.findIndex(e => e.id === encounterId);
    if (idx === -1) return { ok: false, error: `Encounter ${encounterId} not found` };

    const current = encounters[idx];
    if (current.lastEventAt && eventTimestamp <= current.lastEventAt) {
      return { ok: true, data: { encounter: current, applied: false } };
    }

    const updated: Encounter = {
      ...current,
      attendingProvider: changes.attendingProvider ?? current.attendingProvider,
      hospitalService: changes.hospitalService ?? current.hospitalService,
      admitSource: changes.admitSource ?? current.admitSource,
      financialClass: changes.financialClass ?? current.financialClass,
      lastEventAt: eventTimestamp,
      updatedAt: new Date().toISOString(),
    };
    encounters[idx] = updated;
    saveEncounters(encounters);
    return { ok: true, data: { encounter: updated, applied: true } };
  },

  // Real feature, per direct confirmation — A12 (Cancel Transfer):
  // restores locationId from the real, captured previousLocationId.
  // Genuinely a no-op (applied: false, not an error) when there's
  // nothing to restore — never transferred, or already restored once.
  async cancelTransfer(encounterId, eventTimestamp) {
    await delay();
    const encounters = loadEncounters();
    const idx = encounters.findIndex(e => e.id === encounterId);
    if (idx === -1) return { ok: false, error: `Encounter ${encounterId} not found` };

    const current = encounters[idx];
    if (!current.previousLocationId) {
      return { ok: true, data: { encounter: current, applied: false } };
    }
    if (current.lastEventAt && eventTimestamp <= current.lastEventAt) {
      return { ok: true, data: { encounter: current, applied: false } };
    }

    const updated: Encounter = {
      ...current,
      locationId: current.previousLocationId,
      previousLocationId: undefined,
      lastEventAt: eventTimestamp,
      updatedAt: new Date().toISOString(),
    };
    encounters[idx] = updated;
    saveEncounters(encounters);
    return { ok: true, data: { encounter: updated, applied: true } };
  },
};
