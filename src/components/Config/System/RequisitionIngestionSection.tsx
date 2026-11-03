// src/components/Config/System/RequisitionIngestionSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 762 (Automated Batch Requisition & Document Ingestion spec §2.1): Configuration → System → Integrations →
// Requisition ingestion. The sources the job reads, each belonging to a performing facility (or to every facility): a folder on
// the hospital network, a third-party document system read at its https address, or a system that sends scans to the API;
// how often the job looks; and the barcode printed on the separator sheet between requisitions in one scan.
// Stateless configuration only (CLAUDE.md rule 11): the job is a scheduled function on the server; nothing here starts
// or stops a process. Saving needs config:requisition-ingestion:manage (checked in the service, audited).
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { useTranslation } from 'react-i18next';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { LoadingState } from '@/components/Common/LoadingState';
import { useRequisitionSources } from '@/hooks/useRequisitionSources';
import { REQUISITION_SOURCE_KINDS, type RequisitionSourceKind } from '@/services';
import { formatDateTime } from '@/utils/formatDate';
import { useReportConfigDirty } from '../configDirtyGuardContext';
import { RequisitionExpectationCard } from './RequisitionExpectationCard';
import '@/components/Requisitions/Requisitions.css';

const K = 'requisitionIngestion';

const RequisitionIngestionSection: React.FC = () => {
  const { t, i18n } = useTranslation();
  const s = useRequisitionSources();
  useReportConfigDirty(s.dirty);
  if (s.problem === 'NOT_PERMITTED') return <p className="ps-req-problem" role="alert">{t('requisitions.errors.notPermitted')}</p>;
  if (!s.draft || !s.sources) return <LoadingState label={t(`${K}.loading`)} />;
  const d = s.draft;
  const bad = (f: string) => s.problems.includes(f as never);

  return (
    <div className="ps-req-config" data-testid="requisition-ingestion-section">
      <div className="ps-conf-section-header">
        <div>
          <h2 className="ps-conf-section-title">{t(`${K}.title`)}</h2>
          <p className="ps-conf-section-subtitle">{t(`${K}.subtitle`)}</p>
        </div>
      </div>
      <p className="ps-req-note" role="note">{t(`${K}.referenceOnly`)}</p>
      {s.problem && <p className="ps-req-problem" role="alert">{t(`${K}.problem`)}</p>}
      {s.notice && <p className="ps-req-note" role="status">{t(`${K}.saved`)}</p>}

      <div className="ps-req-source-tabs" role="tablist" aria-label={t(`${K}.sources`)}>
        {s.sources.map(src => (
          <button key={src.id} type="button" role="tab" aria-selected={src.id === d.id} className={`ps-btn-small${src.id === d.id ? ' ps-req-source-tab--active' : ''}`} onClick={() => s.select(src.id)}>
            {src.name}
          </button>
        ))}
        <button type="button" className={`ps-btn-small${!d.id ? ' ps-req-source-tab--active' : ''}`} onClick={s.addNew}>{t(`${K}.addSource`)}</button>
      </div>

      <section className="ps-req-card ps-req-form">
        <label className="ps-req-check">
          <input type="checkbox" checked={d.enabled} onChange={e => s.set('enabled', e.target.checked)} />
          <span>{t(`${K}.enabled`)}</span>
        </label>
        <label className="ps-req-field">
          <span>{t(`${K}.name`)}</span>
          <input className="ps-req-input" value={d.name} aria-invalid={bad('name')} onChange={e => s.set('name', e.target.value)} />
        </label>
        <label className="ps-req-field">
          <span>{t(`${K}.facility`)}</span>
          <select className="ps-req-select" value={d.facilityId ?? ''} onChange={e => s.set('facilityId', e.target.value || null)}>
            <option value="">{t('requisitions.allFacilities')}</option>
            {s.facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <span className="ps-req-hint">{t(`${K}.facilityHint`)}</span>
        </label>
        <label className="ps-req-field">
          <span>{t(`${K}.kind`)}</span>
          <select className="ps-req-select" value={d.kind} onChange={e => s.set('kind', e.target.value as RequisitionSourceKind)}>
            {REQUISITION_SOURCE_KINDS.map(k => <option key={k} value={k}>{t(`${K}.kinds.${k}`)}</option>)}
          </select>
        </label>
        <label className="ps-req-field">
          <span>{t(`${K}.location.${d.kind}`)}</span>
          <input className="ps-req-input ps-req-input--mono" value={d.location} aria-invalid={bad('location')} onChange={e => s.set('location', e.target.value)} />
          <span className="ps-req-hint">{t(`${K}.locationHint.${d.kind}`)}</span>
        </label>
        <label className="ps-req-field">
          <span>{t(`${K}.schedule`)}</span>
          <input className="ps-req-input ps-req-input--short" type="number" min={1} max={1440} value={d.scheduleMinutes} aria-invalid={bad('scheduleMinutes')}
            onChange={e => s.set('scheduleMinutes', Number(e.target.value))} />
          <span className="ps-req-hint">{t(`${K}.scheduleHint`)}</span>
        </label>
        <label className="ps-req-field">
          <span>{t(`${K}.separator`)}</span>
          <input className="ps-req-input ps-req-input--mono" value={d.separatorBarcode} aria-invalid={bad('separatorBarcode')} onChange={e => s.set('separatorBarcode', e.target.value)} />
          <span className="ps-req-hint">{t(`${K}.separatorHint`)}</span>
        </label>
        <div className="ps-req-card-row">
          <span className="ps-req-meta">{s.saved ? t(`${K}.lastSaved`, { when: formatDateTime(s.saved.updatedAt, i18n.language), name: s.saved.updatedBy }) : t(`${K}.newSource`)}</span>
          <CapabilityButton capability="config:requisition-ingestion:manage" className="ps-btn-primary" disabled={!s.dirty || s.problems.length > 0} onClick={() => { void s.save(); }}>
            {t('common.save')}
          </CapabilityButton>
        </div>
      </section>

      <RequisitionExpectationCard facilities={s.facilities} />
    </div>
  );
};

export default RequisitionIngestionSection;
