// src/services/organMapping/organMapDeliveryRules.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 751 (spec section 12.3): the organ map delivery setting and its plain rules, with no imports, so the facility
// service and the screens can use them without loading the map drawing (organMapDelivery.ts has the drawing).
// ─────────────────────────────────────────────────────────────────────────────

import type { OrganMapType } from './organMapTypes';

export type OrganMapDeliveryMode = 'off' | 'text' | 'textAndFile';
export type OrganMapFileFormat = 'png' | 'pdf';
export const ORGAN_MAP_DELIVERY_MODES: readonly OrganMapDeliveryMode[] = ['off', 'text', 'textAndFile'];
export const ORGAN_MAP_FILE_FORMATS: readonly OrganMapFileFormat[] = ['png', 'pdf'];

export interface OrganMapDeliverySettings {
  mode: OrganMapDeliveryMode;
  fileFormat: OrganMapFileFormat;
  /** Where the interface engine puts the file: a folder, an SFTP address or a channel name. */
  destination: string;
}

export const DEFAULT_ORGAN_MAP_DELIVERY: OrganMapDeliverySettings = { mode: 'off', fileFormat: 'png', destination: '' };

export type OrganMapDeliveryProblem = 'destinationRequired' | 'destinationCredentials' | 'destinationTooLong' | 'unknownMode' | 'unknownFormat';

/** Checks the settings before they are saved; the destination is needed only for a file, and never holds a password. */
export function validateOrganMapDelivery(s: OrganMapDeliverySettings): { ok: true; settings: OrganMapDeliverySettings } | { ok: false; problem: OrganMapDeliveryProblem } {
  if (!ORGAN_MAP_DELIVERY_MODES.includes(s.mode)) return { ok: false, problem: 'unknownMode' };
  if (!ORGAN_MAP_FILE_FORMATS.includes(s.fileFormat)) return { ok: false, problem: 'unknownFormat' };
  // The destination is only for a file: with Off or Text only it is not kept (and so can't hold a hidden problem).
  const destination = s.mode === 'textAndFile' ? (s.destination ?? '').trim() : '';
  if (s.mode === 'textAndFile' && !destination) return { ok: false, problem: 'destinationRequired' };
  if (destination.length > 300) return { ok: false, problem: 'destinationTooLong' };
  if (/^[a-z][a-z0-9+.-]*:\/\/[^/@\s]*@/i.test(destination)) return { ok: false, problem: 'destinationCredentials' };
  return { ok: true, settings: { mode: s.mode, fileFormat: s.fileFormat, destination } };
}

/** The settings in force (absent = off). */
export const organMapDeliveryOf = (facility: { organMapDelivery?: Partial<OrganMapDeliverySettings> } | null | undefined): OrganMapDeliverySettings =>
  ({ ...DEFAULT_ORGAN_MAP_DELIVERY, ...(facility?.organMapDelivery ?? {}) });

/** The audit line for a change of the setting (literal English, as audit text is). */
export function organMapDeliveryChangeDetail(facilityName: string, facilityId: string, before: OrganMapDeliverySettings, after: OrganMapDeliverySettings): string {
  const describe = (s: OrganMapDeliverySettings) => s.mode === 'off' ? 'off' : s.mode === 'text' ? 'text only' : `text and ${s.fileFormat.toUpperCase()} file to ${s.destination}`;
  return `Organ map delivery for facility ${facilityName} (${facilityId}): ${describe(before)} → ${describe(after)}.`;
}

/** The file's name: accession, map type and time (UTC), never a patient name. */
export function organMapFileName(accession: string, mapType: OrganMapType, at: string, format: OrganMapFileFormat): string {
  const safe = accession.replace(/[^A-Za-z0-9-]/g, '_');
  const stamp = at.replace(/[-:]/g, '').replace(/\.\d+/, '').replace(/Z$/, 'Z');
  return `${safe}_${mapType}_${stamp}.${format}`;
}

/** The mark carried with the file and the text: what the figure is. */
export const ORGAN_MAP_GENERATED_FROM = 'synoptic answers';

/** The time the workup's latest map file reached the laboratory system (for the panel's quiet line), if it did. */
export function organMapFileSentAt(
  entries: readonly { kind: string; instanceId: string; status: string; lastAttemptAt?: string; queuedAt: string }[], instanceId: string,
): string | undefined {
  const files = entries.filter(e => e.kind === 'organ_map' && e.instanceId === instanceId).sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));
  const latest = files[files.length - 1];
  return latest?.status === 'SENT' ? latest.lastAttemptAt ?? latest.queuedAt : undefined;
}
