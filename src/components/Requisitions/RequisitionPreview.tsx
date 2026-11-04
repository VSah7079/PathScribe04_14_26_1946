// src/components/Requisitions/RequisitionPreview.tsx
// Batch 762: a requisition's scanned pages, read from where the PDF lives (useRequisitionPreview), with a link that
// opens the PDF itself at the requisition's first page. The page images name the patient: tagged data-phi.
import { useTranslation } from 'react-i18next';
import { LoadingState } from '@/components/Common/LoadingState';
import { useRequisitionPreview, type RequisitionRef } from '@/hooks/useRequisitionPreview';
import type { PageRange } from '@/services';
import './Requisitions.css';

interface Props {
  target: { ref: RequisitionRef; pages: PageRange; fileName: string } | null;
  onClose: () => void;
}

export function RequisitionPreview({ target, onClose }: Props) {
  const { t } = useTranslation();
  const preview = useRequisitionPreview(target ? { ref: target.ref, pages: target.pages } : null);
  if (!target) return null;
  const pages = target.pages.from === target.pages.to
    ? t('requisitions.pageSingle', { page: target.pages.from })
    : t('requisitions.pageRange', { from: target.pages.from, to: target.pages.to });
  return (
    <section className="ps-req-preview" aria-label={t('requisitions.preview.title')}>
      <header className="ps-req-preview-head">
        <div>
          <div className="ps-req-preview-title">{t('requisitions.preview.title')}</div>
          <div className="ps-req-preview-sub ps-req-dots"><span data-phi="requisition">{target.fileName}</span><span>{pages}</span></div>
        </div>
        <div className="ps-req-preview-actions">
          {preview.url && <a className="ps-btn-ghost-dark" href={preview.url} target="_blank" rel="noopener noreferrer">{t('requisitions.preview.openPdf')}</a>}
          <button type="button" className="ps-btn-ghost-dark" onClick={onClose}>{t('common.close')}</button>
        </div>
      </header>
      {preview.status === 'loading' && <LoadingState variant="inline" label={t('requisitions.preview.loading')} />}
      {preview.status === 'failed' && <p className="ps-req-problem" role="alert">{t(`requisitions.preview.errors.${preview.error === 'NOT_PERMITTED' ? 'notPermitted' : 'unreadable'}`)}</p>}
      {preview.status === 'ready' && (
        <div className="ps-req-pages" data-phi="requisition">
          {preview.images.map((src, i) => (
            <img key={src} className="ps-req-page" src={src} alt={t('requisitions.preview.pageAlt', { page: target.pages.from + i })} />
          ))}
        </div>
      )}
    </section>
  );
}

export default RequisitionPreview;
