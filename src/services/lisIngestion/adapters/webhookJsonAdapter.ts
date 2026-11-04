// src/services/lisIngestion/adapters/webhookJsonAdapter.ts
// ─────────────────────────────────────────────────────────────────────────────
// Push adapter: PathScribe's published JSON webhook contract → normalized
// updates. For LISs or middleware that can POST JSON but not HL7. Pure.
//
// Body: one object or an array of them:
//   {
//     "accession":       "S26-4416-BX-001",        required
//     "status":          "GROSSED",                required, LIS vocabulary
//     "updatedAt":       "2026-09-24T15:05:00Z",   required, ISO 8601
//     "grossText":       "...",                    optional
//     "microscopicText": "...",                    optional
//     "diagnosisText":   "...",                    optional
//     "placerOrderNumber": "ORD-2026-10091",       optional (Batch 426): ORC-2,
//     "fillerOrderNumber": "LIS-2026-44912"        optional (Batch 426): ORC-3,
//   }                                              echoed on the synoptic result
// ─────────────────────────────────────────────────────────────────────────────

import type { AdapterResult, LisPushAdapter, NormalizedLisUpdate } from '../types';

const optionalText = (v: unknown) => (typeof v === 'string' ? v : undefined);

export const webhookJsonAdapter: LisPushAdapter = {
  source: 'webhook',
  normalize(raw: string): AdapterResult {
    if (!raw.trim()) return { ok: false, error: 'EMPTY_MESSAGE' };
    let body: unknown;
    try { body = JSON.parse(raw); } catch { return { ok: false, error: 'INVALID_JSON' }; }
    const items = Array.isArray(body) ? body : [body];
    const updates: NormalizedLisUpdate[] = [];
    for (const item of items) {
      if (!item || typeof item !== 'object') return { ok: false, error: 'INVALID_JSON' };
      const o = item as Record<string, unknown>;
      if (typeof o.accession !== 'string' || !o.accession.trim()) return { ok: false, error: 'MISSING_ACCESSION' };
      if (typeof o.status !== 'string' || !o.status.trim()) return { ok: false, error: 'MISSING_STATUS' };
      const t = typeof o.updatedAt === 'string' ? new Date(o.updatedAt) : null;
      if (!t || isNaN(t.getTime())) return { ok: false, error: 'INVALID_UPDATED_AT' };
      const gross = optionalText(o.grossText), micro = optionalText(o.microscopicText), dx = optionalText(o.diagnosisText);
      const placer = optionalText(o.placerOrderNumber)?.trim(), filler = optionalText(o.fillerOrderNumber)?.trim();
      updates.push({
        accession: o.accession.trim(),
        lisStatus: o.status.trim(),
        updatedAt: t.toISOString(),
        ...(gross !== undefined ? { grossText: gross } : {}),
        ...(micro !== undefined ? { microscopicText: micro } : {}),
        ...(dx !== undefined ? { diagnosisText: dx } : {}),
        ...(placer ? { placerOrderNumber: placer } : {}),
        ...(filler ? { fillerOrderNumber: filler } : {}),
      });
    }
    if (updates.length === 0) return { ok: false, error: 'MISSING_ACCESSION' };
    return { ok: true, updates };
  },
};

/** A sample body for the admin screen's "Test an inbound message".
 *  Demo data: Gross Complete for the seeded Assist case S26-4416-BX-001. */
export const EXAMPLE_WEBHOOK_BODY = JSON.stringify({
  accession: 'S26-4416-BX-001',
  status: 'GROSSED',
  updatedAt: '2026-09-24T15:05:00Z',
  grossText: 'Received in formalin labeled "skin punch biopsy right forearm" is a punch biopsy measuring 0.4 cm in diameter and 0.3 cm deep.',
}, null, 2);
