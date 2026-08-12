// src/services/governingBodies/IGoverningBodyService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real persistence for Governing Bodies (CAP, RCPath, ICCR, RCPA, and any
// custom bodies a super-admin adds) — found via a direct audit that
// components/Config/System/GoverningBodiesSection.tsx's handleSave was
// a bare `/* TODO: persist */` comment: every toggle, edit, add, and
// remove only ever touched React state, never saved anywhere. A refresh
// silently discarded every change, while the UI's own "unsaved changes"
// indicator cleared as if the save had genuinely succeeded.
//
// firestore.rules already has a real /governingBodies/{docId} collection
// defined (platform-level, ForMedrix-staff-only write access) — the
// backend schema already anticipated this data existing; the frontend
// just never actually wrote to it.
//
// Global, not organisation-scoped — CAP/RCPath/ICCR/RCPA are platform-
// wide standards bodies, the same "platform-level admin config" concept
// firestore.rules' own comment describes for this collection, distinct
// from anything org-scoped elsewhere in this app.
// ─────────────────────────────────────────────────────────────────────────────

export interface GoverningBody {
  id:          string;
  label:       string;
  fullName:    string;
  region:      string;
  website:     string;
  enabled:     boolean;
  syncEnabled: boolean;
  isCustom:    boolean;
}

export interface IGoverningBodyService {
  getAll(): Promise<GoverningBody[]>;
  /** Real, whole-list save — matches how GoverningBodiesSection.tsx
   *  already manages this as one in-memory array with a single
   *  Save button, rather than per-row autosave. */
  saveAll(bodies: GoverningBody[]): Promise<void>;
}
