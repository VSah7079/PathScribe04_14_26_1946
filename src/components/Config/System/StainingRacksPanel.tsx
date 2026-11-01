// src/components/Config/System/StainingRacksPanel.tsx
// Batch 737 (Lab Workflow & Batch spec §11.1): Configuration → System → Equipment, the lab's reusable staining racks
// (RACK-…), each with "Takes large-format slides". A large-format slide (from a megablock) is refused by a staining
// carrier that does not take it (services/batches: slideFitsCarrier). Saves at once; config:equipment:manage is
// checked by the rack registry service.
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { hardwareContainerRegistryService } from '@/services/hardwareContainers/hardwareContainerRegistryServiceInstance';
import type { HardwareContainer } from '@/services/hardwareContainers/IHardwareContainerRegistryService';

const StainingRacksPanel: React.FC = () => {
  const { t } = useTranslation();
  const [racks, setRacks] = useState<HardwareContainer[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    const r = await hardwareContainerRegistryService.getAll();
    if (r.ok) setRacks(r.data.filter(c => c.containerType === 'Staining Rack'));
  }, []);
  useEffect(() => { void load(); }, [load]);

  const toggle = async (rack: HardwareContainer, value: boolean) => {
    setBusy(rack.id); setError(false);
    const r = await hardwareContainerRegistryService.update(rack.id, { supportsLargeFormat: value });
    setBusy(null);
    if (!r.ok) setError(true);
    await load();
  };

  if (racks.length === 0) return null;
  return (
    <div className="ps-conf-card ps-conf-card--spaced">
      <div className="ps-conf-card-title">{t('equipmentSection.racks.title')}</div>
      <p className="ps-specreq-meta">{t('equipmentSection.racks.subtitle')}</p>
      {error && <p className="ps-conf-error" role="alert">{t('equipmentSection.racks.notSaved')}</p>}
      <div className="ps-conf-table-wrap">
        <table className="ps-conf-table">
          <thead><tr>
            <th className="ps-conf-th">{t('equipmentSection.racks.rack')}</th>
            <th className="ps-conf-th">{t('equipmentSection.racks.largeFormat')}</th>
          </tr></thead>
          <tbody>
            {racks.map(rack => (
              <tr key={rack.id} className="ps-conf-tr">
                <td className="ps-conf-td"><code>{rack.rackId}</code></td>
                <td className="ps-conf-td">
                  <label className="ps-conf-checkbox-row">
                    <input type="checkbox" checked={!!rack.supportsLargeFormat} disabled={busy === rack.id}
                      aria-label={t('equipmentSection.racks.largeFormatAria', { rack: rack.rackId })}
                      onChange={e => { void toggle(rack, e.target.checked); }} />
                    {t('equipmentSection.racks.largeFormatLabel')}
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StainingRacksPanel;
