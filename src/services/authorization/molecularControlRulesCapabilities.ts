// src/services/authorization/molecularControlRulesCapabilities.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 669 (ctl, Pete's ruling Oct 24, 2026): Control Rules (/molecular-control-rules) is no longer gated by the
// Molecular screen, which neither Admin nor Lab Director holds by default, so nobody who sets the rules could reach
// the page. It now has two capabilities of its own, one per action (verb last), spread into CAPABILITY_CATALOG from
// here so capabilityCatalog.ts does not grow (CLAUDE.md rule 10):
//
//   config:molecular-control-rules:view    read the rules (the page, and the rules the plate builder and rack
//                                          screen enforce). Checked in services/molecular/
//                                          mockMolecularAssayControlRuleService.ts (getAll, getByAssayCode) and by the
//                                          route (services/screens/screenAccess.ts, sub-screen 'molecularControlRules').
//   config:molecular-control-rules:manage  add, change or delete a rule (Batch 406). Needs view.
//
// Seeds (capabilitySeeds.ts): view to Admin (administration group), Lab Director, QA Reviewer, and every role that holds
// the Molecular screen (the Molecular Technologist); manage stays with Admin and Lab Director.
// ─────────────────────────────────────────────────────────────────────────────
import type { CapabilityDefinition } from './capabilityCatalog';

export const MOLECULAR_CONTROL_RULES_CAPABILITIES = [
  { key: 'config:molecular-control-rules:view', labelId: 'configMolecularControlRulesView', group: 'administration', risk: 'standard', requires: [] },
  { key: 'config:molecular-control-rules:manage', labelId: 'configMolecularControlRulesManage', group: 'administration', risk: 'high', requires: ['config:molecular-control-rules:view'] },
] as const satisfies readonly CapabilityDefinition[];
