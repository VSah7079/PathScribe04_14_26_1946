// src/pages/SlideDistributionStationPage/components/ScanCenterPanel.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Real, per PS-286's own Center Panel (Continuous-Scan Input Area):
// "primary active barcode scan target, visual tray/rack layout grid
// showing occupied slots, batch progress indicators." Real, honest
// scope note: the "slot grid" below is a schematic chip per queued
// slide (color-coded by real destination/status), NOT a literal,
// coordinate-accurate rack/tray layout — no real rack/tray-to-slide
// membership data model exists anywhere in this app to draw one from
// (confirmed by direct investigation — see this folder's own README
// and useSlideDistributionStation.ts's own header comment). Also owns
// the Smart Rules & Exception Handling surface for the active slide:
// the Split-Destination warning and the Scan Exception Log (both the
// session-scoped "never resolved to a real slide" exceptions and the
// per-slide "Missing Glass" exception already recorded on the active
// item).
//
// Batch 402 (PS-359): flagging an exception can carry a note, which the
// organisation can require (Field Requirements page "slideDistribution"); the
// reason buttons stay off, with "Still required", until it is there. Statuses,
// reasons and the split warning are shown in the user's language (stored in
// English), and times in the user's locale. The chain-of-custody lines are a
// traceability record and stay in English.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SlideQueueItem, ScanException } from '../hooks/useSlideDistributionStation';
import type { SplitDestinationWarning, SlideExceptionReason } from '@/utils/slideDistributionOperations';
import { SLIDE_EXCEPTION_REASONS, SLIDE_EXCEPTION_REASON_KEYS, DISTRIBUTION_STATUS_KEYS } from '@/utils/slideDistributionOperations';
import { slideExceptionMissing, slideDistributionFieldRequired } from '@/services';
import type { ResolvedFieldRequirement } from '@/services/fieldRequirements/fieldRequirementRules';
import { formatTime } from '@/utils/formatDate';
import { formatList } from '@/utils/formatList';

export interface ScanCenterPanelProps {
  queue: SlideQueueItem[];
  activeItem: SlideQueueItem | undefined;
  activeQueueId: string | null;
  onSelect: (id: string) => void;
  splitWarning: SplitDestinationWarning | null;
  scanExceptions: ScanException[];
  onFlagException: (reason: SlideExceptionReason, note: string) => void;
  onResolveException: () => void;
  onRequestReprint: () => void;
  reprintFeedback: string | null;
  requirements: readonly ResolvedFieldRequirement[];
}

function slotClass(item: SlideQueueItem, isActive: boolean): string {
  const parts = ['ps-slidedist-slot-chip'];
  if (isActive) parts.push('ps-slidedist-slot-chip--active');
  if (item.stain.activeExceptionReason) parts.push('ps-slidedist-slot-chip--exception');
  else if (item.stain.distributionDestination === 'physical') parts.push('ps-slidedist-slot-chip--physical');
  else if (item.stain.distributionDestination === 'digital') parts.push('ps-slidedist-slot-chip--digital');
  return parts.join(' ');
}

const ScanCenterPanel: React.FC<ScanCenterPanelProps> = ({
  queue, activeItem, activeQueueId, onSelect, splitWarning, scanExceptions,
  onFlagException, onResolveException, onRequestReprint, reprintFeedback, requirements,
}) => {
  const { t, i18n } = useTranslation();
  const [exceptionNote, setExceptionNote] = useState('');
  useEffect(() => { setExceptionNote(''); }, [activeQueueId]);
  const exceptionMissing = slideExceptionMissing(exceptionNote, requirements);
  const flag = (reason: SlideExceptionReason) => {
    if (exceptionMissing.length > 0) return;
    onFlagException(reason, exceptionNote.trim());
    setExceptionNote('');
  };

  return (
    <div>
      <div className="ps-slidedist-panel ps-mb-14">
        <p className="ps-slidedist-panel-title">{t('slideDistribution.slots.title')}</p>
        {queue.length === 0 ? (
          <div className="ps-slidedist-empty">{t('slideDistribution.slots.empty')}</div>
        ) : (
          <div className="ps-slidedist-slot-grid">
            {queue.map(item => (
              <button
                key={item.queueId} type="button" className={slotClass(item, item.queueId === activeQueueId)}
                onClick={() => onSelect(item.queueId)}
                title={t('slideDistribution.slots.chipTitle', { slide: `${item.specimen.label}${item.block.label}`, stain: item.stain.stainName })}
              >
                {item.block.label}
              </button>
            ))}
          </div>
        )}

        {scanExceptions.length > 0 && (
          <>
            <p className="ps-slidedist-panel-title ps-mt-4">{t('slideDistribution.exceptions.scanLogTitle')}</p>
            <ul className="ps-slidedist-event-list">
              {scanExceptions.slice(-5).reverse().map(exc => (
                <li key={exc.id} className="ps-slidedist-event-item">
                  {t('slideDistribution.exceptions.scanLogLine', {
                    reason: t(`slideDistribution.exceptions.reason.${SLIDE_EXCEPTION_REASON_KEYS[exc.reason]}`),
                    scan: exc.rawScan,
                    time: formatTime(exc.timestamp, i18n.language),
                  })}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {activeItem ? (
        <div className="ps-slidedist-panel">
          <p className="ps-slidedist-panel-title">{t('slideDistribution.activeSlide.title')}</p>
          <div className="ps-slidedist-context-field">
            {t('slideDistribution.activeSlide.slide')}
            <strong>{t('slideDistribution.slots.chipTitle', { slide: `${activeItem.specimen.label}${activeItem.block.label}`, stain: activeItem.stain.stainName })}</strong>
          </div>
          <div className="ps-slidedist-context-field">
            {t('slideDistribution.activeSlide.status')}
            <strong>{activeItem.stain.distributionStatus ? t(`slideDistribution.status.${DISTRIBUTION_STATUS_KEYS[activeItem.stain.distributionStatus]}`) : t('slideDistribution.queue.unrouted')}</strong>
          </div>

          {splitWarning?.conflict && (
            <div className="ps-slidedist-split-warning">⚠ {t(`slideDistribution.splitWarning.${splitWarning.kind}`)}</div>
          )}

          {activeItem.stain.activeExceptionReason ? (
            <div className="ps-slidedist-exception-banner">
              <span>⚠ {t(`slideDistribution.exceptions.reason.${SLIDE_EXCEPTION_REASON_KEYS[activeItem.stain.activeExceptionReason as SlideExceptionReason] ?? 'other'}`)}</span>
              <button type="button" className="ps-slidedist-row-btn" onClick={onResolveException}>{t('slideDistribution.exceptions.resolve')}</button>
            </div>
          ) : (
            <>
              <p className="ps-slidedist-panel-title ps-mt-10">{t('slideDistribution.exceptions.title')}</p>
              <label className="ps-slidedist-field-label" htmlFor="slidedist-exception-note">
                {t('slideDistribution.exceptions.note')}{slideDistributionFieldRequired(requirements, 'exceptionNote') && <span className="ps-conf-required"> *</span>}
              </label>
              <input id="slidedist-exception-note" type="text" className="ps-slidedist-field-input" value={exceptionNote}
                onChange={e => setExceptionNote(e.target.value)} placeholder={t('slideDistribution.exceptions.notePlaceholder') ?? ''} />
              <div className="ps-slidedist-exception-grid">
                {SLIDE_EXCEPTION_REASONS.map(reason => (
                  <button key={reason} type="button" className="ps-slidedist-exception-btn" disabled={exceptionMissing.length > 0} onClick={() => flag(reason)}>
                    {t(`slideDistribution.exceptions.reason.${SLIDE_EXCEPTION_REASON_KEYS[reason]}`)}
                  </button>
                ))}
              </div>
              {exceptionMissing.length > 0 && (
                <p className="ps-field-still-required" role="status">
                  {t('fieldRequirements.stillRequired', { fields: formatList(exceptionMissing.map(id => t(`fieldRequirements.fields.slideDistribution.${id}`)), i18n.language) })}
                </p>
              )}
            </>
          )}

          <button type="button" className="ps-btn-secondary ps-mt-10" onClick={onRequestReprint}>
            🖨️ {t('slideDistribution.activeSlide.reprintLabel')}
          </button>
          {reprintFeedback && <div className="ps-slidedist-scan-error ps-mt-6">{reprintFeedback}</div>}

          {(activeItem.stain.distributionEvents?.length ?? 0) > 0 && (
            <>
              <p className="ps-slidedist-panel-title ps-mt-10">{t('slideDistribution.activeSlide.history')}</p>
              <ul className="ps-slidedist-event-list">
                {activeItem.stain.distributionEvents!.slice().reverse().map(ev => (
                  <li key={ev.id} className="ps-slidedist-event-item">{t('slideDistribution.activeSlide.historyLine', { detail: ev.detail, time: formatTime(ev.timestamp, i18n.language) })}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : (
        <div className="ps-slidedist-panel">
          <div className="ps-slidedist-empty">{t('slideDistribution.activeSlide.none')}</div>
        </div>
      )}
    </div>
  );
};

export default ScanCenterPanel;
