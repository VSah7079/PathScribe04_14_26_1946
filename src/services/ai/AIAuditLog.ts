// src/services/ai/AIAuditLog.ts
// ─────────────────────────────────────────────────────────────
// Audit trail for all AI generation events in PathScribe.
//
// WHY THIS EXISTS:
//   CAP/CLIA compliance requires that every AI-assisted report
//   is traceable to a specific model, provider, and timestamp.
//   Pathologists must know exactly what AI generated each section
//   they reviewed and signed off on.
//
// WHAT IS RECORDED:
//   • Which case (caseId)
//   • Which generation step (sectionId + title)
//   • Which provider and model (providerId + modelId)
//   • When (timestamp ISO)
//   • Outcome (completed / error / cancelled)
//   • Performance (tokensGenerated, latencyMs)
//   • Any error message
//   • Batch 536 (PS-558): every callAi() call too (the mismatch check,
//     critical findings, suggestions, voice), with its hosting region, the
//     jurisdiction it was checked against and the feature; a call the
//     jurisdiction's AI vendor policy refused is recorded as 'refused'
//
// STORAGE:
//   localStorage for mock/dev. In production, entries are written
//   to Firestore under cases/{caseId}/aiAuditLog/{entryId} and
//   also to an org-level audit collection for compliance reporting.
// ─────────────────────────────────────────────────────────────

import { dataStorage } from '../browserData/dataStorage';
const LS_KEY    = 'ps_ai_audit_log_v1';
const MAX_ENTRIES = 2000; // prevent unbounded localStorage growth

export interface AIAuditEntry {
  /** Unique entry identifier */
  id:              string;
  /** ISO timestamp of the generation event */
  timestamp:       string;
  /** Case this generation was performed for */
  caseId:          string;
  /** Generation step ID (from narrativeTemplateConfig) */
  sectionId:       string;
  /** Human-readable step title */
  sectionTitle:    string;
  /** Provider that performed the generation */
  providerId:      string;
  /** Specific model used */
  modelId:         string;
  /** Outcome of the generation. Batch 536 (PS-558): 'refused' when the
   *  jurisdiction's AI vendor policy didn't allow the service or region. */
  status:          'completed' | 'error' | 'cancelled' | 'refused';
  /** Approximate tokens generated */
  tokensGenerated: number;
  /** Wall-clock latency in ms */
  latencyMs:       number;
  /** Error message if status === 'error' */
  error?:          string;
  /** Batch 536 (PS-558): where the call went and for whom, so a regulator can
   *  be shown what was used: the hosting region (when recorded), the
   *  jurisdiction and facility it was checked against, and the feature. */
  hostingRegion?:  string;
  jurisdiction?:   string;
  facilityId?:     string;
  feature?:        string;
}

// ── Storage helpers ───────────────────────────────────────────

function loadLog(): AIAuditEntry[] {
  try {
    const raw = dataStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveLog(entries: AIAuditEntry[]): void {
  try {
    // Trim to max entries (keep most recent)
    const trimmed = entries.slice(-MAX_ENTRIES);
    dataStorage.setItem(LS_KEY, JSON.stringify(trimmed));
  } catch {
    // Storage quota exceeded — silently ignore
  }
}

// ── Public API ────────────────────────────────────────────────

export const AIAuditLog = {
  /**
   * Record a generation event.
   * Call this after every generateStream() / generate() call,
   * regardless of outcome.
   */
  record(entry: Omit<AIAuditEntry, 'id' | 'timestamp'>): void {
    const entries = loadLog();
    const newEntry: AIAuditEntry = {
      ...entry,
      id:        `ail_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    entries.push(newEntry);
    saveLog(entries);
  },

  /**
   * Get all audit entries for a specific case.
   * Used in the case report page to show AI provenance per section.
   */
  getForCase(caseId: string): AIAuditEntry[] {
    return loadLog().filter(e => e.caseId === caseId);
  },

  /**
   * Get all audit entries.
   * Used by the admin compliance dashboard.
   */
  getAll(): AIAuditEntry[] {
    return loadLog();
  },

  /**
   * Get audit entries with optional filters.
   */
  query(filters: {
    caseId?:     string;
    providerId?: string;
    modelId?:    string;
    status?:     AIAuditEntry['status'];
    since?:      string; // ISO date
  }): AIAuditEntry[] {
    return loadLog().filter(e => {
      if (filters.caseId     && e.caseId     !== filters.caseId)     return false;
      if (filters.providerId && e.providerId !== filters.providerId) return false;
      if (filters.modelId    && e.modelId    !== filters.modelId)    return false;
      if (filters.status     && e.status     !== filters.status)     return false;
      if (filters.since      && e.timestamp  < filters.since)        return false;
      return true;
    });
  },

  /**
   * Clear the audit log.
   * Admin only — should be gated by role check before calling.
   */
  clear(): void {
    dataStorage.removeItem(LS_KEY);
  },
};
