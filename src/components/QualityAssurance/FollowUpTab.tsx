// src/components/QualityAssurance/FollowUpTab.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 454 (Pete, Oct 4): Quality Assurance → Operations → "Follow-up not
// received". It lists expected follow-ups: histology after an abnormal
// cytology result, and a resection or excision after a surgical case marked
// "follow-up expected" at sign-out. Each shows where it stands against its
// window.
//
// From here the lab:
//   • records what happened (a disposition), which closes the follow-up
//     (qa:follow-up:record);
//   • emails the ordering clinician, when the facility has turned that on.
//     Nothing is sent until the user has reviewed the draft and pressed Send
//     (qa:follow-up-clinician:email);
//   • downloads the list as CSV (qa:follow-up:export), for one facility or
//     all (Batch 544: the scope picker filters the list and the export).
// Decisions live in services/followUp/. Opening the tab also sends any
// internal alerts now due.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  loadFollowUpItems, sendFollowUpAlertsLive, recordFollowUpDispositionLive, reopenFollowUpLive,
  draftFollowUpClinicianEmailLive, emailOrderingClinicianLive,
  filterFollowUpItems, countFollowUpItems, followUpCaseView, followUpExportRows, followUpOutcomeAction,
  canOfferClinicianEmail, clinicianEmailProblem, dispositionProblem,
  FOLLOW_UP_DISPOSITIONS, MAX_FOLLOW_UP_NOTE, MAX_FOLLOW_UP_EMAIL_SUBJECT, MAX_FOLLOW_UP_EMAIL_BODY,
  type FollowUpItem, type FollowUpFilter, type FollowUpDisposition, type LoadedFollowUps,
} from '@/services';
import { useAuth } from '@/contexts/AuthContext';
import { useOpenCase } from '@/hooks/useOpenCase';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { exportQaReportRows } from './qaReportUtils';
import { QaScopeSwitcher } from './QaScopeSwitcher';
import { useQaCaseScope } from '@/hooks/useQaCaseScope';
import { formatDate, formatDateTime } from '@/utils/formatDate';
import '@/pathscribe.css';
import { LoadingState } from '@/components/Common/LoadingState';

const K = 'followUp.report';
const FILTERS: FollowUpFilter[] = ['attention', 'overdue', 'dueSoon', 'open', 'resolved', 'all'];

type Dialog =
  | { kind: 'disposition'; item: FollowUpItem }
  | { kind: 'email'; item: FollowUpItem };

interface Props {
  /** Told how many need attention (the tile shows it). */
  onAttentionCountChange?: (count: number) => void;
}

export const FollowUpTab: React.FC<Props> = ({ onAttentionCountChange }) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const openCasePage = useOpenCase();
  const [loaded, setLoaded] = useState<LoadedFollowUps | null>(null);
  const [filter, setFilter] = useState<FollowUpFilter>('attention');
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [disposition, setDisposition] = useState<FollowUpDisposition | ''>('');
  const [note, setNote] = useState('');
  const [email, setEmail] = useState({ to: '', subject: '', body: '' });
  const [drafting, setDrafting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await loadFollowUpItems();
    setLoaded(data);
    onAttentionCountChange?.(filterFollowUpItems(data.items, 'attention').length);
  }, [onAttentionCountChange]);

  useEffect(() => {
    void sendFollowUpAlertsLive().catch(() => undefined).finally(() => { void load(); });
  }, [load]);

  const qa = useQaCaseScope();
  const allItems = useMemo(() => loaded?.items ?? [], [loaded]);
  const items = useMemo(() => qa.filter(allItems, i => i), [qa, allItems]);
  const rows = useMemo(() => filterFollowUpItems(items, filter), [items, filter]);
  const counts = useMemo(() => countFollowUpItems(items), [items]);
  const date = (iso?: string) => formatDate(iso, i18n.language);
  const me = user ? { id: user.id, name: user.name ?? user.id } : null;

  const openDisposition = (item: FollowUpItem) => { setDialog({ kind: 'disposition', item }); setDisposition(''); setNote(''); setError(null); };
  // A draft that arrives after its dialog was closed or replaced is dropped.
  const draftRequest = useRef(0);
  const openEmail = async (item: FollowUpItem) => {
    const request = ++draftRequest.current;
    setDialog({ kind: 'email', item }); setError(null); setDrafting(true); setEmail({ to: '', subject: '', body: '' });
    const draft = await draftFollowUpClinicianEmailLive(item, user?.name ?? '', iso => formatDate(iso, i18n.language));
    if (request !== draftRequest.current) return;
    setEmail({ to: draft.to, subject: draft.subject, body: draft.body });
    setDrafting(false);
  };
  const close = () => { draftRequest.current++; setDialog(null); setError(null); };
  const errorText = (reason: string) => t(`followUp.errors.${reason}`, { defaultValue: t('followUp.errors.failed') });

  const saveDisposition = async () => {
    if (dialog?.kind !== 'disposition' || !me) return;
    const problem = dispositionProblem(disposition, note);
    if (problem) { setError(errorText(problem)); return; }
    setBusy(true);
    const res = await recordFollowUpDispositionLive(dialog.item, disposition as FollowUpDisposition, note, me);
    setBusy(false);
    if (res.ok === false) { setError(errorText(res.reason)); return; }
    close();
    await load();
  };

  const reopen = async (item: FollowUpItem) => {
    if (!me) return;
    const res = await reopenFollowUpLive(item, me);
    if (res.ok === false) { setNotice(errorText(res.reason)); return; }
    await load();
  };

  const sendEmail = async () => {
    if (dialog?.kind !== 'email' || !me) return;
    const problem = clinicianEmailProblem(email);
    if (problem) { setError(errorText(problem)); return; }
    setBusy(true);
    const res = await emailOrderingClinicianLive(dialog.item, email, me);
    setBusy(false);
    if (res.ok === false) { setError(errorText(res.reason)); return; }
    close();
    setNotice(t(`${K}.emailSent`, { to: email.to.trim() }));
    await load();
  };

  const handleExport = () => {
    void exportQaReportRows('qa:follow-up:export', followUpExportRows(rows), qa.filename('follow-up-not-received'), qa.context, { scope: qa.scope, filter });
  };

  if (!loaded) return <LoadingState label={t(`${K}.loading`)} />;

  return (
    <div className="ps-followup">
      <p className="ps-conf-card-description--tight">{t(`${K}.intro`)}</p>

      <div className="ps-qa-summary-tiles">
        {(['overdue', 'dueSoon', 'pending', 'received', 'closed'] as const).map(s => (
          <div key={s} className={`ps-qa-tile${s === 'overdue' && counts.overdue > 0 ? ' ps-qa-tile--warning' : ''}`}>
            <div className={`ps-qa-tile-value${s === 'overdue' && counts.overdue > 0 ? ' ps-qa-tile-value--warning' : ''}`}>{counts[s]}</div>
            <div className="ps-qa-tile-label">{t(`followUp.status.${s}`)}</div>
          </div>
        ))}
      </div>

      <div className="ps-qa-tab-toolbar">
        <div className="ps-followup__filters" role="group" aria-label={t(`${K}.filterLabel`)}>
          {FILTERS.map(f => (
            <button key={f} className={`ps-followup__filter${filter === f ? ' ps-followup__filter--active' : ''}`} aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {t(`${K}.filters.${f}`)}
            </button>
          ))}
        </div>
        <QaScopeSwitcher scope={qa.scope} onChange={qa.setScope} visibleClientIds={qa.facilityIds(allItems, i => i)} />
        <CapabilityButton capability="qa:follow-up:export" context={qa.context} className="ps-conf-btn-secondary" onClick={handleExport}>{t('common.export')}</CapabilityButton>
      </div>

      {notice && <div className="ps-followup__notice" role="status">{notice}</div>}

      {rows.length === 0 ? (
        <div className="ps-conf-empty">{t(`${K}.empty.${filter}`)}</div>
      ) : (
        <div className="ps-conf-table-wrap">
          <div className="ps-conf-table-scroll">
            <table className="ps-conf-table">
              <thead className="ps-conf-thead-sticky">
                <tr>
                  <th className="ps-conf-th">{t(`${K}.columns.status`)}</th>
                  <th className="ps-conf-th">{t(`${K}.columns.case`)}</th>
                  <th className="ps-conf-th">{t(`${K}.columns.kind`)}</th>
                  <th className="ps-conf-th">{t(`${K}.columns.due`)}</th>
                  <th className="ps-conf-th">{t(`${K}.columns.clinician`)}</th>
                  <th className="ps-conf-th">{t(`${K}.columns.contacted`)}</th>
                  <th className="ps-conf-th">{t(`${K}.columns.outcome`)}</th>
                  <th className="ps-conf-th">{t(`${K}.columns.actions`)}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(item => {
                  const lastContact = item.record.clinicianContacts.slice(-1)[0];
                  const settings = loaded.settingsFor(item.facilityId);
                  return (
                    <tr key={item.key} className="ps-conf-tr">
                      <td className="ps-conf-td">
                        <span className={`ps-followup__status ps-followup__status--${item.status}`}>{t(`followUp.status.${item.status}`)}</span>
                        <div className="ps-specreq-meta">
                          {item.daysOverdue !== null ? t(`${K}.daysOverdue`, { count: item.daysOverdue })
                            : item.daysRemaining !== null ? t(`${K}.daysRemaining`, { count: item.daysRemaining }) : ' '}
                        </div>
                      </td>
                      <td className="ps-conf-td">
                        <button className="ps-conf-btn-row" onClick={() => void openCasePage(item.caseId, followUpCaseView(item))}>
                          <span data-phi="accession">{item.accession}</span>
                        </button>
                        {item.receivedAccession && (
                          <div className="ps-specreq-meta">{t(`${K}.receivedIn`)} <span data-phi="accession">{item.receivedAccession}</span></div>
                        )}
                        {item.possibleAccession && (
                          <div className="ps-specreq-meta ps-followup__possible">{t(`${K}.possibleMatch`)} <span data-phi="accession">{item.possibleAccession}</span></div>
                        )}
                      </td>
                      <td className="ps-conf-td">{t(`followUp.kind.${item.kind}`)}</td>
                      <td className="ps-conf-td">
                        {date(item.dueAt)}
                        <div className="ps-specreq-meta">{t(`${K}.windowLine`, { start: date(item.window.startsAt), days: item.window.windowDays })}</div>
                      </td>
                      <td className="ps-conf-td">{item.requestingProvider || t(`${K}.clinicianNotRecorded`)}</td>
                      <td className="ps-conf-td">
                        {lastContact
                          ? <>{formatDateTime(lastContact.sentAt, i18n.language)}<div className="ps-specreq-meta">{t(`${K}.contactedBy`, { name: lastContact.sentByName, count: item.record.clinicianContacts.length })}</div></>
                          : t(`${K}.notEmailed`)}
                      </td>
                      <td className="ps-conf-td">
                        {item.record.disposition
                          ? <>{t(`followUp.dispositions.${item.record.disposition.value}`)}<div className="ps-specreq-meta">{t(`${K}.recordedBy`, { name: item.record.disposition.recordedByName, date: date(item.record.disposition.recordedAt) })}</div></>
                          : t(`${K}.noOutcome`)}
                      </td>
                      <td className="ps-conf-td">
                        <div className="ps-qa-inline-actions">
                          {followUpOutcomeAction(item) === 'reopen' ? (
                            <CapabilityButton capability="qa:follow-up:record" context={{ caseId: item.caseId, facilityId: item.facilityId ?? null }} className="ps-conf-btn-secondary" onClick={() => void reopen(item)}>{t(`${K}.reopen`)}</CapabilityButton>
                          ) : followUpOutcomeAction(item) === 'record' && (
                            <CapabilityButton capability="qa:follow-up:record" context={{ caseId: item.caseId, facilityId: item.facilityId ?? null }} className="ps-conf-btn-secondary" onClick={() => openDisposition(item)}>{t(`${K}.recordOutcome`)}</CapabilityButton>
                          )}
                          {canOfferClinicianEmail(item, settings) && (
                            <CapabilityButton capability="qa:follow-up-clinician:email" context={{ caseId: item.caseId, facilityId: item.facilityId ?? null }} className="ps-conf-btn-primary" onClick={() => void openEmail(item)}>{t(`${K}.emailClinician`)}</CapabilityButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {dialog && (
        <div className="ps-ms-overlay">
          <div className="ps-ms-modal">
            <div className="ps-ms-header">{dialog.kind === 'disposition' ? t(`${K}.dispositionTitle`) : t(`${K}.emailTitle`)}</div>
            <div className="ps-ms-body">
              <p className="ps-specreq-meta"><span data-phi="accession">{dialog.item.accession}</span></p>
              <p className="ps-specreq-meta">
                {t(`${K}.dialogMeta`, { kind: t(`followUp.kind.${dialog.item.kind}`), status: t(`followUp.status.${dialog.item.status}`), date: date(dialog.item.dueAt) })}
              </p>

              {dialog.kind === 'disposition' ? (
                <>
                  <div className="ps-conf-form-field">
                    <label className="ps-conf-label" htmlFor="followup-disposition">{t(`${K}.dispositionLabel`)} <span className="ps-conf-required">*</span></label>
                    <select id="followup-disposition" className="ps-conf-select" value={disposition} onChange={e => setDisposition(e.target.value as FollowUpDisposition)}>
                      <option value="">{t(`${K}.dispositionPlaceholder`)}</option>
                      {FOLLOW_UP_DISPOSITIONS.map(d => <option key={d} value={d}>{t(`followUp.dispositions.${d}`)}</option>)}
                    </select>
                  </div>
                  <div className="ps-conf-form-field">
                    <label className="ps-conf-label" htmlFor="followup-note">
                      {t(`${K}.noteLabel`)}{disposition === 'other' && <> <span className="ps-conf-required">*</span></>}
                    </label>
                    <textarea id="followup-note" className="ps-conf-input ps-followup__textarea" maxLength={MAX_FOLLOW_UP_NOTE} value={note} onChange={e => setNote(e.target.value)} placeholder={t(`${K}.notePlaceholder`)} />
                    <span className="ps-conf-field-hint">{t(`${K}.noteHint`)}</span>
                  </div>
                </>
              ) : drafting ? (
                <LoadingState label={t(`${K}.drafting`)} />
              ) : (
                <>
                  <p className="ps-conf-field-hint">{t(`${K}.emailReviewHint`)}</p>
                  <div className="ps-conf-form-field">
                    <label className="ps-conf-label" htmlFor="followup-email-to">{t(`${K}.emailTo`)} <span className="ps-conf-required">*</span></label>
                    <input id="followup-email-to" type="email" className="ps-conf-input" value={email.to} onChange={e => setEmail({ ...email, to: e.target.value })} />
                    {!email.to && <span className="ps-conf-field-hint">{t(`${K}.emailNoAddress`)}</span>}
                  </div>
                  <div className="ps-conf-form-field" data-phi="accession">
                    <label className="ps-conf-label" htmlFor="followup-email-subject">{t(`${K}.emailSubject`)} <span className="ps-conf-required">*</span></label>
                    <input id="followup-email-subject" className="ps-conf-input" maxLength={MAX_FOLLOW_UP_EMAIL_SUBJECT} value={email.subject} onChange={e => setEmail({ ...email, subject: e.target.value })} />
                  </div>
                  <div className="ps-conf-form-field" data-phi="accession">
                    <label className="ps-conf-label" htmlFor="followup-email-body">{t(`${K}.emailBody`)} <span className="ps-conf-required">*</span></label>
                    <textarea id="followup-email-body" className="ps-conf-input ps-followup__email-body" maxLength={MAX_FOLLOW_UP_EMAIL_BODY} value={email.body} onChange={e => setEmail({ ...email, body: e.target.value })} />
                    <span className="ps-conf-field-hint">{t(`${K}.emailMinimumHint`)}</span>
                  </div>
                </>
              )}
              {error && <div className="ps-conf-error-text" role="alert">{error}</div>}
            </div>
            <div className="ps-ms-footer">
              <button className="ps-ms-btn-cancel" onClick={close}>{t('common.cancel')}</button>
              {dialog.kind === 'disposition' ? (
                <button className="ps-ms-btn-apply" disabled={busy} onClick={() => { void saveDisposition(); }}>{t(`${K}.saveDisposition`)}</button>
              ) : (
                <button className="ps-ms-btn-apply" disabled={busy || drafting} onClick={() => { void sendEmail(); }}>{t(`${K}.send`)}</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FollowUpTab;
