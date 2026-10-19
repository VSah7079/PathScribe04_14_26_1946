// src/components/Config/System/ClientSlaSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 610 (#87, #164): Configuration → System → Client SLA. The hours a client
// is promised: from receipt to first touch, and to the signed report, with
// optional STAT variants. A client without one has no SLA. The Quality tab's
// Client SLA table, the TAT views and the worklist show a breach against these.
// Changing one needs config:tat-targets:manage (checked by the service,
// audited, hours only). The rules are in services/clientSLA/clientSlaRules.ts.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { clientSlaService, facilityService, type ClientSLA } from '@/services';
import '@/pathscribe.css';

const K = 'clientSlaSection';
type HoursField = 'firstTouchTargetHrs' | 'totalTatTargetHrs' | 'statFirstTouchTargetHrs' | 'statTotalTatTargetHrs';
const FIELDS: readonly HoursField[] = ['firstTouchTargetHrs', 'totalTatTargetHrs', 'statFirstTouchTargetHrs', 'statTotalTatTargetHrs'];

interface ClientChoice { authority: string; name: string }

const ClientSlaSection: React.FC = () => {
  const { t } = useTranslation();
  const [slas, setSlas] = useState<ClientSLA[] | null>(null);
  const [clients, setClients] = useState<ClientChoice[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [adding, setAdding] = useState({ authority: '', firstTouch: '', total: '' });

  const load = useCallback(async () => {
    const res = await clientSlaService.getAll();
    if (res.ok) setSlas(res.data);
  }, []);
  useEffect(() => {
    void load();
    facilityService.getAll()
      .then(r => { if (r.ok) setClients(r.data.filter(f => f.status !== 'Inactive' && f.assigningAuthority).map(f => ({ authority: f.assigningAuthority, name: f.name }))); })
      .catch(() => {});
  }, [load]);

  const finish = (res: { ok: boolean; error?: string }) => {
    if (res.ok) { setProblem(null); setSaved(true); setTimeout(() => setSaved(false), 2000); void load(); }
    else setProblem(res.error ?? 'targetInvalid');
    return res.ok;
  };

  const draftKey = (id: string, f: HoursField) => `${id}:${f}`;
  const commit = async (sla: ClientSLA, f: HoursField) => {
    const key = draftKey(sla.id, f);
    const raw = drafts[key];
    if (raw === undefined) return;
    const optional = f === 'statFirstTouchTargetHrs' || f === 'statTotalTatTargetHrs';
    const value = raw.trim() === '' ? undefined : Number(raw);
    if (value === sla[f]) { setDrafts(d => { const { [key]: _g, ...rest } = d; return rest; }); return; }
    if (value === undefined && !optional) { setProblem('targetInvalid'); return; }
    const ok = finish(await clientSlaService.update(sla.id, { [f]: value } as Partial<ClientSLA>));
    if (ok) setDrafts(d => { const { [key]: _g, ...rest } = d; return rest; });
  };

  const taken = new Set((slas ?? []).map(s => s.assigningAuthority.toLowerCase()));
  const available = clients.filter(c => !taken.has(c.authority.toLowerCase()));

  const add = async () => {
    const client = clients.find(c => c.authority === adding.authority);
    if (!client) { setProblem('authorityRequired'); return; }
    const ok = finish(await clientSlaService.add({
      assigningAuthority: client.authority, clientName: client.name,
      firstTouchTargetHrs: Number(adding.firstTouch), totalTatTargetHrs: Number(adding.total), active: true,
    }));
    if (ok) setAdding({ authority: '', firstTouch: '', total: '' });
  };

  if (!slas) return null;

  return (
    <div>
      <div className="ps-rbuf-header">
        <h2 className="ps-rbuf-title">{t(`${K}.title`)}</h2>
        <p className="ps-rbuf-subtitle">{t(`${K}.subtitle`)}</p>
      </div>

      <div className="ps-conf-card ps-conf-card--spaced">
        <p className="ps-conf-card-description--tight">{t(`${K}.howItWorks`)}</p>
        {problem && <p className="ps-conf-error-text" role="alert">{t(`${K}.problems.${problem}`, { defaultValue: t(`${K}.problems.targetInvalid`) })}</p>}
        {saved && <p className="ps-conf-field-hint" role="status">{t(`${K}.saved`)}</p>}
        {slas.length === 0 ? (
          <p className="ps-conf-field-hint" data-testid="client-sla-empty">{t(`${K}.empty`)}</p>
        ) : (
          <div className="ps-conf-table-wrap">
            <table className="ps-conf-table">
              <thead>
                <tr>
                  <th className="ps-conf-th">{t(`${K}.columns.client`)}</th>
                  {FIELDS.map(f => <th key={f} className="ps-conf-th">{t(`${K}.columns.${f}`)}</th>)}
                  <th className="ps-conf-th">{t(`${K}.columns.active`)}</th>
                  <th className="ps-conf-th"><span className="ps-sr-only">{t(`${K}.columns.actions`)}</span></th>
                </tr>
              </thead>
              <tbody>
                {slas.map(sla => (
                  <tr key={sla.id} className="ps-conf-tr">
                    <td className="ps-conf-td"><span className="ps-client-authority-badge">{sla.assigningAuthority}</span> {sla.clientName}</td>
                    {FIELDS.map(f => (
                      <td key={f} className="ps-conf-td">
                        <input type="number" min={0} step="any" className="ps-conf-input ps-perf-target-value"
                          aria-label={t(`${K}.hoursAria`, { client: sla.clientName, field: t(`${K}.columns.${f}`) })}
                          placeholder={f.startsWith('stat') ? t(`${K}.sameAsRoutine`) : undefined}
                          value={drafts[draftKey(sla.id, f)] ?? (sla[f] === undefined ? '' : String(sla[f]))}
                          onChange={e => setDrafts(d => ({ ...d, [draftKey(sla.id, f)]: e.target.value }))}
                          onBlur={() => { void commit(sla, f); }}
                          onKeyDown={e => { if (e.key === 'Enter') void commit(sla, f); }} />
                      </td>
                    ))}
                    <td className="ps-conf-td">
                      <input type="checkbox" checked={sla.active} aria-label={t(`${K}.activeAria`, { client: sla.clientName })}
                        onChange={e => { void clientSlaService.update(sla.id, { active: e.target.checked }).then(finish); }} />
                    </td>
                    <td className="ps-conf-td">
                      <button type="button" className="ps-conf-btn-secondary" aria-label={t(`${K}.removeAria`, { client: sla.clientName })}
                        onClick={() => { void clientSlaService.delete(sla.id).then(finish); }}>{t(`${K}.remove`)}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="ps-conf-field-hint">{t(`${K}.statHint`)}</p>
      </div>

      <div className="ps-conf-card ps-conf-card--spaced">
        <div className="ps-conf-card-title">{t(`${K}.add.title`)}</div>
        {available.length === 0 ? (
          <p className="ps-conf-field-hint">{t(`${K}.add.noClients`)}</p>
        ) : (
          <div className="ps-perf-target-add">
            <select className="ps-conf-select" aria-label={t(`${K}.add.client`)} value={adding.authority}
              onChange={e => setAdding(a => ({ ...a, authority: e.target.value }))}>
              <option value="">{t(`${K}.add.pickClient`)}</option>
              {available.map(c => <option key={c.authority} value={c.authority}>{t(`${K}.add.clientOption`, { authority: c.authority, name: c.name })}</option>)}
            </select>
            <input type="number" min={0} step="any" className="ps-conf-input ps-perf-target-value" aria-label={t(`${K}.columns.firstTouchTargetHrs`)} placeholder={t(`${K}.columns.firstTouchTargetHrs`)}
              value={adding.firstTouch} onChange={e => setAdding(a => ({ ...a, firstTouch: e.target.value }))} />
            <input type="number" min={0} step="any" className="ps-conf-input ps-perf-target-value" aria-label={t(`${K}.columns.totalTatTargetHrs`)} placeholder={t(`${K}.columns.totalTatTargetHrs`)}
              value={adding.total} onChange={e => setAdding(a => ({ ...a, total: e.target.value }))} />
            <button type="button" className="ps-conf-btn-primary" onClick={() => { void add(); }}>{t(`${K}.add.button`)}</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientSlaSection;
