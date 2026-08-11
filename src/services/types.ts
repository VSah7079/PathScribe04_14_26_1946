// ─────────────────────────────────────────────────────────────────────────────
// services/types.ts
// Shared types used across all service interfaces.
// ─────────────────────────────────────────────────────────────────────────────

// Optional, additive metadata a service can attach to a successful result.
// Currently used for cursor-based pagination (see CaseFilterParams.pageSize/
// cursor and ICaseService.getAll's real Firestore implementation) - kept
// generic and optional here rather than a case-specific type, since any
// service could reasonably need to signal "there's more" without changing
// its own data shape.
export interface ServiceResultMeta {
  hasMore?: boolean;
  /** Opaque cursor - pass back as CaseFilterParams.cursor to fetch the next page. */
  nextCursor?: string;
}

export type ServiceResult<T> =
  | { ok: true;  data: T; meta?: ServiceResultMeta }
  | { ok: false; error: string };

export type ID = string;
