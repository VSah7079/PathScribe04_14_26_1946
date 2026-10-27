// src/components/Config/System/BatchRegistryFeedSection.tsx
// ───────────────────────────────────────────────────────────────────────────
// Batch 620 part S (PS-800): Configuration > System > Registry Batch Files. A registry or screening programme that takes a file
// instead of a message has a PROFILE here (format, columns, file name). WHEN its file is made is the registry's own delivery
// schedule (Delivery Schedules); the screen shows the schedule's state and what is waiting, and lets someone with permission make
// the file now. The interface engine carries the file; the registry's answer comes back through it. Logic: services/batchRegistryFeed.
// Contract: docs/architecture/BATCH_REGISTRY_FEED_API.md
// ───────────────────────────────────────────────────────────────────────────
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../../../pathscribe.css';
import './DeliverySchedulesSection.css';
import './BatchRegistryFeedSection.css';

import { batchRegistryFeedService } from '@/services';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { LoadingState } from '@/components/Common/LoadingState';
import { downloadText } from '../../../utils/downloadText';
import { isFormatAvailable, SHIPPED_PROFILE_IDS, type BatchProgramProfile, type BatchRunManifest } from '../../../services/batchRegistryFeed/batchRegistryFeed';
import type { RunPreview } from '../../../services/batchRegistryFeed/IBatchRegistryFeedService';
import { registryChoices } from '../../../services/deliverySchedules/registryChoices';
import { draftFromProfile, type ProfileDraft } from './batchRegistryFeedForm';
import { BATCH_FEED_CAPABILITY, BATCH_FILE_GENERATE_CAPABILITY } from './batchRegistryFeedCapabilities';
import BatchProfileEditor from './BatchProfileEditor';

const Counts: React.FC<{ p: RunPreview }> = ({ p }) => {
  const { t } = useTranslation();
  return (
    <div className="ps-brf-counts" data-testid="brf-counts">
      <span>{t('batchRegistryFeedSection.counts.waiting', { count: p.waiting })}</span>
      <span>{t('batchRegistryFeedSection.counts.dueNow', { count: p.dueNow })}</span>
      <span>{t('batchRegistryFeedSection.counts.heldBack', { count: p.wouldBeHeldBack })}</span>
      <span>{t('batchRegistryFeedSection.counts.overdue', { count: p.overdue })}</span>
      <span>{p.nextDueAt ? t('batchRegistryFeedSection.counts.nextRun', { at: new Date(p.nextDueAt).toLocaleString() }) : t('batchRegistryFeedSection.counts.noNextRun')}</span>
      {!p.scheduleIsBatch && <span role="note">{t('batchRegistryFeedSection.counts.notBatch')}</span>}
    </div>
  );
};

const Runs: React.FC<{ runs: BatchRunManifest[] }> = ({ runs }) => {
  const { t } = useTranslation();
  if (runs.length === 0) return <p className="ps-conf-hint">{t('batchRegistryFeedSection.runs.none')}</p>;
  return (
    <table className="ps-brf-runs">
      <thead><tr>
        <th>{t('batchRegistryFeedSection.runs.file')}</th><th>{t('batchRegistryFeedSection.runs.records')}</th>
        <th>{t('batchRegistryFeedSection.runs.checksum')}</th><th>{t('batchRegistryFeedSection.runs.status')}</th>
      </tr></thead>
      <tbody>{runs.slice(0, 5).map(r => (
        <tr key={r.id} data-run={r.id}>
          <td>{r.fileName}{r.manual && <> · {t('batchRegistryFeedSection.runs.manual')}</>}</td>
          <td>{r.recordCount}{r.heldBack.length > 0 && <> · {t('batchRegistryFeedSection.runs.heldBack', { count: r.heldBack.length })}</>}</td>
          <td className="ps-brf-sha">{r.sha256.slice(0, 12)}</td>
          <td>{t(`batchRegistryFeedSection.runStatus.${r.status}`)}</td>
        </tr>
      ))}</tbody>
    </table>
  );
};

const BatchRegistryFeedSection: React.FC = () => {
  const { t } = useTranslation();
  const [profiles, setProfiles] = useState<BatchProgramProfile[]>([]);
  const [runs, setRuns] = useState<BatchRunManifest[]>([]);
  const [previews, setPreviews] = useState<Record<string, RunPreview>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ profile: BatchProgramProfile | null } | null>(null);
  const [status, setStatus] = useState<'saved' | 'refused' | 'built' | 'nothingToSend' | null>(null);

  const load = useCallback(async () => {
    const [p, r] = await Promise.all([batchRegistryFeedService.getProfiles(), batchRegistryFeedService.getRuns()]);
    if (p.ok) setProfiles(p.data);
    if (r.ok) setRuns(r.data);
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const done = async (ok: boolean) => { setStatus(ok ? 'saved' : 'refused'); await load(); };
  const save = async (d: ProfileDraft) => { const r = await batchRegistryFeedService.saveProfile(d); setEditing(null); await done(r.ok); };
  const toggle = async (p: BatchProgramProfile) => { const r = await batchRegistryFeedService.saveProfile({ ...p, enabled: !p.enabled }); await done(r.ok); };
  const remove = async (id: string) => { const r = await batchRegistryFeedService.removeProfile(id); await done(r.ok); };
  const check = async (id: string) => { const r = await batchRegistryFeedService.preview(id); if (r.ok) setPreviews({ ...previews, [id]: r.data }); };
  const build = async (id: string) => {
    const r = await batchRegistryFeedService.buildRun(id, { manual: true });
    if (r.ok) {
      downloadText(r.data.run.fileName, r.data.content, r.data.run.format === 'csv' ? 'text/csv;charset=utf-8' : 'application/xml');
      setStatus('built');
    } else setStatus(r.error === 'NO_RECORDS' ? 'nothingToSend' : 'refused');
    await load();
    await check(id);
  };
  const registryName = (key: string) => { const c = registryChoices().find(x => x.key === key); return c ? t(c.labelKey) : key; };

  if (loading) return <LoadingState label={t('batchRegistryFeedSection.loading')} />;
  return (
    <div className="ps-dsch-root">
      <div>
        <h2 className="tmpl-list-title">{t('batchRegistryFeedSection.title')}</h2>
        <p className="tmpl-list-subtitle">{t('batchRegistryFeedSection.subtitle')}</p>
      </div>
      <div className="ps-dsch-scope">
        <CapabilityButton capability={BATCH_FEED_CAPABILITY} className="ps-conf-btn-primary" onClick={() => setEditing({ profile: null })}>{t('batchRegistryFeedSection.addProgram')}</CapabilityButton>
      </div>
      <div className="ps-dsch-list">
        {profiles.map(p => {
          const available = isFormatAvailable(p.format);
          const pr = previews[p.id];
          return (
            <div key={p.id} className="ps-dsch-card" data-profile={p.id}>
              <div>
                <div className="ps-dsch-feed">
                  {p.name}
                  {p.isExample && <span className="ps-brf-badge">{t('batchRegistryFeedSection.badges.example')}</span>}
                  {!available && <span className="ps-brf-badge ps-brf-badge--off">{t('batchRegistryFeedSection.badges.later')}</span>}
                </div>
                <div className="ps-dsch-summary">{t('batchRegistryFeedSection.summary', { registry: registryName(p.registryKey), format: t(`batchRegistryFeedSection.formats.${p.format}`), columns: p.columns.length })}</div>
                <span className={`ps-dsch-source ps-dsch-source--${p.enabled ? 'facility' : 'enterprise'}`}>{t(p.enabled ? 'batchRegistryFeedSection.on' : 'batchRegistryFeedSection.off')}</span>
                {available && p.enabled && (
                  <>
                    {pr && <Counts p={pr} />}
                    <Runs runs={runs.filter(r => r.profileId === p.id)} />
                  </>
                )}
              </div>
              <div className="ps-dsch-actions">
                {available && p.enabled && <button className="ps-conf-btn-secondary" onClick={() => { void check(p.id); }}>{t('batchRegistryFeedSection.check')}</button>}
                {available && p.enabled && <CapabilityButton capability={BATCH_FILE_GENERATE_CAPABILITY} className="ps-conf-btn-primary" onClick={() => { void build(p.id); }}>{t('batchRegistryFeedSection.buildNow')}</CapabilityButton>}
                <CapabilityButton capability={BATCH_FEED_CAPABILITY} className="ps-conf-btn-secondary" disabled={!available} onClick={() => { void toggle(p); }}>{t(p.enabled ? 'batchRegistryFeedSection.turnOff' : 'batchRegistryFeedSection.turnOn')}</CapabilityButton>
                <CapabilityButton capability={BATCH_FEED_CAPABILITY} className="ps-conf-btn-secondary" disabled={!available} onClick={() => setEditing({ profile: p })}>{t('batchRegistryFeedSection.editButton')}</CapabilityButton>
                {!SHIPPED_PROFILE_IDS.includes(p.id) && <CapabilityButton capability={BATCH_FEED_CAPABILITY} className="ps-conf-btn-secondary" onClick={() => { void remove(p.id); }}>{t('batchRegistryFeedSection.removeButton')}</CapabilityButton>}
              </div>
            </div>
          );
        })}
      </div>
      {status && <p className="ps-conf-hint" role="status">{t(`batchRegistryFeedSection.status.${status}`)}</p>}
      {editing && <BatchProfileEditor start={draftFromProfile(editing.profile, registryChoices()[0]?.key ?? '')} onSave={d => { void save(d); }} onClose={() => setEditing(null)} />}
    </div>
  );
};

export default BatchRegistryFeedSection;
