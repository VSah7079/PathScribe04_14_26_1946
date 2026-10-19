// src/components/Config/System/BiFeedSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 613 (PS-787): Configuration → System → Reporting feed (Power BI).
//   • Switch the reporting feed on and choose which datasets and performing-lab
//     facilities it offers. The API server serves the feed
//     (docs/architecture/BI_FEED_API.md); here the settings and tokens are kept
//     and a pull is Simulated.
//   • Feed tokens: one per BI tool or report author. A token is limited to some
//     of the datasets and facilities, is de-identified unless an approval is on
//     record, is shown once, and can be replaced or revoked at once.
//   • Identified (not de-identified) tokens need a named approver and a reason.
//   • The field catalogue lists every field a dataset offers and what the
//     de-identified feed does with it.
// Settings need config:bi-feed:manage, tokens config:bi-feed-tokens:manage, the
// approval config:bi-feed-identified:approve (checked in the service). The rules
// are in services/biFeed.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBiFeed } from '@/hooks/useBiFeed';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { LoadingState } from '@/components/Common/LoadingState';
import { formatDateTime } from '@/utils/formatDate';
import { copyText } from '@/utils/copyText';
import { useReportConfigDirty } from '../configDirtyGuardContext';
import { REVOKE_NOTE_MAX, REVOKE_REASON_CODES, revokeReasonValid, type AgentRevokeReasonCode } from '@/services/siteAgent/siteAgentAdmin';
import { BI_DATASETS, BI_PREVIOUS_TOKEN_GRACE_HOURS, BI_RATE_LIMIT_PER_MINUTE, biTokenState } from '@/services/biFeed/biFeedRules';

const K = 'biFeed';

const BiFeedSection: React.FC = () => {
  const { t, i18n } = useTranslation();
  const s = useBiFeed();
  useReportConfigDirty(s.settingsDirty || !!s.tokenForm);
  const [revoking, setRevoking] = useState<{ id: string; code?: AgentRevokeReasonCode; note: string } | null>(null);
  const [copied, setCopied] = useState<boolean | null>(null);
  const [pasted, setPasted] = useState('');
  const [pullDataset, setPullDataset] = useState<string>(BI_DATASETS[0].id);
  const now = new Date().toISOString();
  const unset = t(`${K}.unset`);
  const facilityName = (id: string) => s.facilities.find(f => f.id === id)?.name ?? id;

  if (s.saved === null || s.tokens === null) return <LoadingState label={t(`${K}.loading`)} />;

  const saved = s.saved;
  const form = s.tokenForm;
  const firstProblem = (list: readonly string[]) => list[0];
  const approval = saved.identifiedApproval;
  const toggleIn = <T extends string>(list: readonly T[], id: T): T[] => (list.includes(id) ? list.filter(x => x !== id) : [...list, id]);

  return (
    <div className="ps-bifeed" data-testid="bi-feed-section">
      <div className="ps-conf-section-header">
        <div>
          <h2 className="ps-conf-section-title">{t(`${K}.title`)}</h2>
          <p className="ps-conf-section-subtitle">{t(`${K}.subtitle`)}</p>
        </div>
      </div>

      <p className="ps-bifeed-note"><span className="ps-simulated-badge">{t(`${K}.simulated`)}</span> {t(`${K}.demoNote`, { limit: BI_RATE_LIMIT_PER_MINUTE })}</p>
      {s.problem && <p className="ps-bifeed-note ps-bifeed-note--problem" role="alert" data-testid="bi-feed-problem">{t(`${K}.problem.${s.problem}`, { defaultValue: s.problem })}</p>}
      {s.notice && <p className="ps-bifeed-note" role="status">{t(`${K}.notice.${s.notice}`)}</p>}

      <section className="ps-bifeed-card" aria-labelledby="ps-bifeed-settings">
        <h3 id="ps-bifeed-settings" className="ps-bifeed-heading">{t(`${K}.settings.title`)}</h3>
        <label className="ps-bifeed-check">
          <input type="checkbox" checked={s.draft.enabled} onChange={e => s.setEnabled(e.target.checked)} />
          <span>{t(`${K}.settings.enabled`)}</span>
        </label>
        <p className="ps-bifeed-hint">{t(`${K}.settings.enabledHint`)}</p>

        <fieldset className="ps-bifeed-fieldset">
          <legend className="ps-bifeed-legend">{t(`${K}.settings.datasets`)}</legend>
          {BI_DATASETS.map(ds => (
            <label key={ds.id} className="ps-bifeed-check">
              <input type="checkbox" checked={s.draft.datasetIds.includes(ds.id)} onChange={() => s.toggleDataset(ds.id)} />
              <span>
                {t(`${K}.datasets.${ds.id}.name`)}
                {ds.identifiable && <span className="ps-bifeed-tag">{t(`${K}.settings.identifiableTag`)}</span>}
                <span className="ps-bifeed-hint">{t(`${K}.datasets.${ds.id}.description`)}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <fieldset className="ps-bifeed-fieldset">
          <legend className="ps-bifeed-legend">{t(`${K}.settings.facilities`)}</legend>
          {s.facilities.length === 0 ? <p className="ps-bifeed-hint">{t(`${K}.settings.noFacilities`)}</p> : s.facilities.map(f => (
            <label key={f.id} className="ps-bifeed-check">
              <input type="checkbox" checked={s.draft.facilityIds.includes(f.id)} onChange={() => s.toggleFacility(f.id)} />
              <span>{f.name}</span>
            </label>
          ))}
          <p className="ps-bifeed-hint">{t(`${K}.settings.facilitiesHint`)}</p>
        </fieldset>

        {s.draft.enabled && firstProblem(s.settingsProblems) && (
          <p className="ps-bifeed-error" role="alert">{t(`${K}.problem.${firstProblem(s.settingsProblems)}`)}</p>
        )}
        <div className="ps-bifeed-actions">
          <CapabilityButton capability="config:bi-feed:manage" className="ps-conf-btn-primary" disabled={s.busy || !s.settingsDirty || s.settingsProblems.length > 0} onClick={() => { void s.saveSettings(); }}>
            {t(`${K}.settings.save`)}
          </CapabilityButton>
          {s.settingsDirty && <button type="button" className="ps-conf-btn-secondary" onClick={s.discardSettings}>{t(`${K}.settings.discard`)}</button>}
        </div>
      </section>

      <section className="ps-bifeed-card" aria-labelledby="ps-bifeed-approval">
        <h3 id="ps-bifeed-approval" className="ps-bifeed-heading">{t(`${K}.approval.title`)}</h3>
        <p className="ps-bifeed-note">{t(`${K}.approval.hint`)}</p>
        {approval ? (
          <>
            <p className="ps-bifeed-note" data-testid="bi-feed-approval-current">
              {t(`${K}.approval.current`, { approver: approval.approverName, when: formatDateTime(approval.approvedAt, i18n.language), recorder: approval.recordedBy, reason: approval.reason })}
            </p>
            <div className="ps-bifeed-actions">
              <CapabilityButton capability="config:bi-feed-identified:approve" className="ps-conf-btn-secondary" disabled={s.busy} onClick={() => { void s.withdraw(); }}>
                {t(`${K}.approval.withdraw`)}
              </CapabilityButton>
            </div>
          </>
        ) : (
          <>
            <p className="ps-bifeed-note">{t(`${K}.approval.none`)}</p>
            <div className="ps-bifeed-grid">
              <label className="ps-bifeed-field">
                <span>{t(`${K}.approval.approver`)}</span>
                <input className="ps-conf-input" value={s.approval.approverName} placeholder={t(`${K}.approval.approverPlaceholder`)} onChange={e => s.setApproval({ ...s.approval, approverName: e.target.value })} />
              </label>
              <label className="ps-bifeed-field">
                <span>{t(`${K}.approval.reason`)}</span>
                <input className="ps-conf-input" value={s.approval.reason} placeholder={t(`${K}.approval.reasonPlaceholder`)} onChange={e => s.setApproval({ ...s.approval, reason: e.target.value })} />
              </label>
            </div>
            <div className="ps-bifeed-actions">
              <CapabilityButton capability="config:bi-feed-identified:approve" className="ps-conf-btn-primary" disabled={s.busy || s.approvalProblems.length > 0} onClick={() => { void s.approve(); }}>
                {t(`${K}.approval.record`)}
              </CapabilityButton>
            </div>
          </>
        )}
      </section>

      {s.revealed && (
        <section className="ps-bifeed-token" role="status" aria-label={t(`${K}.tokenPanel.title`, { name: s.revealed.name })} data-testid="bi-feed-token-panel">
          <h3 className="ps-bifeed-heading">{t(`${K}.tokenPanel.title`, { name: s.revealed.name })}</h3>
          <p className="ps-bifeed-note">{t(`${K}.tokenPanel.warning`)}</p>
          {s.revealed.grace && <p className="ps-bifeed-note">{t(`${K}.tokenPanel.grace`, { hours: BI_PREVIOUS_TOKEN_GRACE_HOURS })}</p>}
          <code className="ps-bifeed-token-value">{s.revealed.token}</code>
          <div className="ps-bifeed-actions">
            <button type="button" className="ps-conf-btn-secondary" onClick={() => { void copyText(s.revealed!.token).then(setCopied); }}>{copied ? t(`${K}.copied`) : t(`${K}.copy`)}</button>
            <button type="button" className="ps-conf-btn-primary" onClick={() => { setCopied(null); s.clearRevealed(); }}>{t(`${K}.tokenPanel.done`)}</button>
          </div>
          {copied === false && <p className="ps-bifeed-note" role="alert">{t(`${K}.copyFailed`)}</p>}
        </section>
      )}

      <section className="ps-bifeed-card" aria-labelledby="ps-bifeed-tokens">
        <div className="ps-conf-section-header">
          <h3 id="ps-bifeed-tokens" className="ps-bifeed-heading">{t(`${K}.tokens.title`)}</h3>
          <CapabilityButton capability="config:bi-feed-tokens:manage" className="ps-conf-btn-primary" disabled={s.busy || !!form || !saved.enabled} onClick={s.openTokenForm}>
            {t(`${K}.tokens.create`)}
          </CapabilityButton>
        </div>
        {!saved.enabled && <p className="ps-bifeed-note">{t(`${K}.tokens.feedOff`)}</p>}

        {form && (
          <div className="ps-bifeed-form" data-testid="bi-feed-token-form">
            <label className="ps-bifeed-field">
              <span>{t(`${K}.form.name`)}</span>
              <input className="ps-conf-input" value={form.name} placeholder={t(`${K}.form.namePlaceholder`)} onChange={e => s.setTokenForm({ ...form, name: e.target.value })} />
            </label>
            <fieldset className="ps-bifeed-fieldset">
              <legend className="ps-bifeed-legend">{t(`${K}.form.datasets`)}</legend>
              {BI_DATASETS.filter(ds => saved.datasetIds.includes(ds.id)).map(ds => (
                <label key={ds.id} className="ps-bifeed-check">
                  <input type="checkbox" checked={form.datasetIds.includes(ds.id)} onChange={() => s.setTokenForm({ ...form, datasetIds: toggleIn(form.datasetIds, ds.id) })} />
                  <span>{t(`${K}.datasets.${ds.id}.name`)}</span>
                </label>
              ))}
            </fieldset>
            <fieldset className="ps-bifeed-fieldset">
              <legend className="ps-bifeed-legend">{t(`${K}.form.facilities`)}</legend>
              {s.facilities.filter(f => saved.facilityIds.includes(f.id)).map(f => (
                <label key={f.id} className="ps-bifeed-check">
                  <input type="checkbox" checked={form.facilityIds.includes(f.id)} onChange={() => s.setTokenForm({ ...form, facilityIds: toggleIn(form.facilityIds, f.id) })} />
                  <span>{f.name}</span>
                </label>
              ))}
              <p className="ps-bifeed-hint">{t(`${K}.form.facilitiesHint`)}</p>
            </fieldset>
            <fieldset className="ps-bifeed-fieldset">
              <legend className="ps-bifeed-legend">{t(`${K}.form.mode`)}</legend>
              <label className="ps-bifeed-check">
                <input type="radio" name="bi-mode" checked={!form.identified} onChange={() => s.setTokenForm({ ...form, identified: false })} />
                <span>{t(`${K}.form.deidentified`)}<span className="ps-bifeed-hint">{t(`${K}.form.deidentifiedHelp`)}</span></span>
              </label>
              <label className="ps-bifeed-check">
                <input type="radio" name="bi-mode" checked={form.identified} disabled={!approval} onChange={() => s.setTokenForm({ ...form, identified: true })} />
                <span>{t(`${K}.form.identified`)}<span className="ps-bifeed-hint">{approval ? t(`${K}.form.identifiedHelp`, { approver: approval.approverName }) : t(`${K}.form.identifiedLocked`)}</span></span>
              </label>
            </fieldset>
            {firstProblem(s.tokenProblems) && form.name && <p className="ps-bifeed-error" role="alert">{t(`${K}.problem.${firstProblem(s.tokenProblems)}`)}</p>}
            <div className="ps-bifeed-actions">
              <CapabilityButton capability="config:bi-feed-tokens:manage" className="ps-conf-btn-primary" disabled={s.busy || s.tokenProblems.length > 0} onClick={() => { setCopied(null); void s.submitToken(); }}>
                {t(`${K}.form.submit`)}
              </CapabilityButton>
              <button type="button" className="ps-conf-btn-secondary" onClick={s.closeTokenForm}>{t('common.cancel')}</button>
            </div>
          </div>
        )}

        {s.tokens.length === 0 ? <p className="ps-bifeed-note" data-testid="bi-feed-empty">{t(`${K}.empty`)}</p> : (
          <div className="ps-conf-table-wrap"><div className="ps-conf-table-scroll">
            <table className="ps-conf-table">
              <thead><tr>
                <th className="ps-conf-th">{t(`${K}.tokens.columns.name`)}</th>
                <th className="ps-conf-th">{t(`${K}.tokens.columns.datasets`)}</th>
                <th className="ps-conf-th">{t(`${K}.tokens.columns.facilities`)}</th>
                <th className="ps-conf-th">{t(`${K}.tokens.columns.mode`)}</th>
                <th className="ps-conf-th">{t(`${K}.tokens.columns.status`)}</th>
                <th className="ps-conf-th">{t(`${K}.tokens.columns.token`)}</th>
                <th className="ps-conf-th">{t(`${K}.tokens.columns.lastPulled`)}</th>
                <th className="ps-conf-th"><span className="ps-sr-only">{t(`${K}.tokens.columns.actions`)}</span></th>
              </tr></thead>
              <tbody>
                {s.tokens.map(tk => {
                  const state = biTokenState(tk, now);
                  const isRevoked = tk.status === 'revoked';
                  return (
                    <tr key={tk.id} className="ps-conf-tr" data-testid={`bi-feed-token-${tk.id}`}>
                      <td className="ps-conf-td">{tk.name}</td>
                      <td className="ps-conf-td">{tk.datasetIds.map(id => t(`${K}.datasets.${id}.name`)).join(', ')}</td>
                      <td className="ps-conf-td">{tk.facilityIds.length ? tk.facilityIds.map(facilityName).join(', ') : t(`${K}.tokens.allFacilities`)}</td>
                      <td className="ps-conf-td">{tk.identified ? t(`${K}.tokens.modeIdentified`) : t(`${K}.tokens.modeDeidentified`)}</td>
                      <td className="ps-conf-td">
                        <span className={`ps-bifeed-status ps-bifeed-status--${state}`}>{t(`${K}.tokens.status.${state}`)}</span>
                        {isRevoked && tk.revokedAt && tk.revokedReason && (
                          <span className="ps-bifeed-hint">{t(`${K}.tokens.revokedLine`, {
                            when: formatDateTime(tk.revokedAt, i18n.language), who: tk.revokedBy ?? '',
                            reason: t(`${K}.tokens.revokeReasons.${tk.revokedReason.code}`) + (tk.revokedReason.note ? `: ${tk.revokedReason.note}` : ''),
                          })}</span>
                        )}
                      </td>
                      <td className="ps-conf-td">{isRevoked ? unset : t(`${K}.tokens.tokenSummary`, { hint: tk.tokenHint, when: formatDateTime(tk.tokenExpiresAt, i18n.language) })}</td>
                      <td className="ps-conf-td">
                        {tk.lastPull
                          ? <>{t(`${K}.tokens.lastPulledLine`, { dataset: t(`${K}.datasets.${tk.lastPull.datasetId}.name`), rows: tk.lastPull.rows, when: formatDateTime(tk.lastPull.at, i18n.language) })} <span className="ps-simulated-badge">{t(`${K}.simulated`)}</span></>
                          : t(`${K}.never`)}
                      </td>
                      <td className="ps-conf-td">
                        {!isRevoked && (revoking?.id === tk.id ? (
                          <span className="ps-bifeed-revoke">
                            <span className="ps-bifeed-reasons" role="group" aria-label={t(`${K}.tokens.revokeReason`)}>
                              {REVOKE_REASON_CODES.map(code => (
                                <button key={code} type="button" className="ps-bifeed-reason" aria-pressed={revoking.code === code} onClick={() => setRevoking({ ...revoking, code })}>
                                  {t(`${K}.tokens.revokeReasons.${code}`)}
                                </button>
                              ))}
                            </span>
                            <input className="ps-conf-input" aria-label={t(`${K}.tokens.revokeNote`)} maxLength={REVOKE_NOTE_MAX}
                              placeholder={revoking.code === 'other' ? t(`${K}.tokens.placeholders.revokeNoteRequired`) : t(`${K}.tokens.placeholders.revokeNoteOptional`)}
                              value={revoking.note} onChange={e => setRevoking({ ...revoking, note: e.target.value })} />
                            <CapabilityButton capability="config:bi-feed-tokens:manage" className="ps-conf-btn-primary ps-bifeed-btn-danger"
                              disabled={!revoking.code || !revokeReasonValid({ code: revoking.code, note: revoking.note }) || s.busy}
                              onClick={() => { if (revoking.code) void s.revoke(tk, { code: revoking.code, note: revoking.note }).then(ok => { if (ok) setRevoking(null); }); }}>
                              {t(`${K}.tokens.confirmRevoke`)}
                            </CapabilityButton>
                            <button type="button" className="ps-conf-btn-secondary" onClick={() => setRevoking(null)}>{t('common.cancel')}</button>
                          </span>
                        ) : (
                          <span className="ps-bifeed-actions">
                            <CapabilityButton capability="config:bi-feed-tokens:manage" className="ps-conf-btn-secondary" disabled={s.busy} onClick={() => { setCopied(null); void s.rotate(tk); }}>{t(`${K}.tokens.rotate`)}</CapabilityButton>
                            <CapabilityButton capability="config:bi-feed-tokens:manage" className="ps-conf-btn-secondary" onClick={() => setRevoking({ id: tk.id, note: '' })}>{t(`${K}.tokens.revoke`)}</CapabilityButton>
                          </span>
                        ))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div></div>
        )}
      </section>

      <section className="ps-bifeed-card" aria-labelledby="ps-bifeed-pull">
        <h3 id="ps-bifeed-pull" className="ps-bifeed-heading">{t(`${K}.pull.title`)} <span className="ps-simulated-badge">{t(`${K}.simulated`)}</span></h3>
        <p className="ps-bifeed-note">{t(`${K}.pull.hint`)}</p>
        <div className="ps-bifeed-actions">
          <input className="ps-conf-input" aria-label={t(`${K}.pull.token`)} value={pasted} placeholder={t(`${K}.pull.tokenPlaceholder`)} onChange={e => { setPasted(e.target.value); s.clearPull(); }} />
          <select className="ps-conf-select" aria-label={t(`${K}.pull.dataset`)} value={pullDataset} onChange={e => { setPullDataset(e.target.value); s.clearPull(); }}>
            {BI_DATASETS.map(ds => <option key={ds.id} value={ds.id}>{t(`${K}.datasets.${ds.id}.name`)}</option>)}
          </select>
          <CapabilityButton capability="config:bi-feed-tokens:manage" className="ps-conf-btn-secondary" disabled={!pasted.trim()} onClick={() => { void s.testPull(pasted, pullDataset); }}>{t(`${K}.pull.button`)}</CapabilityButton>
        </div>
        {s.pull && (
          <p className={`ps-bifeed-note${s.pull.result === 'ok' ? '' : ' ps-bifeed-note--problem'}`} role="status" data-testid="bi-feed-pull-result">
            {s.pull.result === 'ok'
              ? t(`${K}.pull.results.ok`, { name: s.pull.tokenName ?? '', rows: s.pull.rows ?? 0, fields: s.pull.fieldCount ?? 0, mode: s.pull.identified ? t(`${K}.tokens.modeIdentified`) : t(`${K}.tokens.modeDeidentified`) })
              : t(`${K}.pull.results.${s.pull.result}`, { name: s.pull.tokenName ?? '', limit: BI_RATE_LIMIT_PER_MINUTE })}
          </p>
        )}
      </section>

      <section className="ps-bifeed-card" aria-labelledby="ps-bifeed-catalog">
        <h3 id="ps-bifeed-catalog" className="ps-bifeed-heading">{t(`${K}.catalog.title`)}</h3>
        <p className="ps-bifeed-note">{t(`${K}.catalog.hint`)}</p>
        {BI_DATASETS.map(ds => (
          <details key={ds.id} className="ps-bifeed-details" data-testid={`bi-feed-catalog-${ds.id}`}>
            <summary>
              {t(`${K}.datasets.${ds.id}.name`)} · {t(`${K}.catalog.fieldsCount`, { count: ds.fields.length })}
              {ds.identifiable && <span className="ps-bifeed-tag">{t(`${K}.settings.identifiableTag`)}</span>}
            </summary>
            <p className="ps-bifeed-hint">{t(`${K}.datasets.${ds.id}.description`)}</p>
            <table className="ps-conf-table">
              <thead><tr>
                <th className="ps-conf-th">{t(`${K}.catalog.field`)}</th>
                <th className="ps-conf-th">{t(`${K}.catalog.type`)}</th>
                <th className="ps-conf-th">{t(`${K}.catalog.handling`)}</th>
              </tr></thead>
              <tbody>
                {ds.fields.map(fl => (
                  <tr key={fl.id} className="ps-conf-tr">
                    <td className="ps-conf-td"><code>{fl.id}</code></td>
                    <td className="ps-conf-td">{t(`${K}.catalog.types.${fl.type}`)}</td>
                    <td className="ps-conf-td">{ds.identifiable ? t(`${K}.catalog.handlingValue.${fl.deidentified}`) : t(`${K}.catalog.handlingValue.kept`)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        ))}
      </section>
    </div>
  );
};

export default BiFeedSection;
