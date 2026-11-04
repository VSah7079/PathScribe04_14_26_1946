// src/services/equipment/IEquipmentService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 358: the lab's equipment register. Pete, on centralising equipment
// configuration: "Yes" to the hybrid.
//   - This register holds what every device shares: identity (code, name,
//     make, model, serial number), where it is (performing lab, scan station)
//     and status.
//   - Workflow-specific settings stay in their own screens and point at a
//     register entry: Printer Profiles, Grossing Hardware (Batch 359),
//     engravers, cold-chain storage units.
//
// It takes over Batch 356's instrument list (PS-326): an "instrument" a
// molecular batch targets is register equipment of kind 'analyser'.
//
// `code` is what other records carry (MolecularBatch.targetInstrumentId,
// the deck barcode LOC-INST-<code>-SLOT_<slot>, printed labels). It is
// unique, fixed once created, and equipment is deactivated, never deleted.
// ─────────────────────────────────────────────────────────────────────────────
import type { ServiceResult, ID } from '../types';

/** Batch 359: the error a settings service (printer profile, grossing hardware)
 *  returns when its `equipmentId` isn't a register device of the right kind.
 *  Screens show it translated. */
export const EQUIPMENT_LINK_INVALID = 'equipmentLinkInvalid';

/** Kinds of equipment. Stored values; labels come from equipmentKinds.<kind>. */
export const EQUIPMENT_KINDS = [
  // Batch 739 (fluid decision 4): 'lbc_processor', a liquid-based cytology processor (ThinPrep, SurePath and others).
  'analyser', 'stainer', 'tissue_processor', 'lbc_processor', 'slide_scanner', 'camera', 'scale', 'label_printer', 'engraver', 'storage_unit', 'other',
] as const;
export type EquipmentKind = typeof EQUIPMENT_KINDS[number];

/** Batch 406 (Pete): what physically fits in a deck slot. */
export const DECK_RACK_TYPES = ['sample_tube_rack', 'extraction_plate', 'reagent_cartridge'] as const;
export type DeckRackType = typeof DECK_RACK_TYPES[number];

/** Batch 406 (Pete): one position on an analyser's deck, from its instrument
 *  profile. The id goes into the deck-location barcode
 *  (LOC-INST-<code>-<id>), so it is letters, digits and "_" (e.g. SLOT_A1). */
export interface DeckSlot {
  id: string;
  /** Which deck or bay it is on (e.g. "Deck 1"). */
  deck?: string;
  /** The rack or plate types permitted here. */
  rackTypes: DeckRackType[];
}

export interface Equipment {
  id: ID;
  /** Stable code, e.g. "PANTHER_02". Unique (case-insensitive), fixed once created. */
  code: string;
  /** Human-facing name, e.g. "Panther 2". Data, not translated. */
  name: string;
  kind: EquipmentKind;
  make?: string;
  model?: string;
  serialNumber?: string;
  /** The performing lab it belongs to (services/facilities/). */
  facilityId: string;
  /** The scan station (services/scanStations/) it sits at, in the same lab. */
  scanStationId?: string;
  /** Batch 360: how often it needs routine maintenance, in days. Unset = not scheduled. */
  maintenanceIntervalDays?: number;
  /** Batch 360: how often it needs calibration, in days. Unset = not scheduled. */
  calibrationIntervalDays?: number;
  /** Batch 730: the acceptable temperature range for a temperature check (a refrigerator, freezer, water bath, processor).
   *  Either end may be unset. A check outside it is a Fail. */
  temperatureMinCelsius?: number;
  temperatureMaxCelsius?: number;
  /** Batch 732 (spec §11.1): a stainer or slide scanner that takes large-format slides (megablock sections). */
  supportsLargeFormat?: boolean;
  /** Batch 763: a stainer's or slide scanner's QC sign-off (services/stainQc/): auto-accept, the instrument's own
   *  (through the interface engine), or a PathScribe sign-off. Unset: the lab's default in Configuration. */
  qcMode?: import('../stainQc/stainQcTypes').QcMode;
  status: 'Active' | 'Inactive';
  /** Batch 406: an analyser's deck layout (its instrument profile). Racks
   *  loaded for it are placed in one of these slots; see
   *  services/molecular/deckSlots.ts. */
  deckSlots?: DeckSlot[];
}

export type EquipmentDraft = Omit<Equipment, 'id'>;

export type EquipmentError =
  | 'notFound'
  /** Another item already has this code. */
  | 'duplicateCode'
  /** The draft failed validation (validateEquipmentDraft). */
  | 'invalid';

export interface IEquipmentService {
  getAll(): Promise<ServiceResult<Equipment[]>>;
  /** Active equipment, optionally of one kind (e.g. 'analyser' for a molecular batch's target). */
  getActive(kind?: EquipmentKind): Promise<ServiceResult<Equipment[]>>;
  getById(id: ID): Promise<ServiceResult<Equipment>>;
  /** Case-insensitive, active or not. */
  getByCode(code: string): Promise<ServiceResult<Equipment>>;
  create(draft: EquipmentDraft): Promise<ServiceResult<Equipment>>;
  /** The code can't change once created. */
  update(id: ID, changes: Partial<Omit<EquipmentDraft, 'code'>>): Promise<ServiceResult<Equipment>>;
  deactivate(id: ID): Promise<ServiceResult<Equipment>>;
  reactivate(id: ID): Promise<ServiceResult<Equipment>>;
}
