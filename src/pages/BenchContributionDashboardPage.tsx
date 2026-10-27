// src/pages/BenchContributionDashboardPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 488 — the dedicated bench-contribution page for the four bench
// roles (Accessioner, Histotechnologist, Cytotechnologist, Molecular
// Technologist), per Pete's direct instruction: a separate page, scoped
// to exactly the four metrics he confirmed are real (see
// src/pages/benchContributionCalculations.ts's own header for the full
// scoping reasoning and real data sources).
//
// Deliberately NOT a tabbed clone of ContributionDashboardPage.tsx — a
// bench role's own real data doesn't support that page's pathologist-
// facing tabs (Productivity/Quality/AI/Mentor all key off diagnostic/
// RVU/TAT data that only exists once a pathologist has worked a case).
// This page is a single scrollable dashboard, same real `.ps-contrib-*`
// tile/KPI CSS classes already established by that page (no new CSS
// needed for the tile chrome itself) — reused, not duplicated.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import '../pathscribe.css';
import { useAuth } from '@contexts/AuthContext';
import { useSystemConfig } from '@/contexts/SystemConfigContext';
import { caseService, batchService, molecularBatchService } from '@/services';
import { DailyAccessioningChart } from '@/components/Contribution/DailyAccessioningChart';
import {
  computeAccessioningRate,
  computeBatchThroughputAndAging,
  computeStageToStageTat,
  computeMolecularQcSummary,
  type AccessioningRateSummary,
  type BatchThroughputAndAging,
  type StageToStageTat,
  type MolecularQcSummary,
} from './benchContributionCalculations';

const WINDOW_DAYS = 30;

function formatPercent(v: number | null): string {
  return v === null ? '—' : `${Math.round(v * 100)}%`;
}

function formatHours(v: number | null): string {
  return v === null ? '—' : `${Math.round(v * 10) / 10}h`;
}

function formatRate(v: number | null): string {
  return v === null ? '—' : `${Math.round(v * 10) / 10}`;
}

export default function BenchContributionDashboardPage() {
  const { t } = useTranslation();
  // Batch 495: this page never registered a breadcrumb (same gap fixed on
  // TumorBoardWorkspacePage/MarginExceptionReviewPage in Batch 492) — AppShell
  // only shows the breadcrumb bar once crumbs.length > 1.
  const { pushCrumb } = useBreadcrumb();
  useEffect(() => { pushCrumb(t('benchContributions.title'), '/bench-contributions'); }, [pushCrumb, t]);
  const { user } = useAuth();
  const { config } = useSystemConfig();

  const [accessioning, setAccessioning] = useState<AccessioningRateSummary | null>(null);
  const [throughputAndAging, setThroughputAndAging] = useState<BatchThroughputAndAging | null>(null);
  const [stageTat, setStageTat] = useState<StageToStageTat | null>(null);
  const [molecularQc, setMolecularQc] = useState<MolecularQcSummary | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    const now = new Date();

    caseService.getAll().then(res => {
      const cases = res.ok ? res.data : [];
      setAccessioning(computeAccessioningRate(cases, user.id, config.facilityTimezone, now, WINDOW_DAYS));
      // Stage-to-stage TAT also needs the real case list for its own
      // accessioning→first-stage join — fetched once here, reused below
      // once batches are also in hand.
      batchService.getAll().then(batchRes => {
        const batches = batchRes.ok ? batchRes.data : [];
        setThroughputAndAging(computeBatchThroughputAndAging(batches, user.id, now, WINDOW_DAYS));
        setStageTat(computeStageToStageTat(batches, cases, now, WINDOW_DAYS));
      });
    });

    molecularBatchService.getAll().then(res => {
      const molecularBatches = res.ok ? res.data : [];
      setMolecularQc(computeMolecularQcSummary(molecularBatches, user.id, now, WINDOW_DAYS));
    });
  }, [user?.id, config.facilityTimezone]);

  const nodeLabel = (node: string) => t(`batchManagement.nodes.${node}`, { defaultValue: node });
  // 'Accessioning' is this file's own synthetic first stage (see
  // benchContributionCalculations.ts), not a real BatchProcessingNode —
  // batchManagement.nodes doesn't have it, so it gets its own key
  // rather than falling back to an untranslated English defaultValue.
  const stageLabel = (stage: string) => (stage === 'Accessioning' ? t('benchContributions.stageTat.accessioningStage') : nodeLabel(stage));

  return (
    <div className="ps-contrib-page" tabIndex={0} role="region" aria-label={t('benchContributions.scrollRegionLabel')}>
      <div className="ps-contrib-title-block">
        <h1 className="ps-contrib-title">{t('benchContributions.title')}</h1>
        <p className="ps-contrib-subtitle">
          {user?.name} · {t('benchContributions.subtitle', { days: WINDOW_DAYS })}
        </p>
      </div>

      {/* ─── 1. Accessioning Rate ──────────────────────────────────────── */}
      <div className="ps-contrib-tile">
        <div className="ps-contrib-tile-header ps-contrib-tile-header--spaced">
          <span className="ps-contrib-tile-title">{t('benchContributions.accessioning.title')}</span>
        </div>
        {accessioning && accessioning.totalAccessioned > 0 ? (
          <>
          <div className="ps-kpi-grid">
            <div className="ps-contrib-kpi-tile">
              <span className="ps-contrib-kpi-label">{t('benchContributions.accessioning.totalLabel')}</span>
              <div className="ps-contrib-kpi-value-row">
                <span className="ps-contrib-kpi-value">{accessioning.totalAccessioned}</span>
              </div>
            </div>
            <div className="ps-contrib-kpi-tile">
              <span className="ps-contrib-kpi-label">{t('benchContributions.accessioning.perActiveHourLabel')}</span>
              <div className="ps-contrib-kpi-value-row">
                <span className="ps-contrib-kpi-value">{formatRate(accessioning.perActiveHour)}</span>
              </div>
            </div>
          </div>
          <DailyAccessioningChart daily={accessioning.daily} />
          </>
        ) : (
          <p className="ps-contrib-tile-subtitle">{t('benchContributions.accessioning.noActivity')}</p>
        )}
      </div>

      {/* ─── 2. Batch Throughput ───────────────────────────────────────── */}
      <div className="ps-contrib-tile">
        <div className="ps-contrib-tile-header ps-contrib-tile-header--spaced">
          <span className="ps-contrib-tile-title">{t('benchContributions.throughput.title')}</span>
        </div>
        {throughputAndAging && throughputAndAging.throughputByNode.some(n => n.itemsAdded > 0) ? (
          <div className="ps-kpi-grid">
            {throughputAndAging.throughputByNode.filter(n => n.itemsAdded > 0).map(n => (
              <div className="ps-contrib-kpi-tile" key={n.processingNode}>
                <span className="ps-contrib-kpi-label">{nodeLabel(n.processingNode)}</span>
                <div className="ps-contrib-kpi-value-row">
                  <span className="ps-contrib-kpi-value">{n.itemsAdded}</span>
                  <span className="ps-contrib-kpi-unit">{t('benchContributions.throughput.itemsAddedLabel')}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="ps-contrib-tile-subtitle">{t('benchContributions.throughput.noActivity')}</p>
        )}
      </div>

      {/* ─── 2b. Queue Aging (shared, not user-scoped) ─────────────────── */}
      <div className="ps-contrib-tile">
        <div className="ps-contrib-tile-header ps-contrib-tile-header--spaced">
          <span className="ps-contrib-tile-title">{t('benchContributions.queueAging.title')}</span>
        </div>
        {throughputAndAging && throughputAndAging.queueAgingByNode.some(n => n.openBatchCount > 0) ? (
          <div className="ps-kpi-grid">
            {throughputAndAging.queueAgingByNode.filter(n => n.openBatchCount > 0).map(n => (
              <div className="ps-contrib-kpi-tile" key={n.processingNode}>
                <span className="ps-contrib-kpi-label">{nodeLabel(n.processingNode)}</span>
                <div className="ps-contrib-kpi-row">
                  <span className="ps-contrib-kpi-row-label">{t('benchContributions.queueAging.openBatchesLabel')}</span>
                  <span className="ps-contrib-kpi-row-value">{n.openBatchCount}</span>
                </div>
                <div className="ps-contrib-kpi-row">
                  <span className="ps-contrib-kpi-row-label">{t('benchContributions.queueAging.oldestLabel')}</span>
                  <span className="ps-contrib-kpi-row-value">{formatHours(n.oldestOpenBatchAgeHours)}</span>
                </div>
                <div className="ps-contrib-kpi-row">
                  <span className="ps-contrib-kpi-row-label">{t('benchContributions.queueAging.meanLabel')}</span>
                  <span className="ps-contrib-kpi-row-value">{formatHours(n.meanOpenBatchAgeHours)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="ps-contrib-tile-subtitle">{t('benchContributions.queueAging.noOpenBatches')}</p>
        )}
      </div>

      {/* ─── 3. Stage-to-Stage TAT ──────────────────────────────────────── */}
      <div className="ps-contrib-tile">
        <div className="ps-contrib-tile-header ps-contrib-tile-header--spaced">
          <span className="ps-contrib-tile-title">{t('benchContributions.stageTat.title')}</span>
        </div>
        {(() => {
          const pairs = [
            ...(stageTat?.surgical.map(p => ({ ...p, group: t('benchContributions.stageTat.surgicalTitle') })) ?? []),
            ...(stageTat?.cytology.map(p => ({ ...p, group: t('benchContributions.stageTat.cytologyTitle') })) ?? []),
          ].filter(p => p.samples > 0);
          if (pairs.length === 0) {
            return <p className="ps-contrib-tile-subtitle">{t('benchContributions.stageTat.noSamples')}</p>;
          }
          return (
            <div className="ps-kpi-grid">
              {pairs.map(p => (
                <div className="ps-contrib-kpi-tile" key={`${p.group}-${p.fromStage}-${p.toStage}`}>
                  <span className="ps-contrib-kpi-label">
                    {p.group} · {stageLabel(p.fromStage)} → {stageLabel(p.toStage)}
                  </span>
                  <div className="ps-contrib-kpi-row">
                    <span className="ps-contrib-kpi-row-label">{t('benchContributions.stageTat.meanLabel')}</span>
                    <span className="ps-contrib-kpi-row-value">{formatHours(p.meanHours)}</span>
                  </div>
                  <div className="ps-contrib-kpi-row">
                    <span className="ps-contrib-kpi-row-label">{t('benchContributions.stageTat.medianLabel')}</span>
                    <span className="ps-contrib-kpi-row-value">{formatHours(p.medianHours)}</span>
                  </div>
                  <div className="ps-contrib-kpi-row">
                    <span className="ps-contrib-kpi-row-label">{t('benchContributions.stageTat.sampleCount', { count: p.samples })}</span>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* ─── 4. Molecular QC ────────────────────────────────────────────── */}
      <div className="ps-contrib-tile">
        <div className="ps-contrib-tile-header ps-contrib-tile-header--spaced">
          <span className="ps-contrib-tile-title">{t('benchContributions.molecularQc.title')}</span>
        </div>
        {molecularQc && molecularQc.totalBatches > 0 ? (
          <div className="ps-kpi-grid">
            <div className="ps-contrib-kpi-tile">
              <span className="ps-contrib-kpi-label">{t('benchContributions.molecularQc.totalBatchesLabel')}</span>
              <div className="ps-contrib-kpi-value-row">
                <span className="ps-contrib-kpi-value">{molecularQc.totalBatches}</span>
              </div>
            </div>
            <div className="ps-contrib-kpi-tile">
              <span className="ps-contrib-kpi-label">{t('benchContributions.molecularQc.passRateLabel')}</span>
              <div className="ps-contrib-kpi-value-row">
                <span className="ps-contrib-kpi-value">{formatPercent(molecularQc.passRate)}</span>
              </div>
              <div className="ps-contrib-kpi-row">
                <span className="ps-contrib-kpi-row-label">{t('benchContributions.molecularQc.controlsEvaluatedLabel')}</span>
                <span className="ps-contrib-kpi-row-value">{molecularQc.controlsEvaluated}</span>
              </div>
            </div>
            <div className="ps-contrib-kpi-tile">
              <span className="ps-contrib-kpi-label">{t('benchContributions.molecularQc.rerunRateLabel')}</span>
              <div className="ps-contrib-kpi-value-row">
                <span className="ps-contrib-kpi-value">{formatPercent(molecularQc.rerunRate)}</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="ps-contrib-tile-subtitle">{t('benchContributions.molecularQc.noActivity')}</p>
        )}
      </div>
    </div>
  );
}
