// src/components/Config/System/UsEpathSection.tsx
// ─────────────────────────────────────────────────────────────────────
// Batch 620 (part E, PS-800): Configuration > System > US Electronic Pathology. The state profiles for NPCR ePath reporting
// (HL7 v2.5.1) and which one each performing facility uses: an enterprise default and a choice per facility. The state registry
// is chosen by the state of the facility that PERFORMED THE WORK, never the patient's address. When a facility has no choice of
// its own, it follows the profile for its own state, then the enterprise default. The shipped profile is an EXAMPLE: it shows
// the shape and claims no state's requirements. Logic: services/usEpath/. Contract: docs/architecture/US_EPATH_API.md
// ─────────────────────────────────────────────────────────────────────
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../../../pathscribe.css';
import './DeliverySchedulesSection.css';

import { usEpathService, facilityService } from '@/services';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { LoadingState } from '@/components/Common/LoadingState';
import type { Facility } from '../../../services/facilities/IFacilityService';
import type { EpathProfileAssignment, EpathStateProfile } from '../../../services/usEpath/epathProfile';
import { profileForFacility } from '../../../services/usEpath/epathRouting';
import { draftFromProfile, toInput } from './usEpathForm';
import UsEpathProfileEditor, { US_EPATH_CAPABILITY } from './UsEpathProfileEditor';

const UsEpathSection: React.FC = () => {
  const { t } = useTranslation();
  const [profiles, setProfiles] = useState<EpathStateProfile[]>([]);
  const [assignments, setAssignments] = useState<EpathProfileAssignment[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [scopeId, setScopeId] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ profile: EpathStateProfile | null } | null>(null);
  const [status, setStatus] = useState<'saved' | 'refused' | null>(null);

  const load = useCallback(async () => {
    const [p, a, f] = await Promise.all([usEpathService.getProfiles(), usEpathService.getAssignments(), facilityService.getAll()]);
    if (p.ok) setProfiles(p.data);
    if (a.ok) setAssignments(a.data);
    if (f.ok) setFacilities((f.data as Facility[]).filter(x => x.status === 'Active'));
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const name = (p: EpathStateProfile) => (p.example ? t('usEpathSection.exampleName') : p.name || p.state);
  const scopeFacility = scopeId ? facilities.find(f => f.id === scopeId) ?? null : null;
  const own = assignments.find(a => a.facilityId === (scopeId || null));
  const resolved = scopeId ? profileForFacility(scopeId, { facilities: facilities.map(f => ({ id: f.id as string, state: f.state })), profiles, assignments }) : undefined;

  const done = async (ok: boolean) => { setStatus(ok ? 'saved' : 'refused'); await load(); };
  const save = async (d: ReturnType<typeof draftFromProfile>) => { const r = await usEpathService.saveProfile(toInput(d)); setEditing(null); await done(r.ok); };
  const remove = async (id: string) => { const r = await usEpathService.removeProfile(id); await done(r.ok); };
  const choose = async (profileId: string) => {
    if (!profileId && !scopeId) return;
    const r = profileId ? await usEpathService.setAssignment({ facilityId: scopeId || null, profileId }) : await usEpathService.removeAssignment(scopeId);
    await done(r.ok);
  };

  if (loading) return <LoadingState label={t('usEpathSection.loading')} />;
  return (
    <div className="ps-dsch-root">
      <div>
        <h2 className="tmpl-list-title">{t('usEpathSection.title')}</h2>
        <p className="tmpl-list-subtitle">{t('usEpathSection.subtitle')}</p>
        <p className="ps-conf-hint">{t('usEpathSection.routingNote')}</p>
      </div>

      <h3 className="ps-conf-label">{t('usEpathSection.profiles.heading')}</h3>
      <div className="ps-dsch-scope">
        <CapabilityButton capability={US_EPATH_CAPABILITY} className="ps-conf-btn-primary" onClick={() => setEditing({ profile: null })}>{t('usEpathSection.addProfile')}</CapabilityButton>
      </div>
      <div className="ps-dsch-list">
        {profiles.map(p => (
          <div key={p.id} className="ps-dsch-card" data-profile={p.id}>
            <div>
              <div className="ps-dsch-feed">{name(p)}{p.example && <> · {t('usEpathSection.exampleBadge')}</>}</div>
              <div className="ps-dsch-summary">
                {t('usEpathSection.profiles.summary', { state: p.example ? t('usEpathSection.noState') : p.state, transport: t(`usEpathSection.transports.${p.transport}`), required: p.requiredFields.length, optional: p.optionalFields.length })}
              </div>
              {p.example && <p className="ps-conf-hint">{t('usEpathSection.exampleNote')}</p>}
            </div>
            {!p.example && (
              <div className="ps-dsch-actions">
                <CapabilityButton capability={US_EPATH_CAPABILITY} className="ps-conf-btn-secondary" onClick={() => setEditing({ profile: p })}>{t('usEpathSection.editButton')}</CapabilityButton>
                <CapabilityButton capability={US_EPATH_CAPABILITY} className="ps-conf-btn-secondary" onClick={() => { void remove(p.id); }}>{t('usEpathSection.removeButton')}</CapabilityButton>
              </div>
            )}
          </div>
        ))}
      </div>

      <h3 className="ps-conf-label">{t('usEpathSection.assignment.heading')}</h3>
      <div className="ps-dsch-scope">
        <label className="ps-conf-label" htmlFor="uep-scope">{t('usEpathSection.scope.label')}</label>
        <select id="uep-scope" className="ps-conf-select" value={scopeId} onChange={e => { setScopeId(e.target.value); setStatus(null); }}>
          <option value="">{t('usEpathSection.scope.enterprise')}</option>
          {facilities.map(f => <option key={f.id as string} value={f.id as string}>{f.name}</option>)}
        </select>
        <label className="ps-conf-label" htmlFor="uep-profile">{t('usEpathSection.assignment.label')}</label>
        <select id="uep-profile" className="ps-conf-select" value={own?.profileId ?? ''} disabled={!profiles.length} onChange={e => { void choose(e.target.value); }}>
          <option value="">{t(scopeId ? 'usEpathSection.assignment.followState' : 'usEpathSection.assignment.none')}</option>
          {profiles.map(p => <option key={p.id} value={p.id}>{name(p)}</option>)}
        </select>
      </div>
      {scopeFacility && (
        <p className="ps-conf-hint">
          {scopeFacility.state ? t('usEpathSection.assignment.facilityState', { state: scopeFacility.state }) : t('usEpathSection.assignment.noFacilityState')}
          {' '}
          {resolved ? t('usEpathSection.assignment.resolved', { profile: name(resolved.profile), via: t(`usEpathSection.via.${resolved.via}`) }) : t('usEpathSection.assignment.unresolved')}
        </p>
      )}
      {status && <p className="ps-conf-hint" role="status">{t(`usEpathSection.${status}`)}</p>}
      {editing && <UsEpathProfileEditor start={draftFromProfile(editing.profile)} onSave={d => { void save(d); }} onClose={() => setEditing(null)} />}
    </div>
  );
};

export default UsEpathSection;
