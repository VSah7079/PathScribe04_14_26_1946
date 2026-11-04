// src/pages/CytologyWorklistPage/components/CytologyReviewNotes.tsx
// Batch 412 (PS-359; Pete). Under each review in the Cytology Workspace's
// history: the notes other reviewers left on parts of it, the author's
// Acknowledge, a form to add a note (optionally "Requires revision"), and the
// review's earlier versions, which the author can load back into the form.
// Renders only: services/cytology/cytologyReviewNotes.ts decides.

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CytologyReviewNote, CytologyReviewSection, CytologyReviewVersion } from '@/types/cytology/CytologyReviewRecord';
import { CYTOLOGY_REVIEW_SECTIONS } from '@/services/cytology/cytologyReviewNotes';
import { formatDateTime } from '@/utils/formatDate';

interface Props {
  notes: CytologyReviewNote[];
  /** The signed-in user wrote this review (acknowledges notes, loads versions). */
  isAuthor: boolean;
  /** Notes can be added (not your own review, specimen not signed out). */
  canAddNote: boolean;
  versions: CytologyReviewVersion[];
  categoryLabel: (id: string) => string;
  onAdd: (section: CytologyReviewSection, text: string, requiresRevision: boolean) => Promise<boolean>;
  onAcknowledge: (noteId: string) => void;
  onLoadVersion: (version: CytologyReviewVersion) => void;
}

export function CytologyReviewNotes({ notes, isAuthor, canAddNote, versions, categoryLabel, onAdd, onAcknowledge, onLoadVersion }: Props) {
  const { t, i18n } = useTranslation();
  const [adding, setAdding] = useState(false);
  const [section, setSection] = useState<CytologyReviewSection>('primary');
  const [text, setText] = useState('');
  const [requiresRevision, setRequiresRevision] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const K = 'cytologyScreening.reviewNotes';

  return (
    <div className="ps-cyto-notes">
      {notes.map(n => (
        <div key={n.id} className={`ps-cyto-note ps-cyto-note--${n.status}${n.requiresRevision ? ' ps-cyto-note--revision' : ''}`}>
          <div className="ps-cyto-note-head">
            <span className="ps-cyto-note-section">{t(`${K}.sections.${n.section}`)}</span>
            {n.requiresRevision && <span className="ps-cyto-note-flag">{t(`${K}.requiresRevision`)}</span>}
            <span className={`ps-cyto-note-status ps-cyto-note-status--${n.status}`}>{t(`${K}.status.${n.status}`)}</span>
            <span className="ps-cyto-note-meta">{t(`${K}.byLine`, { name: n.by.userName, date: formatDateTime(n.at, i18n.language) })}</span>
          </div>
          <div className="ps-cyto-note-text">{n.text}</div>
          {n.status === 'resolvedByPathologist' && n.resolvedBy && (
            <div className="ps-cyto-note-resolved">{t(`${K}.resolvedBy`, { name: n.resolvedBy.userName })}</div>
          )}
          {isAuthor && n.status === 'open' && (
            <button className="ps-cyto-note-ack-btn" onClick={() => onAcknowledge(n.id)}>{t(`${K}.acknowledge`)}</button>
          )}
          {isAuthor && n.status === 'acknowledged' && <div className="ps-cyto-note-hint">{t(`${K}.saveToRevise`)}</div>}
        </div>
      ))}

      <div className="ps-cyto-notes-actions">
        {canAddNote && !adding && <button className="ps-cytoscreen-review-action-btn" onClick={() => setAdding(true)}>{t(`${K}.add`)}</button>}
        {isAuthor && versions.length > 0 && (
          <button className="ps-cytoscreen-review-action-btn" onClick={() => setShowVersions(v => !v)}>
            {t('cytologyScreening.versions.toggle', { count: versions.length })}
          </button>
        )}
      </div>

      {adding && (
        <div className="ps-cyto-note-form">
          <label className="ps-cyto-note-form-label" htmlFor="cyto-note-section">{t(`${K}.sectionLabel`)}</label>
          <select id="cyto-note-section" className="ps-conf-select" value={section} onChange={e => setSection(e.target.value as CytologyReviewSection)}>
            {CYTOLOGY_REVIEW_SECTIONS.map(s => <option key={s} value={s}>{t(`${K}.sections.${s}`)}</option>)}
          </select>
          <textarea className="ps-cyto-note-form-text" rows={2} value={text} onChange={e => setText(e.target.value)} placeholder={t(`${K}.placeholder`)} />
          <label className="ps-cyto-note-form-check">
            <input type="checkbox" checked={requiresRevision} onChange={e => setRequiresRevision(e.target.checked)} />
            {t(`${K}.requiresRevisionOption`)}
          </label>
          <div className="ps-cyto-note-form-actions">
            <button className="ps-cytoscreen-review-action-btn" onClick={() => { setAdding(false); setText(''); setRequiresRevision(false); }}>{t('common.cancel')}</button>
            <button className="ps-cytoscreen-review-action-btn ps-cyto-note-form-save" disabled={!text.trim()}
              onClick={async () => { if (await onAdd(section, text, requiresRevision)) { setAdding(false); setText(''); setRequiresRevision(false); } }}>
              {t(`${K}.save`)}
            </button>
          </div>
        </div>
      )}

      {showVersions && (
        <div className="ps-cyto-versions">
          {[...versions].reverse().map(v => (
            <div key={v.savedAt} className="ps-cyto-version">
              <span className="ps-cyto-version-date">{formatDateTime(v.savedAt, i18n.language)}</span>
              <span className="ps-cyto-version-primary">{categoryLabel(v.primaryInterpretationId)}</span>
              <button className="ps-cytoscreen-review-action-btn" onClick={() => onLoadVersion(v)}>{t('cytologyScreening.versions.load')}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
