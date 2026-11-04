// src/pages/SynopticReportPage/components/TemplatePicker.tsx
// The "pick a checklist for this specimen" list on the case's checklist panel, moved out of RightSynopticPanel.tsx
// unchanged in Batch 755a (PS-497 split-on-touch), which added the "Demo wording" tag beside each demonstration
// checklist's name.
import React from 'react';
import { useTranslation } from 'react-i18next';
import { DemoWordingTag } from '@/components/Synoptic/DemoWordingTag';

// ─── TemplatePicker ───────────────────────────────────────────────────────────
export interface TemplateOption { id: string; name: string; source: string; version: string; category: string; }

export const TemplatePicker: React.FC<{ templates: TemplateOption[]; specimenDescriptions: string[]; activeSpecimenLabel?: string; onSelect: (id: string) => void }> = ({ templates, specimenDescriptions, activeSpecimenLabel, onSelect }) => {
  const { t } = useTranslation();
  // Real fix, per direct report: this list was showing every published
  // template in the entire system, regardless of relevance (a thyroid
  // case listing Breast/Lung/Prostate/Kidney templates alongside
  // whatever real, relevant one exists) — genuinely not useful with a
  // real template library this size. A simple, safe text match — each
  // template's own category (e.g. "BREAST", "LUNG") against the case's
  // real specimen descriptions — surfaces likely matches first, without
  // ever hiding anything: no real subspecialty-to-category mapping
  // exists in this codebase to match TemplateRoutingService.ts's own,
  // more precise automatic-assignment logic (which is what runs BEFORE
  // this manual fallback ever shows at all), so a wrong or missing
  // match here must never prevent the pathologist from finding and
  // picking the template they actually need.
  const haystack = specimenDescriptions.join(' ').toLowerCase();
  const suggested = templates.filter(tpl => tpl.category && haystack.includes(tpl.category.toLowerCase()));
  const suggestedIds = new Set(suggested.map(tpl => tpl.id));
  const rest = templates.filter(tpl => !suggestedIds.has(tpl.id));

  // Real feature, per direct product decision: a pathologist shouldn't
  // have to click the one template already most likely correct just to
  // get started — that's a click this list existing at all was
  // supposed to save, not add back. Auto-attaches the strongest
  // suggestion the moment one exists, landing the pathologist directly
  // on a populated report instead of an empty picker screen. The
  // escape hatch is the existing, real delete-and-re-add flow already
  // available on any attached synoptic report — deliberately not a
  // second, parallel "are you sure" mechanism, since the whole point
  // was fewer clicks, not the same number moved to a different place.
  // Guarded with a ref, not just an effect dependency, so a later
  // re-render (e.g. the suggestion list itself changing) can't
  // re-trigger a second auto-attach on top of a report the pathologist
  // may have already started editing or deliberately replaced.
  const autoAttachedRef = React.useRef(false);
  React.useEffect(() => {
    if (autoAttachedRef.current) return;
    if (suggested.length === 0) return;
    autoAttachedRef.current = true;
    onSelect(suggested[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggested.length > 0]);

  const renderTemplateButton = (tpl: TemplateOption) => (
    <button
      key={tpl.id}
      onClick={() => onSelect(tpl.id)}
      className="ps-syn-picker-btn"
    >
      <div className="ps-syn-picker-btn-title">{tpl.name}<DemoWordingTag templateId={tpl.id} /></div>
      <div className="ps-syn-picker-btn-meta">{t('rightSynopticPanel.templatePicker.templateMeta', { source: tpl.source, version: tpl.version, category: tpl.category })}</div>
    </button>
  );

  return (
    <div className="ps-syn-picker">
      <h2 className="ps-syn-picker-title">{t('rightSynopticPanel.templatePicker.title')}</h2>
      {/* Real fix (PS-310 — "Selected FNA and saw no associated
          Synoptic Reports — the empty state is confusing. It should
          clearly say no synoptic reports are associated with this
          specimen, and let the user add one from there."): this
          screen already IS the "add one from here" UI (every button
          below attaches a template) — what was actually confusing was
          the wording, which said "this case" regardless of which
          specimen was selected. On a real, multi-specimen case where
          most specimens already have a report and only the one just
          selected (an FNA, say) doesn't, "this case" reads as if
          nothing on the whole case has a report yet, when it's really
          just this one specimen. Names the active specimen by its
          real label when the caller has one (every real caller does;
          the fallback only matters for an isolated unit test that
          doesn't wire activeSpecimenId through). */}
      <p className="ps-syn-picker-subtitle">
        {activeSpecimenLabel
          ? t('rightSynopticPanel.templatePicker.subtitleWithLabel', { label: activeSpecimenLabel })
          : t('rightSynopticPanel.templatePicker.subtitleGeneric')}
      </p>
      {templates.length === 0 ? (
        <p className="ps-syn-picker-empty">{t('rightSynopticPanel.templatePicker.noTemplatesAvailable')}</p>
      ) : (
        <>
          {suggested.length > 0 && (
            <>
              <div className="ps-syn-picker-group-label">
                {t('rightSynopticPanel.templatePicker.suggestedForCase')}
              </div>
              {suggested.map(renderTemplateButton)}
              <div className="ps-syn-picker-group-label--all">
                {t('rightSynopticPanel.templatePicker.allTemplates')}
              </div>
            </>
          )}
          {rest.map(renderTemplateButton)}
        </>
      )}
    </div>
  );
};
