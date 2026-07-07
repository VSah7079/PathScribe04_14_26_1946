// src/components/Contribution/AIContributionTab.tsx
import React, { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import '../../pathscribe.css';
// Migrated June 2026 from the dead services/specimens/mockSpecimenService.ts
// (zero real callers except this file — confirmed, then this file itself
// turned up as the one real caller a case-sensitive grep had missed) onto
// the real Specimen Dictionary service.
import { specimenDictionaryService } from '@/services';
import type { SpecimenEntry } from '@/components/Config/System/specimenTypes';

// ─── Types ────────────────────────────────────────────────────────────────────

type DateRange  = "30d" | "90d" | "ytd";
type Section    = "acceptance" | "overrides" | "comparison";
type AiWorkflow = "synoptic" | "narrative";

interface BreakdownRow {
  label: string; code?: string; rate: number; cases: number;
}

interface OverriddenCase {
  id: string; caseType: string; clientCode?: string;
  aiSuggestion: string; finalDiagnosis: string; reason: string; date: string; daysAgo: number;
}

interface CaseComparison {
  caseType: string; aiAssisted: number; manual: number;
  aiTat: number; manualTat: number;
}

interface MonthlyPoint { month: string; rate: number; }

interface WorkflowDataset {
  label: string;
  tileAssistedLabel: string;
  tileAssistedIcon: string;
  tileOverridesLabel: string;
  tileConfidenceLabel: string;
  breakdownTitle: string;
  breakdownSubtitle: string;
  breakdownUnit: string;
  overridesTitle: string;
  overridesSubtitle: string;
  overridesAiCol: string;
  overridesFinalCol: string;
  overridesReasonCol: string;
  comparisonTitle: string;
  comparisonSubtitle: string;
  comparisonAiLabel: string;
  comparisonManualLabel: string;
  trendTitle: string;
  trendSubtitle: string;
  summary: { totalAssisted: number; totalCases: number; avgConfidence: number };
  breakdown: BreakdownRow[];
  overridden: OverriddenCase[];
  comparison: CaseComparison[];
  monthlyShape: number[]; // illustrative full-year pattern; actual displayed months are derived live from the real date
}

// ─── Mock Data — Synoptic AI (CoPilot field-suggestion AI) ────────────────────

const synopticDataset: WorkflowDataset = {
  label: "Synoptic AI (CoPilot)",
  tileAssistedLabel:   "AI-Assisted Cases",
  tileAssistedIcon:    "🤖",
  tileOverridesLabel:  "Overrides",
  tileConfidenceLabel: "Avg AI Confidence",
  breakdownTitle:    "Acceptance by Case Type",
  breakdownSubtitle: "% of AI synoptic field suggestions accepted",
  breakdownUnit:     "cases",
  overridesTitle:    "AI Overrides",
  overridesSubtitle: "Cases where AI suggestion was reviewed and changed by pathologist",
  overridesAiCol:     "AI Suggestion",
  overridesFinalCol:  "Final Diagnosis",
  overridesReasonCol: "Override Reason",
  comparisonTitle:    "AI-Assisted vs Manual",
  comparisonSubtitle: "Case volume and average turnaround time by workflow type",
  comparisonAiLabel:     "AI-Assisted",
  comparisonManualLabel: "Manual",
  trendTitle:    "Acceptance Trend",
  trendSubtitle: "AI suggestion acceptance rate over the selected period",
  summary: { totalAssisted: 92, totalCases: 128, avgConfidence: 91.4 },
  // breakdown is intentionally empty here — for the synoptic workflow this is
  // replaced at render time with categories derived live from the real
  // Specimen Dictionary (grouped by subspecialty name), not a hardcoded list.
  // See deriveBreakdownFromSpecimens below.
  breakdown: [],
  overridden: [
    { id: "PSA-2024-1195", caseType: "Breast Core Bx",   aiSuggestion: "Benign fibrocystic change",   finalDiagnosis: "Atypical ductal hyperplasia", reason: "Clinical context",     date: "Aug 13", daysAgo: 12  },
    { id: "PSA-2024-1183", caseType: "Prostate Bx",      aiSuggestion: "Gleason 3+3=6",               finalDiagnosis: "Gleason 3+4=7",              reason: "Pattern assessment",   date: "Aug 10", daysAgo: 15  },
    { id: "PSA-2024-1171", caseType: "Skin Shave",       aiSuggestion: "Compound nevus",              finalDiagnosis: "Dysplastic nevus, moderate",  reason: "Architectural atypia", date: "Aug 7",  daysAgo: 18  },
    { id: "PSA-2024-1158", caseType: "Lymph Node",       aiSuggestion: "Reactive lymphadenopathy",    finalDiagnosis: "Metastatic carcinoma",        reason: "IHC correlation",      date: "Aug 1",  daysAgo: 24  },
    { id: "PSA-2024-1102", caseType: "Renal Biopsy",     aiSuggestion: "Acute tubular injury",        finalDiagnosis: "Acute interstitial nephritis", reason: "Clinical correlation", date: "Jun 28", daysAgo: 58  },
    { id: "PSA-2024-1041", caseType: "Thyroid FNA",      aiSuggestion: "Benign follicular nodule",    finalDiagnosis: "Follicular neoplasm, atypia",  reason: "Architectural atypia", date: "May 12", daysAgo: 105 },
  ],
  comparison: [
    { caseType: "Breast",  aiAssisted: 38, manual: 4, aiTat: 1.8, manualTat: 2.9 },
    { caseType: "GI",      aiAssisted: 34, manual: 4, aiTat: 1.5, manualTat: 2.4 },
    { caseType: "GU",      aiAssisted: 19, manual: 2, aiTat: 1.9, manualTat: 3.1 },
    { caseType: "Derm",    aiAssisted: 15, manual: 2, aiTat: 1.2, manualTat: 2.0 },
  ],
  monthlyShape: [82, 84, 83, 86, 85, 88, 87, 87, 86, 89, 90, 91],
};

// ─── Mock Data — Narrative AI (Orchestration mode, outreach Gold Standard) ────
// Breakdown dimension is by CLIENT rather than case type, since Orchestration's
// Gold Standard template fallback is client-driven, not specialty-driven.
// Client codes (MGH/RMC/WSC) match the same clients used in QualityTab's TAT-by-client data.

const narrativeDataset: WorkflowDataset = {
  label: "Narrative AI (Outreach)",
  tileAssistedLabel:   "AI-Drafted Reports",
  tileAssistedIcon:    "📝",
  tileOverridesLabel:  "Narrative Edits",
  tileConfidenceLabel: "Avg Draft Confidence",
  breakdownTitle:    "Acceptance by Client",
  breakdownSubtitle: "% of AI-drafted narratives accepted with no edits",
  breakdownUnit:     "reports",
  overridesTitle:    "Narrative Edits",
  overridesSubtitle: "Outreach reports where the AI-drafted narrative was edited before sign-out",
  overridesAiCol:     "AI Draft Excerpt",
  overridesFinalCol:  "Final Excerpt",
  overridesReasonCol: "Edit Reason",
  comparisonTitle:    "AI-Drafted vs Manually Typed",
  comparisonSubtitle: "Report volume and average turnaround time by drafting method",
  comparisonAiLabel:     "AI-Drafted",
  comparisonManualLabel: "Manually Typed",
  trendTitle:    "Narrative Acceptance Trend",
  trendSubtitle: "AI-drafted narrative acceptance rate over the selected period",
  summary: { totalAssisted: 34, totalCases: 40, avgConfidence: 78.6 },
  breakdown: [
    { label: "Metro General Hospital",   code: "MGH", rate: 71, cases: 14 },
    { label: "Riverside Medical Center", code: "RMC", rate: 64, cases: 11 },
    { label: "Westview Surgery Center",  code: "WSC", rate: 58, cases: 9  },
  ],
  overridden: [
    { id: "OUT-2024-0512", caseType: "Skin Excision", clientCode: "WSC", aiSuggestion: "Margins widely clear of significant pathology with no residual atypia identified.",            finalDiagnosis: "Margins clear; rare residual junctional atypia noted near the inferior margin.",        reason: "Added margin nuance",             date: "Aug 12", daysAgo: 13 },
    { id: "OUT-2024-0498", caseType: "GI Biopsy",     clientCode: "MGH", aiSuggestion: "Findings are consistent with chronic inactive gastritis without Helicobacter organisms.",       finalDiagnosis: "Findings consistent with chronic gastritis; rare H. pylori organisms on special stain.", reason: "Incorporated special stain result", date: "Aug 6",  daysAgo: 19 },
    { id: "OUT-2024-0471", caseType: "Breast Core Bx",clientCode: "RMC", aiSuggestion: "No definitive evidence of invasive carcinoma identified in the submitted tissue.",              finalDiagnosis: "No invasive carcinoma; atypical ductal hyperplasia present, correlation recommended.",   reason: "Added clinical correlation",      date: "Jul 22", daysAgo: 34 },
    { id: "OUT-2024-0440", caseType: "Prostate Bx",   clientCode: "MGH", aiSuggestion: "Benign prostatic tissue with no evidence of malignancy in the cores examined.",                 finalDiagnosis: "Benign prostatic tissue; focal atypical small acinar proliferation, repeat advised.",    reason: "Flagged ASAP finding",            date: "Jun 30", daysAgo: 56 },
    { id: "OUT-2024-0398", caseType: "Thyroid FNA",   clientCode: "WSC", aiSuggestion: "Specimen is adequate and consistent with a benign colloid nodule.",                              finalDiagnosis: "Specimen adequate; findings most consistent with benign nodule, Bethesda II.",            reason: "Added Bethesda classification",   date: "May 28", daysAgo: 89 },
  ],
  comparison: [
    { caseType: "Breast", aiAssisted: 9, manual: 2, aiTat: 2.6, manualTat: 3.8 },
    { caseType: "GI",     aiAssisted: 8, manual: 1, aiTat: 2.2, manualTat: 3.1 },
    { caseType: "GU",     aiAssisted: 6, manual: 1, aiTat: 2.9, manualTat: 4.0 },
    { caseType: "Skin",   aiAssisted: 6, manual: 1, aiTat: 1.9, manualTat: 2.7 },
  ],
  monthlyShape: [58, 60, 59, 63, 65, 67, 69, 71, 70, 73, 75, 76],
};

// Display labels for known subspecialty values from the specimen dictionary.
// Falls back to a humanized version of the raw name for anything not listed here,
// so a newly-added subspecialty never silently disappears from the breakdown.
const SUBSPECIALTY_LABELS: Record<string, string> = {
  gi:     "GI",
  breast: "Breast",
  derm:   "Dermatopathology",
  neuro:  "Neuropathology",
  heme:   "Hematopathology",
  gyn:    "Gynecologic",
  uro:    "Genitourinary",
  "":     "Unassigned",
};

// Illustrative acceptance rates per subspecialty — the CATEGORY LIST itself is
// derived live from the specimen dictionary (see deriveBreakdownFromSpecimens),
// but there's no real AI-usage audit trail behind these specific rate numbers yet.
// Falls back to a generic 80% for any subspecialty not seeded here.
const MOCK_RATE_BY_SUBSPECIALTY: Record<string, number> = {
  gi: 88, breast: 91, derm: 82, neuro: 86, heme: 84, gyn: 80, uro: 85, "": 75,
};
const CASES_PER_SPECIMEN_TYPE = 12; // mock volume multiplier — illustrative only

function humanizeSubspecialtyId(id: string): string {
  if (!id) return "Unassigned";
  return id.charAt(0).toUpperCase() + id.slice(1);
}

function deriveBreakdownFromSpecimens(specimens: SpecimenEntry[]): BreakdownRow[] {
  const groups = new Map<string, number>(); // subspecialty name -> active specimen-type count
  for (const s of specimens) {
    if (!s.active) continue;
    const key = (s.subspecialty ?? "").toLowerCase();
    groups.set(key, (groups.get(key) ?? 0) + 1);
  }
  return Array.from(groups.entries())
    .map(([id, typeCount]) => ({
      label: SUBSPECIALTY_LABELS[id] ?? humanizeSubspecialtyId(id),
      rate: MOCK_RATE_BY_SUBSPECIALTY[id] ?? 80,
      cases: typeCount * CASES_PER_SPECIMEN_TYPE,
    }))
    .sort((a, b) => b.cases - a.cases);
}

const WORKFLOW_DATA: Record<AiWorkflow, WorkflowDataset> = {
  synoptic:  synopticDataset,
  narrative: narrativeDataset,
};

// 30-day view: synthesize 4 weekly points trending from last month's rate
// toward this month's, anchored to real calendar dates (mirrors the same
// technique used in QualityTab.tsx for its TAT trend 30-day view).
function formatWeekLabel(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
// "Year to date" should mean January through whichever month it actually is
// right now — not a frozen hardcoded list that drifts out of sync the moment
// a real month passes. monthlyShape is an illustrative 12-value pattern;
// this slices it down to Jan..currentMonth using the real calendar date,
// with real month names, so YTD is always correct regardless of when it's viewed.
function buildYtdMonthly(monthlyShape: number[]): MonthlyPoint[] {
  const today = new Date();
  const currentMonthIdx = today.getMonth(); // 0 = Jan
  const monthCount = Math.min(currentMonthIdx + 1, monthlyShape.length);
  const points: MonthlyPoint[] = [];
  for (let i = 0; i < monthCount; i++) {
    const label = new Date(today.getFullYear(), i, 1).toLocaleDateString('en-US', { month: 'short' });
    points.push({ month: label, rate: monthlyShape[i] });
  }
  return points;
}

function generateLast4WeeksAcceptance(monthly: MonthlyPoint[]): MonthlyPoint[] {
  const latest = monthly[monthly.length - 1];
  const prev   = monthly[monthly.length - 2] ?? latest;
  const weights = [0.15, 0.45, 0.75, 1];
  const today = new Date();
  const weeks: MonthlyPoint[] = [];
  for (let i = 3; i >= 0; i--) {
    const weekEnding = new Date(today);
    weekEnding.setDate(today.getDate() - i * 7);
    const w = weights[3 - i];
    weeks.push({ month: formatWeekLabel(weekEnding), rate: +(prev.rate + (latest.rate - prev.rate) * w).toFixed(1) });
  }
  return weeks;
}

const AIContributionTab: React.FC = () => {
  const [workflow,  setWorkflow]  = useState<AiWorkflow>("synoptic");
  const [section,   setSection]   = useState<Section>("acceptance");
  const [dateRange, setDateRange] = useState<DateRange>("30d");

  const [specimens, setSpecimens] = useState<SpecimenEntry[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    specimenDictionaryService.getAll().then(result => {
      if (!cancelled && result.ok) setSpecimens(result.data);
    });
    return () => { cancelled = true; };
  }, []);

  const liveSynopticBreakdown = specimens ? deriveBreakdownFromSpecimens(specimens) : null;

  const ds = workflow === "synoptic" && liveSynopticBreakdown
    ? { ...WORKFLOW_DATA[workflow], breakdown: liveSynopticBreakdown }
    : WORKFLOW_DATA[workflow];

  const cutoff = dateRange === "30d" ? 30 : dateRange === "90d" ? 90 : 366;

  const monthly = buildYtdMonthly(ds.monthlyShape);

  const trendRows = dateRange === "30d"
    ? generateLast4WeeksAcceptance(monthly)
    : dateRange === "90d" ? monthly.slice(-3) : monthly;

  const ytdAvgRate = +(monthly.reduce((s, d) => s + d.rate, 0) / monthly.length).toFixed(1);
  const periodAvgRate = +(trendRows.reduce((s, d) => s + d.rate, 0) / trendRows.length).toFixed(1);
  const rateDelta = +(periodAvgRate - ytdAvgRate).toFixed(1);

  const periodTitleLabel = dateRange === "30d" ? "Last 4 Weeks" : dateRange === "90d" ? "Last 90 Days" : "Year to Date";

  // monthly now spans however many real months have elapsed this year so far —
  // use that as the YTD baseline window for proportional volume scaling
  // (same technique as QualityTab), instead of a hardcoded month count.
  const monthsInPeriod = dateRange === "30d" ? 1 : dateRange === "90d" ? 3 : monthly.length;
  const periodFraction = monthsInPeriod / monthly.length;
  const scaledTotalCases    = dateRange === "ytd" ? ds.summary.totalCases    : Math.round(ds.summary.totalCases    * periodFraction);
  const scaledTotalAssisted = dateRange === "ytd" ? ds.summary.totalAssisted : Math.round(ds.summary.totalAssisted * periodFraction);

  const filteredOverridden = ds.overridden.filter(c => c.daysAgo <= cutoff);

  const scaledBreakdown = ds.breakdown.map(r => ({
    ...r,
    cases: dateRange === "ytd" ? r.cases : Math.max(1, Math.round(r.cases * periodFraction)),
  }));

  const scaledComparison = ds.comparison.map(c => ({
    ...c,
    aiAssisted: dateRange === "ytd" ? c.aiAssisted : Math.max(1, Math.round(c.aiAssisted * periodFraction)),
    manual:     dateRange === "ytd" ? c.manual     : Math.max(1, Math.round(c.manual     * periodFraction)),
  }));

  const summaryTiles = [
    { label: "AI Acceptance Rate",     value: periodAvgRate,             unit: "%", color: "#34d399", icon: "✓",
      delta: `${rateDelta >= 0 ? "+" : ""}${rateDelta}% vs YTD avg`, deltaUp: rateDelta >= 0 },
    { label: ds.tileAssistedLabel,     value: scaledTotalAssisted,       unit: "",  color: "#38bdf8", icon: ds.tileAssistedIcon,
      delta: `of ${scaledTotalCases} total`, deltaUp: null as boolean | null },
    { label: ds.tileOverridesLabel,    value: filteredOverridden.length, unit: "",  color: "#fbbf24", icon: "✏️",
      delta: workflow === "synoptic" ? "pathologist-changed" : "edited before sign-out", deltaUp: null as boolean | null },
    { label: ds.tileConfidenceLabel,   value: ds.summary.avgConfidence,  unit: "%", color: "#0891b2", icon: "📊",
      delta: "not period-filtered", deltaUp: null as boolean | null },
  ];

  return (
    <div className="ps-quality-container">

      {/* ── AI workflow switcher ── */}
      <div className="ps-quality-nav" style={{ borderBottom: "none", paddingBottom: 0 }}>
        <div className="ps-quality-nav__left">
          {(Object.keys(WORKFLOW_DATA) as AiWorkflow[]).map(w => (
            <button key={w} className={`ps-quality-btn${workflow === w ? " active" : ""}`} onClick={() => setWorkflow(w)}>
              {WORKFLOW_DATA[w].label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Summary tiles ── */}
      <div className="ps-quality-summary-grid">
        {summaryTiles.map(s => (
          <div key={s.label} className="ps-quality-summary-tile">
            <div className="ps-quality-summary-tile__header">
              <span className="ps-quality-summary-tile__label">{s.label}</span>
              <span>{s.icon}</span>
            </div>
            <div className="ps-quality-summary-tile__value-row">
              <span className="ps-quality-summary-tile__value" style={{ color: s.color }}>
                {s.value}
              </span>
              {s.unit && <span className="ps-quality-summary-tile__unit">{s.unit}</span>}
            </div>
            <div className="ps-quality-summary-tile__period">
              {s.deltaUp === null
                ? s.delta
                : <span style={{ color: s.deltaUp ? "#34d399" : "#f87171" }}>{s.deltaUp ? "▲" : "▼"} {s.delta}</span>
              }
            </div>
          </div>
        ))}
      </div>

      {/* ── Section nav + date range ── */}
      <div className="ps-quality-nav">
        <div className="ps-quality-nav__left">
          <button className={`ps-quality-btn${section === "acceptance" ? " active" : ""}`} onClick={() => setSection("acceptance")}>Acceptance Rate</button>
          <button className={`ps-quality-btn${section === "overrides"  ? " active" : ""}`} onClick={() => setSection("overrides")}>{ds.tileOverridesLabel}</button>
          <button className={`ps-quality-btn${section === "comparison" ? " active" : ""}`} onClick={() => setSection("comparison")}>{ds.comparisonAiLabel} vs {ds.comparisonManualLabel}</button>
        </div>
        <div className="ps-quality-nav__right">
          {(["30d", "90d", "ytd"] as DateRange[]).map(r => (
            <button key={r} className={`ps-quality-btn${dateRange === r ? " active" : ""}`} onClick={() => setDateRange(r)}>{r.toUpperCase()}</button>
          ))}
        </div>
      </div>

      {/* ── Acceptance Rate section ── */}
      {section === "acceptance" && (
        <div className="ps-quality-split-grid">

          {/* Acceptance by case type / client */}
          <div className="ps-quality-card">
            <div className="ps-quality-card__header">
              <div className="ps-quality-card__title">{ds.breakdownTitle}</div>
              <div className="ps-quality-card__subtitle">{ds.breakdownSubtitle}</div>
            </div>
            <div className="ps-quality-bar-list">
              {workflow === "synoptic" && specimens === null
                ? <div className="ps-quality-empty">Loading case types\u2026</div>
                : scaledBreakdown.map(r => (
                <div key={r.label} className="ps-quality-bar-row">
                  <div className="ps-quality-bar-row__label-row">
                    <span className="ps-quality-bar-row__type">
                      {r.code && <span className="ps-client-code-badge" style={{ marginRight: "6px" }}>{r.code}</span>}
                      {r.label}
                    </span>
                    <span className="ps-quality-bar-row__meta">{r.cases} {ds.breakdownUnit} &middot; <span className="ps-quality-bar-row__rate">{r.rate}%</span></span>
                  </div>
                  <div className="ps-quality-progress-track">
                    <div className="ps-quality-progress-fill" style={{ width: `${r.rate}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Acceptance trend chart */}
          <div className="ps-quality-card">
            <div className="ps-quality-card__header">
              <div className="ps-quality-card__title">{ds.trendTitle} &mdash; {periodTitleLabel}</div>
              <div className="ps-quality-card__subtitle">{ds.trendSubtitle}</div>
            </div>
            <div style={{ padding: "8px 16px 16px" }}>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendRows} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={{ stroke: "rgba(255,255,255,0.08)" }} tickLine={false} />
                  <YAxis domain={[50, 100]} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false}
                    tickFormatter={(v: number) => `${v}%`} width={40} />
                  <Tooltip content={({ active, payload, label }: any) => {
                    if (!active || !payload?.length) return null;
                    const val = payload[0]?.value as number;
                    return (
                      <div className="ps-tat-trend__tooltip">
                        <div className="ps-tat-trend__tooltip-header">{label}</div>
                        <div className="ps-tat-trend__tooltip-ft">{val}% acceptance</div>
                      </div>
                    );
                  }} />
                  <Line type="monotone" dataKey="rate" stroke="var(--ps-teal-light)" strokeWidth={2.5}
                    dot={{ r: 3, fill: "var(--ps-teal-light)", strokeWidth: 0 }} activeDot={{ r: 5, fill: "var(--ps-teal-light)" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── Overrides / Narrative Edits ── */}
      {section === "overrides" && (
        <div className="ps-quality-card">
          <div className="ps-quality-card__header">
            <div className="ps-quality-card__title">{ds.overridesTitle}</div>
            <div className="ps-quality-card__subtitle">{ds.overridesSubtitle}</div>
          </div>
          {filteredOverridden.length === 0
            ? <div className="ps-quality-empty">✓ No {ds.tileOverridesLabel.toLowerCase()} this period</div>
            : (
              <table className="ps-quality-table">
                <thead>
                  <tr>{["Case", "Type", ...(workflow === "narrative" ? ["Client"] : []), ds.overridesAiCol, ds.overridesFinalCol, ds.overridesReasonCol, "Date"].map(h => <th key={h} className="ps-quality-th">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {filteredOverridden.map(c => (
                    <tr key={c.id}>
                      <td className="ps-quality-td ps-quality-td--accent">{c.id}</td>
                      <td className="ps-quality-td">{c.caseType}</td>
                      {workflow === "narrative" && (
                        <td className="ps-quality-td">{c.clientCode && <span className="ps-client-code-badge">{c.clientCode}</span>}</td>
                      )}
                      <td className="ps-quality-td ps-quality-td--muted">{c.aiSuggestion}</td>
                      <td className="ps-quality-td ps-quality-td--primary">{c.finalDiagnosis}</td>
                      <td className="ps-quality-td">
                        <span className="ps-badge ps-badge-teal">{c.reason}</span>
                      </td>
                      <td className="ps-quality-td ps-quality-td--muted">{c.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>
      )}

      {/* ── AI vs Manual comparison ── */}
      {section === "comparison" && (
        <div className="ps-quality-card">
          <div className="ps-quality-card__header">
            <div className="ps-quality-card__title">{ds.comparisonTitle}</div>
            <div className="ps-quality-card__subtitle">{ds.comparisonSubtitle}</div>
            <div className="ps-quality-legend">
              <div className="ps-quality-legend__item">
                <div className="ps-quality-legend__swatch" style={{ background: "var(--ps-teal-light)" }} />
                <span>{ds.comparisonAiLabel}</span>
              </div>
              <div className="ps-quality-legend__item">
                <div className="ps-quality-legend__swatch" style={{ background: "#64748b" }} />
                <span>{ds.comparisonManualLabel}</span>
              </div>
            </div>
          </div>
          <table className="ps-quality-table">
            <thead>
              <tr>{["Case Type", `${ds.comparisonAiLabel} Cases`, `${ds.comparisonManualLabel} Cases`, `${ds.comparisonAiLabel} Avg TAT`, `${ds.comparisonManualLabel} Avg TAT`, "TAT Improvement"].map(h => <th key={h} className="ps-quality-th">{h}</th>)}</tr>
            </thead>
            <tbody>
              {scaledComparison.map(c => {
                const improvement = ((c.manualTat - c.aiTat) / c.manualTat * 100).toFixed(0);
                return (
                  <tr key={c.caseType}>
                    <td className="ps-quality-td ps-quality-td--primary ps-quality-td--bold">{c.caseType}</td>
                    <td className="ps-quality-td ps-quality-td--accent">{c.aiAssisted}</td>
                    <td className="ps-quality-td ps-quality-td--muted">{c.manual}</td>
                    <td className="ps-quality-td ps-quality-td--accent">{c.aiTat}d</td>
                    <td className="ps-quality-td ps-quality-td--muted">{c.manualTat}d</td>
                    <td className="ps-quality-td">
                      <span className="ps-quality-delta--concordant">&#9650; {improvement}% faster</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
};

export default AIContributionTab;
