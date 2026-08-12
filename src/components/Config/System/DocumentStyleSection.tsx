/**
 * DocumentStyleSection.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Real feature, per direct request: "Is the system wide font style defined
 * in the css hard coded, or does the client get to select this system
 * default?" ... "yes, default to Arial."
 *
 * Confirmed by direct investigation before this existed: the report's
 * actual rendered default font was 100% hardcoded CSS with zero
 * configuration anywhere. This is the missing org-wide layer, sitting
 * beneath a per-template override (Template Assembly editor's own
 * 🖋 Style panel) and above nothing further — the hardcoded CSS is now
 * only ever reached if this resolver itself somehow fails to load.
 *
 * Architecture role:
 *   Admin-editable org default for report body text style. Read by
 *   contextBuilder.ts's buildContext() as the fallback layer beneath a
 *   template's own documentStyle.body, and applied by
 *   ReportPreviewRenderer.tsx at the report root, cascading via ordinary
 *   CSS inheritance to every field's label and value.
 *
 * Related files:
 *   Config/System/documentStyleConfig.ts ← getOrgDocumentStyleDefault/
 *                                            setOrgDocumentStyleDefault
 *   orchestrator/contextBuilder.ts       ← resolves template override ??
 *                                            org default
 *   pages/ReportPreview/ReportPreviewRenderer.tsx ← applies at the root
 *   components/TemplateBuilder/TemplateAssemblyPage.tsx ← the per-template
 *                                            override layer, same shape
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';
import '../../../pathscribe.css';
import {
  getOrgDocumentStyleDefault, setOrgDocumentStyleDefault,
  getOrgHeaderStyleDefault, setOrgHeaderStyleDefault,
  getOrgFooterStyleDefault, setOrgFooterStyleDefault,
} from './documentStyleConfig';
import type { LabelConfig } from '../../../types/template';
import { Label, TextInput, Toggle, Sel } from '../../TemplateBuilder/TemplateInspector';

const FONT_FAMILY_OPTIONS = [
  { value: 'Arial',           label: 'Arial' },
  { value: 'Helvetica',       label: 'Helvetica' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Georgia',         label: 'Georgia' },
  { value: 'Calibri',         label: 'Calibri' },
  { value: 'Verdana',         label: 'Verdana' },
  { value: 'Courier New',     label: 'Courier New' },
];

const GETTERS = { header: getOrgHeaderStyleDefault, body: getOrgDocumentStyleDefault, footer: getOrgFooterStyleDefault };
const SETTERS = { header: setOrgHeaderStyleDefault, body: setOrgDocumentStyleDefault, footer: setOrgFooterStyleDefault };

const DocumentStyleSection: React.FC = () => {
  const [category, setCategory] = useState<'header' | 'body' | 'footer'>('body');
  const [style, setStyle] = useState<LabelConfig>(() => GETTERS[category]());
  const [saved, setSaved] = useState(true);

  const switchCategory = (next: 'header' | 'body' | 'footer') => {
    setCategory(next);
    setStyle(GETTERS[next]());
  };

  const update = (next: LabelConfig) => {
    setStyle(next);
    SETTERS[category](next);
    setSaved(true);
  };

  return (
    <div style={{ padding: '4px 0', maxWidth: '640px' }}>
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px' }}>
          🖋 Document Style
        </h2>
        <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 8px', lineHeight: '1.5' }}>
          The default text style applied to every report across the org
          for each of these three areas, unless a specific Report
          Template sets its own style (Template Assembly editor's own
          Style panel). Individual components within a template can
          still override this for specific fields — for example, making
          Final Diagnosis bold and capitalized while everything else
          stays at the body default.
        </p>
        {saved && (
          <span style={{
            fontSize: '12px', fontWeight: 600, color: '#10B981',
            background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
            padding: '2px 10px', borderRadius: '99px',
          }}>
            ✓ Saved
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {(['header', 'body', 'footer'] as const).map(cat => (
          <button
            key={cat}
            onClick={() => switchCategory(cat)}
            style={{
              padding: '6px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600,
              textTransform: 'capitalize', cursor: 'pointer',
              border: `1px solid ${category === cat ? 'rgba(8,145,178,0.5)' : 'rgba(255,255,255,0.1)'}`,
              background: category === cat ? 'rgba(8,145,178,0.15)' : 'rgba(255,255,255,0.03)',
              color: category === cat ? '#7dd3fc' : '#94a3b8',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="ps-tinsp-stack" style={{ maxWidth: 340 }}>
        <Label>Font family</Label>
        <Sel value={style.fontFamily ?? 'Arial'} onChange={v => update({ ...style, fontFamily: v })}
          options={FONT_FAMILY_OPTIONS} fullWidth />

        <Label>Font size (px)</Label>
        <TextInput
          value={String(style.fontSize ?? 10)}
          onChange={v => update({ ...style, fontSize: parseInt(v) || 10 })}
          placeholder="10"
        />

        <div className="ps-tinsp-row" style={{ marginTop: 4 }}>
          <Toggle
            checked={style.weight === 'bold'}
            onChange={v => update({ ...style, weight: v ? 'bold' : 'normal' })}
            label="Bold"
          />
          <Toggle
            checked={style.decoration === 'underline'}
            onChange={v => update({ ...style, decoration: v ? 'underline' : 'none' })}
            label="Underline"
          />
        </div>

        <Label>Text transform</Label>
        <Sel value={style.transform ?? 'none'} onChange={v => update({ ...style, transform: v as LabelConfig['transform'] })}
          options={[
            { value: 'none',       label: 'As typed' },
            { value: 'uppercase',  label: 'UPPERCASE' },
            { value: 'capitalize', label: 'Capitalize' },
          ]} fullWidth />

        <div
          style={{
            marginTop: 8, padding: '10px 12px', borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)',
            fontFamily: style.fontFamily || 'Arial',
            fontSize: `${style.fontSize ?? 10}px`,
            fontWeight: style.weight === 'bold' ? 700 : 400,
            textDecoration: style.decoration === 'underline' ? 'underline' : 'none',
            textTransform: style.transform === 'uppercase' ? 'uppercase' : style.transform === 'capitalize' ? 'capitalize' : 'none',
            color: '#f1f5f9',
          }}
        >
          Preview — {category} text renders this way, org-wide, unless a
          template or component overrides it.
        </div>
      </div>
    </div>
  );
};

export default DocumentStyleSection;
