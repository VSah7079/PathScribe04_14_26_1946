// src/services/digitalPathology/aiQaReportRows.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 610 (#78). The rows behind the Quality Assurance "AI discordance" tab and
// its two CSV exports. Pure. Vendors with no reviewed results still get a row
// (with no rate, never 0%) so the lab sees which products have not been judged yet.
// Exports carry accession numbers only: no patient name, MRN or date of birth
// (qaReportUtils.ts's rule for every QA export).
// ─────────────────────────────────────────────────────────────────────────────
import type { AiScreeningResult } from '@/types/digitalPathology/AiScreeningResult';
import type { DpVendorEntry } from './IDpVendorService';
import { resolveAiHumanDiscrepancyReport } from './resolveAiHumanDiscrepancyReport';
import type { StalledAiResult } from './aiStalledResultRule';

export interface VendorDiscordanceRow {
  vendorId: string;
  vendorName: string;
  productName: string;
  /** Results ordered from this vendor, any status. */
  orderedCount: number;
  reviewedCount: number;
  concordantCount: number;
  discordantCount: number;
  /** 0 to 1; undefined when nothing has been reviewed. */
  discordanceRate?: number;
}

export function buildVendorDiscordanceRows(results: readonly AiScreeningResult[], vendors: readonly DpVendorEntry[]): VendorDiscordanceRow[] {
  const report = resolveAiHumanDiscrepancyReport([...results]);
  const rows: VendorDiscordanceRow[] = [];
  const seen = new Set<string>();
  const add = (vendorId: string, vendor?: DpVendorEntry) => {
    if (seen.has(vendorId)) return;
    seen.add(vendorId);
    const stats = report.byVendor.find(v => v.vendorId === vendorId);
    rows.push({
      vendorId,
      vendorName: vendor?.name ?? vendorId,
      productName: vendor?.productName ?? '',
      orderedCount: results.filter(r => r.vendorId === vendorId).length,
      reviewedCount: stats?.reviewedCount ?? 0,
      concordantCount: stats?.concordantCount ?? 0,
      discordantCount: stats?.discordantCount ?? 0,
      discordanceRate: stats?.discordanceRate,
    });
  };
  for (const v of vendors) if (v.active || results.some(r => r.vendorId === v.id)) add(v.id, v);
  for (const r of results) add(r.vendorId, vendors.find(v => v.id === r.vendorId));
  // Highest discordance first; products not yet reviewed last.
  return rows.sort((a, b) => (b.discordanceRate ?? -1) - (a.discordanceRate ?? -1) || a.vendorName.localeCompare(b.vendorName));
}

/** The percentage as text with one decimal, or an empty string when there is no rate. */
export const formatDiscordancePercent = (rate: number | undefined): string => (rate === undefined ? '' : (rate * 100).toFixed(1));

/** CSV rows. Column names stay English, as every export does. */
export function vendorDiscordanceExportRows(rows: readonly VendorDiscordanceRow[]): Record<string, string | number>[] {
  return rows.map(r => ({
    Vendor: r.vendorName,
    Product: r.productName,
    'Screenings ordered': r.orderedCount,
    'Reviewed by a pathologist': r.reviewedCount,
    Concordant: r.concordantCount,
    Discordant: r.discordantCount,
    'Discordance rate (%)': formatDiscordancePercent(r.discordanceRate),
  }));
}

export function stalledResultExportRows(
  stalled: readonly StalledAiResult[], vendors: readonly DpVendorEntry[], timeoutHours: number,
): Record<string, string | number>[] {
  return stalled.map(s => ({
    Accession: s.result.caseId,
    Vendor: vendors.find(v => v.id === s.result.vendorId)?.name ?? s.result.vendorId,
    'Ordered at': s.result.orderedAt,
    'Hours waiting': s.hoursWaiting,
    'Timeout (hours)': timeoutHours,
  }));
}
