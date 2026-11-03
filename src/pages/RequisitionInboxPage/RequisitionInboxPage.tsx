// src/pages/RequisitionInboxPage/RequisitionInboxPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 762 (Automated Batch Requisition & Document Ingestion spec §2.3, §3): the Requisition Inbox, reached from the
// Accession screen (sub-screen 'requisitionInbox', requisition:inbox:review). It shows the last ingestion run, the
// Unmatched Requisitions queue (scans whose barcode matched no case, or had none) and the requisitions linked lately.
// A scan in the queue can be viewed, linked to a case by scanning or typing its accession, or discarded with a reason.
// Everything is decided and audited in services/requisitions/requisitionService.ts; the state is useRequisitionInbox.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { toast } from 'react-toastify';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { PhiToastMessage } from '@/components/Common/PhiToastMessage';
import { StationScanField } from '@/components/Workstation/StationScanField';
import { RequisitionPreview } from '@/components/Requisitions/RequisitionPreview';
import { useRequisitionInbox } from '@/hooks/useRequisitionInbox';
import { useRequisitionActionEvents } from '@/hooks/useRequisitionActionEvents';
import { DISCARD_REASONS, WAIVER_REASONS, type CaseToLink, type DiscardReason, type PageRange, type UnmatchedRequisition, type WaiverReason } from '@/services';
import { runOutcome } from '@/services/requisitions/requisitionRules';
import { formatDateTime } from '@/utils/formatDate';
import '@/components/Requisitions/Requisitions.css';

type Viewing = { ref: { linkId: string } | { unmatchedId: string }; pages: PageRange; fileName: string };

export default function RequisitionInboxPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const inbox = useRequisitionInbox();
  const [viewing, setViewing] = useState<Viewing | null>(null);
  const [reasons, setReasons] = useState<Record<string, DiscardReason>>({});
  const [waivers, setWaivers] = useState<Record<string, WaiverReason>>({});
  // Search results for linking, per queued scan (when what was typed is not an accession).
  const [found, setFound] = useState<Record<string, { query: string; cases: CaseToLink[] }>>({});
  const when = (iso: string) => formatDateTime(iso, i18n.language);
  const pagesText = (p: PageRange) => (p.from === p.to ? t('requisitions.pageSingle', { page: p.from }) : t('requisitions.pageRange', { from: p.from, to: p.to }));

  const run = async () => {
    const r = await inbox.runNow();
    if (!r.ok) toast.error(t(`requisitions.errors.${r.error === 'NOT_PERMITTED' ? 'notPermitted' : 'runFailed'}`));
  };
  const link = async (u: UnmatchedRequisition, accession: string, how?: 'search') => {
    const r = await inbox.reassociate(u.id, accession, how);
    if (!r.ok && r.error === 'NOT_FOUND' && !how) {
      // Not an accession: search by accession, patient name or MRN and offer the cases found.
      const cases = await inbox.findCases(accession);
      setFound(f => ({ ...f, [u.id]: { query: accession, cases } }));
      return;
    }
    if (r.ok) {
      setFound(f => { const n = { ...f }; delete n[u.id]; return n; });
      toast.success(<PhiToastMessage>{t('requisitions.toast.linked', { accession: r.data.accession })}</PhiToastMessage>);
      if (viewing && 'unmatchedId' in viewing.ref && viewing.ref.unmatchedId === u.id) setViewing(null);
    } else toast.error(<PhiToastMessage>{t(`requisitions.errors.${r.error === 'NOT_FOUND' ? 'noSuchCase' : r.error === 'NOT_PERMITTED' ? 'notPermitted' : 'alreadyClosed'}`, { accession })}</PhiToastMessage>);
  };
  // Alt+G or "run ingestion now" (constants/requisitionActionGroup.ts), when this role may run it here.
  useRequisitionActionEvents({ runNow: () => { if (inbox.canRunHere && !inbox.running) void run(); } });
  // The reason picked for a flagged case (the first one until another is picked).
  const waiverReasonFor = (flag: { caseId: string }) => waivers[flag.caseId] ?? WAIVER_REASONS[0];
  const waive = async (caseId: string) => {
    const r = await inbox.waive(caseId, waivers[caseId] ?? WAIVER_REASONS[0]);
    if (r.ok) toast.success(t('requisitions.toast.waived'));
    else toast.error(t(`requisitions.errors.${r.error === 'NOT_PERMITTED' ? 'notPermitted' : 'alreadyClosed'}`));
  };
  const discard = async (u: UnmatchedRequisition) => {
    const r = await inbox.discard(u.id, reasons[u.id] ?? DISCARD_REASONS[0]);
    if (r.ok) toast.success(t('requisitions.toast.discarded'));
    else toast.error(t(`requisitions.errors.${r.error === 'NOT_PERMITTED' ? 'notPermitted' : 'alreadyClosed'}`));
  };

  const unmatched = inbox.unmatched;
  const recent = inbox.recentLinks;
  const facilityName = (id: string | null | undefined) => (id ? inbox.facilityNames[id] ?? id : t('requisitions.allFacilities'));

  return (
    <div className="ps-req-page-shell">
      <div className="ps-req-head">
        <div>
          <h1 className="ps-req-title">{t('requisitions.inbox.title')}</h1>
          <p className="ps-req-subtitle">{t('requisitions.inbox.subtitle')}</p>
        </div>
        <div className="ps-req-head-actions">
          {inbox.facilityOptions.length > 0 && (
            <select className="ps-req-select" aria-label={t('requisitions.inbox.facilityFilter')} value={inbox.facilityId} onChange={e => inbox.setFacilityId(e.target.value)}>
              <option value="">{t('requisitions.inbox.everyFacility')}</option>
              {inbox.facilityOptions.map(f => <option key={f} value={f}>{facilityName(f)}</option>)}
            </select>
          )}
          <button type="button" className="ps-btn-small" onClick={() => navigate('/accession')}>{t('requisitions.inbox.backToAccession')}</button>
        </div>
      </div>

      {inbox.loadError && <p className="ps-req-problem" role="alert">{t('requisitions.errors.notPermitted')}</p>}

      <section className="ps-req-card">
        <div className="ps-req-card-row">
          <div>
            <div className="ps-req-card-title">{t('requisitions.inbox.ingestion')}</div>
            {inbox.sources.map(src => (
              <div key={src.id} className="ps-req-meta ps-req-dots">
                <span className="ps-req-facility">{facilityName(src.facilityId)}</span>
                <span>{t('requisitions.inbox.sourceLine', { name: src.name, location: src.location, minutes: src.scheduleMinutes })}</span>
                {!src.enabled && <span>{t('requisitions.inbox.sourceOff')}</span>}
              </div>
            ))}
            {inbox.loaded && inbox.sources.length === 0 && <div className="ps-req-meta">{t('requisitions.inbox.noSources')}</div>}
          </div>
          {inbox.canRunHere
            ? <CapabilityButton capability="requisition:ingestion:run" className="ps-btn-primary" disabled={inbox.running || inbox.sources.every(src => !src.enabled)} onClick={() => { void run(); }}>
                {t(inbox.running ? 'requisitions.inbox.running' : 'requisitions.inbox.runNow')}
              </CapabilityButton>
            : <span className="ps-req-meta">{t('requisitions.inbox.serverRuns')}</span>}
        </div>
        {inbox.refusedSourceIds.length > 0 && (
          <p className="ps-req-problem" role="alert">{t('requisitions.inbox.notRun', { names: inbox.refusedSourceIds.map(inbox.sourceName).join(', ') })}</p>
        )}
        {inbox.lastRuns.map(last => (
          <div key={last.id} className={`ps-req-run ps-req-run--${runOutcome(last)}`} role="status">
            {inbox.sources.length > 1 && <div className="ps-req-meta">{inbox.sourceName(last.sourceId)}</div>}
            <div>{t('requisitions.inbox.lastRun', { when: when(last.at), files: last.files, matched: last.matched, unmatched: last.unmatched, rejected: last.rejected.length })}</div>
            {last.rejected.map(r => (
              <div key={r.fileName} className="ps-req-meta ps-req-dots">
                <span data-phi="requisition">{r.fileName}</span><span>{t(`requisitions.rejected.${r.reason}`)}</span>
              </div>
            ))}
          </div>
        ))}
        {inbox.loaded && inbox.lastRuns.length === 0 && <p className="ps-req-meta">{t('requisitions.inbox.noRunYet')}</p>}
      </section>

      <div className={`ps-req-columns${viewing ? ' ps-req-columns--viewing' : ''}`}>
        <div>
          {inbox.missing.length > 0 && (
            <section className="ps-req-card">
              <div className="ps-req-card-title">{t('requisitions.missing.title', { count: inbox.missing.length })}</div>
              <p className="ps-req-meta">{t('requisitions.missing.hint')}</p>
              <ul className="ps-req-list">
                {inbox.missing.map(m => (
                  <li key={m.caseId} className="ps-req-item">
                    <div className="ps-req-item-head">
                      <span className="ps-req-acc" data-phi="accession">{m.accession}</span>
                      <span className="ps-req-meta ps-req-dots">
                        <span className="ps-req-facility">{facilityName(m.facilityId)}</span>
                        <span>{t(`requisitions.origins.${m.origin}`)}</span>
                        <span>{t('requisitions.missing.accessioned', { when: when(m.accessionedAt) })}</span>
                      </span>
                    </div>
                    <div className="ps-req-reason">{m.deficiencyId ? t('requisitions.missing.deficiencyRaised') : t('requisitions.missing.flagged')}</div>
                    <div className="ps-req-item-actions">
                      <span className="ps-req-meta">{t('requisitions.missing.linkHint')}</span>
                      <span className="ps-req-dots-none">
                        <select className="ps-req-select" aria-label={t('requisitions.missing.reason')} value={waiverReasonFor(m)}
                          onChange={e => setWaivers(w => ({ ...w, [m.caseId]: e.target.value as WaiverReason }))}>
                          {WAIVER_REASONS.map(r => <option key={r} value={r}>{t(`requisitions.waiverReasons.${r}`)}</option>)}
                        </select>
                        <CapabilityButton capability="requisition:inbox:resolve" className="ps-btn-ghost-dark" onClick={() => { void waive(m.caseId); }}>{t('requisitions.missing.waive')}</CapabilityButton>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="ps-req-card">
            <div className="ps-req-card-title">{t('requisitions.inbox.unmatchedTitle', { count: unmatched.length })}</div>
            {unmatched.length === 0 && <p className="ps-req-meta">{t('requisitions.inbox.unmatchedEmpty')}</p>}
            <ul className="ps-req-list">
              {unmatched.map(u => (
                <li key={u.id} className="ps-req-item">
                  <div className="ps-req-item-head">
                    <span className="ps-req-file" data-phi="requisition">{u.fileName}</span>
                    <span className="ps-req-meta ps-req-dots"><span>{pagesText(u.pages)}</span><span>{when(u.receivedAt)}</span></span>
                  </div>
                  <div className="ps-req-meta ps-req-dots">
                    <span className="ps-req-facility">{facilityName(u.facilityId)}</span><span>{inbox.sourceName(u.sourceId)}</span>
                  </div>
                  {u.overdueAt && <div className="ps-req-overdue" role="note">{t('requisitions.withoutCase')}</div>}
                  <div className="ps-req-reason">
                    {u.reason === 'noMatch'
                      ? <span className="ps-req-dots"><span data-phi="accession">{u.barcode}</span><span>{t('requisitions.reason.noMatch')}</span></span>
                      : t('requisitions.reason.noBarcode')}
                  </div>
                  <div className="ps-req-item-actions">
                    <button type="button" className="ps-btn-small" onClick={() => setViewing({ ref: { unmatchedId: u.id }, pages: u.pages, fileName: u.fileName })}>{t('requisitions.view')}</button>
                    <div className="ps-req-link-field">
                      <StationScanField compact keepFocus={false} phiKind="accession"
                        placeholder={t('requisitions.inbox.linkPlaceholder')} submitLabel={t('requisitions.inbox.link')}
                        onScan={value => link(u, value)} />
                    </div>
                    <CapabilityButton capability="case:accession:create" className="ps-btn-small" onClick={() => navigate(`/accession?fromRequisition=${encodeURIComponent(u.id)}`)}>
                      {t('requisitions.inbox.newCase')}
                    </CapabilityButton>
                    <select className="ps-req-select" aria-label={t('requisitions.inbox.discardReason')} value={reasons[u.id] ?? DISCARD_REASONS[0]}
                      onChange={e => setReasons(r => ({ ...r, [u.id]: e.target.value as DiscardReason }))}>
                      {DISCARD_REASONS.map(r => <option key={r} value={r}>{t(`requisitions.discardReasons.${r}`)}</option>)}
                    </select>
                    <CapabilityButton capability="requisition:inbox:resolve" className="ps-btn-ghost-dark" onClick={() => { void discard(u); }}>{t('requisitions.inbox.discard')}</CapabilityButton>
                  </div>
                  {found[u.id] && (
                    <div className="ps-req-found" role="region" aria-label={t('requisitions.inbox.foundTitle')}>
                      {found[u.id].cases.length === 0
                        ? <p className="ps-req-meta">{t('requisitions.inbox.foundNone')}</p>
                        : found[u.id].cases.map(c => (
                          <div key={c.caseId} className="ps-req-found-row">
                            <span className="ps-req-dots">
                              <span className="ps-req-acc" data-phi="accession">{c.accession}</span>
                              <span data-phi="name">{c.patientName}</span>
                              {c.accessionedAt && <span>{when(c.accessionedAt)}</span>}
                            </span>
                            <CapabilityButton capability="requisition:inbox:resolve" className="ps-btn-small" onClick={() => { void link(u, c.accession, 'search'); }}>{t('requisitions.inbox.link')}</CapabilityButton>
                          </div>
                        ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="ps-req-card">
            <div className="ps-req-card-title">{t('requisitions.inbox.recentTitle')}</div>
            {recent.length === 0 && <p className="ps-req-meta">{t('requisitions.inbox.recentEmpty')}</p>}
            <ul className="ps-req-list">
              {recent.map(l => (
                <li key={l.id} className="ps-req-item ps-req-item--linked">
                  <div className="ps-req-item-head">
                    <span className="ps-req-acc" data-phi="accession">{l.accession}</span>
                    <span className="ps-req-meta ps-req-dots"><span data-phi="requisition">{l.fileName}</span><span>{pagesText(l.pages)}</span><span>{when(l.ingestedAt)}</span></span>
                  </div>
                  <div className="ps-req-item-actions">
                    <span className="ps-req-meta">{l.matchedBy === 'manual' ? t('requisitions.matchedByHand', { name: l.linkedBy ?? '' }) : t('requisitions.matchedAutomatically')}</span>
                    <button type="button" className="ps-btn-small" onClick={() => setViewing({ ref: { linkId: l.id }, pages: l.pages, fileName: l.fileName })}>{t('requisitions.view')}</button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
        {viewing && <RequisitionPreview target={viewing} onClose={() => setViewing(null)} />}
      </div>
    </div>
  );
}
