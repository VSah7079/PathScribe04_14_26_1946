// src/components/Config/System/WorkstationsSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 612: Configuration → System → Workstations.
//   • Register a workstation (a named computer at a performing-lab facility) with
//     the room, role, point of care and printers it is bound to.
//   • Its token is shown once, at registration or replacement, and cannot be
//     shown again; only a fingerprint is kept. Revoking cuts it off at once.
//   • "Use this computer" makes this browser identify itself as the workstation,
//     so print routing rules for that workstation apply to prints made here.
//   • Test a token: the Simulated route that answers as the API server will.
// Every change needs config:workstations:manage or config:workstation-tokens:manage
// (checked in the service). The rules are in services/workstationRegistry.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorkstationRegistry } from '@/hooks/useWorkstationRegistry';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { LoadingState } from '@/components/Common/LoadingState';
import { formatDateTime } from '@/utils/formatDate';
import { copyText } from '@/utils/copyText';
import { useReportConfigDirty } from '../configDirtyGuardContext';
import { REVOKE_NOTE_MAX, REVOKE_REASON_CODES, revokeReasonValid, type AgentRevokeReasonCode } from '@/services/siteAgent/siteAgentAdmin';
import { WORKSTATION_PREVIOUS_TOKEN_GRACE_HOURS, workstationState } from '@/services/workstationRegistry/workstationRegistryRules';
import { FUNCTIONAL_AREAS_BY_DISCIPLINE, WORKSTATION_DISCIPLINES } from '@/services/workstationGroups/IWorkstationGroupService';

const K = 'workstationRegistry';

const WorkstationsSection: React.FC = () => {
  const { t, i18n } = useTranslation();
  const s = useWorkstationRegistry();
  useReportConfigDirty(!!s.form);
  const [revoking, setRevoking] = useState<{ id: string; code?: AgentRevokeReasonCode; note: string } | null>(null);
  const [copied, setCopied] = useState<boolean | null>(null);
  const [pasted, setPasted] = useState('');
  const now = new Date().toISOString();
  const facilityName = (id: string) => s.facilities.find(f => f.id === id)?.name ?? id;
  const unset = t(`${K}.unset`);

  if (s.workstations === null) return <LoadingState label={t(`${K}.loading`)} />;

  const draft = s.form?.draft;
  const areas = draft?.discipline ? FUNCTIONAL_AREAS_BY_DISCIPLINE[draft.discipline] : [];
  const nameProblem = (['NAME_REQUIRED', 'NAME_TOO_LONG', 'NAME_TAKEN'] as const).find(c => s.problems.includes(c));
  const problemText = (code: string) => (s.problems.includes(code as never) ? t(`${K}.problem.${code}`) : null);

  return (
    <div className="ps-workstations" data-testid="workstations-section">
      <div className="ps-conf-section-header">
        <div>
          <h2 className="ps-conf-section-title">{t(`${K}.title`)}</h2>
          <p className="ps-conf-section-subtitle">{t(`${K}.subtitle`)}</p>
        </div>
        <CapabilityButton capability="config:workstations:manage" className="ps-conf-btn-primary" disabled={s.busy || !!s.form} onClick={s.openRegister}>
          {t(`${K}.register`)}
        </CapabilityButton>
      </div>

      <p className="ps-workstations-note"><span className="ps-simulated-badge">{t(`${K}.simulated`)}</span> {t(`${K}.demoNote`)}</p>
      {s.problem && <p className="ps-workstations-note ps-workstations-note--problem" role="alert" data-testid="workstations-problem">{t(`${K}.problem.${s.problem}`, { defaultValue: s.problem })}</p>}
      {s.notice && <p className="ps-workstations-note" role="status">{t(`${K}.notice.${s.notice}`)}</p>}

      {s.revealed && (
        <section className="ps-workstations-token" role="status" aria-label={t(`${K}.tokenPanel.title`, { name: s.revealed.name })} data-testid="workstation-token-panel">
          <h3 className="ps-workstations-heading">{t(`${K}.tokenPanel.title`, { name: s.revealed.name })}</h3>
          <p className="ps-workstations-note">{t(`${K}.tokenPanel.warning`)}</p>
          {s.revealed.grace && <p className="ps-workstations-note">{t(`${K}.tokenPanel.grace`, { hours: WORKSTATION_PREVIOUS_TOKEN_GRACE_HOURS })}</p>}
          <code className="ps-workstations-token-value">{s.revealed.token}</code>
          <div className="ps-workstations-actions">
            <button type="button" className="ps-conf-btn-secondary" onClick={() => { void copyText(s.revealed!.token).then(setCopied); }}>
              {copied ? t(`${K}.copied`) : t(`${K}.copy`)}
            </button>
            <button type="button" className="ps-conf-btn-primary" onClick={() => { setCopied(null); s.clearRevealed(); }}>{t(`${K}.tokenPanel.done`)}</button>
          </div>
          {copied === false && <p className="ps-workstations-note" role="alert">{t(`${K}.copyFailed`)}</p>}
        </section>
      )}

      {s.form && draft && (
        <section className="ps-workstations-form" aria-label={s.form.editingId ? t(`${K}.form.editTitle`, { name: draft.name }) : t(`${K}.form.registerTitle`)} data-testid="workstation-form">
          <h3 className="ps-workstations-heading">{s.form.editingId ? t(`${K}.form.editTitle`, { name: draft.name }) : t(`${K}.form.registerTitle`)}</h3>
          <div className="ps-workstations-grid">
            <label className="ps-workstations-field">
              <span>{t(`${K}.form.name`)}</span>
              <input className="ps-conf-input" value={draft.name} placeholder={t(`${K}.placeholders.name`)} onChange={e => s.setDraft({ ...draft, name: e.target.value })} />
              {nameProblem && <span className="ps-workstations-error" role="alert">{t(`${K}.problem.${nameProblem}`)}</span>}
            </label>
            <label className="ps-workstations-field">
              <span>{t(`${K}.form.facility`)}</span>
              <select className="ps-conf-select" value={draft.facilityId} onChange={e => s.setDraft({ ...draft, facilityId: e.target.value })}>
                <option value="">{t(`${K}.form.facilityPick`)}</option>
                {s.facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              {problemText('FACILITY_REQUIRED') && <span className="ps-workstations-error" role="alert">{problemText('FACILITY_REQUIRED')}</span>}
            </label>
            <label className="ps-workstations-field">
              <span>{t(`${K}.form.room`)}</span>
              <input className="ps-conf-input" value={draft.roomLabel ?? ''} placeholder={t(`${K}.placeholders.room`)} onChange={e => s.setDraft({ ...draft, roomLabel: e.target.value })} />
              {problemText('ROOM_TOO_LONG') && <span className="ps-workstations-error" role="alert">{problemText('ROOM_TOO_LONG')}</span>}
            </label>
            <label className="ps-workstations-field">
              <span>{t(`${K}.form.discipline`)}</span>
              <select className="ps-conf-select" value={draft.discipline ?? ''} onChange={e => s.setDraft({ ...draft, discipline: (e.target.value || undefined) as typeof draft.discipline, functionalArea: undefined })}>
                <option value="">{t(`${K}.form.none`)}</option>
                {WORKSTATION_DISCIPLINES.map(d => <option key={d} value={d}>{t(`${K}.disciplines.${d}`)}</option>)}
              </select>
            </label>
            <label className="ps-workstations-field">
              <span>{t(`${K}.form.area`)}</span>
              <select className="ps-conf-select" value={draft.functionalArea ?? ''} disabled={areas.length === 0} onChange={e => s.setDraft({ ...draft, functionalArea: e.target.value || undefined })}>
                <option value="">{t(`${K}.form.none`)}</option>
                {areas.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              {problemText('AREA_NOT_IN_DISCIPLINE') && <span className="ps-workstations-error" role="alert">{problemText('AREA_NOT_IN_DISCIPLINE')}</span>}
            </label>
            <label className="ps-workstations-field">
              <span>{t(`${K}.form.pointOfCare`)}</span>
              <input className="ps-conf-input" value={draft.pointOfCare ?? ''} placeholder={t(`${K}.placeholders.pointOfCare`)} onChange={e => s.setDraft({ ...draft, pointOfCare: e.target.value })} />
              <span className="ps-workstations-hint">{t(`${K}.form.pointOfCareHint`)}</span>
              {problemText('POINT_OF_CARE_TOO_LONG') && <span className="ps-workstations-error" role="alert">{problemText('POINT_OF_CARE_TOO_LONG')}</span>}
            </label>
            <label className="ps-workstations-field">
              <span>{t(`${K}.form.reportPrinter`)}</span>
              <input className="ps-conf-input" list="ps-workstation-printers" value={draft.reportPrinterId ?? ''} placeholder={t(`${K}.placeholders.printer`)} onChange={e => s.setDraft({ ...draft, reportPrinterId: e.target.value })} />
            </label>
            <label className="ps-workstations-field">
              <span>{t(`${K}.form.labelPrinter`)}</span>
              <input className="ps-conf-input" list="ps-workstation-printers" value={draft.labelPrinterId ?? ''} placeholder={t(`${K}.placeholders.printer`)} onChange={e => s.setDraft({ ...draft, labelPrinterId: e.target.value })} />
            </label>
          </div>
          <datalist id="ps-workstation-printers">{s.printerIds.map(id => <option key={id} value={id} />)}</datalist>
          <p className="ps-workstations-hint">{t(`${K}.form.printerHint`)}</p>
          <div className="ps-workstations-actions">
            <CapabilityButton capability="config:workstations:manage" className="ps-conf-btn-primary" disabled={s.busy || s.problems.length > 0} onClick={() => { setCopied(null); void s.submit(); }}>
              {s.form.editingId ? t(`${K}.form.save`) : t(`${K}.form.registerSubmit`)}
            </CapabilityButton>
            <button type="button" className="ps-conf-btn-secondary" onClick={s.closeForm}>{t('common.cancel')}</button>
          </div>
        </section>
      )}

      {s.workstations.length === 0 ? <p className="ps-workstations-note" data-testid="workstations-empty">{t(`${K}.empty`)}</p> : (
        <div className="ps-conf-table-wrap"><div className="ps-conf-table-scroll">
          <table className="ps-conf-table">
            <thead><tr>
              <th className="ps-conf-th">{t(`${K}.columns.name`)}</th>
              <th className="ps-conf-th">{t(`${K}.columns.facility`)}</th>
              <th className="ps-conf-th">{t(`${K}.columns.room`)}</th>
              <th className="ps-conf-th">{t(`${K}.columns.role`)}</th>
              <th className="ps-conf-th">{t(`${K}.columns.printers`)}</th>
              <th className="ps-conf-th">{t(`${K}.columns.status`)}</th>
              <th className="ps-conf-th">{t(`${K}.columns.token`)}</th>
              <th className="ps-conf-th">{t(`${K}.columns.lastSeen`)}</th>
              <th className="ps-conf-th"><span className="ps-sr-only">{t(`${K}.columns.actions`)}</span></th>
            </tr></thead>
            <tbody>
              {s.workstations.map(w => {
                const state = workstationState(w, now);
                const isRevoked = w.status === 'revoked';
                return (
                  <tr key={w.id} className="ps-conf-tr" data-testid={`workstation-row-${w.id}`}>
                    <td className="ps-conf-td">
                      {w.name}
                      {s.boundId === w.id && <span className="ps-workstations-here">{t(`${K}.thisComputer`)}</span>}
                    </td>
                    <td className="ps-conf-td">{facilityName(w.facilityId)}</td>
                    <td className="ps-conf-td">{w.roomLabel ?? unset}</td>
                    <td className="ps-conf-td">{w.functionalArea ?? unset}</td>
                    <td className="ps-conf-td">{t(`${K}.printersSummary`, { report: w.reportPrinterId ?? unset, label: w.labelPrinterId ?? unset })}</td>
                    <td className="ps-conf-td">
                      <span className={`ps-workstations-status ps-workstations-status--${state}`}>{t(`${K}.status.${state}`)}</span>
                      {isRevoked && w.revokedAt && w.revokedReason && (
                        <span className="ps-workstations-hint">{t(`${K}.revokedLine`, {
                          when: formatDateTime(w.revokedAt, i18n.language), who: w.revokedBy ?? '',
                          reason: t(`${K}.revokeReasons.${w.revokedReason.code}`) + (w.revokedReason.note ? `: ${w.revokedReason.note}` : ''),
                        })}</span>
                      )}
                    </td>
                    <td className="ps-conf-td">{isRevoked ? unset : t(`${K}.tokenSummary`, { hint: w.tokenHint, when: formatDateTime(w.tokenExpiresAt, i18n.language) })}</td>
                    <td className="ps-conf-td">{w.lastSeenAt ? formatDateTime(w.lastSeenAt, i18n.language) : t(`${K}.never`)}</td>
                    <td className="ps-conf-td">
                      {!isRevoked && (revoking?.id === w.id ? (
                        <span className="ps-workstations-revoke">
                          <span className="ps-workstations-reasons" role="group" aria-label={t(`${K}.revokeReason`)}>
                            {REVOKE_REASON_CODES.map(code => (
                              <button key={code} type="button" className="ps-workstations-reason" aria-pressed={revoking.code === code}
                                onClick={() => setRevoking({ ...revoking, code })}>{t(`${K}.revokeReasons.${code}`)}</button>
                            ))}
                          </span>
                          <input className="ps-conf-input" aria-label={t(`${K}.revokeNote`)} maxLength={REVOKE_NOTE_MAX}
                            placeholder={revoking.code === 'other' ? t(`${K}.placeholders.revokeNoteRequired`) : t(`${K}.placeholders.revokeNoteOptional`)}
                            value={revoking.note} onChange={e => setRevoking({ ...revoking, note: e.target.value })} />
                          <CapabilityButton capability="config:workstation-tokens:manage" className="ps-conf-btn-primary ps-workstations-btn-danger"
                            disabled={!revoking.code || !revokeReasonValid({ code: revoking.code, note: revoking.note }) || s.busy}
                            onClick={() => { if (revoking.code) void s.revoke(w, { code: revoking.code, note: revoking.note }).then(ok => { if (ok) setRevoking(null); }); }}>
                            {t(`${K}.confirmRevoke`)}
                          </CapabilityButton>
                          <button type="button" className="ps-conf-btn-secondary" onClick={() => setRevoking(null)}>{t('common.cancel')}</button>
                        </span>
                      ) : (
                        <span className="ps-workstations-actions">
                          <CapabilityButton capability="config:workstations:manage" className="ps-conf-btn-secondary" disabled={s.busy || !!s.form} onClick={() => s.openEdit(w)}>{t(`${K}.edit`)}</CapabilityButton>
                          <button type="button" className="ps-conf-btn-secondary" onClick={() => s.useThisComputer(s.boundId === w.id ? null : w.id)}>
                            {s.boundId === w.id ? t(`${K}.stopUsing`) : t(`${K}.useThisComputer`)}
                          </button>
                          <CapabilityButton capability="config:workstation-tokens:manage" className="ps-conf-btn-secondary" disabled={s.busy} onClick={() => { setCopied(null); void s.rotate(w); }}>{t(`${K}.rotate`)}</CapabilityButton>
                          <CapabilityButton capability="config:workstation-tokens:manage" className="ps-conf-btn-secondary" onClick={() => setRevoking({ id: w.id, note: '' })}>{t(`${K}.revoke`)}</CapabilityButton>
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

      <section className="ps-workstations-card" aria-labelledby="ps-workstations-test">
        <h3 id="ps-workstations-test" className="ps-workstations-heading">{t(`${K}.checkin.title`)} <span className="ps-simulated-badge">{t(`${K}.simulated`)}</span></h3>
        <p className="ps-workstations-note">{t(`${K}.checkin.hint`)}</p>
        <div className="ps-workstations-actions">
          <input className="ps-conf-input" aria-label={t(`${K}.checkin.title`)} value={pasted} placeholder={t(`${K}.placeholders.token`)} onChange={e => { setPasted(e.target.value); s.clearCheckIn(); }} />
          <CapabilityButton capability="config:workstation-tokens:manage" className="ps-conf-btn-secondary" disabled={!pasted.trim()} onClick={() => { void s.test(pasted); }}>{t(`${K}.checkin.button`)}</CapabilityButton>
        </div>
        {s.checkIn && (
          <p className={`ps-workstations-note${s.checkIn.result === 'ok' ? '' : ' ps-workstations-note--problem'}`} role="status" data-testid="workstation-checkin-result">
            {t(`${K}.checkin.results.${s.checkIn.result}`, { name: s.checkIn.workstation?.name ?? '' })}
          </p>
        )}
      </section>
    </div>
  );
};

export default WorkstationsSection;
