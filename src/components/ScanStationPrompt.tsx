// src/components/ScanStationPrompt.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Real fix, per direct follow-up: "I think the premise of setting a
// current station in an actual case is not correct. The Current
// station, or Station should be identified at login. Should be
// sticky too." Replaces the old, case-scoped MaterialTreePanel.tsx
// selector entirely — a station is a property of the terminal, never
// of whatever case happens to be open.
//
// Mounted once, at the app root (AppShell.tsx, so it runs for every
// authenticated page — never gated to a specific case). Real fallback
// chain, per direct follow-up: "1. Check Client Device Storage...
// Force the session to use this station_id. 2. Fallback to User
// Profile: If no device-level ID exists, pull the logged-in user's
// default_station_id." This prompt only ever shows when NEITHER
// resolves (useEffectiveScanStation.ts's own effectiveStationId is
// still null) — a user with a real, admin-assigned default is never
// interrupted by this at all; it's genuinely reserved for the case
// where nothing at all is known yet. Also respects the device's own,
// separate sticky "hasBeenPrompted" flag, so a genuine "Skip" stays
// skipped rather than re-asking every login. A tech can still change
// their station any time afterward via the compact NavBar indicator
// (NavBarScanStation.tsx) — this prompt is only the real, one-time
// "identified at login" moment, not the only way to ever set it.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveScanStation } from '@/hooks/useEffectiveScanStation';

import { resolveStationBenchRoute } from '@/services/workstationGroups/resolveStationBenchRoute';
import { useSelectableScanStations } from '@/hooks/useSelectableScanStations';

export function ScanStationPrompt() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { effectiveStationId, unavailableStationId, setStationId, hasBeenPrompted, markPrompted } = useEffectiveScanStation();
  // Batch 713: only the Active stations this user may use (services/scanStations/stationsForUser.ts).
  const { stations, allStations } = useSelectableScanStations();
  const [selected, setSelected] = useState<string>('');
  // Batch 713: "skip" on the not-available notice lasts for this sign-in; the computer's stored station is left alone.
  const [skippedUnavailableFor, setSkippedUnavailableFor] = useState<string | null>(null);
  const navigate = useNavigate();
  useEffect(() => { setSelected(''); setSkippedUnavailableFor(null); }, [user?.id]);

  // Real, deliberate show condition: a real, logged-in user, with
  // NEITHER a device-level station NOR a resolved user default
  // (effectiveStationId covers both halves of the real fallback
  // chain), on a device that has genuinely never been through this
  // prompt before — never re-shown just because the device's own
  // stationId happens to be null (a resolved user default, or an
  // intentional skip, are both real reasons that's true too).
  // Batch 713: also shown again when the station stored on this computer is one
  // this user may not use (it counts as no station until they pick their own or skip).
  const notAvailableStation = unavailableStationId ? allStations.find(s => s.id === unavailableStationId) : undefined;
  const showUnavailable = !!user && !!unavailableStationId && !effectiveStationId && skippedUnavailableFor !== user.id;
  const shouldShow = !!user && !effectiveStationId && (!hasBeenPrompted || showUnavailable);
  if (!shouldShow) return null;

  // Real fix, per direct follow-up: "The workstation selection will
  // default the page now" — closes the one piece PS-289's own comment
  // thread named and never delivered (see NavBarScanStation.tsx's own
  // header): `dedicatedPageRoute` was captured on WorkstationGroup and
  // already consumed for the manual "🔬 Go to Bench" NavBar button,
  // but picking a station at this one-time login prompt still just
  // left a tech sitting on Home, one extra click from their own bench.
  // Same resolution chain NavBarScanStation.tsx already uses (station
  // → its WorkstationGroup → that group's route), run once, right at
  // confirmation, instead of waiting on the NavBar's own effect. Same
  // honest guard as that button: only a real route on an Active group
  // is ever navigated to — a station with no group, or an inactive
  // one, just leaves the tech on Home exactly as before, no dead nav.
  // Deliberately scoped to this one-time prompt only, not every future
  // Home visit — a device/user with an already-resolved station never
  // sees this prompt at all (shouldShow below), so this can't trap a
  // returning tech who actually wants to be on Home.
  const handleConfirm = () => {
    if (!selected) { markPrompted(); return; }
    setStationId(selected);
    markPrompted();
    // Real fix, found by this app's own inline-CSS/business-logic
    // sweep: delegates to resolveStationBenchRoute.ts's shared
    // station → WorkstationGroup → Active-gated route resolution —
    // the same real chain NavBarScanStation.tsx's own "Go to Bench"
    // button uses — instead of a second, independently-maintained
    // copy of the same gating rule.
    resolveStationBenchRoute(selected).then(route => {
      if (route) navigate(route);
    });
  };

  const handleSkip = () => {
    markPrompted();
    if (user) setSkippedUnavailableFor(user.id);
  };

  return (
    <div className="ps-overlay ps-scan-prompt-overlay">
      <div className="ps-modal-dark ps-scan-prompt-modal">
        <div>
          <div className="ps-scan-prompt-title">📍 {t('scanStationPrompt.title')}</div>
          <div className="ps-scan-prompt-subtitle">
            {t('scanStationPrompt.subtitle')}
          </div>
        </div>
        {showUnavailable && (
          <div className="ps-scan-prompt-subtitle" role="status">
            {t('scanStationPrompt.notAvailable', { station: notAvailableStation?.name ?? unavailableStationId })}
          </div>
        )}
        <select aria-label={t('scanStationPrompt.subtitle')}
          value={selected}
          onChange={e => setSelected(e.target.value)}
          className="ps-scan-prompt-select"
        >
          <option value="">{t('scanStationPrompt.selectPlaceholder')}</option>
          {stations.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <div className="ps-scan-prompt-actions">
          <button className="ps-scan-prompt-skip" onClick={handleSkip}>{t('scanStationPrompt.skipButton')}</button>
          <button className="ps-scan-prompt-confirm" onClick={handleConfirm} disabled={!selected}>{t('scanStationPrompt.confirmButton')}</button>
        </div>
      </div>
    </div>
  );
}

export default ScanStationPrompt;
