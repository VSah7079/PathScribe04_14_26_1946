// src/pages/BatchManagement/DisposalQueuePage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Real feature, per direct follow-up: "I am thinking that the client
// selects the disposal tile and the system delivers a list of
// specimens that qualify for disposal. As the user scans each specimen
// container it gets updated to disposed and comes off the list. If the
// scan doesn't match what the system expects, the screen turns red.
// The list should be aware of specimens that are actually stored at
// that laboratory location."
//
// Deliberately NOT the batch/container flow every other processing
// node uses — see services/batches/IBatchService.ts's own header for
// why: "disposal is the only workflow that demands this approach,
// building batches absolutely makes sense for the other workflow."
// This is a real, computed worklist (computeDisposalQueue.ts) with
// direct scan-to-dispose (disposeItemByScan.ts) — no manual container
// creation, no separate reconciliation pass; each scan is validated
// against the real, live eligibility rules the instant it happens.
//
// Batch 407: disposing needs retention:material:dispose (checked in
// disposeItemByScan.ts). The red screen shows the refusal in the user's
// language (disposalQueue.refusals.<code>) with dates formatted for it; item
// ids (accession-based) are tagged data-phi; the scan-station service comes
// from @/services, so the page is off the deployment baseline.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import '../../pathscribe.css';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentScanStation } from '@/hooks/useCurrentScanStation';
import { facilityService, scanStationService } from '@/services';
import { formatDate } from '@/utils/formatDate';
import { computeDisposalQueue } from '@/services/retentionPolicy/computeDisposalQueue';
import type { DisposalQueueItem } from '@/services/retentionPolicy/computeDisposalQueue';
import { disposeItemByScan } from '@/services/retentionPolicy/disposeItemByScan';
import { playScanBeep, playScanErrorTone } from '@/utils/playScanBeep';
import type { ScanEvent } from '@/contexts/ScannerProvider';
import { pressable } from '@/utils/a11y/pressable';

// Real, label-key-map — keeps the real DisposalQueueItem['materialType']
// value (used for filtering/matching elsewhere) untouched, translating
// only the on-screen label. Same real values disposalReport.materialType.*
// already covers (DisposalReportPage.tsx's own CSV export), given its own
// separate namespace here per this sweep's one-namespace-per-page rule.
const MATERIAL_TYPE_LABEL_KEY: Record<DisposalQueueItem['materialType'], string> = {
  block: 'disposalQueue.materialType.block', slide: 'disposalQueue.materialType.slide', wet_tissue: 'disposalQueue.materialType.wet_tissue',
};

const DisposalQueuePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { pushCrumb } = useBreadcrumb();
  useEffect(() => { pushCrumb(t('disposalQueue.pageTitle'), '/batch-management/disposal'); }, [pushCrumb, t]);
  const { user } = useAuth();
  const { stationId } = useCurrentScanStation();

  const [facilityId, setFacilityId] = useState<string | undefined>(undefined);
  const [facilityName, setFacilityName] = useState<string | null>(null);
  const [queue, setQueue] = useState<DisposalQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  // Real feature, per the spec's own "the screen turns red." A real,
  // full-screen state, not just a toast — the spec's own explicit
  // emphasis ("turns red," not "shows an error") calls for something
  // impossible to miss even if a tech isn't looking directly at a
  // small status line while working hands-free.
  const [redScreen, setRedScreen] = useState<{ text: string; hasPatientId: boolean } | null>(null);
  const [lastDisposed, setLastDisposed] = useState<string | null>(null);
  const redScreenTimer = useRef<number | null>(null);
  const successTimer = useRef<number | null>(null);

  // Real, station -> facility resolution — the same real ScanStation
  // record already used throughout this app's own material-tracking
  // pipeline (useGlobalMaterialScanTracking.ts), not a new concept.
  useEffect(() => {
    if (!stationId) { setFacilityId(undefined); setFacilityName(null); return; }
    scanStationService.getById(stationId).then(res => {
      if (!res.ok) return;
      setFacilityId(res.data.facilityId);
      facilityService.getById(res.data.facilityId).then(fRes => {
        if ('ok' in fRes && fRes.ok) setFacilityName(fRes.data.name);
      });
    });
  }, [stationId]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const items = await computeDisposalQueue(facilityId);
    setQueue(items);
    setLoading(false);
  }, [facilityId]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleScan = useCallback(async (raw: string) => {
    const value = raw.trim();
    if (!value) return;
    const result = await disposeItemByScan(value, facilityId, user?.id ?? 'unknown', user?.name ?? 'Unknown User');
    if (result.outcome === 'disposed') {
      playScanBeep();
      setQueue(prev => prev.filter(i => i.displayId !== result.displayId));
      setLastDisposed(t('disposalQueue.disposedFlash', { displayId: result.displayId }));
      if (successTimer.current) window.clearTimeout(successTimer.current);
      successTimer.current = window.setTimeout(() => setLastDisposed(null), 2500);
    } else {
      playScanErrorTone();
      // Batch 407: the refusal in the user's language, with any date formatted for it.
      setRedScreen({ text: t(`disposalQueue.refusals.${result.code}`, {
        displayId: result.values.displayId ?? value, note: result.values.note ?? '',
        date: result.values.date ? formatDate(result.values.date, i18n.language) : t('disposalQueue.unknownDate'),
      }), hasPatientId: result.code !== 'notPermitted' });
      if (redScreenTimer.current) window.clearTimeout(redScreenTimer.current);
      redScreenTimer.current = window.setTimeout(() => setRedScreen(null), 4000);
    }
  }, [facilityId, user?.id, user?.name, t, i18n.language]);

  useEffect(() => {
    const listener = (e: Event) => {
      const scanEvent = (e as CustomEvent<ScanEvent>).detail;
      if (scanEvent) handleScan(scanEvent.raw);
    };
    window.addEventListener('PATHSCRIBE_SCAN', listener);
    return () => window.removeEventListener('PATHSCRIBE_SCAN', listener);
  }, [handleScan]);

  return (
    <div className="ps-batch-page">
      {/* Real, full-screen red overlay — dismisses itself, or a tech
          can dismiss it immediately by clicking through to keep
          working; never silently blocks the next real scan. */}
      {redScreen && (
        <div className="ps-disposal-redscreen" {...pressable(() => setRedScreen(null))}>
          <div className="ps-disposal-redscreen-icon">⛔</div>
          <div className="ps-disposal-redscreen-text" data-phi={redScreen.hasPatientId ? 'accession' : undefined}>{redScreen.text}</div>
          <div className="ps-disposal-redscreen-dismiss">{t('disposalQueue.dismissHint')}</div>
        </div>
      )}

      <div className="ps-batch-scroll">
        <div className="ps-batch-inner">
          <div className="ps-batch-page-header">
            <h1 className="ps-batch-page-title">🗑️ {t('disposalQueue.pageTitle')}</h1>
            <p className="ps-batch-page-subtitle">
              {t('disposalQueue.pageSubtitle')}
              {facilityName && <> {t('disposalQueue.scopedTo', { facility: facilityName })}</>}
              {!facilityId && <> {t('disposalQueue.noStationAllLocations')}</>}
            </p>
          </div>

          {lastDisposed && <div className="ps-batch-flash ps-batch-flash--success" data-phi="accession">{lastDisposed}</div>}

          <div className="ps-batch-scan-hint">📷 {t('disposalQueue.scanHint')}</div>

          <div className="ps-batch-section-label">
            {t('disposalQueue.sectionLabel', { count: queue.length })}
          </div>
          {loading ? (
            <div className="ps-batch-empty">{t('disposalQueue.computing')}</div>
          ) : queue.length === 0 ? (
            <div className="ps-batch-empty">{t('disposalQueue.empty')}</div>
          ) : (
            <div className="ps-batch-manifest">
              {queue.map(item => (
                <div key={item.key} className="ps-batch-manifest-row">
                  <span className="ps-batch-manifest-id" data-phi="accession">{item.displayId}</span>
                  <span className="ps-batch-manifest-type">{t(MATERIAL_TYPE_LABEL_KEY[item.materialType])}</span>
                  <span className="ps-batch-manifest-added">
                    {t(item.lastKnownLocation ? 'disposalQueue.rowDetailWithLocation' : 'disposalQueue.rowDetail', {
                      specimen: item.specimenLabel.includes(',') ? t('disposalQueue.sharedSpecimens', { specimens: item.specimenLabel }) : item.specimenLabel,
                      date: formatDate(item.eligibleSince, i18n.language),
                      location: item.lastKnownLocation,
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DisposalQueuePage;
