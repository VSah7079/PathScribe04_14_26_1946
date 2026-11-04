// src/services/scheduledReports/mockScheduledReportService.ts
// ─────────────────────────────────────────────────
// Batch 613: the schedule service wired to this build's pieces: browser-held storage, the
// audit log, the saved report list and the case search service. Every change and run needs
// search:report-schedule:manage. With the API server this file is replaced by HTTP calls.
// ─────────────────────────────────────────────────
import { storageGet, storageSet } from '../mockStorage';
import { mockAuditService } from '../auditlog/mockAuditService';
import { guardConfigWrites } from '../authorization/guardConfigWrites';
import { readSessionProfile } from '../auth/sessionProfile';
import { mockUserService } from '../users/mockUserService';
import { caseReportsStore } from '../caseReports/caseReportStore';
import { createMockCaseSearchServiceOver, loadCasesForSessionUser, mockCaseSearchService } from '../caseSearch/mockCaseSearchService';
import { mockRoleService } from '../roles/mockRoleService';
import { mockSubspecialtyService } from '../subspecialties/mockSubspecialtyService';
import { mockFacilityService } from '../facilities/mockFacilityService';
import type { CaseAccessSubspecialty } from '../auth/caseAccessControl';
import { casesVisibleToRecipient, sessionUserForStaff } from './recipientAccess';
import { cleanColumns } from '../caseSearch/caseSearchReport';
import { draftToCriteria } from '@/utils/search/buildCaseSearchRequest';
import { createScheduledReportService } from './createScheduledReportService';

const newId = (): string =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : `sr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const unchecked = createScheduledReportService({
  load: storageGet,
  save: storageSet,
  audit: e => mockAuditService.logEvent(e),
  actor: () => { const p = readSessionProfile(); return p ? { id: p.id, name: p.name ?? 'unknown' } : null; },
  now: () => new Date(),
  newId,
  async savedReportName(id) {
    const res = await caseReportsStore.list();
    return res.ok ? (res.data.find(r => r.id === id)?.name ?? null) : null;
  },
  async runReport(id, lookback) {
    const list = await caseReportsStore.list();
    const found = list.ok ? list.data.find(r => r.id === id) : undefined;
    if (!found) return { ok: false, error: 'REPORT_NOT_FOUND' };
    const d = found.definition;
    const res = await mockCaseSearchService.report({
      criteria: { ...draftToCriteria(d.draft), ...(lookback ?? {}) }, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      groupBy: d.groupBy, columns: cleanColumns(d.columns),
    });
    return res.ok ? { ok: true, data: { groupCount: res.data.groups.length, rowCount: res.data.rows.length, total: res.data.total } } : res;
  },
  // A recipient's share of the report: the owner's cases, filtered by that person's own access.
  async recipientTotals(id, userIds, lookback) {
    const list = await caseReportsStore.list();
    const found = list.ok ? list.data.find(r => r.id === id) : undefined;
    if (!found) return { ok: false, error: 'REPORT_NOT_FOUND' };
    const d = found.definition;
    const request = {
      criteria: { ...draftToCriteria(d.draft), ...(lookback ?? {}) }, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      groupBy: d.groupBy, columns: cleanColumns(d.columns),
    };
    const [ownerReport, ownerCases, staff, roles, subs, facilities] = await Promise.all([
      mockCaseSearchService.report(request), loadCasesForSessionUser(), mockUserService.getAll(), mockRoleService.getAll(),
      mockSubspecialtyService.getAll(), mockFacilityService.getAll(),
    ]);
    if (ownerReport.ok === false) return ownerReport;
    if (ownerCases.ok === false || staff.ok === false || roles.ok === false) return { ok: false, error: 'RECIPIENT_ACCESS_UNKNOWN' };
    const subspecialties = new Map<string, CaseAccessSubspecialty>();
    if (subs.ok) subs.data.forEach(s => subspecialties.set(s.id, { id: s.id, userIds: s.userIds ?? [], isWorkgroup: s.isWorkgroup ?? false, isWorkgroupEnabled: s.isWorkgroupEnabled ?? false }));
    const enterprise = facilities.ok ? facilities.data.filter(f => f.isEnterprise) : [];
    const visibleTotals: Record<string, number> = {};
    for (const userId of userIds) {
      const person = staff.data.find(u => u.id === userId);
      const visible = casesVisibleToRecipient(person ? sessionUserForStaff(person, roles.data) : null, ownerCases.data, subspecialties, enterprise);
      const res = await createMockCaseSearchServiceOver(async () => ({ ok: true, data: visible })).report(request);
      if (res.ok === false) return res;
      visibleTotals[userId] = res.data.total;
    }
    return { ok: true, data: { ownerTotal: ownerReport.data.total, visibleTotals } };
  },
  async existingUserIds(ids) {
    const res = await mockUserService.getAll();
    return res.ok ? res.data.filter(u => u.status === 'Active' && ids.includes(u.id)).map(u => u.id) : [];
  },
});

export const mockScheduledReportService = guardConfigWrites(unchecked, [
  ['search:report-schedule:manage', ['create', 'update', 'setActive', 'remove', 'runNow', 'runDue', 'assessRecipients']],
]);
