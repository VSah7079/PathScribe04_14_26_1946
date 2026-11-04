// src/components/Config/System/InterfaceDictionarySection.tsx
// ─────────────────────────────────────────────────
// Batch 612: Configuration → System → Interface Dictionary (Message Mapper).
// ForMedrixAI staff only (platform:interface-dictionary:*; Superadmin).
//
// Vendor profiles say where a vendor's own fields are in its HL7 v2, JSON or FHIR
// messages and which extension field each becomes on the case. A profile goes
// draft → tested → published; a bad publish is rolled back to the version before.
// Core structure (patient, order, specimen, diagnosis, report) cannot be mapped: that
// needs a code release (the scope guard refuses it as it is typed). Decisions are in
// services/interfaceDictionary/; this file shows and dispatches.
// Simulated: nothing is received from a vendor in the demo; sample messages are pasted.
// ─────────────────────────────────────────────────
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LoadingState } from '@/components/Common/LoadingState';
import { MappingEditor } from '@/components/InterfaceDictionary/MappingEditor';
import { ProfileTestPanel } from '@/components/InterfaceDictionary/ProfileTestPanel';
import { ScopeReference } from '@/components/InterfaceDictionary/ScopeReference';
import { useCapabilities } from '@/hooks/useCapabilities';
import { formatDateTime } from '@/utils/formatDate';
import {
  VENDOR_MESSAGE_FORMATS, codeKey, interfaceDictionaryService, messageTypeValid, publishRefusal, publishedVersion, rollbackTarget,
  validateMappings, workingVersion,
  type FieldMapping, type ProfileTestReport, type VendorMessageFormat, type VendorProfile,
} from '@/services';

const sameMappings = (a: FieldMapping[], b: FieldMapping[]) => JSON.stringify(a) === JSON.stringify(b);

const InterfaceDictionarySection: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { has } = useCapabilities();
  const [profiles, setProfiles] = useState<VendorProfile[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [sample, setSample] = useState('');
  const [report, setReport] = useState<ProfileTestReport | null>(null);
  const [caseId, setCaseId] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState('');
  const [newFormat, setNewFormat] = useState<VendorMessageFormat>('hl7v2');
  const [newType, setNewType] = useState('');

  const selected = profiles?.find(p => p.id === selectedId) ?? null;
  const working = selected ? workingVersion(selected) : undefined;
  const live = selected ? publishedVersion(selected) : undefined;
  const rollbackTo = selected ? rollbackTarget(selected) : undefined;

  const load = useCallback(async () => {
    const r = await interfaceDictionaryService.list();
    if (r.ok) setProfiles(r.data);
  }, []);
  useEffect(() => { void load(); }, [load]);

  /** Takes a changed profile from a service result and shows the working copy's mappings again. */
  const adopt = (p: VendorProfile) => {
    setProfiles(prev => (prev ?? []).some(x => x.id === p.id) ? (prev ?? []).map(x => (x.id === p.id ? p : x)) : [...(prev ?? []), p]);
    setMappings(workingVersion(p)?.mappings ?? []);
  };
  const select = (p: VendorProfile) => { setSelectedId(p.id); setMappings(workingVersion(p)?.mappings ?? []); setReport(null); setNotice(null); setError(null); };

  const dirty = !!working && !sameMappings(working.mappings, mappings);
  const problems = useMemo(() => (selected ? validateMappings(selected.format, mappings) : []), [selected, mappings]);

  const act = async (op: () => Promise<{ ok: true; data: VendorProfile } | { ok: false; error: string }>, done?: string): Promise<boolean> => {
    setBusy(true);
    const r = await op();
    setBusy(false);
    if (r.ok) { adopt(r.data); setError(null); setNotice(done ?? null); return true; }
    setError(r.error); setNotice(null);
    return false;
  };

  const create = async () => {
    const ok = await act(async () => {
      const r = await interfaceDictionaryService.createProfile({ name: newName, format: newFormat, messageType: newType });
      if (r.ok) { setSelectedId(r.data.id); setNewName(''); setNewType(''); setReport(null); }
      return r;
    }, t('interfaceDictionary.notice.created'));
    return ok;
  };

  const save = () => act(() => interfaceDictionaryService.saveMappings(selected!.id, mappings), t('interfaceDictionary.notice.saved'));

  const runTest = async () => {
    if (!selected) return;
    setBusy(true);
    if (dirty) {
      const saved = await interfaceDictionaryService.saveMappings(selected.id, mappings);
      if (!saved.ok) { setBusy(false); setError(saved.error); return; }
      adopt(saved.data);
    }
    const r = await interfaceDictionaryService.testProfile(selected.id, sample);
    setBusy(false);
    if (r.ok) { adopt(r.data.profile); setReport({ result: r.data.result, apply: r.data.apply }); setError(null); setNotice(null); }
    else { setError(r.error); setNotice(null); }
  };

  const simulate = async () => {
    if (!selected) return;
    setBusy(true);
    const r = await interfaceDictionaryService.simulateReceive(selected.id, caseId, sample);
    setBusy(false);
    if (r.ok) { setError(null); setNotice(t('interfaceDictionary.notice.applied', { count: r.data.applied })); }
    else { setError(r.error); setNotice(null); }
  };

  if (!profiles) return <LoadingState label={t('interfaceDictionary.loading')} />;

  const canPublishCap = has('platform:interface-dictionary:publish');
  const refusal = selected ? publishRefusal(selected) : null;
  const typeOk = newFormat === 'json' || (!!newType.trim() && messageTypeValid(newFormat, newType));

  return (
    <div className="ps-conf-section" data-testid="interface-dictionary-section">
      <div className="ps-conf-section-header">
        <div>
          <h3 className="ps-conf-section-title">{t('interfaceDictionary.title')}</h3>
          <p className="ps-conf-section-subtitle">{t('interfaceDictionary.subtitle')}</p>
        </div>
      </div>
      <p className="ps-conf-identity-sub"><span className="ps-simulated-badge">{t('interfaceDictionary.simulated')}</span> {t('interfaceDictionary.simulatedNote')}</p>
      {error && <div className="ps-idict-refusal" role="alert" data-testid="idict-error">{t(`interfaceDictionary.refusal.${codeKey(error)}`)}</div>}
      {notice && <div className="ps-conf-hint" role="status" data-testid="idict-notice">{notice}</div>}

      <ScopeReference />

      <div className="ps-idict-layout">
        <aside className="ps-idict-list" data-testid="idict-list">
          <h4>{t('interfaceDictionary.list.title')}</h4>
          {profiles.length === 0 && <p className="ps-conf-hint">{t('interfaceDictionary.list.empty')}</p>}
          <ul>
            {profiles.map(p => {
              const lv = publishedVersion(p);
              return (
                <li key={p.id}>
                  <button type="button" className={`ps-idict-profile-btn${p.id === selectedId ? ' ps-idict-profile-btn--active' : ''}`}
                    data-testid={`idict-profile-${p.id}`} onClick={() => select(p)}>
                    <strong>{p.name}</strong>
                    <span className="ps-conf-hint">{t(`interfaceDictionary.format.${p.format}`)}{p.messageType ? ` · ${p.messageType}` : ''}</span>
                    <span className="ps-conf-hint">{lv ? t('interfaceDictionary.list.live', { version: lv.version }) : t('interfaceDictionary.list.notLive')}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="ps-idict-new" data-testid="idict-new">
            <h5>{t('interfaceDictionary.list.newTitle')}</h5>
            <label className="ps-idict-field" htmlFor="idict-new-name">
              <span>{t('interfaceDictionary.list.nameLabel')}</span>
              <input id="idict-new-name" className="ps-conf-input" data-testid="idict-new-name" value={newName} onChange={e => setNewName(e.target.value)} />
            </label>
            <label className="ps-idict-field" htmlFor="idict-new-format">
              <span>{t('interfaceDictionary.list.formatLabel')}</span>
              <select id="idict-new-format" className="ps-conf-select" data-testid="idict-new-format" value={newFormat}
                onChange={e => setNewFormat(e.target.value as VendorMessageFormat)}>
                {VENDOR_MESSAGE_FORMATS.map(f => <option key={f} value={f}>{t(`interfaceDictionary.format.${f}`)}</option>)}
              </select>
            </label>
            <label className="ps-idict-field" htmlFor="idict-new-type">
              <span>{t('interfaceDictionary.list.messageTypeLabel')}</span>
              <input id="idict-new-type" className="ps-conf-input ps-idict-mono" data-testid="idict-new-type" value={newType}
                placeholder={t(`interfaceDictionary.list.messageTypePlaceholder.${newFormat}`)} onChange={e => setNewType(e.target.value)} />
            </label>
            <button type="button" className="ps-btn ps-btn-primary" data-testid="idict-create" disabled={busy || !newName.trim() || !typeOk} onClick={() => { void create(); }}>
              {t('interfaceDictionary.list.create')}
            </button>
          </div>
        </aside>

        <div className="ps-idict-detail">
          {!selected && <p className="ps-conf-hint">{t('interfaceDictionary.detail.choose')}</p>}
          {selected && (
            <>
              <h4 data-testid="idict-selected-name">{selected.name}</h4>
              <p className="ps-conf-hint">{t(`interfaceDictionary.format.${selected.format}`)}{selected.messageType ? ` · ${selected.messageType}` : ''}</p>

              <h5>{t('interfaceDictionary.versions.title')}</h5>
              <table className="ps-conf-table" data-testid="idict-versions">
                <thead>
                  <tr>
                    <th>{t('interfaceDictionary.versions.colVersion')}</th>
                    <th>{t('interfaceDictionary.versions.colStatus')}</th>
                    <th>{t('interfaceDictionary.versions.colBy')}</th>
                    <th>{t('interfaceDictionary.versions.colWhen')}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...selected.versions].sort((a, b) => b.version - a.version).map(v => (
                    <tr key={v.version} data-testid={`idict-version-${v.version}`}>
                      <td>{v.version}{v.rolledBackFrom ? ` (${t('interfaceDictionary.versions.copyOf', { version: v.rolledBackFrom })})` : ''}</td>
                      <td>{t(`interfaceDictionary.status.${v.status}`)}{v.rolledBackAt ? ` · ${t('interfaceDictionary.versions.rolledBack')}` : ''}</td>
                      <td>{v.publishedBy ?? v.createdBy}</td>
                      <td>{formatDateTime(v.publishedAt ?? v.createdAt, i18n.language)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="ps-idict-actions">
                {!working && (
                  <button type="button" className="ps-btn ps-btn-secondary" disabled={busy} data-testid="idict-start-draft"
                    onClick={() => { void act(() => interfaceDictionaryService.startDraft(selected.id)); }}>{t('interfaceDictionary.versions.startDraft')}</button>
                )}
                {live && (
                  <>
                    <button type="button" className="ps-btn ps-btn-secondary" disabled={busy || !canPublishCap || !rollbackTo} data-testid="idict-rollback"
                      title={rollbackTo ? t('interfaceDictionary.versions.rollbackHint', { version: rollbackTo.version }) : t('interfaceDictionary.versions.nothingToRollBack')}
                      onClick={() => { void act(() => interfaceDictionaryService.rollback(selected.id), t('interfaceDictionary.notice.rolledBack')); }}>
                      {t('interfaceDictionary.versions.rollback')}
                    </button>
                    <button type="button" className="ps-btn ps-btn-secondary" disabled={busy || !canPublishCap} data-testid="idict-retire"
                      onClick={() => { void act(() => interfaceDictionaryService.retire(selected.id), t('interfaceDictionary.notice.retired')); }}>
                      {t('interfaceDictionary.versions.retire')}
                    </button>
                  </>
                )}
              </div>

              {working && (
                <>
                  <h5>{t('interfaceDictionary.editor.title', { version: working.version })}</h5>
                  <MappingEditor format={selected.format} mappings={mappings} problems={problems} disabled={busy} onChange={setMappings} />
                  <div className="ps-idict-actions">
                    <button type="button" className="ps-btn ps-btn-primary" disabled={busy || !dirty} data-testid="idict-save" onClick={() => { void save(); }}>
                      {t('interfaceDictionary.editor.save')}
                    </button>
                  </div>

                  <ProfileTestPanel sample={sample} onSampleChange={setSample} onRun={() => { void runTest(); }} busy={busy}
                    canRun={mappings.length > 0 && problems.length === 0} report={report} />

                  <div className="ps-idict-publish" data-testid="idict-publish-box">
                    <button type="button" className="ps-btn ps-btn-primary" data-testid="idict-publish"
                      disabled={busy || dirty || !canPublishCap || refusal !== null}
                      onClick={() => { void act(() => interfaceDictionaryService.publish(selected.id), t('interfaceDictionary.notice.published')); }}>
                      {t('interfaceDictionary.publish.button')}
                    </button>
                    <span className="ps-conf-hint" data-testid="idict-publish-state">
                      {dirty ? t('interfaceDictionary.publish.unsaved')
                        : refusal ? t(`interfaceDictionary.publish.blocked.${codeKey(refusal)}`)
                          : t('interfaceDictionary.publish.ready')}
                    </span>
                  </div>
                </>
              )}

              {live && (
                <div className="ps-idict-simulate" data-testid="idict-simulate">
                  <h4>{t('interfaceDictionary.simulate.title')} <span className="ps-simulated-badge">{t('interfaceDictionary.simulated')}</span></h4>
                  <p className="ps-conf-hint">{t('interfaceDictionary.simulate.hint', { version: live.version })}</p>
                  {!working && (
                    <label className="ps-idict-field" htmlFor="idict-sample-live">
                      <span>{t('interfaceDictionary.test.sampleLabel')}</span>
                      <textarea id="idict-sample-live" className="ps-conf-input ps-idict-mono ps-idict-sample" data-testid="idict-sample" data-phi="true"
                        rows={5} value={sample} onChange={e => setSample(e.target.value)} />
                    </label>
                  )}
                  <label className="ps-idict-field" htmlFor="idict-case">
                    <span>{t('interfaceDictionary.simulate.caseLabel')}</span>
                    <input id="idict-case" className="ps-conf-input ps-idict-mono" data-testid="idict-case" data-phi="accession" value={caseId} onChange={e => setCaseId(e.target.value)} />
                  </label>
                  <button type="button" className="ps-btn ps-btn-secondary" data-testid="idict-apply"
                    disabled={busy || !has('platform:interface-dictionary:simulate') || !caseId.trim() || !sample.trim()} onClick={() => { void simulate(); }}>
                    {t('interfaceDictionary.simulate.apply')}
                  </button>
                  <details className="ps-idict-scope">
                    <summary>{t('interfaceDictionary.contract.title')}</summary>
                    <pre className="ps-idict-json" data-testid="idict-contract">{JSON.stringify({ vendor: selected.name, format: selected.format, messageType: selected.messageType, version: live.version, mappings: live.mappings }, null, 2)}</pre>
                  </details>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterfaceDictionarySection;
