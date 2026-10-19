// src/services/autopsy/dashboard/autopsyDashboardSeed.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 610 (#61, #89): Simulated autopsy cases for the dashboards. The demo
// baseline has only a handful of real autopsy cases, which is too few to show
// a turnaround rate, a consent mix or a cause-of-death split. These fill the
// gap and are labelled Simulated everywhere they appear (the record's
// `simulated` flag, the SIM-A ids, and the facility names), so they cannot be
// mistaken for patients.
//
// No patient data of any kind: an id, a facility, dates and categories only.
// Deterministic for a given `now`, so the same dashboard shows the same
// figures when reopened and the tests can assert on them.
// ─────────────────────────────────────────────────────────────────────────────
import type { AutopsyCaseDetails, HospitalConsentStatus, OrganRetentionTier } from '@/types/autopsy/AutopsyCaseDetails';
import type { Jurisdiction } from '@/types/systemConfig';
import type { AutopsyDashboardRecord, CauseOfDeathCategory } from './autopsyDashboardTypes';

const HOUR = 3_600_000;

/** Small seeded generator (mulberry32) so the data is stable. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SIM_FACILITIES: ReadonlyArray<{ id: string; name: string; jurisdiction: Jurisdiction }> = [
  { id: 'sim-fac-metro', name: 'Metro General (Simulated)', jurisdiction: 'US' },
  { id: 'sim-fac-community', name: 'Lakeside Community (Simulated)', jurisdiction: 'US' },
  { id: 'sim-fac-teaching', name: 'St Anne’s Teaching (Simulated)', jurisdiction: 'GB_EW' },
];

const CAUSE_WEIGHTS: ReadonlyArray<[CauseOfDeathCategory, number]> = [
  ['cardiovascular', 28], ['respiratory', 14], ['infection', 12], ['neoplasm', 18], ['neurological', 8], ['external', 12], ['undetermined', 8],
];
const CONSENT_WEIGHTS: ReadonlyArray<[HospitalConsentStatus, number]> = [['active', 72], ['narrowed', 20], ['revoked', 8]];
const RETENTION_WEIGHTS: ReadonlyArray<[OrganRetentionTier | undefined, number]> = [
  [undefined, 20], ['tier_0_no_retention', 30], ['tier_1_diagnostic_tissue_only', 32], ['tier_2_full_organ_retention', 12], ['tier_3_education_research_genomic', 6],
];

function pick<T>(weights: ReadonlyArray<[T, number]>, r: number): T {
  const total = weights.reduce((n, [, w]) => n + w, 0);
  let x = r * total;
  for (const [v, w] of weights) { x -= w; if (x < 0) return v; }
  return weights[weights.length - 1][0];
}

export function buildSimulatedAutopsyRecords(now: Date, count = 60): AutopsyDashboardRecord[] {
  const rand = rng(610);
  const records: AutopsyDashboardRecord[] = [];
  for (let i = 0; i < count; i++) {
    const fac = SIM_FACILITIES[i % SIM_FACILITIES.length];
    const forensic = rand() < 0.2;
    // Body arrival between 3 hours and 120 days ago, newest cases fewer so most are decided.
    const ageHours = 3 + Math.floor(Math.pow(rand(), 1.4) * 120 * 24);
    const startedMs = now.getTime() - ageHours * HOUR;
    // PAD usually signed within 1-4 days (some slow); FAD within 1-6 weeks (some slow).
    const padHours = 10 + Math.floor(rand() * (rand() < 0.2 ? 150 : 60));
    const fadHours = 24 * (5 + Math.floor(rand() * (rand() < 0.25 ? 70 : 38)));
    const padSignedMs = startedMs + padHours * HOUR;
    const fadSignedMs = startedMs + fadHours * HOUR;
    const held = rand() < 0.15;
    const holdStartMs = startedMs + 12 * HOUR;
    const holdLen = (24 + Math.floor(rand() * 72)) * HOUR;
    const consent = pick(CONSENT_WEIGHTS, rand());
    const retention = pick(RETENTION_WEIGHTS, rand());
    const signed = (tier: 'PAD' | 'FAD', ms: number) => ({
      tier, frozenPayload: null, signedBy: { name: 'Simulated', isPathologist: true }, signedAt: new Date(ms).toISOString(),
    });
    const autopsy: AutopsyCaseDetails = {
      jurisdiction: fac.jurisdiction,
      caseAuthority: forensic ? 'statutory_judicial' : 'hospital_consented',
      scope: 'full',
      addenda: [],
      ancillaryHold: held
        ? { active: false, reason: 'Simulated hold', startedAt: new Date(holdStartMs).toISOString(), endedAt: new Date(holdStartMs + holdLen).toISOString() }
        : { active: false },
      ...(forensic ? {} : {
        hospitalConsent: {
          consentingRelativeName: 'Simulated', consentingRelativeRelationship: 'spouse', consentGivenAt: new Date(startedMs).toISOString(),
          status: consent, consentScope: [], excludedOrgans: [], retentionPermitted: consent !== 'revoked',
        },
      }),
      ...(retention ? { organRetentionTier: retention } : {}),
      ...(padSignedMs <= now.getTime() ? { padSnapshot: signed('PAD', padSignedMs) } : {}),
      ...(padSignedMs <= now.getTime() && fadSignedMs <= now.getTime() ? { fadSnapshot: signed('FAD', fadSignedMs) } : {}),
    };
    records.push({
      id: `SIM-A-${String(1001 + i)}`,
      simulated: true,
      facilityId: fac.id,
      facilityName: fac.name,
      jurisdiction: fac.jurisdiction,
      startedAt: new Date(startedMs).toISOString(),
      autopsy,
      cause: pick(CAUSE_WEIGHTS, rand()),
    });
  }
  return records;
}
