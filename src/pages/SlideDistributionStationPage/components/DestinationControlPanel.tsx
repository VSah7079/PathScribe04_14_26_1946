// src/pages/SlideDistributionStationPage/components/DestinationControlPanel.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Real, per PS-286's own Right Panel (Action & Destination Controls):
// "Destination toggle (Physical Checkout vs. Digital Scanner
// Ingestion), Pathologist/Subspecialty quick-picker grid, Scanner/Rack
// selection controls." Also implements "Automatic Routing Logic:
// pre-populates default attending/primary reading service for Physical
// Checkout from the case's existing LIS assignment" — the parent
// passes the real, already-resolved default (Case.assignedTo/
// Case.subspecialtyId, via useSlideDistributionStation's own
// resolveDefaultRouting), applied here only as a starting point the
// tech can still override, never a silent, un-overridable auto-assign.
//
// Batch 402 (PS-359): both confirms take what they need from the
// organisation's Field Requirements (page "slideDistribution"). Required
// labels are starred, "Still required: …" says what is missing (a checkout
// always needs a pathologist, a pool or a location), and the button stays off
// until it is complete. "confirm checkout" (SLIDE_DIST_CONFIRM_PHYSICAL) and
// "confirm scanner" (SLIDE_DIST_CONFIRM_DIGITAL) by voice act exactly as the
// buttons do, and only for the destination on screen. The search filter moved
// to utils/slideDistributionOperations.ts; the doctor's title and the
// example placeholders are translated.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { actionRegistryService, slideCheckoutMissing, scannerLoadMissing, slideDistributionFieldRequired } from '@/services';
import type { ResolvedFieldRequirement } from '@/services/fieldRequirements/fieldRequirementRules';
import { filterRoutingDirectory } from '@/utils/slideDistributionOperations';
import { formatList } from '@/utils/formatList';
import type { StaffUser } from '@/services/users/IUserService';
import type { Subspecialty } from '@/services/subspecialties/ISubspecialtyService';
import type { Equipment } from '@/services/equipment/IEquipmentService';
import type { SlideQueueItem } from '../hooks/useSlideDistributionStation';
import type { PhysicalAssignment, ScannerAssignment } from '@/utils/slideDistributionOperations';

export type DestinationMode = 'physical' | 'digital';

export interface DestinationControlPanelProps {
  activeItem: SlideQueueItem | undefined;
  pathologists: StaffUser[];
  subspecialties: Subspecialty[];
  /** Batch 434: active slide scanners from the Equipment register. */
  scanners: Equipment[];
  defaultRouting: { pathologistId?: string; pathologistName?: string; subspecialtyId?: string };
  onAssignPhysical: (assignment: PhysicalAssignment) => void;
  onAssignScanner: (assignment: ScannerAssignment) => void;
  feedback: string | null;
  /** Real, per the header's own "Selected Destination Mode" context
   *  field — lifted to the page so the header can display it, rather
   *  than staying trapped as this panel's own local state. */
  mode: DestinationMode;
  onModeChange: (mode: DestinationMode) => void;
  requirements: readonly ResolvedFieldRequirement[];
}

const DestinationControlPanel: React.FC<DestinationControlPanelProps> = ({
  activeItem, pathologists, subspecialties, scanners, defaultRouting, onAssignPhysical, onAssignScanner, feedback, mode, onModeChange, requirements,
}) => {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState('');
  const [pathologistId, setPathologistId] = useState<string | undefined>(undefined);
  const [subspecialtyId, setSubspecialtyId] = useState<string | undefined>(undefined);
  const [slideFolderId, setSlideFolderId] = useState('');
  const [trayNumber, setTrayNumber] = useState('');
  const [courierBagId, setCourierBagId] = useState('');
  const [scannerInstrumentId, setScannerInstrumentId] = useState('');
  const [rackId, setRackId] = useState('');
  const [slotPosition, setSlotPosition] = useState('');

  // Real, per this file's own header — pre-fill from the real
  // case-level default the moment a NEW, not-yet-routed slide becomes
  // active; never overwrite a slide that's already been explicitly
  // routed, and never fight the tech's own in-progress edits on the
  // same slide (keyed on queueId, not on every render).
  useEffect(() => {
    if (!activeItem) return;
    setSearch(''); setSlideFolderId(''); setTrayNumber(''); setCourierBagId('');
    setScannerInstrumentId(''); setRackId(''); setSlotPosition('');
    if (activeItem.stain.distributionDestination === 'digital') {
      onModeChange('digital');
      setPathologistId(undefined); setSubspecialtyId(undefined);
    } else {
      onModeChange('physical');
      setPathologistId(activeItem.stain.assignedPathologistId ?? defaultRouting.pathologistId);
      setSubspecialtyId(activeItem.stain.assignedSubspecialtyId ?? defaultRouting.subspecialtyId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeItem?.queueId]);

  const { pathologists: filteredPathologists, subspecialties: filteredSubspecialties } = useMemo(
    () => filterRoutingDirectory(pathologists, subspecialties, search), [pathologists, subspecialties, search],
  );

  const physicalMissing = slideCheckoutMissing({ pathologistId, subspecialtyId, slideFolderId, trayNumber, courierBagId }, requirements);
  const digitalMissing = scannerLoadMissing({ scannerInstrumentId, rackId, slotPosition }, requirements);
  const missing = mode === 'physical' ? physicalMissing : digitalMissing;
  const star = (fieldId: string) => slideDistributionFieldRequired(requirements, fieldId) && <span className="ps-conf-required"> *</span>;

  const handleAssignPhysicalClick = () => {
    if (!activeItem || physicalMissing.length > 0) return;
    const pathologist = pathologists.find(p => p.id === pathologistId);
    onAssignPhysical({
      pathologistId, pathologistName: pathologist ? `${pathologist.firstName} ${pathologist.lastName}` : undefined,
      subspecialtyId, slideFolderId: slideFolderId || undefined, trayNumber: trayNumber || undefined, courierBagId: courierBagId || undefined,
    });
  };

  const handleAssignScannerClick = () => {
    if (!activeItem || digitalMissing.length > 0) return;
    onAssignScanner({ scannerInstrumentId: scannerInstrumentId || undefined, rackId: rackId || undefined, slotPosition: slotPosition || undefined });
  };

  const voiceRef = useRef({ mode, physical: handleAssignPhysicalClick, digital: handleAssignScannerClick });
  voiceRef.current = { mode, physical: handleAssignPhysicalClick, digital: handleAssignScannerClick };
  useEffect(() => actionRegistryService.onAction((actionId: string) => {
    const v = voiceRef.current;
    if (actionId === 'SLIDE_DIST_CONFIRM_PHYSICAL' && v.mode === 'physical') v.physical();
    if (actionId === 'SLIDE_DIST_CONFIRM_DIGITAL' && v.mode === 'digital') v.digital();
  }), []);

  if (!activeItem) {
    return <div className="ps-slidedist-panel"><div className="ps-slidedist-empty">{t('slideDistribution.destination.selectFirst')}</div></div>;
  }

  const handlePathologistPick = (id: string) => { setPathologistId(prev => prev === id ? undefined : id); setSubspecialtyId(undefined); };
  const handleSubspecialtyPick = (id: string) => { setSubspecialtyId(prev => prev === id ? undefined : id); setPathologistId(undefined); };

  return (
    <div>
      <div className="ps-slidedist-panel ps-mb-14">
        <p className="ps-slidedist-panel-title">{t('slideDistribution.destination.title')}</p>
        <div className="ps-slidedist-destination-toggle">
          <button type="button" className={`ps-slidedist-toggle-btn${mode === 'physical' ? ' ps-slidedist-toggle-btn--active' : ''}`} onClick={() => onModeChange('physical')}>
            {t('slideDistribution.destination.physical')}
          </button>
          <button type="button" className={`ps-slidedist-toggle-btn${mode === 'digital' ? ' ps-slidedist-toggle-btn--active' : ''}`} onClick={() => onModeChange('digital')}>
            {t('slideDistribution.destination.digital')}
          </button>
        </div>

        {mode === 'physical' ? (
          <>
            <p className="ps-slidedist-field-label">{t('slideDistribution.destination.recipient')}{star('readingPathologist')}</p>
            <input
              type="text" className="ps-slidedist-search-input" value={search} onChange={e => setSearch(e.target.value)}
              placeholder={t('slideDistribution.destination.searchPlaceholder') ?? ''}
            />
            <div className="ps-slidedist-picker-grid">
              {filteredPathologists.map(p => (
                <button
                  key={p.id} type="button"
                  className={`ps-slidedist-picker-chip${pathologistId === p.id ? ' ps-slidedist-picker-chip--active' : ''}`}
                  onClick={() => handlePathologistPick(p.id)}
                >
                  {t('slideDistribution.destination.doctorName', { name: p.lastName })}
                </button>
              ))}
              {filteredSubspecialties.map(s => (
                <button
                  key={s.id} type="button"
                  className={`ps-slidedist-picker-chip${subspecialtyId === s.id ? ' ps-slidedist-picker-chip--active' : ''}`}
                  onClick={() => handleSubspecialtyPick(s.id)}
                >
                  {s.name}
                </button>
              ))}
            </div>

            <label className="ps-slidedist-field-label" htmlFor="slidedist-folder">{t('slideDistribution.destination.slideFolderId')}{star('slideFolderId')}</label>
            <input id="slidedist-folder" type="text" className="ps-slidedist-field-input" value={slideFolderId} onChange={e => setSlideFolderId(e.target.value)} />
            <label className="ps-slidedist-field-label" htmlFor="slidedist-tray">{t('slideDistribution.destination.trayNumber')}{star('trayNumber')}</label>
            <input id="slidedist-tray" type="text" className="ps-slidedist-field-input" value={trayNumber} onChange={e => setTrayNumber(e.target.value)} />
            <label className="ps-slidedist-field-label" htmlFor="slidedist-courier">{t('slideDistribution.destination.courierBagId')}{star('courierBagId')}</label>
            <input id="slidedist-courier" type="text" className="ps-slidedist-field-input" value={courierBagId} onChange={e => setCourierBagId(e.target.value)} />

            <button type="button" className="ps-btn-primary" onClick={handleAssignPhysicalClick} disabled={physicalMissing.length > 0}>
              ✅ {t('slideDistribution.destination.confirmPhysical')}
            </button>
          </>
        ) : (
          <>
            <label className="ps-slidedist-field-label" htmlFor="slidedist-scanner">{t('slideDistribution.destination.scannerInstrument')}{star('scannerInstrument')}</label>
            {/* Batch 434: a slide scanner from the Equipment register (was free text). */}
            <select id="slidedist-scanner" className="ps-slidedist-field-input" value={scannerInstrumentId} onChange={e => setScannerInstrumentId(e.target.value)}>
              <option value="">{t('slideDistribution.destination.selectScanner')}</option>
              {scanners.map(sc => <option key={sc.code} value={sc.code}>{sc.name}</option>)}
            </select>
            {scanners.length === 0 && <p className="ps-billing-reason-hint">{t('slideDistribution.destination.noScanners')}</p>}
            <label className="ps-slidedist-field-label" htmlFor="slidedist-rack">{t('slideDistribution.destination.rackId')}{star('rackId')}</label>
            <input id="slidedist-rack" type="text" className="ps-slidedist-field-input" value={rackId} onChange={e => setRackId(e.target.value)} placeholder={t('slideDistribution.destination.rackPlaceholder') ?? ''} />
            <label className="ps-slidedist-field-label" htmlFor="slidedist-slot">{t('slideDistribution.destination.slotPosition')}{star('slotPosition')}</label>
            <input id="slidedist-slot" type="text" className="ps-slidedist-field-input" value={slotPosition} onChange={e => setSlotPosition(e.target.value)} placeholder={t('slideDistribution.destination.slotPlaceholder') ?? ''} />

            <button type="button" className="ps-btn-primary" onClick={handleAssignScannerClick} disabled={digitalMissing.length > 0}>
              ✅ {t('slideDistribution.destination.confirmDigital')}
            </button>
          </>
        )}
        {missing.length > 0 && (
          <p className="ps-field-still-required" role="status">
            {t('fieldRequirements.stillRequired', { fields: formatList(missing.map(id => t(`fieldRequirements.fields.slideDistribution.${id}`)), i18n.language) })}
          </p>
        )}
        {feedback && <div className="ps-slidedist-scan-error ps-mt-8">{feedback}</div>}
      </div>
    </div>
  );
};

export default DestinationControlPanel;
