// src/components/Contribution/QualityTab.tsx
import React, { useState } from "react";
import '../../pathscribe.css';
import { mockActionRegistryService } from '@/services/actionRegistry/mockActionRegistryService';
import { VOICE_CONTEXT } from '@/constants/systemActions';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

type Severity   = "low" | "medium" | "high";
type DateRange  = "30d" | "90d" | "ytd";
type Section    = "discordant" | "amended" | "tat" | "tatClient";
type TatSubView = "firstTouch" | "total";
type MetricView = "firstTouch" | "total";
// All supported TAT types — mirrors TATEntry.type in the config system
type TatTileKey = "firstTouch" | "totalCase" | "frozenSection" | "grossing" | "signOut" | "coldIschemia" | "consultResponse" | "consultAwaiting";

interface DiscordantCase {
  id: string; caseType: string; frozenDx: string; finalDx: string;
  delta: string; date: string; severity: Severity; daysAgo: number;
}
interface AmendedCase {
  id: string; caseType: string; reason: string; date: string; severity: Severity; daysAgo: number;
}
interface FirstTouchOutlier {
  id: string; caseType: string; date: string;
  firstTouchHrs: number; targetHrs: number; overByHrs: number; clientCode: string; daysAgo: number;
}
interface TotalTATOutlier {
  id: string; caseType: string; date: string;
  tatHrs: number; targetHrs: number; overByHrs: number; clientCode: string; daysAgo: number;
}
interface ClientTatRow {
  id: string; name: string; code: string;
  target:   { firstTouch: number; total: number };
  mine:     { firstTouch: number; total: number };
  peer:     { firstTouch: number; total: number };
  breaches: { firstTouch: number; total: number };
}
interface TatTrendMonth {
  month:           string;
  cases:           number;
  firstTouch:      number;  // hrs
  totalCase:       number;
  frozenSection:   number;
  grossing:        number;
  signOut:         number;
  coldIschemia:    number;
  consultResponse: number;  // hrs — how fast I respond to review requests
  consultAwaiting: number;  // hrs — how long I wait for responses
}
// ─── Mock Data ────────────────────────────────────────────────────────────────

const mockDiscordant: DiscordantCase[] = [
  { id: "PSA-2024-1190", caseType: "Breast Core Bx",    frozenDx: "Atypical, favor benign",  finalDx: "DCIS, low grade",         delta: "Upgraded",   date: "Aug 12", severity: "high",   daysAgo: 13  },
  { id: "PSA-2024-1178", caseType: "Colon Polypectomy", frozenDx: "Adenoma, low-grade",      finalDx: "Adenoma, low-grade",      delta: "Concordant", date: "Aug 9",  severity: "low",    daysAgo: 16  },
  { id: "PSA-2024-1165", caseType: "Thyroid Lobe",      frozenDx: "Follicular lesion",       finalDx: "Follicular carcinoma",    delta: "Upgraded",   date: "Aug 5",  severity: "medium", daysAgo: 20  },
  { id: "PSA-2024-1142", caseType: "Lymph Node",        frozenDx: "Reactive",                finalDx: "Metastatic carcinoma",    delta: "Upgraded",   date: "Jul 28", severity: "high",   daysAgo: 28  },
  { id: "PSA-2024-1098", caseType: "Soft Tissue Mass",  frozenDx: "Spindle cell neoplasm",   finalDx: "Low-grade sarcoma",       delta: "Upgraded",   date: "Jul 3",  severity: "medium", daysAgo: 53  },
  { id: "PSA-2024-1071", caseType: "Liver Wedge",       frozenDx: "Atypical hepatocytes",    finalDx: "Hepatocellular carcinoma",delta: "Upgraded",   date: "Jun 15", severity: "high",   daysAgo: 71  },
  { id: "PSA-2024-1034", caseType: "Lung Wedge",        frozenDx: "Inflammatory change",     finalDx: "Adenocarcinoma",          delta: "Upgraded",   date: "May 20", severity: "high",   daysAgo: 97  },
  { id: "PSA-2024-0988", caseType: "Prostate Bx",       frozenDx: "PIN, high grade",         finalDx: "Gleason 3+4 carcinoma",   delta: "Upgraded",   date: "Apr 18", severity: "medium", daysAgo: 129 },
];

const mockAmended: AmendedCase[] = [
  { id: "PSA-2024-1201", caseType: "Prostate Bx",      reason: "Specimen labeling mismatch",    date: "Aug 14", severity: "high",   daysAgo: 11  },
  { id: "PSA-2024-1185", caseType: "Skin Excision",    reason: "Margin status correction",       date: "Aug 11", severity: "medium", daysAgo: 14  },
  { id: "PSA-2024-1170", caseType: "GI Biopsy",        reason: "Diagnosis clarification added",  date: "Aug 6",  severity: "low",    daysAgo: 19  },
  { id: "PSA-2024-1155", caseType: "Breast Excision",  reason: "IHC results addended",           date: "Jul 31", severity: "low",    daysAgo: 25  },
  { id: "PSA-2024-1102", caseType: "Renal Biopsy",     reason: "Tumour grade amended",           date: "Jun 28", severity: "medium", daysAgo: 58  },
  { id: "PSA-2024-1063", caseType: "Lymph Node Panel", reason: "Additional immunostains addended",date: "Jun 5", severity: "low",    daysAgo: 81  },
  { id: "PSA-2024-1021", caseType: "Thyroid FNA",      reason: "Cytological reclassification",   date: "May 8",  severity: "medium", daysAgo: 109 },
];

const mockFirstTouchOutliers: FirstTouchOutlier[] = [
  { id: "PSA-2024-1199", caseType: "Renal Biopsy",  date: "Aug 14", firstTouchHrs: 7.2,  targetHrs: 4, overByHrs: 3.2, clientCode: "MGH", daysAgo: 11  },
  { id: "PSA-2024-1188", caseType: "Lung Wedge",    date: "Aug 10", firstTouchHrs: 9.1,  targetHrs: 4, overByHrs: 5.1, clientCode: "MGH", daysAgo: 15  },
  { id: "PSA-2024-1173", caseType: "Liver Core Bx", date: "Aug 6",  firstTouchHrs: 10.4, targetHrs: 8, overByHrs: 2.4, clientCode: "RMC", daysAgo: 19  },
  { id: "PSA-2024-1099", caseType: "Brain Biopsy",  date: "Jul 1",  firstTouchHrs: 6.8,  targetHrs: 4, overByHrs: 2.8, clientCode: "MGH", daysAgo: 55  },
  { id: "PSA-2024-1052", caseType: "Bone Marrow",   date: "Jun 8",  firstTouchHrs: 11.2, targetHrs: 8, overByHrs: 3.2, clientCode: "RMC", daysAgo: 78  },
  { id: "PSA-2024-0997", caseType: "Skin Punch Bx", date: "Apr 30", firstTouchHrs: 8.4,  targetHrs: 6, overByHrs: 2.4, clientCode: "WSC", daysAgo: 116 },
];

const mockTotalTATOutliers: TotalTATOutlier[] = [
  { id: "PSA-2024-1198", caseType: "Soft Tissue Mass", date: "Aug 13", tatHrs: 31.2, targetHrs: 24, overByHrs: 7.2,  clientCode: "MGH", daysAgo: 12  },
  { id: "PSA-2024-1176", caseType: "Decalcified Bone", date: "Aug 8",  tatHrs: 52.4, targetHrs: 48, overByHrs: 4.4,  clientCode: "RMC", daysAgo: 17  },
  { id: "PSA-2024-1160", caseType: "Lymph Node Panel", date: "Aug 2",  tatHrs: 28.6, targetHrs: 24, overByHrs: 4.6,  clientCode: "MGH", daysAgo: 23  },
  { id: "PSA-2024-1104", caseType: "Placenta",          date: "Jun 30", tatHrs: 36.1, targetHrs: 24, overByHrs: 12.1, clientCode: "WSC", daysAgo: 56  },
  { id: "PSA-2024-1058", caseType: "Liver Resection",   date: "Jun 10", tatHrs: 58.2, targetHrs: 48, overByHrs: 10.2, clientCode: "MGH", daysAgo: 76  },
  { id: "PSA-2024-0995", caseType: "Bone Marrow Bx",    date: "Apr 28", tatHrs: 74.4, targetHrs: 48, overByHrs: 26.4, clientCode: "RMC", daysAgo: 118 },
];

const mockTatByClient: ClientTatRow[] = [
  { id: 'c1', name: 'Metro General Hospital',   code: 'MGH', target: { firstTouch: 4,  total: 24 }, mine: { firstTouch: 2.4, total: 18.2 }, peer: { firstTouch: 3.1, total: 21.4 }, breaches: { firstTouch: 2, total: 1 } },
  { id: 'c4', name: 'Westview Surgery Center',  code: 'WSC', target: { firstTouch: 6,  total: 36 }, mine: { firstTouch: 4.8, total: 28.6 }, peer: { firstTouch: 5.2, total: 31.0 }, breaches: { firstTouch: 0, total: 1 } },
  { id: 'c2', name: 'Riverside Medical Center', code: 'RMC', target: { firstTouch: 8,  total: 48 }, mine: { firstTouch: 6.2, total: 39.1 }, peer: { firstTouch: 7.4, total: 42.0 }, breaches: { firstTouch: 1, total: 1 } },
];

const peerAvgTotal = 26.9;

const mockSummary = {
  discordant:           mockDiscordant.length,
  amended:              mockAmended.length,
  concordanceRate:      94.2,
  // TAT breach counts per type — in production from ITATResultService
  firstTouchBreaches:   mockFirstTouchOutliers.length,
  totalCaseBreaches:    mockTotalTATOutliers.length,
  frozenSectionBreaches: 2,
  grossingBreaches:      1,
  signOutBreaches:          3,
  coldIschemiaBreaches:     0,
  consultResponseBreaches:  2,
  consultAwaitingBreaches:  1,
};

// ─── TAT Trend data — one series per enabled TAT type ───────────────────────
// Targets and peer values are aggregated across configured clients.
// In production these come from ITATConfigService + ITATResultService.

interface TatTypeTarget { target: number; peer: number; }

const TAT_TYPE_TARGETS: Record<TatTileKey, TatTypeTarget> = {
  firstTouch:      { target: 5,   peer: 3.8  },
  totalCase:       { target: 30,  peer: 24.2 },
  frozenSection:   { target: 0.5, peer: 0.38 },
  grossing:        { target: 4,   peer: 3.2  },
  signOut:         { target: 24,  peer: 21.4 },
  coldIschemia:    { target: 0.5, peer: 0.42 },
  consultResponse: { target: 48,  peer: 36   },  // 48h default (Pathologist role)
  consultAwaiting: { target: 48,  peer: 40   },  // 48h before chasing
};

const TREND_DATA: TatTrendMonth[] = [
  { month: "Sep '24", cases: 310, firstTouch: 3.2, totalCase: 22.4, frozenSection: 0.41, grossing: 3.1, signOut: 20.8, coldIschemia: 0.44, consultResponse: 38.2, consultAwaiting: 42.1 },
  { month: "Oct '24", cases: 334, firstTouch: 3.6, totalCase: 24.1, frozenSection: 0.38, grossing: 3.4, signOut: 22.6, coldIschemia: 0.41, consultResponse: 41.5, consultAwaiting: 45.2 },,
  { month: "Nov '24", cases: 298, firstTouch: 4.1, totalCase: 26.8, frozenSection: 0.46, grossing: 3.8, signOut: 25.1, coldIschemia: 0.48, consultResponse: 52.1, consultAwaiting: 58.4 },,
  { month: "Dec '24", cases: 261, firstTouch: 3.8, totalCase: 25.3, frozenSection: 0.43, grossing: 3.6, signOut: 23.7, coldIschemia: 0.45, consultResponse: 44.8, consultAwaiting: 49.1 },,
  { month: "Jan '25", cases: 305, firstTouch: 3.3, totalCase: 22.9, frozenSection: 0.39, grossing: 3.2, signOut: 21.4, coldIschemia: 0.42, consultResponse: 36.4, consultAwaiting: 40.2 },,
  { month: "Feb '25", cases: 318, firstTouch: 3.7, totalCase: 24.6, frozenSection: 0.42, grossing: 3.5, signOut: 23.1, coldIschemia: 0.44, consultResponse: 39.7, consultAwaiting: 43.8 },,
  { month: "Mar '25", cases: 341, firstTouch: 4.2, totalCase: 27.1, frozenSection: 0.47, grossing: 3.9, signOut: 25.4, coldIschemia: 0.49, consultResponse: 55.2, consultAwaiting: 61.3 },,
  { month: "Apr '25", cases: 352, firstTouch: 3.5, totalCase: 23.8, frozenSection: 0.40, grossing: 3.3, signOut: 22.2, coldIschemia: 0.43, consultResponse: 42.1, consultAwaiting: 46.5 },,
  { month: "May '25", cases: 346, firstTouch: 3.1, totalCase: 22.1, frozenSection: 0.37, grossing: 3.0, signOut: 20.6, coldIschemia: 0.40, consultResponse: 34.8, consultAwaiting: 38.2 },,
  { month: "Jun '25", cases: 368, firstTouch: 3.4, totalCase: 24.0, frozenSection: 0.41, grossing: 3.3, signOut: 22.5, coldIschemia: 0.43, consultResponse: 38.6, consultAwaiting: 42.4 },,
  { month: "Jul '25", cases: 341, firstTouch: 2.9, totalCase: 21.6, frozenSection: 0.36, grossing: 2.9, signOut: 20.1, coldIschemia: 0.38, consultResponse: 31.2, consultAwaiting: 35.8 },,
  { month: "Aug '25", cases: 387, firstTouch: 2.4, totalCase: 18.2, frozenSection: 0.32, grossing: 2.6, signOut: 17.8, coldIschemia: 0.34, consultResponse: 28.4, consultAwaiting: 32.1 },,
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const severityClass = (s: Severity) =>
  `ps-severity-badge ps-severity-badge--${s}`;

const barColor = (pct: number) =>
  pct < 70 ? '#10b981' : pct < 90 ? '#f59e0b' : '#ef4444';

const deltaLabel = (mine: number, peer: number) => {
  const diff   = mine - peer;
  const faster = diff < 0;
  return { text: `${faster ? '↓' : '↑'} ${Math.abs(diff).toFixed(1)}h vs peers`, color: faster ? '#10b981' : '#f59e0b' };
};

// ─── Enabled TAT types — in production from ITATConfigService ────────────────
// One entry per type configured in TAT Configuration for this pathologist.
// Comment out any type not yet enabled to demo a partial configuration.

interface TatTypeConfig {
  key:        TatTileKey;
  label:      string;
  icon:       string;
  color:      string;
  summaryKey: keyof typeof mockSummary;
  dataKey:    keyof Omit<TatTrendMonth, 'month' | 'cases'>;
}

const ENABLED_TAT_TYPES: TatTypeConfig[] = [
  { key: "firstTouch",    label: "1st Touch",      icon: "⚡", color: "#f59e0b", summaryKey: "firstTouchBreaches",    dataKey: "firstTouch"    },
  { key: "totalCase",     label: "Total Case",      icon: "✓",  color: "#f97316", summaryKey: "totalCaseBreaches",     dataKey: "totalCase"     },
  { key: "frozenSection", label: "Frozen Section",  icon: "🧊", color: "#7dd3fc", summaryKey: "frozenSectionBreaches", dataKey: "frozenSection" },
  { key: "grossing",      label: "Grossing",        icon: "🔬", color: "#a78bfa", summaryKey: "grossingBreaches",      dataKey: "grossing"      },
  { key: "signOut",       label: "Sign-out",        icon: "📋", color: "#34d399", summaryKey: "signOutBreaches",       dataKey: "signOut"       },
  { key: "coldIschemia",  label: "Cold Ischemia",   icon: "❄️", color: "#93c5fd", summaryKey: "coldIschemiaBreaches",  dataKey: "coldIschemia"    },
  { key: "consultResponse", label: "My Response Time", icon: "💬", color: "#f472b6", summaryKey: "consultResponseBreaches", dataKey: "consultResponse" },
  { key: "consultAwaiting", label: "Awaiting Response", icon: "⏳", color: "#fb923c", summaryKey: "consultAwaitingBreaches", dataKey: "consultAwaiting" },
];

// Fixed (non-TAT) summary tiles — always present
const FIXED_SUMMARY_TILES = [
  { label: "Discordant Cases", key: "discordant"      as const, unit: "", color: "#f97316", icon: "⚠️" },
  { label: "Amended Reports",  key: "amended"         as const, unit: "", color: "#FDD663", icon: "✏️" },
  { label: "Concordance Rate", key: "concordanceRate" as const, unit: "%",color: "#10b981", icon: "✓"  },
];

// ─── Custom Reference Line Label — callout with leader line ──────────────────

interface RefLabelProps {
  viewBox?: { x: number; y: number; width: number; height: number };
  value:    string;
  color:    string;
  side:     'left' | 'right';
  nudge?:   number;  // px offset from the line: negative = above, positive = below
}

const RefLineLabel: React.FC<RefLabelProps> = ({
  viewBox, value, color, side, nudge = -16,
}) => {
  if (!viewBox) return null;
  const { x, y, width } = viewBox;

  const isLeft  = side === 'left';
  const pinX    = isLeft ? x + 44 : x + width - 44;   // where leader touches the ref line
  const labelY  = y + nudge;
  const leaderY1 = nudge < 0 ? labelY + 12 : labelY;  // from bottom/top of label text
  const leaderY2 = y;                                   // to the actual reference line

  return (
    <g>
      {/* Leader line */}
      <line
        x1={pinX} y1={leaderY1}
        x2={pinX} y2={leaderY2}
        stroke={color}
        strokeWidth={1}
        strokeDasharray="2 2"
        opacity={0.55}
      />
      {/* Callout dot on the reference line */}
      <circle cx={pinX} cy={y} r={2.5} fill={color} opacity={0.7} />
      {/* Label text with dark halo so it reads over any background */}
      <text
        x={isLeft ? pinX + 4 : pinX - 4}
        y={labelY + 9}
        fontSize={9.5}
        fontWeight={700}
        fontFamily="system-ui, -apple-system, sans-serif"
        fill={color}
        textAnchor={isLeft ? 'start' : 'end'}
        style={{
          paintOrder:      'stroke fill',
          stroke:          '#0a1628',
          strokeWidth:     '3.5px',
          strokeLinejoin:  'round',
        } as React.CSSProperties}
      >
        {value}
      </text>
    </g>
  );
};

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const TatTooltip = ({ active, payload, label, data, cfg }: any) => {
  if (!active || !payload?.length) return null;
  const ft    = payload.find((p: any) => p.dataKey === 'firstTouch');
  const tt    = payload.find((p: any) => p.dataKey === 'total');
  const cases = (data as TatTrendMonth[]).find(d => d.month === label)?.cases ?? 0;
  React.useEffect(() => {
    mockActionRegistryService.setCurrentContext(VOICE_CONTEXT.CONTRIBUTION);
    return () => mockActionRegistryService.setCurrentContext(VOICE_CONTEXT.WORKLIST);
  }, []);

  return (
    <div className="ps-tat-trend__tooltip">
      <div className="ps-tat-trend__tooltip-header">{label} · {cases} cases</div>
      {ft && <div className="ps-tat-trend__tooltip-ft">⚡ First Touch: {ft.value}h</div>}
      {tt && <div className="ps-tat-trend__tooltip-total">✓ Total Case: {tt.value}h</div>}
      <div className="ps-tat-trend__tooltip-footer">
        Target: {cfg.targetFirst}h / {cfg.targetTotal}h &nbsp;·&nbsp; Peer: {cfg.peerFirst}h / {cfg.peerTotal}h
      </div>
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

const QualityTab: React.FC = () => {
  const [section,     setSection]     = useState<Section>("discordant");
  const [dateRange,   setDateRange]   = useState<DateRange>("30d");

  // Derive filtered arrays from the selected date range
  const cutoff             = dateRange === "30d" ? 30 : dateRange === "90d" ? 90 : 366;
  const filteredDiscordant = mockDiscordant.filter(r => r.daysAgo <= cutoff);
  const filteredAmended    = mockAmended.filter(r => r.daysAgo <= cutoff);
  const filteredFirstTouch = mockFirstTouchOutliers.filter(r => r.daysAgo <= cutoff);
  const filteredTotalTAT   = mockTotalTATOutliers.filter(r => r.daysAgo <= cutoff);

  // TAT trend: 30d=last 1 month, 90d=last 3 months, ytd=all 12
  const trendSlice = dateRange === "30d" ? -1 : dateRange === "90d" ? -3 : undefined;
  const trendRows = trendSlice !== undefined ? TREND_DATA.slice(trendSlice) : TREND_DATA;

  // Reactive summary counts that update with the date filter
  const summaryData = {
    discordant:            filteredDiscordant.length,
    amended:               filteredAmended.length,
    concordanceRate:       mockSummary.concordanceRate,
    firstTouchBreaches:    filteredFirstTouch.length,
    totalCaseBreaches:     filteredTotalTAT.length,
    frozenSectionBreaches: mockSummary.frozenSectionBreaches,
    grossingBreaches:      mockSummary.grossingBreaches,
    signOutBreaches:       mockSummary.signOutBreaches,
    coldIschemiaBreaches:  mockSummary.coldIschemiaBreaches,
  };
  const [tatSubView,    setTatSubView]    = useState<TatSubView>("firstTouch");
  const [metric,        setMetric]        = useState<MetricView>("total");
  const [activeTatTile, setActiveTatTile] = useState<TatTileKey | null>('firstTouch');

  // ── Voice: TAT tile switching ─────────────────────────────────────────────
  React.useEffect(() => {
    const handler = (e: Event) => {
      const key = (e as CustomEvent).detail?.key as TatTileKey;
      if (key && ENABLED_TAT_TYPES.some(t => t.key === key)) setActiveTatTile(key);
    };
    window.addEventListener('PATHSCRIBE_TAT_TILE', handler);
    return () => window.removeEventListener('PATHSCRIBE_TAT_TILE', handler);
  }, []);

  return (
    <div className="ps-quality-container">

      {/* ── Summary tiles — fixed tiles + one per enabled TAT type ── */}
      <div className="ps-quality-summary-grid">

        {/* Fixed tiles — Discordant, Amended, Concordance */}
        {FIXED_SUMMARY_TILES.map(s => (
          <div key={s.label} className="ps-quality-summary-tile">
            <div className="ps-quality-summary-tile__header">
              <span className="ps-quality-summary-tile__label">{s.label}</span>
              <span>{s.icon}</span>
            </div>
            <div className="ps-quality-summary-tile__value-row">
              <span className="ps-quality-summary-tile__value" style={{ color: s.color }}>
                {summaryData[s.key]}
              </span>
              {s.unit && <span className="ps-quality-summary-tile__unit">{s.unit}</span>}
            </div>
            <div className="ps-quality-summary-tile__period">Last {dateRange}</div>
          </div>
        ))}

        {/* TAT tiles — one per enabled TAT type, clickable to drill into trend */}
        {ENABLED_TAT_TYPES.map(t => {
          const isActive = activeTatTile === t.key;
          return (
            <div
              key={t.key}
              className={`ps-quality-summary-tile ps-quality-summary-tile--clickable${isActive ? " ps-quality-summary-tile--active" : ""}`}
              onClick={() => setActiveTatTile(prev => prev === t.key ? null : t.key)}
              style={{ cursor: 'pointer' }}
            >
              <div className="ps-quality-summary-tile__header">
                <span className="ps-quality-summary-tile__label">{t.label}</span>
                <span>{t.icon}</span>
              </div>
              <div className="ps-quality-summary-tile__value-row">
                <span className="ps-quality-summary-tile__value" style={{ color: t.color }}>
                  {summaryData[t.summaryKey]}
                </span>
              </div>
              <div className="ps-quality-summary-tile__period">
                <span style={{ color: isActive ? t.color : '#475569', fontSize: '10px', fontWeight: 600 }}>
                  {isActive ? '▲ Showing trend' : 'Click for trend'}
                </span>
              </div>
            </div>
          );
        })}

      </div>

      {/* ── TAT trend date range selector ── */}
      <div className="ps-quality-tat-range">
        <span className="ps-quality-tat-range__label">Trend period:</span>
        {(["30d", "90d", "ytd"] as DateRange[]).map(r => (
          <button key={r} className={`ps-quality-btn${dateRange === r ? " active" : ""}`} onClick={() => setDateRange(r)}>
            {r === "30d" ? "30 Days" : r === "90d" ? "90 Days" : "1 Year"}
          </button>
        ))}
      </div>

      {/* ── TAT Trend — shown when a TAT tile is selected ── */}
      {activeTatTile !== null && (() => {
        const tatCfg  = ENABLED_TAT_TYPES.find(t => t.key === activeTatTile)!;
        const targets = TAT_TYPE_TARGETS[activeTatTile];
        const dataKey = tatCfg.dataKey;
        const isMin   = activeTatTile === 'frozenSection' || activeTatTile === 'coldIschemia';
        const fmt     = (v: number) => isMin ? `${Math.round(v * 60)}m` : `${v}h`;
        const yMax    = Math.ceil(Math.max(targets.target, ...trendRows.map(d => d[dataKey] as number)) * 1.35);
        const avg12   = +(TREND_DATA.reduce((s, d) => s + (d[dataKey] as number), 0) / TREND_DATA.length).toFixed(2);
        const vsTarget = +(avg12 - targets.target).toFixed(2);
        const vsPeer   = +(avg12 - targets.peer).toFixed(2);

        const YBTick = ({ x, y, payload }: any) => {
          if (!payload?.value) return null;
          const isJan = String(payload.value).startsWith("Jan");
          return (
            <g transform={`translate(${x},${y})`}>
              {isJan && <line y1={-300} y2={0} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />}
              <text x={0} y={16} textAnchor="middle" fontSize={11} fill="#64748b">{payload.value}</text>
            </g>
          );
        };

        return (
          <div className="ps-tat-trend">
            <div className="ps-tat-trend__header">
              <div>
                <div className="ps-tat-trend__title">
                  {tatCfg.icon} {tatCfg.label} TAT Trend — Last 12 Months
                </div>
                <div className="ps-tat-trend__subtitle">
                  Monthly average vs target {fmt(targets.target)} and peer avg {fmt(targets.peer)}
                </div>
                <div className="ps-tat-trend__summary-row">
                  <span className="ps-tat-trend__summary-group">
                    <span className="ps-tat-trend__summary-label">12-mo avg</span>
                    <span className="ps-tat-trend__summary-pill" style={{ background: `${tatCfg.color}1a`, color: tatCfg.color, border: `1px solid ${tatCfg.color}44` }}>
                      {tatCfg.icon} {fmt(avg12)}
                    </span>
                  </span>
                  <span className="ps-tat-trend__summary-divider">|</span>
                  <span className="ps-tat-trend__summary-group">
                    <span className="ps-tat-trend__summary-label">vs target</span>
                    <span className="ps-tat-trend__summary-delta" style={{ color: vsTarget < 0 ? '#10b981' : '#ef4444' }}>
                      {vsTarget < 0 ? '↓' : '↑'} {fmt(Math.abs(vsTarget))}
                    </span>
                  </span>
                  <span className="ps-tat-trend__summary-divider">|</span>
                  <span className="ps-tat-trend__summary-group">
                    <span className="ps-tat-trend__summary-label">vs peers</span>
                    <span className="ps-tat-trend__summary-delta" style={{ color: vsPeer < 0 ? '#10b981' : '#f59e0b' }}>
                      {vsPeer < 0 ? '↓' : '↑'} {fmt(Math.abs(vsPeer))}
                    </span>
                  </span>
                  <span className="ps-tat-trend__summary-divider">|</span>
                  <button
                    onClick={() => setActiveTatTile(null)}
                    style={{ fontSize: '11px', color: '#475569', background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '3px 10px', cursor: 'pointer', marginLeft: '4px' }}
                  >
                    ✕ Close
                  </button>
                </div>
              </div>
            </div>

            <div className="ps-tat-trend__legend">
              <div className="ps-tat-trend__legend-item" style={{ color: tatCfg.color }}>
                <svg width="24" height="4"><line x1="0" y1="2" x2="24" y2="2" stroke={tatCfg.color} strokeWidth="2" /></svg>
                {tatCfg.label} avg
              </div>
              <div className="ps-tat-trend__legend-item ps-tat-trend__legend-item--red">
                <svg width="24" height="4"><line x1="0" y1="2" x2="24" y2="2" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 3" /></svg>
                Target ({fmt(targets.target)})
              </div>
              <div className="ps-tat-trend__legend-item ps-tat-trend__legend-item--purple">
                <svg width="24" height="4"><line x1="0" y1="2" x2="24" y2="2" stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="2 3" /></svg>
                Peer avg ({fmt(targets.peer)})
              </div>
            </div>

            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendRows} margin={{ top: 8, right: 24, left: 0, bottom: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="month" tick={<YBTick />} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} tickLine={false} height={32} />
                <YAxis domain={[0, yMax]} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false}
                  tickFormatter={(v: number) => fmt(v)} width={46} />
                <Tooltip content={({ active, payload, label }: any) => {
                  if (!active || !payload?.length) return null;
                  const val   = payload[0]?.value as number;
                  const cases = trendRows.find(d => d.month === label)?.cases ?? 0;
                  const over  = val > targets.target;
                  return (
                    <div className="ps-tat-trend__tooltip">
                      <div className="ps-tat-trend__tooltip-header">{label} · {cases} cases</div>
                      <div style={{ color: tatCfg.color }}>{tatCfg.label}: {fmt(val)}</div>
                      <div className="ps-tat-trend__tooltip-footer" style={{ color: over ? '#ef4444' : '#10b981' }}>
                        {over ? `▲ ${fmt(+(val - targets.target).toFixed(2))} over target` : '✓ Within target'}
                      </div>
                    </div>
                  );
                }} />
                <ReferenceLine y={targets.target} stroke="#ef4444" strokeDasharray="4 3" strokeWidth={1.5}
                  label={<RefLineLabel value={`target ${fmt(targets.target)}`} color="#ef4444" side="left" nudge={-18} />} />
                <ReferenceLine y={targets.peer} stroke="#a78bfa" strokeDasharray="2 3" strokeWidth={1.5}
                  label={<RefLineLabel value={`peer ${fmt(targets.peer)}`} color="#a78bfa" side="right" nudge={8} />} />
                <Line type="monotone" dataKey={dataKey as string} stroke={tatCfg.color} strokeWidth={2.5}
                  dot={{ r: 3, fill: tatCfg.color, strokeWidth: 0 }} activeDot={{ r: 5, fill: tatCfg.color }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );
      })()}

      {/* ── Section nav (date range moved above TAT trend) ── */}
      <div className="ps-quality-nav">
        <div className="ps-quality-nav__left">
          <button className={`ps-quality-btn${section === "discordant" ? " active" : ""}`} onClick={() => setSection("discordant")}>Frozen vs Final</button>
          <button className={`ps-quality-btn${section === "amended"    ? " active" : ""}`} onClick={() => setSection("amended")}>Amended Reports</button>
          <button className={`ps-quality-btn${section === "tat"        ? " active" : ""}`} onClick={() => setSection("tat")}>TAT Outliers</button>
          <button className={`ps-quality-btn${section === "tatClient"  ? " active" : ""}`} onClick={() => setSection("tatClient")}>TAT by Client</button>
        </div>
      </div>

      {/* ── Discordant diagnoses ── */}
      {section === "discordant" && (
        <div className="ps-quality-card">
          <div className="ps-quality-card__header">
            <div className="ps-quality-card__title">Discordant Diagnoses</div>
            <div className="ps-quality-card__subtitle">Cases where frozen section and final diagnosis differ</div>
          </div>
          <table className="ps-quality-table">
            <thead>
              <tr>{["Case", "Type", "Frozen Dx", "Final Dx", "Delta", "Date", "Severity"].map(h => <th key={h} className="ps-quality-th">{h}</th>)}</tr>
            </thead>
            <tbody>
              {filteredDiscordant.map(c => (
                <tr key={c.id}>
                  <td className="ps-quality-td ps-quality-td--accent">{c.id}</td>
                  <td className="ps-quality-td">{c.caseType}</td>
                  <td className="ps-quality-td ps-quality-td--muted">{c.frozenDx}</td>
                  <td className="ps-quality-td ps-quality-td--primary">{c.finalDx}</td>
                  <td className="ps-quality-td">
                    <span className={c.delta === "Concordant" ? "ps-delta--concordant" : "ps-delta--upgraded"}>
                      {c.delta === "Concordant" ? "✓" : "↑"} {c.delta}
                    </span>
                  </td>
                  <td className="ps-quality-td ps-quality-td--muted">{c.date}</td>
                  <td className="ps-quality-td"><span className={severityClass(c.severity)}>{c.severity}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Amended reports ── */}
      {section === "amended" && (
        <div className="ps-quality-card">
          <div className="ps-quality-card__header">
            <div className="ps-quality-card__title">Amended Reports</div>
            <div className="ps-quality-card__subtitle">Reports modified after initial sign-out</div>
          </div>
          <table className="ps-quality-table">
            <thead>
              <tr>{["Case", "Type", "Reason for Amendment", "Date", "Severity"].map(h => <th key={h} className="ps-quality-th">{h}</th>)}</tr>
            </thead>
            <tbody>
              {filteredAmended.map(c => (
                <tr key={c.id}>
                  <td className="ps-quality-td ps-quality-td--accent">{c.id}</td>
                  <td className="ps-quality-td">{c.caseType}</td>
                  <td className="ps-quality-td ps-quality-td--primary">{c.reason}</td>
                  <td className="ps-quality-td ps-quality-td--muted">{c.date}</td>
                  <td className="ps-quality-td"><span className={severityClass(c.severity)}>{c.severity}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── TAT Outliers — split sub-views ── */}
      {section === "tat" && (
        <div className="ps-quality-tat-outliers">

          <div className="ps-quality-sub-toggle">
            <button className={`ps-quality-sub-btn${tatSubView === "firstTouch" ? " active" : ""}`} onClick={() => setTatSubView("firstTouch")}>
              ⚡ First Touch Breaches
              {mockFirstTouchOutliers.length > 0 && <span className="ps-quality-sub-btn__badge">{mockFirstTouchOutliers.length}</span>}
            </button>
            <button className={`ps-quality-sub-btn${tatSubView === "total" ? " active" : ""}`} onClick={() => setTatSubView("total")}>
              ✓ Total TAT Breaches
              {mockTotalTATOutliers.length > 0 && <span className="ps-quality-sub-btn__badge">{mockTotalTATOutliers.length}</span>}
            </button>
          </div>

          {tatSubView === "firstTouch" && (
            <div className="ps-quality-card">
              <div className="ps-quality-card__header">
                <div className="ps-quality-card__title">⚡ First Touch Breaches</div>
                <div className="ps-quality-card__subtitle">Cases not opened within the client's first-touch TAT threshold</div>
              </div>
              {filteredFirstTouch.length === 0
                ? <div className="ps-quality-empty">✓ No first-touch breaches this period</div>
                : (
                  <table className="ps-quality-table">
                    <thead>
                      <tr>{["Case", "Type", "Client", "First Opened", "Target", "Over By", "Date"].map(h => <th key={h} className="ps-quality-th">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {filteredFirstTouch.map(c => (
                        <tr key={c.id}>
                          <td className="ps-quality-td ps-quality-td--accent">{c.id}</td>
                          <td className="ps-quality-td">{c.caseType}</td>
                          <td className="ps-quality-td"><span className="ps-client-code-badge">{c.clientCode}</span></td>
                          <td className="ps-quality-td ps-quality-td--warning">{c.firstTouchHrs}h</td>
                          <td className="ps-quality-td ps-quality-td--muted">{c.targetHrs}h</td>
                          <td className="ps-quality-td"><span className="ps-quality-over-by">+{c.overByHrs}h</span></td>
                          <td className="ps-quality-td ps-quality-td--muted">{c.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              }
            </div>
          )}

          {tatSubView === "total" && (
            <div className="ps-quality-card">
              <div className="ps-quality-card__header">
                <div className="ps-quality-card__title">✓ Total TAT Breaches</div>
                <div className="ps-quality-card__subtitle">Cases where receivedDate → finalizedAt exceeded the client's total TAT target</div>
              </div>
              {filteredTotalTAT.length === 0
                ? <div className="ps-quality-empty">✓ No total TAT breaches this period</div>
                : (
                  <table className="ps-quality-table">
                    <thead>
                      <tr>{["Case", "Type", "Client", "Actual TAT", "Target", "Over By", "Date"].map(h => <th key={h} className="ps-quality-th">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {filteredTotalTAT.map(c => (
                        <tr key={c.id}>
                          <td className="ps-quality-td ps-quality-td--accent">{c.id}</td>
                          <td className="ps-quality-td">{c.caseType}</td>
                          <td className="ps-quality-td"><span className="ps-client-code-badge">{c.clientCode}</span></td>
                          <td className="ps-quality-td ps-quality-td--warning">{c.tatHrs}h</td>
                          <td className="ps-quality-td ps-quality-td--muted">{c.targetHrs}h</td>
                          <td className="ps-quality-td"><span className="ps-quality-over-by">+{c.overByHrs}h</span></td>
                          <td className="ps-quality-td ps-quality-td--muted">{c.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              }
            </div>
          )}
        </div>
      )}

      {/* ── TAT by Client ── */}
      {section === "tatClient" && (
        <div className="ps-quality-tat-client">

          <div className="ps-tat-client__section-header">
            <div>
              <div className="ps-tat-client__title">TAT by Client</div>
              <div className="ps-tat-client__subtitle">Your performance vs client targets · peer group overlay (anonymised, same subspecialty)</div>
            </div>
            <div className="ps-tat-client__metric-toggle">
              <button className={`ps-quality-sub-btn${metric === "firstTouch" ? " active" : ""}`} onClick={() => setMetric("firstTouch")}>⚡ First Touch</button>
              <button className={`ps-quality-sub-btn${metric === "total"      ? " active" : ""}`} onClick={() => setMetric("total")}>✓ Total TAT</button>
            </div>
          </div>

          <div className="ps-tat-client__cards">
            {mockTatByClient.map(client => {
              const myVal      = client.mine[metric];
              const target     = client.target[metric];
              const peerVal    = client.peer[metric];
              const pct        = Math.min(100, (myVal   / target) * 100);
              const peerPct    = Math.min(100, (peerVal / target) * 100);
              const color      = barColor(pct);
              const delta      = deltaLabel(myVal, peerVal);
              const breachCount = client.breaches[metric];

              return (
                <div key={client.id} className="ps-tat-client__card">
                  <div className="ps-tat-client__card-header">
                    <div className="ps-tat-client__card-left">
                      <span className="ps-client-code-badge">{client.code}</span>
                      <span className="ps-tat-client__card-name">{client.name}</span>
                    </div>
                    <div className="ps-tat-client__card-right">
                      {breachCount > 0 && (
                        <span className="ps-tat-client__breach-badge">
                          {breachCount} breach{breachCount !== 1 ? "es" : ""}
                        </span>
                      )}
                      <span className="ps-tat-client__delta" style={{ color: delta.color }}>{delta.text}</span>
                    </div>
                  </div>

                  <div className="ps-tat-client__bar-track">
                    <div className="ps-tat-client__bar-fill"    style={{ width: `${pct}%`,     background: color }} />
                    <div className="ps-tat-client__peer-marker" style={{ left:  `${peerPct}%` }} />
                    <div className="ps-tat-client__target-marker" />
                  </div>

                  <div className="ps-tat-client__legend-row">
                    <div className="ps-tat-client__legend-left">
                      <div className="ps-tat-client__legend-item">
                        <div className="ps-tat-client__legend-dot" style={{ background: color }} />
                        <span className="ps-tat-client__you-label" style={{ color }}>You: {myVal}h</span>
                      </div>
                      <div className="ps-tat-client__legend-item">
                        <div className="ps-tat-client__legend-peer-mark" />
                        <span className="ps-tat-client__peer-label">Peers: {peerVal}h</span>
                      </div>
                    </div>
                    <span className="ps-tat-client__pct-label">{pct.toFixed(0)}% of {target}h target used</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="ps-tat-client__footer">
            <span>Peer avg (total TAT): {peerAvgTotal}h · anonymised · role-gated · same subspecialty</span>
            <span>Targets configured per client in Client Dictionary</span>
          </div>
        </div>
      )}

    </div>
  );
};

export default QualityTab;