// src/services/quality/mockPeerReviewSettingsService.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-144 (Batch 439, Pete Oct 2): where the peer-review sign-out gate is on.
// Off by default; an organisation default, then per facility (the performing
// lab, resolved from the case's ordering facility), then per department (the
// case's subspecialty), most specific winning
// (peerReviewRules.peerReviewGateOn). Changing it needs
// config:peer-review:manage; every change is audited.
// ─────────────────────────────────────────────────────────────────────────────

import { storageGet, storageSet } from '../mockStorage';
import { guardConfigWrites } from '../authorization/guardConfigWrites';
import { mockAuditService } from '../auditlog/mockAuditService';
import { readSessionProfile } from '../auth/sessionProfile';
import type { PeerReviewGateSettings } from '@/types/quality/PeerReview';
import { DEFAULT_PEER_REVIEW_GATE_SETTINGS, peerReviewGateOn, peerReviewGateSettingsChange } from './peerReviewRules';
import type { IPeerReviewSettingsService } from './IPeerReviewSettingsService';
export type { IPeerReviewSettingsService } from './IPeerReviewSettingsService';

export const PEER_REVIEW_SETTINGS_STORAGE_KEY = 'pathscribe_peer_review_gate_settings';


const load = (): PeerReviewGateSettings => ({
  ...DEFAULT_PEER_REVIEW_GATE_SETTINGS,
  ...storageGet<Partial<PeerReviewGateSettings>>(PEER_REVIEW_SETTINGS_STORAGE_KEY, {}),
});

const unchecked: IPeerReviewSettingsService = {
  async get() { return { ok: true, data: load() }; },
  async save(settings) {
    const before = load();
    storageSet(PEER_REVIEW_SETTINGS_STORAGE_KEY, settings);
    const change = peerReviewGateSettingsChange(before, settings);
    if (change) {
      const user = readSessionProfile()?.id ?? 'unknown';
      mockAuditService.logEvent({ type: 'user', event: 'PEER_REVIEW_GATE_CHANGED', detail: change, user, caseId: null, confidence: null }).catch(() => {});
    }
    return { ok: true, data: settings };
  },
  async gateOnFor(facilityId, subspecialtyId) { return peerReviewGateOn(load(), facilityId, subspecialtyId); },
};

export const mockPeerReviewSettingsService: IPeerReviewSettingsService = guardConfigWrites(unchecked, [
  ['config:peer-review:manage', ['save']],
]);
