// src/services/caseRegistry/caseRegistryService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Stub only — real implementation pending backend cutover.
// mockCaseRegistryService.ts is the active implementation; this satisfies
// ICaseRegistryService's contract so the swap to a real backend is a
// one-line change wherever the active service is selected, matching the
// same relationship FirestoreCaseService.ts has to mockCaseService.ts.
//
// Collection layout
// ─────────────────
//  /caseRegistries/{organisationId} — one CaseMaskConfig document per org
//
// Uses the shared `db` instance from '@/firebase' (src/firebase/index.ts)
// rather than calling getFirestore() per method — deliberate choice for
// this service specifically: allocateNextCaseNumber runs inside a
// runTransaction callback, and a single shared db instance is the more
// conventional pattern for that. (FirestoreCaseService.ts's own
// getFirestore()-per-call pattern predates this file and wasn't changed
// as part of this work — the two coexisting is a known inconsistency, not
// something this file tries to silently "fix" project-wide.)
// ─────────────────────────────────────────────────────────────────────────────
import { doc, getDoc, setDoc, runTransaction } from 'firebase/firestore';
import { db } from '@/firebase';
import type { ServiceResult } from '../types';
import {
  CaseMaskConfig, DEFAULT_FALLBACK_MASK, DEFAULT_FALLBACK_PREFIX, DEFAULT_FALLBACK_SEQUENCE_DIGITS,
} from '@/types/config/CaseMaskConfig';
import type { ICaseRegistryService } from './ICaseRegistryService';
import { getFacilityDateParts } from '@/utils/facilityTime';

const COLLECTION_NAME = 'caseRegistries';

const ok  = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const err = <T>(msg: string): ServiceResult<T> => ({ ok: false, error: msg });

function renderMask(pattern: string, prefix: string, seq: number, sequenceDigits: number, timezone: string): string {
  const { year: year4num } = getFacilityDateParts(new Date(), timezone);
  const year4 = String(year4num);
  const year2 = year4.slice(-2);

  return pattern
    .split('{PREFIX}').join(prefix)
    .split('{SITE}').join(prefix)
    .split('{YEAR:4}').join(year4)
    .split('{YEAR:2}').join(year2)
    .replace(/\{SEQ:(\d+)\}/, (_m, digits) => String(seq).padStart(Number(digits) || sequenceDigits, '0'));
}

function resolveSitePrefix(config: CaseMaskConfig, siteId: string | undefined): string {
  if (siteId && config.sitePrefixMap?.[siteId]) return config.sitePrefixMap[siteId];
  return config.prefix;
}

/** Real fix: the real, facility-local year, not the caller's own local
 *  time - a real, serious concern here specifically, since an incorrect
 *  reset would either fail to reset a real, new facility year's
 *  sequence (real collision risk with the prior year's still-climbing
 *  numbers) or reset it a real day early/late relative to the actual,
 *  physical facility calendar. */
function needsAnnualReset(config: CaseMaskConfig, timezone: string): boolean {
  const { year: currentYear } = getFacilityDateParts(new Date(), timezone);
  return config.resetSequenceAnnually && (!config.lastResetYear || config.lastResetYear < currentYear);
}

export const caseRegistryService: ICaseRegistryService = {
  async getConfig(organisationId) {
    try {
      const snap = await getDoc(doc(db, COLLECTION_NAME, organisationId));
      return ok(snap.exists() ? (snap.data() as CaseMaskConfig) : null);
    } catch (e) {
      return err(`caseRegistryService.getConfig failed for ${organisationId}: ${(e as Error).message}`);
    }
  },

  async saveConfig(config) {
    try {
      await setDoc(doc(db, COLLECTION_NAME, config.organisationId), {
        ...config,
        updatedAt: new Date().toISOString(),
      });
      return ok(config);
    } catch (e) {
      return err(`caseRegistryService.saveConfig failed for ${config.organisationId}: ${(e as Error).message}`);
    }
  },

  async allocateNextCaseNumber(organisationId, timezone, siteId) {
    const registryRef = doc(db, COLLECTION_NAME, organisationId);

    try {
      const result = await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(registryRef);

        if (!snap.exists()) {
          // Graceful fallback, same as the mock — an unconfigured
          // organisation must never block case creation. Allocated via a
          // separate, org-namespaced fallback document rather than
          // failing the transaction, so two unconfigured orgs still
          // can't collide with each other.
          console.info(
            `[caseRegistryService] No CaseMaskConfig for organisation "${organisationId}" — using default fallback scheme (${DEFAULT_FALLBACK_MASK}).`
          );
          const fallbackRef = doc(db, COLLECTION_NAME, `__fallback__${organisationId}`);
          const fallbackSnap = await transaction.get(fallbackRef);
          const fallbackSeq = (fallbackSnap.exists() ? (fallbackSnap.data().currentSequence ?? 0) : 0) + 1;
          const { year: fallbackYear } = getFacilityDateParts(new Date(), timezone);
          transaction.set(fallbackRef, {
            organisationId: `__fallback__${organisationId}`, prefix: DEFAULT_FALLBACK_PREFIX,
            maskPattern: DEFAULT_FALLBACK_MASK, sequenceDigits: DEFAULT_FALLBACK_SEQUENCE_DIGITS,
            currentSequence: fallbackSeq, resetSequenceAnnually: true, lastResetYear: fallbackYear,
            updatedBy: 'system', updatedAt: new Date().toISOString(),
          });
          return renderMask(DEFAULT_FALLBACK_MASK, DEFAULT_FALLBACK_PREFIX, fallbackSeq, DEFAULT_FALLBACK_SEQUENCE_DIGITS, timezone);
        }

        const config = snap.data() as CaseMaskConfig;
        const nextSeq = needsAnnualReset(config, timezone) ? 1 : config.currentSequence + 1;
        const { year: resetYear } = getFacilityDateParts(new Date(), timezone);

        transaction.update(registryRef, {
          currentSequence: nextSeq,
          lastResetYear: resetYear,
          updatedAt: new Date().toISOString(),
        });

        const prefix = resolveSitePrefix(config, siteId);
        return renderMask(config.maskPattern, prefix, nextSeq, config.sequenceDigits, timezone);
      });

      return ok(result);
    } catch (e) {
      return err(`caseRegistryService.allocateNextCaseNumber failed for ${organisationId}: ${(e as Error).message}`);
    }
  },

  async previewNextCaseNumber(organisationId, timezone, siteId) {
    try {
      const snap = await getDoc(doc(db, COLLECTION_NAME, organisationId));
      if (!snap.exists()) {
        return ok(renderMask(DEFAULT_FALLBACK_MASK, DEFAULT_FALLBACK_PREFIX, 1, DEFAULT_FALLBACK_SEQUENCE_DIGITS, timezone));
      }
      const config = snap.data() as CaseMaskConfig;
      const nextSeq = needsAnnualReset(config, timezone) ? 1 : config.currentSequence + 1;
      const prefix = resolveSitePrefix(config, siteId);
      return ok(renderMask(config.maskPattern, prefix, nextSeq, config.sequenceDigits, timezone));
    } catch (e) {
      return err(`caseRegistryService.previewNextCaseNumber failed for ${organisationId}: ${(e as Error).message}`);
    }
  },
};
