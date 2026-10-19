// src/components/ReportImages/AttachReportImagesModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 609 (PS-44): the Attach images screen for a case's report, opened from
// the surgical report page's action bar and the Cytology Workspace. PathScribe
// stores no images (Pete, Oct 13, 2026), so a person links one: the https
// link to the image in the hospital's own system, a type (remembered) and an
// optional caption. Enter adds it, so there is no extra click. The image is
// fetched and drawn into the PDF when the report is made.
//
// Everything that decides (the link check, permission, the audit entry) is in
// services/imageAssociation/caseReportImages.ts.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import '@/pathscribe.css';
import { useAuth } from '@/contexts/AuthContext';
import { useCaseReportImages } from '@/hooks/useCaseReportImages';
import { MAX_CAPTION_LENGTH, MAX_REPORT_IMAGES, REPORT_IMAGE_TYPES } from '@/services';
import { getUiPreference, setUiPreference } from '@/utils/uiPreferences';

const TYPE_KEY: Record<string, string> = {
  'Gross Specimen': 'reportImages.types.grossSpecimen',
  'Microphotograph': 'reportImages.types.microphotograph',
  'Block Face': 'reportImages.types.blockFace',
  'Other': 'reportImages.types.other',
};
const PROBLEM_KEY: Record<string, string> = {
  notPermitted: 'reportImages.problems.notPermitted',
  invalidLink: 'reportImages.problems.invalidLink',
  duplicate: 'reportImages.problems.duplicate',
  tooMany: 'reportImages.problems.tooMany',
  failed: 'reportImages.problems.failed',
};
const problemKeyFor = (failure: string): string => PROBLEM_KEY[failure] ?? PROBLEM_KEY.failed;
const TYPE_PREFERENCE = 'reportImageType';

interface Props {
  caseId: string;
  accession: string;
  facilityId: string | null;
  onClose: () => void;
}

export const AttachReportImagesModal: React.FC<Props> = ({ caseId, accession, facilityId, onClose }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { images, busy, problem: failure, attach, remove, clearProblem } = useCaseReportImages({ caseId, accession, facilityId, user: user?.name ?? '' });
  const [imageType, setImageType] = useState<string>(() => {
    const saved = getUiPreference<string>(TYPE_PREFERENCE, REPORT_IMAGE_TYPES[0]);
    return (REPORT_IMAGE_TYPES as readonly string[]).includes(saved) ? saved : REPORT_IMAGE_TYPES[0];
  });
  const [caption, setCaption] = useState('');
  const [link, setLink] = useState('');

  const onAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!link.trim() || busy) return;
    if (await attach(link, imageType, caption)) { setLink(''); setCaption(''); }
  };
  const changeType = (value: string) => { setImageType(value); setUiPreference(TYPE_PREFERENCE, value); };
  const failureText = failure ? t(problemKeyFor(failure), { max: MAX_REPORT_IMAGES }) : '';
  const typeLabel = (type: string) => t(TYPE_KEY[type] ?? TYPE_KEY.Other);

  return (
    <div className="ps-overlay ps-overlay--confirm">
      <div className="ps-modal-dark ps-modal-md ps-rptimg" role="dialog" aria-label={t('reportImages.title')}>
        <span className="ps-modal-dark-title">{t('reportImages.title')}</span>
        <p className="ps-rptimg-line" data-phi="accession">{t('reportImages.accessionLine', { accession })}</p>
        <p className="ps-modal-dark-body">{t('reportImages.intro')}</p>
        <p className="ps-rptimg-note" role="note">{t('reportImages.linkNote')}</p>

        <form className="ps-rptimg-form" onSubmit={e => { void onAdd(e); }}>
          <label className="ps-rptimg-field ps-rptimg-field--grow">
            {t('reportImages.linkLabel')}
            <input className="ps-rptimg-input" type="url" inputMode="url" value={link} autoFocus
              placeholder={t('reportImages.linkPlaceholder')} onChange={e => { setLink(e.target.value); if (failure) clearProblem(); }} data-phi="true" />
          </label>
          <label className="ps-rptimg-field">
            {t('reportImages.typeLabel')}
            <select className="ps-rptimg-input" value={imageType} onChange={e => changeType(e.target.value)}>
              {REPORT_IMAGE_TYPES.map(type => <option key={type} value={type}>{typeLabel(type)}</option>)}
            </select>
          </label>
          <label className="ps-rptimg-field ps-rptimg-field--grow">
            {t('reportImages.captionLabel')}
            <input className="ps-rptimg-input" type="text" maxLength={MAX_CAPTION_LENGTH} value={caption}
              placeholder={t('reportImages.captionPlaceholder')} onChange={e => setCaption(e.target.value)} data-phi="true" />
          </label>
          <button type="submit" className="ps-btn-amber" disabled={busy || !link.trim() || images.length >= MAX_REPORT_IMAGES}>{t('reportImages.add')}</button>
        </form>

        {failure && (
          <p className="ps-rptimg-problem" role="alert">
            {failureText}
            {' '}<button type="button" className="ps-rptimg-link" onClick={clearProblem}>{t('reportImages.dismiss')}</button>
          </p>
        )}

        <ul className="ps-rptimg-list" aria-label={t('reportImages.listLabel')}>
          {images.length === 0 && <li className="ps-rptimg-empty">{t('reportImages.empty')}</li>}
          {images.map(image => (
            <li key={image.id} className="ps-rptimg-item">
              <div className="ps-rptimg-meta">
                <div className="ps-rptimg-name">
                  {typeLabel(image.imageType)}
                  {image.caption && <span data-phi="true"> — {image.caption}</span>}
                </div>
                <div className="ps-rptimg-detail">{t('reportImages.source', { host: image.sourceSystemId })}</div>
              </div>
              <button type="button" className="ps-btn-ghost-dark" onClick={() => { void remove(image.id); }}>{t('reportImages.remove')}</button>
            </li>
          ))}
        </ul>

        <div className="ps-modal-dark-footer">
          <button type="button" className="ps-btn-amber" onClick={onClose}>{t('reportImages.close')}</button>
        </div>
      </div>
    </div>
  );
};
