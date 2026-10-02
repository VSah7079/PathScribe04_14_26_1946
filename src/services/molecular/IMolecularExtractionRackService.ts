// src/services/molecular/IMolecularExtractionRackService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per direct follow-up: "Implement the load into extraction
// rack workflow step (§5.1's secondary_rack stage)." Confirmed
// directly against the given specification's own §2.2: "Physical
// tube rack holding input tubes prior to or during lysis/extraction"
// — a real, distinct physical object from a MolecularBatch's own
// plate (a rack holds raw specimen tubes pre-extraction; a plate
// holds prepared reactions). Kept as its own, separate entity rather
// than folded into MolecularBatch — a rack's own real lifecycle
// (loading tubes) happens independently of, and normally before, any
// specific batch/plate even being created, matching this project's
// own established "genuinely different real object, genuinely
// separate entity" reasoning (services/molecular/README.md's own
// architecture decision for Phase 1).
//
// Real, deliberate simplicity: a rack's own real positions are a flat,
// linear sequence (position "1" through "N"), not a row/column grid
// like a plate's own wells — matching how a real physical tube rack
// is actually laid out (a single row or a simple linear count),
// confirmed against the given specification's own §2.2 description,
// which names no grid/row/column concept for a rack the way §2.3
// explicitly does for a plate.
// ─────────────────────────────────────────────────────────────────────────────

import type { ServiceResult, ID } from '../types';
import type { MolecularMovementRecord } from './IMolecularBatchService';
import type { DeckRackType } from '../equipment/IEquipmentService';
import type { ResolvedFieldRequirement } from '../fieldRequirements/fieldRequirementRules';

export interface MolecularRackPosition {
  positionLabel: string; // e.g. '1', '2', ... 'N' — real, linear, per this file's own header
  specimenUuid?: string;
  accessionNumber?: string;
  containerBarcode?: string;
  /** Real, per §5.1 — the real movement(s) that placed this specific
   *  specimen at this position. Undefined for a genuinely empty
   *  position, never a fabricated empty array. */
  movementHistory?: MolecularMovementRecord[];
}

/** Batch 406 (Pete): where a rack was put on an analyser's deck. */
export interface MolecularRackPlacement {
  /** Equipment.code of the analyser. */
  instrumentCode: string;
  /** StainType.id of the assay, when recorded; it narrows the slots to its rule's. */
  assayCode?: string;
  /** DeckSlot.id; required when the instrument has more than one slot for this rack type. */
  deckSlotId?: string;
  /** How the slot was chosen: the filtered pick-list, or scanning the deck position's barcode. */
  via: 'manual' | 'deckScan';
  placedAt: string;
  placedByUserId: string;
  placedByUserName: string;
}

export interface MolecularExtractionRack {
  id: ID;
  /** Batch 406: the physical rack's own barcode when it has one (entered or
   *  scanned at creation), else a generated RACK-MOLE-XXXXX. Unique. */
  rackBarcode: string;
  rackUuid: string;
  capacity: number;
  positions: MolecularRackPosition[];
  createdAt: string;
  createdByUserId: string;
  createdByUserName: string;
  /** Batch 406: what kind of rack it is, for deck-slot compatibility. Missing = a sample tube rack. */
  rackType?: DeckRackType;
  /** Batch 406: set once the rack is placed on an instrument's deck. */
  placement?: MolecularRackPlacement;
}

/** Batch 406: `rackBarcode` is the physical rack's barcode; left blank, one is generated. */
export type NewMolecularExtractionRack = Pick<MolecularExtractionRack, 'capacity' | 'createdByUserId' | 'createdByUserName'> & { rackBarcode?: string };

/** Batch 406: why a rack change was refused, as codes the Rack Loading page
 *  translates (`molecularRackLoadingPage.errors.<code>`), plus the deck-slot
 *  problems from services/molecular/deckSlots.ts. */
export const MOLECULAR_RACK_ERRORS = {
  notFound: 'rackNotFound',
  positionNotFound: 'positionNotFound',
  positionOccupied: 'positionOccupied',
  positionEmpty: 'positionEmpty',
  duplicateBarcode: 'duplicateRackBarcode',
  invalidBarcode: 'invalidRackBarcode',
  /** A locked Field Requirement (sample IDs, instrument, deck slot) is missing. */
  incomplete: 'placementIncomplete',
  instrumentUnavailable: 'instrumentUnavailable',
  alreadyPlaced: 'alreadyPlaced',
} as const;

export interface IMolecularExtractionRackService {
  getAll(): Promise<ServiceResult<MolecularExtractionRack[]>>;
  getById(id: ID): Promise<ServiceResult<MolecularExtractionRack>>;
  create(rack: NewMolecularExtractionRack): Promise<ServiceResult<MolecularExtractionRack>>;
  /** Real, per this file's own header (§5.1) — loads a real, scanned
   *  specimen into a specific real position on this rack, recording
   *  the real primary_vial → secondary_rack movement. Real, honest
   *  refusal (never overwrites) when the given position is already
   *  real and occupied — a real rack position holds exactly one real
   *  tube at a time. */
  loadSpecimenIntoPosition(
    rackId: ID,
    positionLabel: string,
    specimen: { specimenUuid?: string; accessionNumber?: string; containerBarcode: string },
    movement: MolecularMovementRecord,
  ): Promise<ServiceResult<MolecularExtractionRack>>;
  /** Batch 406 (Pete: every occupied position has its sample ID): records the
   *  accession of a tube already on the rack whose scan didn't match one. */
  setPositionAccession(rackId: ID, positionLabel: string, accessionNumber: string): Promise<ServiceResult<MolecularExtractionRack>>;
  /** Batch 406: puts the rack on an analyser's deck. Refused unless every
   *  occupied position has its sample ID, the instrument is an active
   *  analyser, and the slot (required when the deck has more than one for this
   *  rack type) takes this rack type and, with an assay, is one its rule
   *  allows. The organisation's Field Requirements are passed in. */
  placeOnDeck(
    rackId: ID,
    placement: Omit<MolecularRackPlacement, 'placedAt'>,
    requirements: readonly ResolvedFieldRequirement[],
  ): Promise<ServiceResult<MolecularExtractionRack>>;
  /** Real, per this file's own header — given a real, already-scanned
   *  container barcode, finds which rack (if any) and which position
   *  currently holds it. Real, honest null when the specimen was
   *  never racked (e.g. going straight from vial to plate well) —
   *  the plate builder's own scan-to-well flow uses this to decide
   *  whether a well's own movement should read
   *  secondary_rack → plate_well (racked first) or
   *  primary_vial → plate_well (not racked), matching what actually
   *  happened rather than assuming one or the other. */
  findPositionByContainerBarcode(containerBarcode: string): Promise<ServiceResult<{ rack: MolecularExtractionRack; position: MolecularRackPosition } | null>>;
}
