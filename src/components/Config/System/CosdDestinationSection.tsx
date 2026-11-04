// src/components/Config/System/CosdDestinationSection.tsx
// ─────────────────────────────────────────────────────────────────────
// Batch 620 (part C, PS-800): Configuration > System > UK Cancer Registry (COSD). Where the UK cancer registry submission goes
// and how many working days a rejected one has to be corrected (5 unless set otherwise). Set for the whole enterprise, and a
// performing facility may have its own. PathScribe holds the destination settings and the status; the interface engine owns the
// transport, credentials and the real COSD file. Logic: services/cosd. Contract: docs/architecture/UK_COSD_API.md
// ─────────────────────────────────────────────────────────────────────
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../../../pathscribe.css';
import './DeliverySchedulesSection.css';
import './CosdDestinationSection.css';

import { cosdDestinationService, facilityService } from '@/services';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { LoadingState } from '@/components/Common/LoadingState';
import type { Facility } from '../../../services/facilities/IFacilityService';
import { COSD_TRANSPORTS, resolveCosdDestination, validateDestination, type CosdDestination } from '../../../services/cosd/cosdDestination';
import { draftFromSettings, toInput, type DestinationDraft } from './cosdDestinationForm';
import CosdCheckPanel from './CosdCheckPanel';

export const COSD_DESTINATION_CAPABILITY = 'config:cosd-destination:manage' as const;

const CosdDestinationSection: React.FC = () => {
  const { t } = useTranslation();
  const [stored, setStored] = useState<CosdDestination[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [scopeId, setScopeId] = useState('');
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<DestinationDraft | null>(null);
  const [status, setStatus] = useState<'saved' | 'refused' | null>(null);

  const load = useCallback(async () => {
    const [d, f] = await Promise.all([cosdDestinationService.getAll(), facilityService.getAll()]);
    if (d.ok) setStored(d.data);
    if (f.ok) setFacilities((f.data as Facility[]).filter(x => x.status === 'Active'));
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const scope = scopeId || null;
  const own = stored.find(d => d.facilityId === scope);
  const shown = resolveCosdDestination(stored, scope);
  const problems = draft ? validateDestination(toInput(draft)) : [];
  const save = async () => {
    if (!draft || problems.length) return;
    const r = await cosdDestinationService.set(toInput(draft));
    setStatus(r.ok ? 'saved' : 'refused');
    setDraft(null);
    await load();
  };
  const remove = async () => {
    if (!scopeId) return;
    const r = await cosdDestinationService.remove(scopeId);
    setStatus(r.ok ? 'saved' : 'refused');
    await load();
  };

  if (loading) return <LoadingState label={t('cosdDestinationSection.loading')} />;
  return (
    <div className="ps-dsch-root">
      <div>
        <h2 className="tmpl-list-title">{t('cosdDestinationSection.title')}</h2>
        <p className="tmpl-list-subtitle">{t('cosdDestinationSection.subtitle')}</p>
      </div>
      <div className="ps-dsch-scope">
        <label className="ps-conf-label" htmlFor="cosd-scope">{t('cosdDestinationSection.scope.label')}</label>
        <select id="cosd-scope" className="ps-conf-select" value={scopeId} onChange={e => { setScopeId(e.target.value); setStatus(null); }}>
          <option value="">{t('cosdDestinationSection.scope.enterprise')}</option>
          {facilities.map(f => <option key={f.id as string} value={f.id as string}>{f.name}</option>)}
        </select>
        <CapabilityButton capability={COSD_DESTINATION_CAPABILITY} className="ps-conf-btn-primary" onClick={() => setDraft(draftFromSettings(shown, scope))}>
          {t(own ? 'cosdDestinationSection.editButton' : 'cosdDestinationSection.setUp')}
        </CapabilityButton>
      </div>
      {scopeId && !own && <p className="ps-conf-hint">{t('cosdDestinationSection.followsEnterprise')}</p>}
      <div className="ps-dsch-card" data-destination={shown.source}>
        <div>
          <div className="ps-dsch-feed">{t(`cosdDestinationSection.transports.${shown.transport}`)}</div>
          <div className="ps-dsch-summary">
            {t('cosdDestinationSection.summary.days', { count: shown.correctionWorkingDays })}
            {' · '}{t('cosdDestinationSection.summary.nonWorking', { count: shown.nonWorkingDates.length })}
          </div>
          <span className={`ps-dsch-source ps-dsch-source--${shown.source === 'facility' ? 'facility' : 'enterprise'}`}>{t(`cosdDestinationSection.source.${shown.source}`)}</span>
        </div>
        {scopeId && own && (
          <div className="ps-dsch-actions">
            <CapabilityButton capability={COSD_DESTINATION_CAPABILITY} className="ps-conf-btn-secondary" onClick={() => { void remove(); }}>{t('cosdDestinationSection.removeButton')}</CapabilityButton>
          </div>
        )}
      </div>
      {status && <p className="ps-conf-hint" role="status">{t(`cosdDestinationSection.${status}`)}</p>}
      <CosdCheckPanel destination={shown} />
      {draft && (
        <div className="ps-overlay" onClick={() => setDraft(null)}>
          <div className="ps-modal-dark" onClick={e => e.stopPropagation()}>
            <div className="ps-modal-dark-header">
              <span className="ps-modal-dark-title">{t('cosdDestinationSection.editor.title', { scope: scope ? facilities.find(f => f.id === scope)?.name ?? scope : t('cosdDestinationSection.scope.enterprise') })}</span>
              <button className="ps-research-close" onClick={() => setDraft(null)} aria-label={t('common.cancel')}>✕</button>
            </div>
            <div className="ps-modal-dark-body">
              <label className="ps-conf-label" htmlFor="cosd-transport">{t('cosdDestinationSection.editor.transport')}</label>
              <select id="cosd-transport" className="ps-conf-select" value={draft.transport} onChange={e => setDraft({ ...draft, transport: e.target.value as DestinationDraft['transport'] })}>
                {COSD_TRANSPORTS.map(x => <option key={x} value={x}>{t(`cosdDestinationSection.transports.${x}`)}</option>)}
              </select>
              <p className="ps-rr-modal-hint">{t('cosdDestinationSection.editor.transportHint')}</p>
              <label className="ps-conf-label" htmlFor="cosd-days">{t('cosdDestinationSection.editor.days')}</label>
              <input id="cosd-days" className="ps-conf-input" inputMode="numeric" value={draft.daysText} onChange={e => setDraft({ ...draft, daysText: e.target.value })} />
              <p className="ps-rr-modal-hint">{t('cosdDestinationSection.editor.daysHint')}</p>
              <label className="ps-conf-label" htmlFor="cosd-dates">{t('cosdDestinationSection.editor.dates')}</label>
              <input id="cosd-dates" className="ps-conf-input" value={draft.datesText} onChange={e => setDraft({ ...draft, datesText: e.target.value })} />
              <p className="ps-rr-modal-hint">{t('cosdDestinationSection.editor.datesHint')}</p>
              {problems.map(p => <p key={p} className="ps-conf-hint" role="alert">{t(`cosdDestinationSection.editor.problems.${p}`)}</p>)}
            </div>
            <div className="ps-dsch-actions">
              <button className="ps-conf-btn-secondary" onClick={() => setDraft(null)}>{t('common.cancel')}</button>
              <CapabilityButton capability={COSD_DESTINATION_CAPABILITY} className="ps-conf-btn-primary" disabled={problems.length > 0} onClick={() => { void save(); }}>{t('cosdDestinationSection.editor.save')}</CapabilityButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CosdDestinationSection;
