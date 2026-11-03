// src/components/StainQc/QcCheckpointPanel.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 763 (Pete: "a Post-Stain / Pre-Distribution QC checkpoint"): on Slide Distribution, the staining runs and scanned
// images waiting for QC. A run is signed off with one click when every slide passed; a failed slide is marked with its
// follow-up (re-stain or re-cut) and a reason. A run waiting for its stainer's own sign-off (Option A) says so; a
// supervisor can sign it off here instead. A scanned image is passed to the pathologist, or sent back to be scanned again.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { useQcCheckpoint } from '@/hooks/useQcCheckpoint';
import { IMAGE_QC_FAIL_REASONS, QC_FAIL_ACTIONS, STAIN_QC_FAIL_REASONS, type ImageQcFailReason, type QcFailAction, type StainQcFailReason } from '@/services';
import { formatDateTime } from '@/utils/formatDate';
import './QcCheckpointPanel.css';

export function QcCheckpointPanel({ refreshKey }: { refreshKey?: unknown }) {
  const { t, i18n } = useTranslation();
  const q = useQcCheckpoint(refreshKey);
  const [imageReasons, setImageReasons] = useState<Record<string, ImageQcFailReason>>({});
  const { runs, images } = q.checkpoint;
  if (runs.length === 0 && images.length === 0) return null;

  return (
    <section className="ps-qc-panel" aria-label={t('stainQc.title')}>
      <div className="ps-qc-title">{t('stainQc.title')}</div>
      <p className="ps-qc-hint">{t('stainQc.hint')}</p>
      {q.problem && <p className="ps-qc-problem" role="alert">{t(`stainQc.errors.${q.problem === 'NOT_PERMITTED' ? 'notPermitted' : q.problem === 'INVALID' ? 'invalid' : 'failed'}`)}</p>}

      {runs.map(run => {
        const open = q.openRunId === run.batchId;
        const outcomes = q.outcomesOf(run);
        const failed = outcomes.filter(o => o.outcome === 'fail').length;
        return (
          <div key={run.batchId} className="ps-qc-run">
            <button type="button" className="ps-qc-run-head" aria-expanded={open} onClick={() => q.setOpenRunId(open ? null : run.batchId)}>
              <span className="ps-qc-rack">{run.masterBarcode}</span>
              <span className="ps-qc-meta">{t('stainQc.runLine', { count: run.slides.length, when: formatDateTime(run.openedAt, i18n.language) })}</span>
              <span className={`ps-qc-mode ps-qc-mode--${run.mode}`}>{t(`stainQc.modes.${run.mode}`)}</span>
            </button>
            {open && (
              <div className="ps-qc-run-body">
                {run.mode === 'vendorSignOff' && <p className="ps-qc-note" role="note">{t('stainQc.waitingForInstrument')}</p>}
                {!run.stainerEquipmentId && q.stainers.length > 0 && (
                  <label className="ps-qc-field">
                    <span>{t('stainQc.stainer')}</span>
                    <select className="ps-qc-select" value={q.stainerFor(run.batchId)} onChange={e => q.setStainer(run.batchId, e.target.value)}>
                      <option value="">{t('stainQc.stainerUnknown')}</option>
                      {q.stainers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </label>
                )}
                <ul className="ps-qc-slides">
                  {outcomes.map(o => (
                    <li key={o.slideId} className={`ps-qc-slide${o.outcome === 'fail' ? ' ps-qc-slide--fail' : ''}`}>
                      <span className="ps-qc-slide-id" data-phi="accession">{o.slideId}</span>
                      <span className="ps-qc-toggle" role="group" aria-label={t('stainQc.outcome')}>
                        <button type="button" className={o.outcome === 'pass' ? 'ps-qc-on' : ''} aria-pressed={o.outcome === 'pass'} onClick={() => q.setSlide(run, o.slideId, { outcome: 'pass' })}>{t('stainQc.pass')}</button>
                        <button type="button" className={o.outcome === 'fail' ? 'ps-qc-on ps-qc-on--fail' : ''} aria-pressed={o.outcome === 'fail'} onClick={() => q.setSlide(run, o.slideId, { outcome: 'fail', action: o.action ?? 'restain', reason: o.reason ?? STAIN_QC_FAIL_REASONS[0] })}>{t('stainQc.fail')}</button>
                      </span>
                      {o.outcome === 'fail' && (
                        <>
                          <select className="ps-qc-select" aria-label={t('stainQc.followUp')} value={o.action} onChange={e => q.setSlide(run, o.slideId, { action: e.target.value as QcFailAction })}>
                            {QC_FAIL_ACTIONS.map(a => <option key={a} value={a}>{t(`stainQc.actions.${a}`)}</option>)}
                          </select>
                          <select className="ps-qc-select" aria-label={t('stainQc.reason')} value={o.reason} onChange={e => q.setSlide(run, o.slideId, { reason: e.target.value as StainQcFailReason })}>
                            {STAIN_QC_FAIL_REASONS.map(r => <option key={r} value={r}>{t(`stainQc.reasons.${r}`)}</option>)}
                          </select>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="ps-qc-actions">
                  <CapabilityButton capability={run.mode === 'vendorSignOff' ? 'stain:qc:override' : 'stain:qc:sign-off'} className="ps-btn-primary" disabled={!q.canSign(run)} onClick={() => { void q.signOff(run); }}>
                    {failed ? t('stainQc.signOffWithFailures', { count: failed }) : run.mode === 'vendorSignOff' ? t('stainQc.signOffInstead') : t('stainQc.signOffAllPassed')}
                  </CapabilityButton>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {images.length > 0 && (
        <div className="ps-qc-images">
          <div className="ps-qc-subtitle">{t('stainQc.imagesTitle', { count: images.length })}</div>
          <ul className="ps-qc-slides">
            {images.map(img => (
              <li key={img.stainId} className="ps-qc-slide">
                <span className="ps-qc-slide-id" data-phi="accession">{img.slideLabel}</span>
                <span className="ps-qc-meta">{t('stainQc.imageLine', { scanner: img.scannerInstrumentId, batch: img.scanBatchBarcode })}</span>
                <CapabilityButton capability="scan:image-qc:sign-off" className="ps-btn-small" onClick={() => { void q.decideImage(img.stainId, 'pass'); }}>{t('stainQc.releaseImage')}</CapabilityButton>
                <select className="ps-qc-select" aria-label={t('stainQc.reason')} value={imageReasons[img.stainId] ?? IMAGE_QC_FAIL_REASONS[0]} onChange={e => setImageReasons(m => ({ ...m, [img.stainId]: e.target.value as ImageQcFailReason }))}>
                  {IMAGE_QC_FAIL_REASONS.map(r => <option key={r} value={r}>{t(`stainQc.imageReasons.${r}`)}</option>)}
                </select>
                <CapabilityButton capability="scan:image-qc:sign-off" className="ps-btn-ghost-dark" onClick={() => { void q.decideImage(img.stainId, 'fail', imageReasons[img.stainId] ?? IMAGE_QC_FAIL_REASONS[0]); }}>{t('stainQc.rescan')}</CapabilityButton>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export default QcCheckpointPanel;
