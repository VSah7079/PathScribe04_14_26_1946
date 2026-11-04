// src/components/CaseAttachments/CaseAttachmentsModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 742 (Pete, "Case Image & File Attachments (Release 1)", Oct 30, 2026): the Attachments window, opened from
// the case's Attachments badge on the report page and in the Cytology Workspace. It replaces the Batch 609 Attach
// images screen.
//
// Four groups (§2B): gross photos, intraoperative and consultation captures, slide regions (from the slide viewer,
// not built yet) and external files and links. Tick what belongs in the report, add a caption if wanted, choose the
// section (pre-set to the one being worked in) and Insert into Report: images print inside that section, a PDF is
// named there and its pages follow the report. Attach External File opens the computer's own file picker (local
// folders and mapped network shares); the file goes to the hospital's storage and only its pointer is kept.
//
// Everything that decides is in services (attachmentCatalog.ts, caseAttachments.ts, caseReportImages.ts); the hook
// runs the calls (hooks/useCaseAttachments.ts).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '@/pathscribe.css';
import './CaseAttachmentsModal.css';
import { useAuth } from '@/contexts/AuthContext';
import { useCaseAttachments } from '@/hooks/useCaseAttachments';
import {
  ATTACHMENT_ACCEPT, ATTACHMENT_GROUPS, DEFAULT_ATTACHMENT_WARN_BYTES, MAX_CAPTION_LENGTH, MAX_REPORT_IMAGES,
  defaultPlacementSection, isDocumentRow, megabytes, placementSections, rowsInGroup, type AttachmentRow,
} from '@/services';
import { formatDateTime } from '@/utils/formatDate';
import { getUiPreference, setUiPreference } from '@/utils/uiPreferences';

const SECTION_PREFERENCE = 'attachmentSection';

interface Props {
  caseData: Parameters<typeof useCaseAttachments>[0]['caseData'];
  caseId: string;
  accession: string;
  facilityId: string | null;
  /** The report layout's sections (id, heading, type); empty when the report has no layout. */
  layoutSections?: readonly { id: string; label: string; type?: string }[];
  /** False for a report whose renderer draws images only after its pages (the cytology report). */
  inlineSupported: boolean;
  /** The section the pathologist is working in, pre-selected. */
  activeSectionId?: string | null;
  onClose: () => void;
}

export const CaseAttachmentsModal: React.FC<Props> = ({ caseData, caseId, accession, facilityId, layoutSections = [], inlineSupported, activeSectionId, onClose }) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const a = useCaseAttachments({ caseData, caseId, accession, facilityId, user: user?.name ?? '' });
  const fileInput = useRef<HTMLInputElement>(null);
  const [chosen, setChosen] = useState<Record<string, boolean>>({});
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [link, setLink] = useState('');

  const sections = useMemo(() => placementSections(layoutSections, inlineSupported, t('caseAttachments.reportEnd')), [layoutSections, inlineSupported, t]);
  const [sectionId, setSectionId] = useState<string | null>(() => defaultPlacementSection(sections, activeSectionId, getUiPreference<string | null>(SECTION_PREFERENCE, null)));
  const section = sections.find(s => s.id === sectionId) ?? null;
  const chosenRows = a.rows.filter(r => chosen[r.key]);
  const locked = a.reportState.signed && !a.reportState.amendmentOpen;
  // Pete, Oct 30, 2026: on an Assist case the LIS writes the report, so the window only pins references to the case.
  const placing = !a.reportState.lisOwnsReport;

  const kindText = (r: AttachmentRow) => t(`caseAttachments.kinds.${r.kind}`);
  const title = (r: AttachmentRow) => (r.ownerLabel ? t('caseAttachments.rowTitle', { kind: kindText(r), owner: r.ownerLabel }) : kindText(r));
  const detail = (r: AttachmentRow) => {
    const when = formatDateTime(r.at, i18n.language);
    return r.by ? t('caseAttachments.rowDetail', { when, by: r.by }) : when;
  };
  const placedText = (sectionLabel?: string) => (sectionLabel ? t('caseAttachments.inReport', { section: sectionLabel }) : t('caseAttachments.inReportAfter'));
  const problemText = a.problem ? t(`caseAttachments.problems.${a.problem.code}`, { max: MAX_REPORT_IMAGES, defaultValue: t('caseAttachments.problems.failed') }) : '';

  const toggle = (key: string) => setChosen(c => ({ ...c, [key]: !c[key] }));
  const chooseSection = (id: string) => { setSectionId(id); setUiPreference(SECTION_PREFERENCE, id); };
  const onInsert = async () => {
    if (await a.insert(chosenRows, captions, section)) { setChosen({}); setCaptions({}); }
  };
  const onAddLink = async (event: React.FormEvent) => {
    event.preventDefault();
    if (link.trim() && (await a.addLink(link))) setLink('');
  };

  const renderRow = (r: AttachmentRow) => (
    <li key={r.key} className="ps-catt-row">
      <label className="ps-catt-pick">
        {placing && <input type="checkbox" checked={!!chosen[r.key]} onChange={() => toggle(r.key)} disabled={locked} aria-label={t('caseAttachments.select', { name: title(r) })} />}
        {r.imageUrl && !isDocumentRow(r)
          ? <img className="ps-catt-thumb" src={r.imageUrl} alt={title(r)} loading="lazy" />
          : <span className="ps-catt-icon" aria-hidden="true">{isDocumentRow(r) ? '📄' : '🖼️'}</span>}
      </label>
      <div className="ps-rptimg-meta">
        <div className="ps-rptimg-name">{title(r)}</div>
        {r.fileName && <div className="ps-catt-file" data-phi="true">{r.fileName}</div>}
        <div className="ps-rptimg-detail">{detail(r)}</div>
        {r.sourceSystemId && <div className="ps-rptimg-detail">{t('caseAttachments.source', { host: r.sourceSystemId })}</div>}
        {isDocumentRow(r) && <div className="ps-rptimg-detail">{t('caseAttachments.document')}</div>}
        {r.placement && <div className="ps-catt-placed">{placedText(r.placement.sectionLabel)}</div>}
        {placing && chosen[r.key] && (
          <label className="ps-rptimg-field ps-catt-caption">
            {t('caseAttachments.captionLabel')}
            <input className="ps-rptimg-input" type="text" maxLength={MAX_CAPTION_LENGTH} value={captions[r.key] ?? r.placement?.caption ?? ''}
              placeholder={t('caseAttachments.captionPlaceholder')} onChange={e => setCaptions(c => ({ ...c, [r.key]: e.target.value }))} data-phi="true" />
          </label>
        )}
      </div>
      <div className="ps-catt-row-actions">
        <button type="button" className="ps-btn-ghost-dark" onClick={() => { void a.open(r); }}>{t('caseAttachments.open')}</button>
        {r.attachmentId && (
          <button type="button" className="ps-btn-ghost-dark" disabled={a.busy} onClick={() => { void a.unlink(r.attachmentId!); }}>{t('caseAttachments.removeFromCase')}</button>
        )}
      </div>
    </li>
  );

  return (
    <div className="ps-overlay ps-overlay--confirm">
      <div className="ps-modal-dark ps-modal-md ps-rptimg ps-catt" role="dialog" aria-label={t('caseAttachments.title')}>
        <span className="ps-modal-dark-title">{t('caseAttachments.title')}</span>
        <p className="ps-rptimg-line" data-phi="accession">{t('caseAttachments.accessionLine', { accession })}</p>
        <p className="ps-rptimg-note" role="note">{t('caseAttachments.storageNote')}</p>
        {!placing && <p className="ps-rptimg-note" role="note">{t('caseAttachments.assistNote')}</p>}
        {placing && locked && <p className="ps-catt-warn" role="note">{t('caseAttachments.signedNote')}</p>}

        {a.problem && (
          <p className="ps-rptimg-problem" role="alert">
            {problemText}
            {' '}<button type="button" className="ps-rptimg-link" onClick={a.clearProblem}>{t('caseAttachments.dismiss')}</button>
          </p>
        )}
        {a.notice && <p className="ps-catt-ok" role="status">{t(`caseAttachments.notices.${a.notice.code}`, a.notice.values)}</p>}
        {a.pendingLargeFile && (
          <div className="ps-catt-warn" role="alert">
            <span>{t('caseAttachments.large', { size: megabytes(a.pendingLargeFile.size), limit: megabytes(DEFAULT_ATTACHMENT_WARN_BYTES) })}</span>
            <span className="ps-catt-warn-actions">
              <button type="button" className="ps-btn-amber" onClick={a.confirmLargeFile}>{t('caseAttachments.attachAnyway')}</button>
              <button type="button" className="ps-btn-ghost-dark" onClick={a.cancelLargeFile}>{t('caseAttachments.cancel')}</button>
            </span>
          </div>
        )}

        {ATTACHMENT_GROUPS.map(group => {
          const rows = rowsInGroup(a.rows, group);
          return (
            <section key={group} className="ps-catt-group" aria-label={t(`caseAttachments.groups.${group}`)}>
              <h3 className="ps-catt-group-title">{t('caseAttachments.groupCount', { title: t(`caseAttachments.groups.${group}`), number: rows.length })}</h3>
              {group === 'external' && (
                <div className="ps-catt-tools">
                  <button type="button" className="ps-btn-amber" disabled={a.busy} onClick={() => fileInput.current?.click()}>{t('caseAttachments.attachFile')}</button>
                  <input ref={fileInput} className="ps-catt-file-input" type="file" accept={ATTACHMENT_ACCEPT} aria-label={t('caseAttachments.attachFile')}
                    onChange={e => { a.pickFile(e.target.files?.[0]); e.target.value = ''; }} />
                  <span className="ps-catt-hint">{t('caseAttachments.fileHint')}</span>
                  <form className="ps-rptimg-form ps-catt-link" onSubmit={e => { void onAddLink(e); }}>
                    <label className="ps-rptimg-field ps-rptimg-field--grow">
                      {t('caseAttachments.linkLabel')}
                      <input className="ps-rptimg-input" type="url" inputMode="url" value={link} placeholder={t('caseAttachments.linkPlaceholder')}
                        onChange={e => setLink(e.target.value)} data-phi="true" />
                    </label>
                    <button type="submit" className="ps-btn-ghost-dark" disabled={a.busy || !link.trim()}>{t('caseAttachments.addLink')}</button>
                  </form>
                </div>
              )}
              {rows.length === 0
                ? <p className="ps-rptimg-empty">{t(`caseAttachments.empty.${group}`)}</p>
                : <ul className="ps-rptimg-list">{rows.map(renderRow)}</ul>}
            </section>
          );
        })}

        {(placing || a.placements.length > 0) && <section className="ps-catt-group" aria-label={t('caseAttachments.inReportTitle')}>
          <h3 className="ps-catt-group-title">{t('caseAttachments.groupCount', { title: t('caseAttachments.inReportTitle'), number: a.placements.length })}</h3>
          {a.placements.length === 0
            ? <p className="ps-rptimg-empty">{t('caseAttachments.inReportEmpty')}</p>
            : (
              <ul className="ps-rptimg-list">
                {a.placements.map(p => (
                  <li key={p.id} className="ps-rptimg-item">
                    <div className="ps-rptimg-meta">
                      <div className="ps-rptimg-name">{placedText(p.sectionLabel)}</div>
                      {p.caption && <div className="ps-rptimg-detail" data-phi="true">{p.caption}</div>}
                      <div className="ps-rptimg-detail">{t('caseAttachments.source', { host: p.sourceSystemId || t('caseAttachments.thisCase') })}</div>
                    </div>
                    <button type="button" className="ps-btn-ghost-dark" disabled={a.busy || locked} onClick={() => { void a.takeOut(p.id); }}>{t('caseAttachments.takeOut')}</button>
                  </li>
                ))}
              </ul>
            )}
        </section>}

        <div className="ps-modal-dark-footer ps-catt-footer">
          {placing && sections.length > 0 && (
            <label className="ps-rptimg-field">
              {t('caseAttachments.insertInto')}
              <select className="ps-rptimg-input" value={sectionId ?? ''} onChange={e => chooseSection(e.target.value)}>
                {sections.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </label>
          )}
          {placing && sections.length === 0 && <span className="ps-rptimg-detail">{t('caseAttachments.afterReportPages')}</span>}
          {placing && (
            <button type="button" className="ps-btn-amber" disabled={a.busy || locked || chosenRows.length === 0} onClick={() => { void onInsert(); }}>
              {t('caseAttachments.insert', { number: chosenRows.length })}
            </button>
          )}
          <button type="button" className="ps-btn-ghost-dark" onClick={onClose}>{t('caseAttachments.close')}</button>
        </div>
      </div>
    </div>
  );
};
