// src/services/routingRules/IRoutingRuleService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Contract for template routing rule persistence.
// Rules are admin-defined overrides that take priority over the default
// synoptic protocol → subspecialty → gold-standard resolution chain.
//
// Priority order (matches TemplateRoutingService):
//   Pass 0  — Client override   (clientId → templateId)
//   Pass 0b — Physician pref    (physicianId → templateId)
//   Pass 1  — Synoptic protocol (admin-defined rules below, merged with the
//                                 hardcoded fallback map in TemplateRoutingService —
//                                 admin rules take precedence)
//   Pass 2  — Subspecialty      (hardcoded in TemplateRoutingService)
//   Pass 3  — Gold standard     (universal fallback)
// ─────────────────────────────────────────────────────────────────────────────

import type { ServiceResult, ID } from '../types';

export type RoutingRuleType = 'client' | 'physician' | 'protocol';

export interface RoutingRule {
  id:           ID;
  type:         RoutingRuleType;
  /** clientId, physicianId, or synoptic protocol ID, depending on type */
  entityId:     string;
  /** Cached display name — avoids async lookup */
  entityName:   string;
  /** Target report template ID */
  templateId:   string;
  /** Cached template name */
  templateName: string;
  /** Optional note explaining why this override exists */
  note?:        string;
  active:       boolean;
  createdAt:    string;
  updatedAt:    string;
  createdBy:    string;
}

export interface IRoutingRuleService {
  getAll():                               Promise<ServiceResult<RoutingRule[]>>;
  getByType(type: RoutingRuleType):       Promise<ServiceResult<RoutingRule[]>>;
  getById(id: ID):                        Promise<ServiceResult<RoutingRule>>;
  add(rule: Omit<RoutingRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceResult<RoutingRule>>;
  update(id: ID, changes: Partial<Omit<RoutingRule, 'id' | 'createdAt'>>): Promise<ServiceResult<RoutingRule>>;
  remove(id: ID):                         Promise<ServiceResult<void>>;
  /** Returns the map used by TemplateRoutingService — { entityId: templateId } */
  getClientMap():                         Promise<ServiceResult<Record<string, string>>>;
  getPhysicianMap():                      Promise<ServiceResult<Record<string, string>>>;
  /** Admin-defined synoptic protocol → template overrides — { protocolId: templateId } */
  getProtocolMap():                       Promise<ServiceResult<Record<string, string>>>;
}
