// src/pages/BatchManagement/EquipmentServiceLogPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 429 (Pete: bench staff record maintenance and calibration). The
// equipment service log, reached from Batch Management so the bench roles
// (Histotechnologist, Cytotechnologist, Molecular Technologist), who can't
// open Configuration, can record what they did. Lists the active equipment
// with its service state and next due date; "Log entry" opens the same log as
// Configuration → System → Equipment. Recording needs
// equipment:maintenance:record (checked in the service; the button greys out
// without it). Adding or changing equipment stays in Configuration.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../../pathscribe.css';
import { equipmentService, equipmentLogService } from '@/services';
import type { Equipment, EquipmentLogEntry } from '@/services';
import { useSystemConfig } from '@/contexts/SystemConfigContext';
import { useAuth } from '@/contexts/AuthContext';
import { getFacilityIsoDate } from '@/utils/facilityTime';
import { formatCalendarDate } from '@/utils/search/caseSearchCsv';
import { earliestDue, equipmentServiceState, groupLogByEquipment, isServiceAlert } from '@/services/equipment/equipmentLogRules';
import { filterEquipment } from '@/services/equipment/equipmentRules';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import EquipmentLogModal from '@/components/Config/System/EquipmentLogModal';

const EquipmentServiceLogPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { config } = useSystemConfig();
  const { user } = useAuth();
  const today = getFacilityIsoDate(new Date(), config.facilityTimezone);
  const [items, setItems] = useState<Equipment[]>([]);
  const [entries, setEntries] = useState<EquipmentLogEntry[]>([]);
  const [logFor, setLogFor] = useState<Equipment | null>(null);
  const byDevice = useMemo(() => groupLogByEquipment(entries), [entries]);

  const reloadLog = () => equipmentLogService.list().then(res => { if (res.ok) setEntries(res.data); });
  useEffect(() => {
    equipmentService.getAll().then(res => { if (res.ok) setItems(filterEquipment(res.data, { search: '', status: 'Active', kind: 'All' })); });
    void reloadLog();
  }, []);

  return (
    <div className="ps-batch-page">
      <div className="ps-batch-scroll">
        <div className="ps-batch-inner">
          <div className="ps-batch-page-header">
            <h1 className="ps-batch-page-title">🔧 {t('equipmentServiceLog.pageTitle')}</h1>
            <p className="ps-batch-page-subtitle">{t('equipmentServiceLog.pageSubtitle')}</p>
          </div>
          <div className="ps-conf-table-wrap">
            <table className="ps-conf-table">
              <thead>
                <tr>
                  {(['item', 'code', 'kind', 'service', 'actions'] as const).map(h => (
                    <th key={h} className="ps-conf-th">{t(`equipmentSection.headers.${h}`)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(i => {
                  const svc = equipmentServiceState(i, byDevice.get(i.id) ?? [], today);
                  const due = earliestDue(today, svc.maintenance, svc.calibration);
                  return (
                    <tr key={i.id} className={`ps-conf-tr ${isServiceAlert(svc.state) ? 'ps-eqlog-row--alert' : ''}`}>
                      <td className="ps-conf-td"><div className="ps-conf-identity-name">{i.name}</div></td>
                      <td className="ps-conf-td"><code>{i.code}</code></td>
                      <td className="ps-conf-td">{t(`equipmentKinds.${i.kind}`)}</td>
                      <td className="ps-conf-td">
                        <span className={`ps-eqlog-state ps-eqlog-state--${svc.state}`}>{t(`equipmentLog.state.${svc.state}`)}</span>
                        {due && <div className="ps-specreq-meta">{t(due.overdue ? 'equipmentSection.wasDue' : 'equipmentSection.nextDue', { date: formatCalendarDate(due.date, i18n.language, 'UTC') })}</div>}
                      </td>
                      <td className="ps-conf-td">
                        <CapabilityButton capability="equipment:maintenance:record" className="ps-conf-btn-row" onClick={() => setLogFor(i)}>
                          {t('equipmentServiceLog.logEntry')}
                        </CapabilityButton>
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && <tr><td className="ps-conf-empty-row" colSpan={5}>{t('equipmentSection.emptyRow')}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {logFor && (
        <EquipmentLogModal item={logFor} entries={byDevice.get(logFor.id) ?? []} today={today}
          userId={user?.id ?? 'unknown'} userName={user?.name ?? ''} onAdded={reloadLog} onClose={() => setLogFor(null)} />
      )}
    </div>
  );
};

export default EquipmentServiceLogPage;
