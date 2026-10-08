// src/pages/LabelDesignerPage/LabelDesignerPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Real, per direct follow-up (PS-245): a real, drag-and-drop label
// designer spanning essentially every real label type in this app.
// See services/labelDesigner/ILabelLayoutService.ts's own header for
// the full architectural account of why this is a new, real, parallel
// UI rather than a reuse of components/TemplateBuilder/'s own
// TemplateNode system — that system's own colSpan-based flowing grid
// is genuinely wrong for a label's own fixed, physical x/y layout.
//
// Real, deliberate first-increment scope: a real, working canvas with
// drag-to-place from a real, per-label-type palette, numeric
// resize/reposition via a real inspector, and a real, live HTML
// preview using real sample data for the selected label type. Real,
// direct follow-up ("add a way for users to output their label so
// they can verify that they will work"): the canvas's own barcode
// field now renders a real, actual barcode (generateBarcodeSvg.ts —
// the same real function every other label's own HTML render already
// uses), not placeholder text, and a real "Export ZPL" action
// produces genuine, working ZPL (buildLabelLayoutZpl.ts) a person can
// paste directly into Labelary's own real viewer for a full,
// authoritative fit/scan check — the same real process already used
// for every other label in this app. Real, honest limit stated
// plainly: this still does not replace any of this app's own
// existing, hardcoded, already-tested render functions — a saved
// layout here does not yet drive real print output.
//
// Batch 460 (PS-245): fields are resized by dragging handles on the
// selected field, and every placement, move, resize and typed number is
// kept inside the label's physical edge (services/labelDesigner/
// labelFieldGeometry.ts). A layout with a field past the edge is flagged,
// can be fitted in one click, and is refused on save. A moved field keeps
// the point where it was grabbed (before, its corner jumped to the pointer).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import '../../pathscribe.css';
import { labelLayoutService } from '@/services';
import { facilityService } from '@/services';
// PS-256 (Batch 451): the canvas's defensive barcode wrapper lives in utils/labels/safeBarcodeSvg.ts.
import { safeBarcodeSvg } from '../../utils/labels/safeBarcodeSvg';
import { buildLabelLayoutZpl } from '../../services/labelDesigner/buildLabelLayoutZpl';
import {
  LABEL_TYPES, LABEL_TYPE_DISPLAY_NAMES, LABEL_TYPE_DEFAULT_SIZE_MM, LABEL_FIELD_CATALOG,
  LABEL_TYPE_ALLOWS_FACILITY_OVERRIDE, LABEL_TYPE_DEFAULT_SYMBOLOGY,
} from '../../services/labelDesigner/ILabelLayoutService';
import type { Facility } from '../../services/facilities/IFacilityService';
import type { LabelType, LabelLayoutField } from '../../services/labelDesigner/ILabelLayoutService';
import {
  PX_PER_MM, RESIZE_HANDLES, pxToMm, moveFieldTo, resizeFieldFromHandle, applyInspectorEdit, clampFieldToLabel, fieldsOutOfBounds,
  LABEL_LAYOUT_OUT_OF_BOUNDS, type ResizeHandle,
} from '../../services/labelDesigner/labelFieldGeometry';

// Real, per this file's own header — this app's own established
// default dpi for ZPL export elsewhere (buildRequisitionStickerSheetZpl.ts).
const EXPORT_DPI = 203;

// The canvas scale (PX_PER_MM) lives in labelFieldGeometry.ts with the rest of the canvas maths.

// Real, per this file's own header — real, illustrative sample values
// for the live preview, keyed by field key. Not real case data (no
// real case is being designed against here) — a real, honest stand-in
// so a designer can see roughly how real text will actually look
// without needing a real, live record.
const SAMPLE_VALUES: Record<string, string> = {
  fullAccession: 'DVMC26-0001', patientName: 'Maria Garcia', dateOfBirth: '1958-03-14',
  mrn: 'AUTO-0031', requestingProvider: 'Dr. Chen', submittingFacility: 'Metro General',
  specimenLabel: 'A', specimenDesc: 'Skin, punch biopsy', barcode: '▮▯▮▮▯▮▯▯▮▮',
  accessionNumber: 'DVMC26-0001', specimenDesignator: 'A', blockId: 'A1', blockLabel: 'A1',
  level: 'L1', stainName: 'H&E', decantLabel: 'D1', decantTypeLabel: 'Cell Block',
  containerBarcode: 'SPEC-20260906-00000042', aliquotVolumeUl: '200', plateBarcode: 'PLT-HPV-20260906-012',
  assayName: 'High-Risk HPV Real-Time PCR', targetInstrumentId: 'PANTHER_02', rackBarcode: 'RACK-MOLE-00007',
  deckLocationLabel: 'LOC-INST-PANTHER_02-SLOT_A1', deckSlot: 'SLOT_A1',
};

/** Batch 460: a millimetre box that applies its number on Enter or when it
 *  loses focus, so a half-typed value ("1" on the way to "15") isn't
 *  clamped while the person is still typing. */
const MmInput: React.FC<{ value: number; step?: number; className: string; onCommit: (n: number) => void }> = ({ value, step, className, onCommit }) => {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => { setDraft(String(value)); }, [value]);
  const commit = () => {
    const n = Number(draft);
    if (draft.trim() === '' || !Number.isFinite(n)) { setDraft(String(value)); return; }
    onCommit(n);
  };
  return (
    <input className={className} type="number" step={step} value={draft}
      onChange={e => setDraft(e.target.value)} onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); }} />
  );
};

function newField(fieldKey: string, xMm: number, yMm: number): LabelLayoutField {
  return { id: 'field-' + Date.now() + Math.random().toString(36).slice(2, 6), fieldKey, xMm, yMm, widthMm: 20, heightMm: 6, fontSizeMm: 2.6 };
}

const LabelDesignerPage: React.FC = () => {
  const { t } = useTranslation();
  const [labelType, setLabelType] = useState<LabelType>('requisition');
  // Real, per direct guidance: real Enterprise hierarchy and
  // inheritance — undefined/'' means editing the real Enterprise
  // default; a real, selected facilityId means editing that
  // facility's own real override, only ever offered when this label
  // type's own real policy allows one.
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [facilityId, setFacilityId] = useState<string>('');
  const allowsOverride = LABEL_TYPE_ALLOWS_FACILITY_OVERRIDE[labelType];

  useEffect(() => {
    facilityService.getAll().then(res => { if (res.ok) setFacilities(res.data.filter(f => !f.isEnterprise)); });
  }, []);
  const [widthMm, setWidthMm] = useState(LABEL_TYPE_DEFAULT_SIZE_MM.requisition.widthMm);
  const [heightMm, setHeightMm] = useState(LABEL_TYPE_DEFAULT_SIZE_MM.requisition.heightMm);
  const [fields, setFields] = useState<LabelLayoutField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  // Real, per direct follow-up ("add a way for users to output their
  // label so they can verify that they will work") — the real,
  // exported ZPL text shown for copying, or null when the export
  // panel is closed.
  const [exportedZpl, setExportedZpl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    setSelectedFieldId(null);
    // Real, per direct guidance: real Enterprise hierarchy and
    // inheritance — a locked label type (allowsOverride false) always
    // loads the real Enterprise default, ignoring any real, selected
    // facilityId, so switching to a locked type never leaves a stale
    // facility selection silently affecting what's actually loaded.
    const effectiveFacilityId = LABEL_TYPE_ALLOWS_FACILITY_OVERRIDE[labelType] ? (facilityId || undefined) : undefined;
    labelLayoutService.getByLabelType(labelType, effectiveFacilityId).then(res => {
      if (res.ok && res.data) {
        setWidthMm(res.data.widthMm);
        setHeightMm(res.data.heightMm);
        setFields(res.data.fields);
      } else {
        setWidthMm(LABEL_TYPE_DEFAULT_SIZE_MM[labelType].widthMm);
        setHeightMm(LABEL_TYPE_DEFAULT_SIZE_MM[labelType].heightMm);
        setFields([]);
      }
      setLoading(false);
    });
  }, [labelType, facilityId]);

  const handlePaletteDragStart = (e: React.DragEvent, fieldKey: string) => {
    e.dataTransfer.setData('application/x-pathscribe-new-field', fieldKey);
  };

  // Batch 460: where inside the field it was grabbed, so it doesn't jump on drop.
  const handlePlacedFieldDragStart = (e: React.DragEvent, fieldId: string) => {
    const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
    e.dataTransfer.setData('application/x-pathscribe-move-field', JSON.stringify({ fieldId, grabXPx: e.clientX - box.left, grabYPx: e.clientY - box.top }));
  };
  const labelSize = { widthMm, heightMm };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const newFieldKey = e.dataTransfer.getData('application/x-pathscribe-new-field');
    const moved = e.dataTransfer.getData('application/x-pathscribe-move-field');

    if (newFieldKey) {
      const field = moveFieldTo(newField(newFieldKey, 0, 0), pxToMm(e.clientX - rect.left), pxToMm(e.clientY - rect.top), labelSize);
      setFields(prev => [...prev, field]);
      setSelectedFieldId(field.id);
    } else if (moved) {
      const { fieldId, grabXPx = 0, grabYPx = 0 } = JSON.parse(moved) as { fieldId: string; grabXPx?: number; grabYPx?: number };
      const xMm = pxToMm(e.clientX - rect.left - grabXPx);
      const yMm = pxToMm(e.clientY - rect.top - grabYPx);
      setFields(prev => prev.map(f => (f.id === fieldId ? moveFieldTo(f, xMm, yMm, labelSize) : f)));
    }
  };

  const updateSelectedField = (patch: Partial<LabelLayoutField>) => {
    setFields(prev => prev.map(f => (f.id === selectedFieldId ? applyInspectorEdit(f, patch, labelSize) : f)));
  };

  // Batch 460: drag-resize. The pointer is captured by the handle; each move
  // resizes from where the drag started (the opposite edge stays put).
  const resizeRef = useRef<{ fieldId: string; handle: ResizeHandle; startX: number; startY: number; start: LabelLayoutField } | null>(null);
  const handleResizeStart = (e: React.PointerEvent, field: LabelLayoutField, handle: ResizeHandle) => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    resizeRef.current = { fieldId: field.id, handle, startX: e.clientX, startY: e.clientY, start: field };
  };
  const handleResizeMove = (e: React.PointerEvent) => {
    const r = resizeRef.current;
    if (!r) return;
    const next = resizeFieldFromHandle(r.start, r.handle, pxToMm(e.clientX - r.startX), pxToMm(e.clientY - r.startY), labelSize);
    setFields(prev => prev.map(f => (f.id === r.fieldId ? next : f)));
  };
  const handleResizeEnd = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    resizeRef.current = null;
  };
  const outsideIds = new Set(fieldsOutOfBounds(fields, labelSize));
  const fitAllToLabel = () => setFields(prev => prev.map(f => clampFieldToLabel(f, labelSize)));

  const removeSelectedField = () => {
    setFields(prev => prev.filter(f => f.id !== selectedFieldId));
    setSelectedFieldId(null);
  };

  const selectedField = fields.find(f => f.id === selectedFieldId);
  // Real, per this file's own header — every real field this label
  // type genuinely supports minus every real field already placed on
  // the canvas, so the palette never offers a field the label already
  // has (avoiding a real, confusing duplicate placement).
  const placedKeys = new Set(fields.map(f => f.fieldKey));
  const availableFields = LABEL_FIELD_CATALOG[labelType].filter(f => !placedKeys.has(f.key));

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const effectiveFacilityId = allowsOverride ? (facilityId || undefined) : undefined;
      const res = await labelLayoutService.save({ labelType, facilityId: effectiveFacilityId, widthMm, heightMm, fields });
      setSaveMessage(res.ok ? (effectiveFacilityId ? t('labelDesignerPage.saveMessages.facilityOverrideSaved') : t('labelDesignerPage.saveMessages.enterpriseDefaultSaved'))
        : 'error' in res ? (res.error === LABEL_LAYOUT_OUT_OF_BOUNDS ? t('labelDesignerPage.saveMessages.outOfBounds') : res.error) : t('labelDesignerPage.saveMessages.unknownError'));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    const effectiveFacilityId = allowsOverride ? (facilityId || undefined) : undefined;
    await labelLayoutService.reset(labelType, effectiveFacilityId);
    setWidthMm(LABEL_TYPE_DEFAULT_SIZE_MM[labelType].widthMm);
    setHeightMm(LABEL_TYPE_DEFAULT_SIZE_MM[labelType].heightMm);
    setFields([]);
    setSelectedFieldId(null);
    setSaveMessage(t('labelDesignerPage.saveMessages.resetToDefault'));
  };

  const handleExportZpl = () => {
    const layout = { id: 'preview', labelType, widthMm, heightMm, fields, updatedAt: new Date().toISOString() };
    setExportedZpl(buildLabelLayoutZpl(layout, labelType, SAMPLE_VALUES, EXPORT_DPI));
  };

  return (
    <div className="ps-app-root ps-page-container ps-page-container--wide">
      <div className="ps-page-header-row">
        <div>
          <h1 className="ps-page-title">{t('labelDesignerPage.title')}</h1>
          <p className="ps-page-subtitle">
            {t('labelDesignerPage.subtitle')}
          </p>
        </div>
        <div className="ps-flex-row-gap-8">
          <label className="ps-label ps-label-inline" htmlFor="ld-label-type">{t('labelDesignerPage.labelTypeLabel')}</label>
          {/* LABEL_TYPE_DISPLAY_NAMES is a shared catalog defined in
              services/labelDesigner/ILabelLayoutService.ts, out of this
              batch's own scope — left as its own real English display
              names, same carve-out as other out-of-scope sibling
              constants elsewhere in this sweep. */}
          <select id="ld-label-type" className="ps-input-dark" value={labelType} onChange={e => { setLabelType(e.target.value as LabelType); setFacilityId(''); }}>
            {LABEL_TYPES.map(lt => <option key={lt} value={lt}>{LABEL_TYPE_DISPLAY_NAMES[lt]}</option>)}
          </select>
          {allowsOverride ? (
            <>
              <label className="ps-label ps-label-inline" htmlFor="ld-facility">{t('labelDesignerPage.scopeLabel')}</label>
              <select id="ld-facility" className="ps-input-dark" value={facilityId} onChange={e => setFacilityId(e.target.value)}>
                <option value="">{t('labelDesignerPage.enterpriseDefaultOption')}</option>
                {facilities.map(f => <option key={f.id} value={f.id}>{t('labelDesignerPage.facilityOverrideOption', { name: f.name })}</option>)}
              </select>
            </>
          ) : (
            <span className="ps-locked-badge" title={t('labelDesignerPage.lockedBadgeTooltip')}>
              🔒 {t('labelDesignerPage.lockedBadgeText')}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="ps-conf-loading">{t('common.loading')}</div>
      ) : (
        <div className="ps-designer-layout">
          {/* Palette */}
          <div className="ps-panel-box">
            <h3 className="ps-panel-heading">{t('labelDesignerPage.availableFieldsHeading')}</h3>
            {availableFields.length === 0 && <p className="ps-helper-text">{t('labelDesignerPage.allFieldsPlaced')}</p>}
            {/* f.displayName is from the same out-of-scope
                LABEL_FIELD_CATALOG shared constant noted above. */}
            {availableFields.map(f => (
              <div
                key={f.key}
                draggable
                onDragStart={e => handlePaletteDragStart(e, f.key)}
                className="ps-palette-item">
                {f.displayName}
              </div>
            ))}
          </div>

          {/* Canvas */}
          <div>
            <div
              ref={canvasRef}
              onDragOver={e => e.preventDefault()}
              onDrop={handleCanvasDrop}
              onClick={() => setSelectedFieldId(null)}
              className="ps-designer-canvas"
              style={{ '--canvas-w': `${widthMm * PX_PER_MM}px`, '--canvas-h': `${heightMm * PX_PER_MM}px` } as React.CSSProperties}>
              {fields.map(f => {
                const def = LABEL_FIELD_CATALOG[labelType].find(c => c.key === f.fieldKey);
                const isSelected = f.id === selectedFieldId;
                return (
                  <div
                    key={f.id}
                    draggable
                    onDragStart={e => { e.stopPropagation(); if (resizeRef.current) { e.preventDefault(); return; } handlePlacedFieldDragStart(e, f.id); }}
                    onClick={e => { e.stopPropagation(); setSelectedFieldId(f.id); }}
                    title={def?.displayName ?? f.fieldKey}
                    data-field-id={f.id}
                    className={`ps-designer-field${isSelected ? ' ps-designer-field--selected' : ''}${outsideIds.has(f.id) ? ' ps-designer-field--outside' : ''}`}
                    style={{
                      '--field-x': `${f.xMm * PX_PER_MM}px`, '--field-y': `${f.yMm * PX_PER_MM}px`,
                      '--field-w': `${f.widthMm * PX_PER_MM}px`, '--field-h': `${f.heightMm * PX_PER_MM}px`,
                      '--field-font': `${f.fontSizeMm * PX_PER_MM * 0.6}px`,
                    } as React.CSSProperties}>
                    {f.fieldKey === 'barcode' ? (
                      // Real, per this file's own header — a real,
                      // rendered barcode (the same generateBarcodeSvg.ts
                      // every other real label's own HTML render
                      // already uses), not placeholder text — lets a
                      // person actually see whether a real barcode
                      // fits and looks right at this real size.
                      <div
                        className="ps-designer-field-barcode-fill"
                        dangerouslySetInnerHTML={{ __html: safeBarcodeSvg(SAMPLE_VALUES.barcode, LABEL_TYPE_DEFAULT_SYMBOLOGY[labelType], t('labelDesignerPage.barcodeRenderFailed')) }}
                      />
                    ) : (
                      SAMPLE_VALUES[f.fieldKey] ?? f.fieldKey
                    )}
                    {isSelected && RESIZE_HANDLES.map(h => (
                      <span
                        key={h}
                        role="presentation"
                        draggable={false}
                        data-handle={h}
                        title={t('labelDesignerPage.resizeHandleTooltip')}
                        className={`ps-designer-handle ps-designer-handle--${h}`}
                        onDragStart={e => { e.preventDefault(); e.stopPropagation(); }}
                        onClick={e => e.stopPropagation()}
                        onPointerDown={e => handleResizeStart(e, f, h)}
                        onPointerMove={handleResizeMove}
                        onPointerUp={handleResizeEnd}
                        onPointerCancel={handleResizeEnd}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
            <p className="ps-canvas-caption">{t('labelDesignerPage.canvasCaption', { width: widthMm, height: heightMm })}</p>
            {outsideIds.size > 0 && (
              <div className="ps-designer-bounds-warning" role="alert">
                ⚠ {t('labelDesignerPage.outOfBoundsWarning', { count: outsideIds.size })}
                <button type="button" className="ps-btn-small" onClick={fitAllToLabel}>{t('labelDesignerPage.fitToLabelButton')}</button>
              </div>
            )}
          </div>

          {/* Inspector */}
          <div className="ps-panel-box">
            <h3 className="ps-panel-heading">{t('labelDesignerPage.inspectorHeading')}</h3>
            {!selectedField && <p className="ps-helper-text">{t('labelDesignerPage.selectFieldPrompt')}</p>}
            {selectedField && (
              <>
                <label className="ps-label">{t('labelDesignerPage.field.x')}</label>
                <MmInput className="ps-input-dark ps-w-full-mb-8" value={selectedField.xMm} onCommit={n => updateSelectedField({ xMm: n })} />
                <label className="ps-label">{t('labelDesignerPage.field.y')}</label>
                <MmInput className="ps-input-dark ps-w-full-mb-8" value={selectedField.yMm} onCommit={n => updateSelectedField({ yMm: n })} />
                <label className="ps-label">{t('labelDesignerPage.field.width')}</label>
                <MmInput className="ps-input-dark ps-w-full-mb-8" value={selectedField.widthMm} onCommit={n => updateSelectedField({ widthMm: n })} />
                <label className="ps-label">{t('labelDesignerPage.field.height')}</label>
                <MmInput className="ps-input-dark ps-w-full-mb-8" value={selectedField.heightMm} onCommit={n => updateSelectedField({ heightMm: n })} />
                <label className="ps-label">{t('labelDesignerPage.field.fontSize')}</label>
                <MmInput className="ps-input-dark ps-w-full ps-mb-14" step={0.1} value={selectedField.fontSizeMm} onCommit={n => updateSelectedField({ fontSizeMm: n })} />
                <button className="ps-btn-small" onClick={removeSelectedField}>{t('labelDesignerPage.removeFieldButton')}</button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="ps-designer-footer-row">
        <button className="ps-conf-btn-secondary" disabled={saving} onClick={handleSave}>{saving ? t('common.saving') : t('labelDesignerPage.saveLayoutButton')}</button>
        <button className="ps-btn-small" onClick={handleReset}>{t('labelDesignerPage.resetToDefaultButton')}</button>
        <button className="ps-btn-small" onClick={handleExportZpl}>📤 {t('labelDesignerPage.exportZplButton')}</button>
        {saveMessage && <span className="ps-helper-text">{saveMessage}</span>}
      </div>

      {exportedZpl && (
        <div className="ps-panel-box ps-mt-16">
          <div className="ps-page-header-row">
            <h3 className="ps-panel-heading">{t('labelDesignerPage.exportedZplHeading')}</h3>
            <button className="ps-btn-small" onClick={() => setExportedZpl(null)}>✕ {t('common.close')}</button>
          </div>
          <p className="ps-helper-text">
            <Trans
              i18nKey="labelDesignerPage.exportInstructions"
              values={{ dpi: EXPORT_DPI, width: widthMm, height: heightMm }}
              components={{ viewer: <strong /> }}
            />
          </p>
          <textarea
            className="ps-input-dark ps-w-full ps-designer-zpl-textarea"
            readOnly
            value={exportedZpl}
            onClick={e => (e.target as HTMLTextAreaElement).select()}
          />
        </div>
      )}
    </div>
  );
};

export default LabelDesignerPage;
