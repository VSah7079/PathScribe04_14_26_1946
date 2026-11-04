// src/components/Config/System/IntraopCriticalResultsSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 399 (Pete: "a dictionary that would map to a critical result flag").
// Configuration → System → Intraoperative critical results. Each entry is a
// kind of frozen result that should reach the operating surgeon directly; a
// specimen matches by its preliminary category or a term in its frozen
// diagnosis (negations ignored). A match flags the verbal report as a
// critical result, which the pathologist confirms or clears. Changing the
// dictionary needs config:intraop-critical-results:manage, checked in the
// service; this screen greys the buttons for anyone without it.
// Names and terms are the lab's own data: stored and shown as typed.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../../../pathscribe.css';
import { intraopCriticalResultService, parseMatchTerms, INTRAOP_CRITICAL_RESULTS_NOT_PERMITTED } from '@/services';
import { useCapabilities } from '@/hooks/useCapabilities';
import type { IntraopCriticalResultEntry, NewIntraopCriticalResultEntry } from '@/types/intraop/IntraopCriticalResult';
import type { FrozenCategory } from '@/types/intraop/IntraoperativeEntry';

const CATEGORIES: FrozenCategory[] = ['benign', 'malignant', 'atypical_suspicious', 'deferred'];
const CATEGORY_KEY: Record<FrozenCategory, string> = {
  benign: 'intraopQueue.specimenStep.categoryBenign',
  malignant: 'intraopQueue.specimenStep.categoryMalignant',
  atypical_suspicious: 'intraopQueue.specimenStep.categoryAtypical',
  deferred: 'intraopQueue.specimenStep.categoryDeferred',
};

interface Draft { name: string; description: string; termsText: string; frozenCategories: FrozenCategory[] }
const toDraft = (e?: IntraopCriticalResultEntry): Draft => ({
  name: e?.name ?? '', description: e?.description ?? '', termsText: (e?.matchTerms ?? []).join('\n'), frozenCategories: [...(e?.frozenCategories ?? [])],
});

const EntryModal: React.FC<{ entry?: IntraopCriticalResultEntry; onSave: (d: NewIntraopCriticalResultEntry) => void; onClose: () => void }> = ({ entry, onSave, onClose }) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Draft>(toDraft(entry));
  const terms = parseMatchTerms(draft.termsText);
  const canSave = !!draft.name.trim() && (terms.length > 0 || draft.frozenCategories.length > 0);
  const toggleCategory = (c: FrozenCategory) => setDraft(d => ({
    ...d, frozenCategories: d.frozenCategories.includes(c) ? d.frozenCategories.filter(x => x !== c) : [...d.frozenCategories, c],
  }));
  return (
    <div data-capture-hide="true" className="ps-conf-backdrop" onClick={onClose}>
      <div className="ps-conf-modal ps-conf-modal--narrow" role="dialog" aria-labelledby="icr-modal-title" onClick={e => e.stopPropagation()}>
        <div id="icr-modal-title" className="ps-conf-modal-header">{entry ? t('intraopCriticalResults.editTitle') : t('intraopCriticalResults.addTitle')}</div>
        <div className="ps-conf-modal-body">
          <label className="ps-label" htmlFor="icr-name">{t('intraopCriticalResults.nameLabel')}</label>
          <input id="icr-name" className="ps-conf-input" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
          <label className="ps-label" htmlFor="icr-description">{t('intraopCriticalResults.descriptionLabel')}</label>
          <input id="icr-description" className="ps-conf-input" value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} />
          <label className="ps-label" htmlFor="icr-terms">{t('intraopCriticalResults.termsLabel')}</label>
          <textarea id="icr-terms" className="ps-conf-input ps-conf-textarea" value={draft.termsText} onChange={e => setDraft({ ...draft, termsText: e.target.value })} />
          <p className="ps-conf-hint">{t('intraopCriticalResults.termsHint')}</p>
          <div className="ps-label">{t('intraopCriticalResults.categoriesLabel')}</div>
          {CATEGORIES.map(c => (
            <label key={c} className="ps-conf-toggle-label-row">
              <input type="checkbox" className="ps-conf-radio-input" checked={draft.frozenCategories.includes(c)} onChange={() => toggleCategory(c)} />
              <span className="ps-conf-option-text">{t(CATEGORY_KEY[c])}</span>
            </label>
          ))}
          {!canSave && <p className="ps-field-still-required" role="status">{t('intraopCriticalResults.needsNameAndMatch')}</p>}
        </div>
        <div className="ps-conf-modal-footer">
          <button className="ps-conf-btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
          <button className="ps-conf-btn-primary" disabled={!canSave}
            onClick={() => onSave({ name: draft.name, description: draft.description.trim(), matchTerms: terms, frozenCategories: draft.frozenCategories, status: entry?.status ?? 'Active' })}>
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
};

const IntraopCriticalResultsSection: React.FC = () => {
  const { t } = useTranslation();
  const capabilities = useCapabilities();
  const canManage = capabilities.has('config:intraop-critical-results:manage');
  const [entries, setEntries] = useState<IntraopCriticalResultEntry[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [modal, setModal] = useState<{ entry?: IntraopCriticalResultEntry } | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(() => { void intraopCriticalResultService.getAll().then(r => { if (r.ok) setEntries(r.data); }); }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const settle = (r: { ok: boolean; error?: string }) => {
    setMessage(r.ok ? null : r.error === INTRAOP_CRITICAL_RESULTS_NOT_PERMITTED ? 'intraopCriticalResults.notPermitted' : 'intraopCriticalResults.saveFailed');
    refresh();
    return r.ok;
  };
  const save = async (draft: NewIntraopCriticalResultEntry) => {
    const r = modal?.entry ? await intraopCriticalResultService.update(modal.entry.id, draft) : await intraopCriticalResultService.add(draft);
    if (settle(r as any)) setModal(null);
  };
  const toggle = async (e: IntraopCriticalResultEntry) => settle(await intraopCriticalResultService.setActive(e.id, e.status !== 'Active') as any);

  const visible = entries.filter(e => showInactive || e.status === 'Active');

  return (
    <div className="ps-conf-page">
      <div className="ps-conf-row">
        <div>
          <h2 className="ps-conf-section-title">{t('intraopCriticalResults.title')}</h2>
          <p className="ps-conf-section-subtitle ps-conf-section-subtitle--spaced">{t('intraopCriticalResults.subtitle')}</p>
        </div>
        <button className="ps-conf-btn-secondary" disabled={!canManage} onClick={() => setModal({})}>{t('intraopCriticalResults.add')}</button>
      </div>
      {!canManage && !capabilities.loading && <p className="ps-fieldreq-note">{t('intraopCriticalResults.readOnly')}</p>}
      {message && <div className="ps-fieldreq-message" role="status">{t(message)}</div>}

      <label className="ps-conf-toggle-label-row">
        <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} className="ps-conf-radio-input" />
        <span className="ps-conf-option-text">{t('intraopCriticalResults.showInactive')}</span>
      </label>

      <div className="ps-conf-card">
        {visible.map(e => (
          <div key={e.id} className="ps-conf-row ps-icr-row">
            <div className="ps-icr-row__main">
              <span className="ps-conf-value">{e.name}{e.status === 'Inactive' ? ` · ${t('intraopCriticalResults.inactive')}` : ''}</span>
              {e.description && <span className="ps-icr-row__description">{e.description}</span>}
              <span className="ps-icr-row__matches">
                {t('intraopCriticalResults.matchesSummary', {
                  categories: e.frozenCategories.map(c => t(CATEGORY_KEY[c])).join(', ') || '—',
                  terms: e.matchTerms.join(', ') || '—',
                })}
              </span>
            </div>
            <div className="ps-conf-row-actions">
              <button className="ps-conf-btn-secondary" disabled={!canManage} onClick={() => { void toggle(e); }}>
                {e.status === 'Active' ? t('intraopCriticalResults.deactivate') : t('intraopCriticalResults.reactivate')}
              </button>
              <button className="ps-conf-btn-secondary" disabled={!canManage} onClick={() => setModal({ entry: e })}>{t('intraopCriticalResults.edit')}</button>
            </div>
          </div>
        ))}
        {visible.length === 0 && <div className="ps-conf-empty-row">{t('intraopCriticalResults.empty')}</div>}
      </div>

      {modal && <EntryModal entry={modal.entry} onSave={d => { void save(d); }} onClose={() => setModal(null)} />}
    </div>
  );
};

export default IntraopCriticalResultsSection;
