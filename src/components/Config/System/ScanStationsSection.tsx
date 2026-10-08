// src/components/Config/System/ScanStationsSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Real feature, per direct follow-up: "Admin config screen for
// stations. You said 'not yet' earlier — still true. Only the 8
// seeded stations exist; nobody can rename or add one without editing
// source." Same real table+modal pattern as ContainerTypesSection —
// full create/edit, deactivate rather than delete, not a fixed list.
// The service layer (services/scanStations/) already had full CRUD
// built and unused since the station-tracking work earlier this
// session; this is that CRUD's real, missing UI.
// ─────────────────────────────────────────────────────────────────────────────
//
// Batch 444: translated (the scanStationsSection keys already existed in all
// five languages but the screen never used them), reached through
// `@/services` instead of the mock service, and the list filter moved to
// services/scanStations/scanStationList.ts.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import '../../../pathscribe.css';
import { printStationLabel, printAllStationLabels } from '../../../utils/labels/printStationLabels';
import {
  printerProfileService, scanStationService, SCAN_STATION_WORKFLOW_STAGES, filterScanStations, activeScanStations,
  workflowStageKey, validateScanStationDraft,
  type ScanStation, type ScanStationStatusFilter, type ScanStationDraftValidationErrors, type PrinterProfile, type Facility,
} from '@/services';
import { getActivePerformingLabs } from '../../../utils/performingLabs';

const K = 'scanStationsSection';

// ─── Modal ────────────────────────────────────────────────────────────────────
type Draft = Omit<ScanStation, 'id' | 'status' | 'createdAt' | 'updatedAt'> & { active: boolean };

const emptyDraft: Draft = {
  // Real fix, per direct guidance: was 'lab-main' — a fake, hardcoded
  // default that doesn't correspond to any real Facility record and
  // let the free-text field always trivially validate. A scan
  // station's own facilityId is a real reference (see
  // IScanStationService.ts's own doc comment — "same real,
  // established scoping as Location.facilityId"), so an unselected
  // default has to be genuinely empty, not a plausible-looking string
  // standing in for a real choice.
  name: '', barcodeCode: '', facilityId: '', workflowStage: SCAN_STATION_WORKFLOW_STAGES[0], active: true, printerIp: '',
  supportsEngraving: false, supportsPrinting: false, cassetteSlidePrinterProfileId: '',
};

interface ScanStationModalProps {
  mode: 'add' | 'edit';
  station?: ScanStation;
  labs: Facility[];
  defaultFacilityId?: string;
  onSave: (draft: Draft) => void;
  onClose: () => void;
}

const ScanStationModal: React.FC<ScanStationModalProps> = ({ mode, station, labs, defaultFacilityId, onSave, onClose }) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Draft>(
    station
      ? { ...station, active: station.status !== 'Inactive' }
      : { ...emptyDraft, facilityId: defaultFacilityId ?? emptyDraft.facilityId }
  );
  const [errors, setErrors] = useState<ScanStationDraftValidationErrors>({});
  const [printerProfiles, setPrinterProfiles] = useState<PrinterProfile[]>([]);

  useEffect(() => {
    printerProfileService.getAll().then(res => { if (res.ok) setPrinterProfiles(res.data); });
  }, []);

  const set = (k: keyof Draft, v: any) => { setDraft(prev => ({ ...prev, [k]: v })); setErrors(prev => ({ ...prev, [k]: undefined })); };

  // Real fix, per direct reminder: "no business logic in the UI
  // code." The real validation rules now live in
  // validateScanStationDraft.ts — this component only calls it.
  const validate = () => validateScanStationDraft(draft);

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    onSave(draft);
  };

  return (
    <div className="ps-ms-overlay">
      <div className="ps-ms-modal">
        <div className="ps-ms-header">
          {mode === 'add' ? t(`${K}.modal.addTitle`) : t(`${K}.modal.editTitle`, { name: station?.name ?? '' })}
        </div>

        <div className="ps-ms-body">
          <div className="ps-conf-form-field">
            <label className="ps-conf-label">{t(`${K}.modal.nameLabel`)} <span className="ps-conf-required">*</span></label>
            <input className={`ps-conf-input ${errors.name ? 'ps-conf-input--error' : ''}`}
              value={draft.name} onChange={e => set('name', e.target.value)} placeholder={t(`${K}.modal.namePlaceholder`)} />
            {errors.name && <span className="ps-conf-error-text">{t(`${K}.errors.${errors.name}`)}</span>}
          </div>

          <div className="ps-conf-form-field">
            <label className="ps-conf-label">{t(`${K}.modal.barcodeCodeLabel`)} <span className="ps-conf-required">*</span></label>
            <input className={`ps-conf-input ${errors.barcodeCode ? 'ps-conf-input--error' : ''}`}
              value={draft.barcodeCode} onChange={e => set('barcodeCode', e.target.value.toUpperCase())} placeholder={t(`${K}.modal.barcodeCodePlaceholder`)} />
            {errors.barcodeCode ? (
              <span className="ps-conf-error-text">{t(`${K}.errors.${errors.barcodeCode}`)}</span>
            ) : (
              <span className="ps-conf-field-hint">{t(`${K}.modal.barcodeHint`, { code: draft.barcodeCode || '…' })}</span>
            )}
          </div>

          <div className="ps-conf-form-field">
            <label className="ps-conf-label" htmlFor="station-workflow-stage">{t(`${K}.modal.workflowStageLabel`)}</label>
            <select id="station-workflow-stage" className="ps-conf-select" value={draft.workflowStage} onChange={e => set('workflowStage', e.target.value)}>
              {SCAN_STATION_WORKFLOW_STAGES.map(stage => <option key={stage} value={stage}>{t(`${K}.stages.${workflowStageKey(stage)}`)}</option>)}
            </select>
          </div>

          {/* Real feature, per direct follow-up: "network printer IP
              assignment per station." Optional — most stations don't
              have a real, directly-attached label printer; a real
              printerIp is what dispatchContainerLabelPrint.ts uses as
              its own real target once a batch created at this station
              actually prints. */}
          <div className="ps-conf-form-field">
            <label className="ps-conf-label">{t(`${K}.modal.printerIpLabel`)}</label>
            <input className="ps-conf-input" value={draft.printerIp ?? ''} onChange={e => set('printerIp', e.target.value)} placeholder={t(`${K}.modal.printerIpPlaceholder`)} />
            <span className="ps-conf-field-hint">{t(`${K}.modal.printerIpHint`)}</span>
          </div>

          {/* Real feature, per direct follow-up: "I would like to
              support both slide engraving and printed labels."
              Deliberately two independent toggles, not a single
              choice — a station can support neither, either, or
              both. dispatchCassetteLabel.ts/dispatchSlideLabel.ts's
              own real engraver-stub dispatch remains genuinely
              correct for supportsEngraving; supportsPrinting is the
              new, real, parallel path via this station's own
              cassetteSlidePrinterProfileId. */}
          <div className="ps-conf-form-row">
            <div className="ps-conf-form-field">
              <label className="ps-conf-label" title={t(`${K}.modal.supportsEngravingTooltip`)}>
                {t(`${K}.modal.supportsEngravingLabel`)}
              </label>
              <div className="ps-conf-toggle-row">
                <div onClick={() => set('supportsEngraving', !draft.supportsEngraving)} className={`ps-conf-toggle-track ${draft.supportsEngraving ? 'ps-conf-toggle-track--active' : ''}`}>
                  <div className="ps-conf-toggle-thumb" />
                </div>
              </div>
            </div>
            <div className="ps-conf-form-field">
              <label className="ps-conf-label" title={t(`${K}.modal.supportsPrintingTooltip`)}>
                {t(`${K}.modal.supportsPrintingLabel`)}
              </label>
              <div className="ps-conf-toggle-row">
                <div onClick={() => set('supportsPrinting', !draft.supportsPrinting)} className={`ps-conf-toggle-track ${draft.supportsPrinting ? 'ps-conf-toggle-track--active' : ''}`}>
                  <div className="ps-conf-toggle-thumb" />
                </div>
              </div>
            </div>
          </div>

          {draft.supportsPrinting && (
            <div className="ps-conf-form-field">
              <label className="ps-conf-label">{t(`${K}.modal.printerProfileLabel`)} <span className="ps-conf-required">*</span></label>
              <select className={`ps-conf-select ${errors.cassetteSlidePrinterProfileId ? 'ps-conf-input--error' : ''}`} value={draft.cassetteSlidePrinterProfileId ?? ''} onChange={e => set('cassetteSlidePrinterProfileId', e.target.value)}>
                <option value="">{t(`${K}.modal.printerProfileNoneOption`)}</option>
                {printerProfiles.map(p => <option key={p.id} value={p.id}>{p.printerId} ({p.model})</option>)}
              </select>
              {errors.cassetteSlidePrinterProfileId ? (
                <span className="ps-conf-error-text">{t(`${K}.errors.${errors.cassetteSlidePrinterProfileId}`)}</span>
              ) : (
                <span className="ps-conf-field-hint">{t(`${K}.modal.printerProfileHint`)}</span>
              )}
            </div>
          )}

          <div className="ps-conf-form-field">
            <label className="ps-conf-label">{t(`${K}.modal.facilityLabel`)} <span className="ps-conf-required">*</span></label>
            <select className={`ps-conf-select ${errors.facilityId ? 'ps-conf-input--error' : ''}`}
              value={draft.facilityId} onChange={e => set('facilityId', e.target.value)}>
              <option value="">{t(`${K}.modal.facilityNoneOption`)}</option>
              {labs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            {errors.facilityId && <span className="ps-conf-error-text">{t(`${K}.errors.${errors.facilityId}`)}</span>}
            <span className="ps-conf-field-hint">{t(`${K}.modal.facilityHint`)}</span>
          </div>

          <div className="ps-conf-form-field">
            <label className="ps-conf-label">{t(`${K}.modal.statusLabel`)}</label>
            <div className="ps-conf-toggle-row">
              <div onClick={() => set('active', !draft.active)} className={`ps-conf-toggle-track ${draft.active ? 'ps-conf-toggle-track--active' : ''}`}>
                <div className="ps-conf-toggle-thumb" />
              </div>
              <span className={`ps-conf-toggle-label ${draft.active ? 'ps-conf-toggle-label--active' : ''}`}>{draft.active ? t('common.active') : t('common.inactive')}</span>
            </div>
          </div>
        </div>

        <div className="ps-ms-footer">
          <button className="ps-ms-btn-cancel" onClick={onClose}>{t('common.cancel')}</button>
          <button className="ps-ms-btn-apply" onClick={handleSave}>
            {mode === 'add' ? t(`${K}.modal.addButton`) : t(`${K}.modal.saveChangesButton`)}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main ScanStationsSection ───────────────────────────────────────────────────
const ScanStationsSection: React.FC<{ selectedFacilityId?: string }> = ({ selectedFacilityId }) => {
  const { t } = useTranslation();
  const [stations,     setStations]     = useState<ScanStation[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState<ScanStationStatusFilter>('All');
  const [modal,        setModal]        = useState<{ mode: 'add' | 'edit'; station?: ScanStation } | null>(null);
  // Real fix, per direct guidance: a scan station's own facility is a
  // real, existing performing lab (see IScanStationService.ts's own
  // ScanStation.facilityId doc comment) — loaded here from the real
  // registry, same shared utility every other lab-scoped dictionary in
  // this app already uses, not free text an admin has to type
  // correctly by hand.
  const [labs, setLabs] = useState<Facility[]>([]);

  useEffect(() => {
    scanStationService.getAll().then(res => {
      if (res.ok) setStations(res.data);
      setLoading(false);
    });
    getActivePerformingLabs().then(setLabs);
  }, []);

  const filtered = useMemo(
    () => filterScanStations(stations, { search, status: statusFilter, facilityId: selectedFacilityId }),
    [stations, search, statusFilter, selectedFacilityId],
  );
  const active = useMemo(() => activeScanStations(stations), [stations]);
  const stageLabel = (stage?: string) => {
    const key = workflowStageKey(stage);
    return key ? t(`${K}.stages.${key}`) : (stage || '—');
  };

  const handleSave = async (draft: Draft) => {
    const { active, ...rest } = draft;
    const payload = { ...rest, status: (active ? 'Active' : 'Inactive') as 'Active' | 'Inactive' };
    if (modal?.mode === 'add') {
      const res = await scanStationService.create(payload);
      if (res.ok) setStations(prev => [...prev, res.data]);
    } else if (modal?.station) {
      const res = await scanStationService.update(modal.station.id, payload);
      if (res.ok) setStations(prev => prev.map(s => s.id === res.data.id ? res.data : s));
    }
    setModal(null);
  };

  const handleToggleStatus = async (s: ScanStation) => {
    const res = s.status === 'Active' ? await scanStationService.deactivate(s.id) : await scanStationService.reactivate(s.id);
    if (res.ok) setStations(prev => prev.map(x => x.id === s.id ? res.data : x));
  };

  if (loading) return <div className="ps-conf-loading">{t(`${K}.loading`)}</div>;

  return (
    <div>
      <div className="ps-conf-section-header">
        <div>
          <h3 className="ps-conf-section-title">{t(`${K}.title`)}</h3>
          <p className="ps-conf-section-subtitle">{t(`${K}.subtitle`)}</p>
        </div>
        <button className="ps-conf-btn-primary ps-conf-btn-primary--nowrap" onClick={() => setModal({ mode: 'add' })}>{t(`${K}.addStationButton`)}</button>
      </div>

      {/* Real feature, per direct follow-up: "Station barcode label
          generation itself... someone would have to hand-write
          STATION:GROSSING-03 on a barcode by some other means."
          Real, working print — same proven window.open()-based
          pipeline every other real label in this app already uses. */}
      <div className="ps-conf-form-row">
        <button
          className="ps-conf-btn-row"
          onClick={() => printAllStationLabels(active)}
          disabled={active.length === 0}
        >
          {t(`${K}.printAllButton`)}
        </button>
      </div>

      <div className="ps-conf-form-row">
        <input data-dirty-ignore data-config-nav type="text" placeholder={t(`${K}.searchPlaceholder`)} value={search} onChange={e => setSearch(e.target.value)}
          className="ps-conf-search" />
        <select data-dirty-ignore data-config-nav value={statusFilter} onChange={e => setStatusFilter(e.target.value as ScanStationStatusFilter)} className="ps-conf-select">
          <option value="All">{t(`${K}.statusFilterAll`)}</option>
          <option value="Active">{t('common.active')}</option>
          <option value="Inactive">{t('common.inactive')}</option>
        </select>
      </div>

      <div className="ps-conf-table-wrap">
        <div className="ps-conf-table-scroll">
          <table className="ps-conf-table">
            <thead className="ps-conf-thead-sticky">
              <tr>
                {(['station', 'barcodeCode', 'workflowStage', 'facility', 'status', 'actions'] as const).map(h => (
                  <th key={h} className="ps-conf-th">{t(`${K}.headers.${h}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} className="ps-conf-tr">
                  <td className="ps-conf-td">
                    <div className="ps-conf-identity-name">📍 {s.name}</div>
                  </td>
                  <td className="ps-conf-td"><code>STATION:{s.barcodeCode}</code></td>
                  <td className="ps-conf-td">{stageLabel(s.workflowStage)}</td>
                  <td className="ps-conf-td">{labs.find(l => l.id === s.facilityId)?.name ?? s.facilityId}</td>
                  <td className="ps-conf-td">
                    <div className="ps-conf-status-cell">
                      <span className={`ps-conf-status-dot ${s.status === 'Active' ? 'ps-conf-status-dot--active' : ''}`} />
                      <span className={`ps-conf-status-text ${s.status === 'Active' ? 'ps-conf-status-text--active' : ''}`}>{s.status === 'Active' ? t('common.active') : t('common.inactive')}</span>
                    </div>
                  </td>
                  <td className="ps-conf-td">
                    <div className="ps-conf-row-actions">
                      <button className="ps-conf-btn-row" onClick={() => printStationLabel(s)}>{t(`${K}.printLabelButton`)}</button>
                      <button className="ps-conf-btn-row" onClick={() => setModal({ mode: 'edit', station: s })}>{t('common.edit')}</button>
                      <button className="ps-conf-btn-row" onClick={() => handleToggleStatus(s)}>
                        {s.status === 'Active' ? t('common.deactivate') : t('common.reactivate')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td className="ps-conf-empty-row" colSpan={6}>{t(`${K}.emptyRow`)}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && <ScanStationModal mode={modal.mode} station={modal.station} labs={labs} defaultFacilityId={selectedFacilityId} onSave={handleSave} onClose={() => setModal(null)} />}
    </div>
  );
};

export default ScanStationsSection;
