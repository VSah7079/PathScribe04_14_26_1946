// src/types/cytology/CytologyPreliminaryRelease.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 533 (Pete, Oct 12, 2026: an urgent finding on one specimen goes out
// "as a preliminary"). One urgent preliminary report for a single cytology
// specimen, sent before the case report (Batch 532). Kept on the case
// (Case.cytologyPreliminaryReleases), written once and never edited: the
// report content is the snapshot that was sent, so a resend sends exactly
// that. Not a sign-out: the specimen still signs out as usual, and the case
// report (FINAL) supersedes it. Never sent to a screening registry.
// ─────────────────────────────────────────────────────────────────────────────

import type { CytologyReportContent } from './CytologyReportContent';

export interface CytologyPreliminaryRelease {
  id: string;
  specimenId: string;
  /** The review it was built from (the specimen's chosen final diagnosis). */
  reviewRecordId: string;
  /** A quick-pick reason (CYTOLOGY_PRELIMINARY_REASONS), stored as its code. */
  reason: string;
  note?: string;
  releasedAt: string;
  releasedBy: { userId: string; userName: string };
  /** Whether the laboratory required the electronic signature, and it was given. */
  signed: boolean;
  /** The report as sent, with `preliminary` set. */
  reportContent: CytologyReportContent;
  /** Batch 534: recalled by its sender within the release delay; never sent. */
  recalled?: { at: string; by: { userId: string; userName: string } };
}
