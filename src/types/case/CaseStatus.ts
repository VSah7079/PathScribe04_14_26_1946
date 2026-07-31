// src/types/case/CaseStatus.ts
// ─────────────────────────────────────────────────────────────
// Clinical-grade case lifecycle states.
// Aligned with:
//   • FHIR DiagnosticReport.status
//   • LIS case lifecycle
//   • PathScribe synoptic workflow
//   • Shared case + amendment workflows
// ─────────────────────────────────────────────────────────────

export type CaseStatus =
  /** Case created but not yet started */
  | "draft"

  /**
   * Case and specimens verified and logged (Orchestration Phase 1, per
   * SOP-PATH-GROSS-001 — the accessioning "gatekeeper" step); Stage 0's AI
   * has assigned Grossing Template(s) per specimen. Case is ready for a PA
   * to pick up at the bench (Worklist filter target / barcode-scan entry
   * point). This is the status this enum was missing before — flagged as
   * a gap when "gross-complete" was added, now filled in.
   */
  | "accessioned"

  /**
   * Grossing finalized by the PA (Orchestration Stage 1 trigger) — case is
   * handed off and awaiting Microscopic entry / diagnostic synoptic work by
   * a pathologist. Distinct from "in-progress" (too generic to filter the
   * Worklist on specifically) and from "pending-review" (that one means AI
   * has pre-filled suggestions, not that Grossing itself is done — a
   * different state earlier reviewers considered reusing for this and
   * correctly ruled out).
   */
  | "gross-complete"

  /**
   * Intraoperative consultation (frozen section read, OR communication)
   * has concluded for this case. Distinct from a specimen's grossing-level
   * "frozen section performed" data (captured as fields on the Standard
   * Tissue Grossing template itself, per-specimen) — this is the case-level
   * workflow milestone: the intraop event is over, normal Gross/Micro
   * processing can proceed.
   *
   * NOTE — tracked future gap, not solved by this status alone: an
   * intraoperative consult can occur BEFORE the specimen is formally
   * accessioned (surgeon sends tissue for an immediate frozen read while
   * accessioning hasn't happened yet). There is currently no holding
   * record for that scenario — a Case requires accession info that may
   * not exist yet at that point. A real fix needs some kind of
   * preliminary/pre-accession record that can later be merged into the
   * real Case once accessioning actually happens, not just this status
   * value. Flagging this now per discussion; deliberately not designing
   * or building that mechanism today.
   */
  | "intraoperative-complete"

  /** AI has run and pre-filled suggestions — pathologist has not yet interacted */
  | "pending-review"

  /** Case is actively being worked on */
  | "in-progress"

  /** Awaiting review, QA, or sign-out — pathologist has reviewed and is ready for sign-out */
  | "pathologist-review"

  /**
   * Fully finalized (no changes pending). A finalized case that has been
   * revised carries that fact on `lastRevisionType` (Case.ts) — NOT as
   * its own CaseStatus value. There is deliberately no 'amended' status
   * anymore: that value's real meaning in the old code was "currently
   * unlocked, revision in progress" (see handleAmendmentSubmit /
   * releasePendingAmendmentOrAddendum in SynopticReportPage.tsx), which
   * collided with "has amendment history" and was the root cause behind
   * the Worklist Amended-tab gap documented in
   * AMENDMENT_STATUS_REDESIGN_BRIEF.md. "Currently unlocked for revision"
   * is now just 'in-progress'/'draft' like any other in-progress case;
   * "has amendment history" is `lastRevisionType` alongside `'finalized'`.
   */
  | "finalized"

  /** Case is closed (no further changes allowed) */
  | "closed"

  /** Case returned to pathologist (shared workflow) */
  | "returned"

  /** Case accepted by another pathologist (shared workflow) */
  | "accepted"

  /** Case is in AI-assisted drafting mode */
  | "ai-assisted"

  /** Case is sitting in a workgroup pool queue — awaiting acceptance by any available pathologist */
  | "pool"

  /** Case is temporarily locked while a pathologist is reviewing the accept/pass prompt — released after 30s if not confirmed */
  | "claiming"

  /** Case is in the process of being finalized — synoptic complete, awaiting sign-out */
  | "finalizing"

  /** A resident (or other non-finalizing assignee) has released this case's
   *  synoptic report(s) — the attending must review and countersign before
   *  it's genuinely finalized. Previously only a valid value on
   *  SynopticReportInstance.status; one seed case was force-casting it onto
   *  CaseStatus via `as CaseStatus`, which the type system was silently
   *  allowing without it actually being a real member of this union. */
  | "pending-countersign";
