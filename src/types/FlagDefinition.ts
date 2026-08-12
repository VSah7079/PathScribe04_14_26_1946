// src/types/FlagDefinition.ts
<<<<<<< HEAD
// Canonical definition of a flag in pathscribeAI.
// Includes LIS-style short code, display name, description, and level.

export interface FlagDefinition {
  /** Unique identifier for this flag */
  id: string;

  /** Short LIS-style code (e.g., "FS", "QA", "RR") */
  code: string;

  /** Human-readable name (e.g., "Frozen Section") */
  name: string;

  /** Optional longer description */
  description?: string;

  /** Whether this flag applies to the case or to specimens */
  level: "case" | "specimen";

  /** LIS integration code (may differ from UI code) */
  lisCode: string;

  /**Flag Severity Value */
    severity: 1 | 2 | 3 | 4 | 5;

  /** Whether this flag is currently active in the system */
  active: boolean;

  /** Whether this flag was auto-created by LIS import */
  autoCreated: boolean;

  /** ISO timestamp */
  createdAt: string;

  /** ISO timestamp */
  updatedAt: string;
=======
// FlagDefinition — the admin-level flag type used by FlagManagerModal
// and flagsApi. Distinct from the service-layer Flag (IFlagService).

export interface FlagDefinition {
  id:           string;
  code:         string;
  name:         string;
  description?: string;
  /** Whether flag applies to a case or a specimen */
  level:        'case' | 'specimen';
  lisCode:      string;
  severity:     1 | 2 | 3 | 4 | 5;
  active:       boolean;
  autoCreated:  boolean;
  createdAt:    string;
  updatedAt:    string;
>>>>>>> upstream/main
}
