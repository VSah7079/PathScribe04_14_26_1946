// src/components/Config/Cytology/CytologyWorkloadCapSettingsSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Real, per direct guidance ("build all the Cytology Admin screens
// that are still pending") — same real 3-tier cascade UI pattern as
// CytologyQcSettingsSection.tsx (Enterprise + Facility + Staff),
// adapted to this settings config's own single dailySlideCap field.
// Real, per direct reminder ("reusing PathScribe CSS objects... no
// inline CSS") — real, named CSS classes throughout, no style={{...}}
// anywhere in this file.
//
// i18n note: since this is the same real 3-tier cascade pattern as
// CytologyQcSettingsSection.tsx, five of its exact-text keys are
// reused outright here (enterprise/facility/staff titles, the
// unsaved-change indicator, the empty states, and the "+ Add
// Override" button) rather than duplicated.
//
// Batch 578 (carried from 576): a cap that isn't saved is said beside its own
// field (enterprise, facility or staff), and only that field is marked
// invalid; the add pickers offer only facilities and staff without an
// override (services/cytology/cytologyWorkloadCapRules.ts).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import '../../../pathscribe.css';

import type { FacilityCytologyWorkloadCapOverride } from '../../../services/cytology/IFacilityCytologyWorkloadCapOverrideService';
import type { StaffCytologyWorkloadCapOverride } from '../../../services/cytology/IStaffCytologyWorkloadCapOverrideService';
import type { Facility } from '../../../services/facilities/IFacilityService';
import type { StaffUser } from '../../../services/users/IUserService';
import { useReportConfigDirty } from '../configDirtyGuardContext';
import { cytologyWorkloadCapSettingsService, facilityCytologyWorkloadCapOverrideService, staffCytologyWorkloadCapOverrideService, facilityService, userService } from '@/services';
import { formatHourOfDay } from '@/utils/formatDate';
import { useAuth } from '@/contexts/AuthContext';
import { saveScreeningDayStart } from '@/services/cytology/saveScreeningDayStart';
import { screeningDayStartSaveDeps } from '@/services/cytology/screeningDayStartSaveDeps';
import { cytologyWorkloadCapError, withoutCapOverride, type CytologyWorkloadCapError, type CytologyWorkloadCapTier } from '@/services/cytology/cytologyWorkloadCapRules';

/** Batch 574: the hours a screening day can start at. */
const DAY_START_HOURS = Array.from({ length: 24 }, (_, h) => h);

const CytologyWorkloadCapSettingsSection: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [enterpriseDraft, setEnterpriseDraft] = useState<number>(100);
  const [savedEnterprise, setSavedEnterprise] = useState<number>(100);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [facilityOverrides, setFacilityOverrides] = useState<FacilityCytologyWorkloadCapOverride[]>([]);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [staffOverrides, setStaffOverrides] = useState<StaffCytologyWorkloadCapOverride[]>([]);
  const [addingFacility, setAddingFacility] = useState<{ facilityId: string; cap: number } | null>(null);
  const [addingStaff, setAddingStaff] = useState<{ staffUserId: string; cap: number } | null>(null);
  const [saving, setSaving] = useState(false);
  // Batch 574 (Pete, Oct 15): when the lab's screening day starts (a night shift on one date).
  const [dayStartDraft, setDayStartDraft] = useState(0);
  const [savedDayStart, setSavedDayStart] = useState(0);
  const [dayStartError, setDayStartError] = useState<'notPermitted' | 'failed' | null>(null);
  // Batch 576: a cap outside 1–100 (or not saved) is said, not silently dropped. Batch 578: beside the field
  // it belongs to (enterprise, facility or staff), which alone is marked invalid and points to it.
  const [capError, setCapError] = useState<CytologyWorkloadCapError | null>(null);
  const capFailed = (tier: CytologyWorkloadCapTier, r: { ok: boolean; error?: string }) => {
    const e = cytologyWorkloadCapError(tier, r);
    setCapError(prev => e ?? (prev?.tier === tier ? null : prev));
    return e !== null;
  };
  // Editing or cancelling at one tier clears that tier's message only.
  const clearCapError = (tier: CytologyWorkloadCapTier) => setCapError(prev => (prev?.tier === tier ? null : prev));
  const capInvalid = (tier: CytologyWorkloadCapTier) => (capError?.tier === tier && capError.code === 'capOutOfRange') || undefined;
  const capDescribedBy = (tier: CytologyWorkloadCapTier) => (capError?.tier === tier ? `ps-cyto-cap-error-${tier}` : undefined);
  const capErrorText = (tier: CytologyWorkloadCapTier) => capError?.tier === tier && (
    <p id={`ps-cyto-cap-error-${tier}`} className="ps-conf-error-text" role="alert">{t(`cytologyWorkloadCapSettingsSection.errors.${capError.code}`)}</p>
  );
  const { user } = useAuth();
  // PS-128 (Batch 437): unsaved changes keep you from leaving without a warning.
  useReportConfigDirty(enterpriseDraft !== savedEnterprise || dayStartDraft !== savedDayStart || addingFacility !== null || addingStaff !== null);

  const refresh = () => {
    cytologyWorkloadCapSettingsService.get().then(r => {
      if (!r.ok) return;
      setEnterpriseDraft(r.data.dailySlideCap); setSavedEnterprise(r.data.dailySlideCap);
      setDayStartDraft(r.data.screeningDayStartHour ?? 0); setSavedDayStart(r.data.screeningDayStartHour ?? 0);
    });
    // Batch 578: each list is set together with its overrides, so the add pickers never offer, even for a
    // moment, someone who already has one.
    facilityService.getAll().then(async r => {
      if (!r.ok) return;
      const overrides = await Promise.all(r.data.map(f => facilityCytologyWorkloadCapOverrideService.getForFacility(f.id)));
      setFacilities(r.data);
      setFacilityOverrides(overrides.filter((o): o is { ok: true; data: FacilityCytologyWorkloadCapOverride } => o.ok && !!o.data).map(o => o.data));
    });
    userService.getAll().then(async r => {
      if (!r.ok) return;
      const overrides = await Promise.all(r.data.map(u => staffCytologyWorkloadCapOverrideService.getForStaff(u.id)));
      setStaff(r.data);
      setStaffOverrides(overrides.filter((o): o is { ok: true; data: StaffCytologyWorkloadCapOverride } => o.ok && !!o.data).map(o => o.data));
    });
  };

  useEffect(() => { refresh(); }, []);

  const saveDayStart = async () => {
    if (!user) return;
    setSaving(true);
    const result = await saveScreeningDayStart(dayStartDraft, user, screeningDayStartSaveDeps);
    setSaving(false);
    // A refused or failed save keeps the choice on screen and says so; otherwise read back what was saved.
    if (result === 'notPermitted' || result === 'failed') { setDayStartError(result); return; }
    setDayStartError(null);
    refresh();
  };

  const saveEnterprise = async () => {
    setSaving(true);
    const r = await cytologyWorkloadCapSettingsService.update({ dailySlideCap: enterpriseDraft });
    setSaving(false);
    if (capFailed('enterprise', r)) return;
    refresh();
  };

  // Batch 578: the add pickers offer only facilities and staff without an override (a second is refused).
  const facilitiesToAdd = withoutCapOverride(facilities, facilityOverrides.map(o => o.facilityId));
  const staffToAdd = withoutCapOverride(staff, staffOverrides.map(o => o.staffUserId));

  const facilityName = (id: string) => facilities.find(f => f.id === id)?.name ?? id;
  const staffName = (id: string) => { const s = staff.find(s => s.id === id); return s ? `${s.firstName} ${s.lastName}` : id; };

  return (
    <div className="ps-conf-page">
      <h2 className="ps-conf-section-title">{t('cytologyWorkloadCapSettingsSection.title')}</h2>
      <p className="ps-conf-section-subtitle ps-conf-section-subtitle--spaced">
        {t('cytologyWorkloadCapSettingsSection.subtitle')}
      </p>

      {/* Tier 1 — Enterprise */}
      <div className="ps-conf-card ps-conf-card--spaced">
        <div className="ps-conf-card-title">{t('cytologyQcSettingsSection.enterprise.title')}</div>
        <div className="ps-conf-row-actions">
          <input aria-label={t('cytologyQcSettingsSection.enterprise.title')} className="ps-conf-input" type="number" min={1} max={100} step={1} value={enterpriseDraft} onChange={e => { setEnterpriseDraft(Number(e.target.value)); clearCapError('enterprise'); }} aria-invalid={capInvalid('enterprise')} aria-describedby={capDescribedBy('enterprise')} />
          <span className="ps-conf-value">{t('cytologyWorkloadCapSettingsSection.unitLabel')}</span>
          <button className="ps-conf-btn-primary" onClick={saveEnterprise} disabled={saving}>{t('common.save')}</button>
        </div>
        {capErrorText('enterprise')}
        {enterpriseDraft !== savedEnterprise && <div className="ps-conf-saving-indicator">{t('cytologyQcSettingsSection.enterprise.unsavedChange')}</div>}
      </div>

      {/* Batch 574: when the screening day starts (each facility's own local time). */}
      <div className="ps-conf-card ps-conf-card--spaced">
        <div className="ps-conf-card-title" id="ps-cyto-day-start-title">{t('cytologyWorkloadCapSettingsSection.dayStart.title')}</div>
        <div className="ps-conf-card-description--tight">{t('cytologyWorkloadCapSettingsSection.dayStart.hint')}</div>
        <div className="ps-conf-row-actions">
          <select aria-labelledby="ps-cyto-day-start-title" className="ps-conf-select" value={dayStartDraft} onChange={e => setDayStartDraft(Number(e.target.value))}>
            {DAY_START_HOURS.map(h => <option key={h} value={h}>{formatHourOfDay(h, i18n.language)}</option>)}
          </select>
          <button className="ps-conf-btn-primary" onClick={saveDayStart} disabled={saving}>{t('common.save')}</button>
        </div>
        {dayStartDraft !== savedDayStart && <div className="ps-conf-saving-indicator">{t('cytologyWorkloadCapSettingsSection.dayStart.fromNowOn')}</div>}
        {dayStartError && <p className="ps-conf-error-text" role="alert">{t(`cytologyWorkloadCapSettingsSection.dayStart.errors.${dayStartError}`)}</p>}
      </div>

      {/* Tier 2 — Facility overrides */}
      <div className="ps-conf-card ps-conf-card--spaced">
        <div className="ps-conf-row">
          <div className="ps-conf-card-title">{t('cytologyQcSettingsSection.facility.title')}</div>
          {!addingFacility && (
            <button className="ps-conf-btn-secondary" disabled={facilitiesToAdd.length === 0} aria-describedby={facilitiesToAdd.length === 0 && facilities.length > 0 ? 'ps-cyto-cap-facility-none-left' : undefined}
              onClick={() => { clearCapError('facility'); setAddingFacility({ facilityId: facilitiesToAdd[0]?.id ?? '', cap: enterpriseDraft }); }}>{t('cytologyQcSettingsSection.addOverrideBtn')}</button>
          )}
        </div>

        {facilityOverrides.map(o => (
          <div key={o.id} className="ps-conf-row">
            <span className="ps-conf-value">{facilityName(o.facilityId)}</span>
            <div className="ps-conf-row-actions">
              <span className="ps-conf-value">{o.overrides.dailySlideCap != null ? t('cytologyWorkloadCapSettingsSection.unitSuffix', { count: o.overrides.dailySlideCap }) : '—'}</span>
              <button className="ps-conf-btn-secondary" onClick={async () => { await facilityCytologyWorkloadCapOverrideService.remove(o.facilityId); refresh(); }}>{t('common.remove')}</button>
            </div>
          </div>
        ))}
        {facilityOverrides.length === 0 && !addingFacility && (
          <div className="ps-conf-empty-row">{t('cytologyQcSettingsSection.facility.emptyState')}</div>
        )}
        {facilitiesToAdd.length === 0 && facilities.length > 0 && !addingFacility && (
          <div className="ps-conf-card-description--tight" id="ps-cyto-cap-facility-none-left">{t('cytologyWorkloadCapSettingsSection.allFacilitiesHaveOverride')}</div>
        )}

        {addingFacility && (
          <div className="ps-conf-row">
            <select aria-label={t('a11y.fields.facility')} className="ps-conf-select" value={addingFacility.facilityId} onChange={e => setAddingFacility({ ...addingFacility, facilityId: e.target.value })}>
              {facilitiesToAdd.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <div className="ps-conf-row-actions">
              <input aria-label={t('a11y.fields.dailyCap')} className="ps-conf-input" type="number" min={1} max={100} step={1} value={addingFacility.cap} onChange={e => { setAddingFacility({ ...addingFacility, cap: Number(e.target.value) }); clearCapError('facility'); }} aria-invalid={capInvalid('facility')} aria-describedby={capDescribedBy('facility')} />
              <button className="ps-conf-btn-primary" onClick={async () => {
                const r = await facilityCytologyWorkloadCapOverrideService.create(addingFacility.facilityId, { dailySlideCap: addingFacility.cap });
                if (capFailed('facility', r)) return;
                setAddingFacility(null); refresh();
              }}>{t('common.save')}</button>
              <button className="ps-conf-btn-secondary" onClick={() => { setAddingFacility(null); clearCapError('facility'); }}>{t('common.cancel')}</button>
            </div>
          </div>
        )}
        {addingFacility && capErrorText('facility')}
      </div>

      {/* Tier 3 — Staff overrides */}
      <div className="ps-conf-card ps-conf-card--spaced">
        <div className="ps-conf-row">
          <div className="ps-conf-card-title">{t('cytologyQcSettingsSection.staff.title')}</div>
          {!addingStaff && (
            <button className="ps-conf-btn-secondary" disabled={staffToAdd.length === 0} aria-describedby={staffToAdd.length === 0 && staff.length > 0 ? 'ps-cyto-cap-staff-none-left' : undefined}
              onClick={() => { clearCapError('staff'); setAddingStaff({ staffUserId: staffToAdd[0]?.id ?? '', cap: enterpriseDraft }); }}>{t('cytologyQcSettingsSection.addOverrideBtn')}</button>
          )}
        </div>
        <div className="ps-conf-card-description--tight">{t('cytologyWorkloadCapSettingsSection.staffHint')}</div>

        {staffOverrides.map(o => (
          <div key={o.id} className="ps-conf-row">
            <span className="ps-conf-value">{staffName(o.staffUserId)}</span>
            <div className="ps-conf-row-actions">
              <span className="ps-conf-value">{o.overrides.dailySlideCap != null ? t('cytologyWorkloadCapSettingsSection.unitSuffix', { count: o.overrides.dailySlideCap }) : '—'}</span>
              <button className="ps-conf-btn-secondary" onClick={async () => { await staffCytologyWorkloadCapOverrideService.remove(o.staffUserId); refresh(); }}>{t('common.remove')}</button>
            </div>
          </div>
        ))}
        {staffOverrides.length === 0 && !addingStaff && (
          <div className="ps-conf-empty-row">{t('cytologyQcSettingsSection.staff.emptyState')}</div>
        )}
        {staffToAdd.length === 0 && staff.length > 0 && !addingStaff && (
          <div className="ps-conf-card-description--tight" id="ps-cyto-cap-staff-none-left">{t('cytologyWorkloadCapSettingsSection.allStaffHaveOverride')}</div>
        )}

        {addingStaff && (
          <div className="ps-conf-row">
            <select aria-label={t('a11y.fields.staffMember')} className="ps-conf-select" value={addingStaff.staffUserId} onChange={e => setAddingStaff({ ...addingStaff, staffUserId: e.target.value })}>
              {staffToAdd.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
            </select>
            <div className="ps-conf-row-actions">
              <input aria-label={t('a11y.fields.dailyCap')} className="ps-conf-input" type="number" min={1} max={100} step={1} value={addingStaff.cap} onChange={e => { setAddingStaff({ ...addingStaff, cap: Number(e.target.value) }); clearCapError('staff'); }} aria-invalid={capInvalid('staff')} aria-describedby={capDescribedBy('staff')} />
              <button className="ps-conf-btn-primary" onClick={async () => {
                const r = await staffCytologyWorkloadCapOverrideService.create(addingStaff.staffUserId, { dailySlideCap: addingStaff.cap });
                if (capFailed('staff', r)) return;
                setAddingStaff(null); refresh();
              }}>{t('common.save')}</button>
              <button className="ps-conf-btn-secondary" onClick={() => { setAddingStaff(null); clearCapError('staff'); }}>{t('common.cancel')}</button>
            </div>
          </div>
        )}
        {addingStaff && capErrorText('staff')}
      </div>
    </div>
  );
};

export default CytologyWorkloadCapSettingsSection;
