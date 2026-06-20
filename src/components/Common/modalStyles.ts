/**
 * src/components/Common/modalStyles.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * DEPRECATED — all styles have moved to pathscribe.css as CSS classes.
 *
 * Equivalent CSS classes:
 *   overlay           → .ps-ms-overlay
 *   modalBox          → .ps-ms-modal
 *   modalHeaderStyle  → .ps-ms-header
 *   modalSubheaderStyle → .ps-ms-subheader
 *   fieldGroupStyle   → .ps-ms-field-group
 *   labelStyle        → .ps-ms-label
 *   inputStyle        → .ps-ms-input
 *   textareaStyle     → .ps-ms-textarea
 *   selectStyle       → .ps-ms-select
 *   modalFooterStyle  → .ps-ms-footer
 *   cancelButtonStyle → .ps-ms-btn-cancel
 *   applyButtonStyle  → .ps-ms-btn-apply
 *
 * These shims are kept so existing imports continue to compile.
 * Refactor each consuming component to use className instead of style
 * and remove this import when done.
 *
 * Consumers: RoleDictionary, StaffTab, ParticipationTypesSection,
 *            PhysiciansSection, RoutingRulesSection, SpecimenDictionary,
 *            SubspecialtiesSection (already refactored)
 * ─────────────────────────────────────────────────────────────────────────────
 */
import type React from "react";

const _: React.CSSProperties = {};

export const overlay             = _;
export const modalBox            = _;
export const modalHeaderStyle    = _;
export const modalSubheaderStyle = _;
export const fieldGroupStyle     = _;
export const labelStyle          = _;
export const inputStyle          = _;
export const textareaStyle       = _;
export const selectStyle         = _;
export const modalFooterStyle    = _;
export const cancelButtonStyle   = _;
export const applyButtonStyle    = _;
