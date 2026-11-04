// src/pages/CytologyPrepStationPage/components/CellBlockHandoffPanel.tsx
// Batch 740 (Pete, fluid decision 1): the specimen's cell blocks at the Cytology Preparation bench. Make one from the
// fluid on the bench, and hand one off to histology with two scans: its source (the fluid or aliquot it was made
// from) and then its own cassette. Only a handed-off cell block is taken at the Microtome.
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Decant } from '@/types/case/Material';
import { StationScanField } from '@/components/Workstation/StationScanField';
import { formatDateTime } from '@/utils/formatDate';
import type { HandoffMessage } from '../hooks/useCellBlockHandoff';

export interface CellBlockHandoffPanelProps {
  specimenLabel: string;
  cellBlocks: Decant[];
  canMake: boolean;
  busy: boolean;
  message: HandoffMessage | null;
  onMake: () => void;
  onHandOff: (cellBlockId: string, scans: { source: string; cassette: string }) => void;
  onPrintLabel: (cellBlock: Decant) => void;
}

const K = 'cytologyPrep.handoff';

const CellBlockHandoffPanel: React.FC<CellBlockHandoffPanelProps> = ({ specimenLabel, cellBlocks, canMake, busy, message, onMake, onHandOff, onPrintLabel }) => {
  const { t, i18n } = useTranslation();
  const [active, setActive] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const start = (id: string) => { setActive(id); setSource(null); };

  return (
    <div className="ps-microtomy-panel ps-mb-14">
      <p className="ps-microtomy-panel-title">{t(`${K}.title`)}</p>
      <p className="ps-cytoprep-note">{t(`${K}.intro`)}</p>
      {canMake && (
        <button type="button" className="ps-btn-secondary ps-cytoprep-make" disabled={busy} onClick={onMake}>{t(`${K}.make`)}</button>
      )}
      {message && (
        <p className={message.kind === 'ok' ? 'ps-cytoprep-ok' : 'ps-cytoprep-error'} role={message.kind === 'ok' ? 'status' : 'alert'}>
          {message.kind === 'ok' ? t(`${K}.done.${message.key}`, { label: message.label }) : t(`${K}.problem.${message.key}`)}
        </p>
      )}
      {cellBlocks.length === 0 ? <p className="ps-cytoprep-note">{t(`${K}.none`)}</p> : (
        <ul className="ps-cytoprep-list">
          {cellBlocks.map(cb => (
            <li key={cb.id} className="ps-cytoprep-row">
              <span className="ps-cytoprep-label">{t(`${K}.cellBlock`, { label: `${specimenLabel}${cb.label}` })}</span>
              {cb.handoff ? (
                <span className="ps-cytoprep-ok">{t(`${K}.handedOffBy`, { name: cb.handoff.byName, when: formatDateTime(cb.handoff.at, i18n.language) })}</span>
              ) : active === cb.id ? (
                <span className="ps-cytoprep-steps">
                  {source === null ? (
                    <StationScanField keepFocus onScan={v => setSource(v)} placeholder={t(`${K}.scanSource`)} submitLabel={t(`${K}.next`)} compact />
                  ) : (
                    <StationScanField keepFocus onScan={v => { onHandOff(cb.id, { source, cassette: v }); setActive(null); setSource(null); }} placeholder={t(`${K}.scanCassette`)} submitLabel={t(`${K}.confirm`)} compact />
                  )}
                  <button type="button" className="ps-btn-secondary" onClick={() => setActive(null)}>{t('common.cancel')}</button>
                </span>
              ) : (
                <span className="ps-cytoprep-steps">
                  <span className="ps-cytoprep-waiting">{t(`${K}.waiting`)}</span>
                  <button type="button" className="ps-btn-secondary" onClick={() => onPrintLabel(cb)}>{t(`${K}.printLabel`)}</button>
                  <button type="button" className="ps-btn-primary" disabled={busy} onClick={() => start(cb.id)}>{t(`${K}.start`)}</button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CellBlockHandoffPanel;
