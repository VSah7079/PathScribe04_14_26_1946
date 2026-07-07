// src/services/protocols/IProtocolService.ts
// ─────────────────────────────────────────────────────────────
// Protocols as their own standalone, referenceable dictionary —
// deliberately NOT embedded on SpecimenEntry. Real lab reality: wildly
// different specimen types (gallbladder, appendix, a benign skin
// shave, an antral gastric biopsy) frequently share the exact same
// processing workflow ("Standard Small Biopsy — 1 block, 1 H&E").
// Embedding a protocol per specimen type means updating a shared
// routine requires editing every specimen type that happens to use it,
// with zero connection between the copies once they exist — this
// dictionary exists specifically so a lab manager updates the one
// master Protocol and it cascades everywhere that references it.
//
// SpecimenEntry now only carries an optional protocolId reference
// (Config/System/specimenTypes.ts) — "what the tissue is" stays
// separate from "how the lab processes it," per the actual reasoning
// this migration was built from.
// ─────────────────────────────────────────────────────────────

import type { ServiceResult, ID } from '../types';

export interface ProtocolPathway {
  id: string;
  /** e.g. "Light Microscopy", "Immunofluorescence", "Electron Microscopy" —
   *  shown to users as "Track" (Track 1, Track 2...), per the naming
   *  clarified when this was still embedded: "Protocol" is reserved for
   *  the outer container, "Track" for each branch inside it. */
  pathwayName: string;
  /** Free text, deliberately not a rigid enum — real fixative naming
   *  varies (e.g. "Michel's Transport Medium" vs. "Michel's medium"),
   *  and a closed enum would just force awkward mapping later. */
  fixativeType: string;
  requiresDecal: boolean;
  decalDefaultDurationMins?: number;
  /** e.g. "Standard", "Megablock", "Frozen Block", "Resin Grid" — same
   *  free-text reasoning as fixativeType. */
  processingFormat: string;
  tasks: PathwayTask[];
}

export interface PathwayTask {
  id: string;
  stepOrder: number;
  /** e.g. "Cut Level 1", "Frozen Section", "Ultra-thin Sectioning" */
  action: string;
  /** References into the real Stain Dictionary (StainType.id) — not
   *  stain name strings. */
  stainTypeIds: string[];
  slideCount?: number;
  /** Explicit held/reserved level — e.g. "Level 5 (Hold)" with nothing
   *  ordered on it yet. Was previously implicit (an empty stainTypeIds
   *  array with no other signal); made explicit so a genuinely-held
   *  step is never confused with a step someone just forgot to fill in. */
  isHold?: boolean;
}

export interface Protocol {
  id: ID;
  name: string;
  description?: string;
  /** Whether specimens using this protocol need a triage decision at
   *  the grossing bench before processing can proceed — e.g. "split
   *  the core into LM/IF/EM portions" for renal. */
  requiresTriage: boolean;
  /** Real, discrete checklist items — not one free-text block. Each
   *  item is something a bench tech could eventually check off one at
   *  a time (connects to the Grossing "confirm triage" voice command
   *  built earlier). */
  triageChecklist?: string[];
  pathways: ProtocolPathway[];
  active: boolean;
  version: number;
  updatedBy: string;
  updatedAt: string;
}

export interface IProtocolService {
  getAll(): Promise<ServiceResult<Protocol[]>>;
  add(entry: Omit<Protocol, 'id' | 'version' | 'updatedBy' | 'updatedAt'>): Promise<ServiceResult<Protocol>>;
  update(id: ID, changes: Partial<Omit<Protocol, 'id'>>): Promise<ServiceResult<Protocol>>;
}
