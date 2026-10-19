// src/components/Config/System/SlideLabelLayoutEditor.tsx
// Batch 606 (PS-15 / PS-165): the admin-edited slide label layout (face size,
// module size, font height) with fit warnings, a scaled preview and a test
// print. The saved values now drive the slide ZPL (buildSlideZplTemplate), so
// what the admin sees here is what prints. Mirrors CassetteLabelLayoutEditor.
// The preview uses the same conservative 26-module DataMatrix estimate as the
// fit check; the printer firmware decides the final grid size.

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import '../../../pathscribe.css';
import type { SlideLabelLayoutConfig } from '@/services/printSettings/IPrintSettingsService';
import { resolveSlideLabelFitWarnings, CONSERVATIVE_SLIDE_DATAMATRIX_MODULE_COUNT } from '@/utils/labels/resolveSlideLabelFitWarnings';
import { printerProfileService } from '@/services/index';
import { printSlideLabel } from '@/utils/labels/printCassetteSlideLabel';
import type { PrinterProfile } from '@/services/printerProfiles/IPrinterProfileService';

const SAMPLE_LINES = ['A1 L1', 'H&E'];

interface Props {
  value: SlideLabelLayoutConfig;
  onChange: (changes: Partial<SlideLabelLayoutConfig>) => void;
  readOnly: boolean;
}

const FIELDS: { key: keyof SlideLabelLayoutConfig; step: string; min: string; label: string }[] = [
  { key: 'faceWidthMm', step: '0.1', min: '1', label: 'slideLabelLayoutEditor.fields.faceWidth' },
  { key: 'faceHeightMm', step: '0.1', min: '1', label: 'slideLabelLayoutEditor.fields.faceHeight' },
  { key: 'moduleSizeMm', step: '0.01', min: '0.05', label: 'slideLabelLayoutEditor.fields.moduleSize' },
  { key: 'fontHeightMm', step: '0.1', min: '0.5', label: 'slideLabelLayoutEditor.fields.fontHeight' },
];

const SlideLabelLayoutEditor: React.FC<Props> = ({ value, onChange, readOnly }) => {
  const { t } = useTranslation();
  const [printers, setPrinters] = useState<PrinterProfile[]>([]);
  const [selectedPrinterId, setSelectedPrinterId] = useState('');
  const [testGtin, setTestGtin] = useState('');
  const [testStatus, setTestStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [sending, setSending] = useState(false);

  React.useEffect(() => {
    printerProfileService.getAll().then(res => {
      if (res.ok) {
        setPrinters(res.data);
        if (res.data.length > 0) setSelectedPrinterId(res.data[0].id);
      }
    });
  }, []);

  const warnings = useMemo(() => resolveSlideLabelFitWarnings(value), [value]);
  const scale = 10;
  const svgWidth = value.faceWidthMm * scale;
  const svgHeight = value.faceHeightMm * scale;
  const marginPx = 0.5 * scale;
  const barcodePx = CONSERVATIVE_SLIDE_DATAMATRIX_MODULE_COUNT * value.moduleSizeMm * scale;
  const fontPx = value.fontHeightMm * scale;
  const textXPx = barcodePx + marginPx * 2;

  const handleTestPrint = async () => {
    const printer = printers.find(p => p.id === selectedPrinterId);
    if (!printer) return;
    setSending(true);
    setTestStatus(null);
    const result = await printSlideLabel(
      { fullAccession: 'PS2026-8821', specimenLabel: 'A', blockLabel: '1', level: 'L1', stainName: 'H&E', slideId: 'PS2026-8821A1-1' },
      printer, testGtin, value,
    );
    setSending(false);
    setTestStatus(result.ok
      ? { ok: true, message: t('cassetteLabelLayoutEditor.testPrint.successMessage', { model: printer.model, printerId: printer.printerId }) }
      : { ok: false, message: (result as { ok: false; message: string }).message });
  };

  return (
    <div className="ps-conf-card ps-conf-card--spaced" data-testid="slide-label-layout-editor">
      <div className="ps-conf-card-title">{t('slideLabelLayoutEditor.title')}</div>
      <div className="ps-conf-card-description">{t('slideLabelLayoutEditor.description')}</div>

      <div className="ps-cassette-layout-fields">
        {FIELDS.map(f => (
          <label key={f.key} className="ps-label">
            {t(f.label)}
            <input
              className="ps-input-dark" type="number" step={f.step} min={f.min}
              value={value[f.key]} disabled={readOnly}
              onChange={e => onChange({ [f.key]: Number(e.target.value) })}
            />
          </label>
        ))}
      </div>

      {warnings.length > 0 ? (
        <div className="ps-cassette-layout-warnings">
          {warnings.map(w => (
            <div key={w.kind} className="ps-conf-callout-banner ps-cassette-layout-warning">
              <span className="ps-conf-callout-banner-text">⚠ {t(`microtomyWorkstation.hardware.fit.${w.kind}`, { required: w.requiredMm, face: w.faceMm })}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="ps-cassette-layout-ok">✓ {t('slideLabelLayoutEditor.ok')}</div>
      )}

      <div className="ps-cassette-layout-preview-wrap">
        <div className="ps-cassette-layout-preview-label">{t('slideLabelLayoutEditor.preview')}</div>
        <svg className="ps-cassette-layout-preview-svg" viewBox={`0 0 ${svgWidth} ${svgHeight}`} width={svgWidth} height={svgHeight}>
          <rect x={0} y={0} width={svgWidth} height={svgHeight} className="ps-cassette-preview-face" />
          <rect x={marginPx} y={marginPx} width={barcodePx} height={barcodePx} className="ps-cassette-preview-barcode" />
          {SAMPLE_LINES.map((line, i) => (
            <text key={line} x={textXPx} y={marginPx + i * fontPx + fontPx * 0.8} className="ps-cassette-preview-text" fontSize={fontPx}>{line}</text>
          ))}
        </svg>
      </div>

      <div className="ps-cassette-layout-testprint">
        <div className="ps-conf-card-title ps-cassette-layout-testprint-title">{t('cassetteLabelLayoutEditor.testPrint.title')}</div>
        <div className="ps-cassette-layout-testprint-row">
          <select aria-label={t('cassetteLabelLayoutEditor.testPrint.title')} data-config-nav className="ps-input-dark"
            value={selectedPrinterId} onChange={e => setSelectedPrinterId(e.target.value)} disabled={printers.length === 0}>
            {printers.length === 0 && <option value="">{t('cassetteLabelLayoutEditor.testPrint.noPrinters')}</option>}
            {printers.map(p => <option key={p.id} value={p.id}>{p.model} ({p.printerId})</option>)}
          </select>
          <input className="ps-input-dark" placeholder={t('cassetteLabelLayoutEditor.testPrint.gtinPlaceholder')}
            value={testGtin} onChange={e => setTestGtin(e.target.value)} maxLength={14} />
          <button type="button" className="ps-conf-callout-banner-link"
            disabled={sending || !selectedPrinterId || !testGtin.trim()} onClick={handleTestPrint}>
            {sending ? t('cassetteLabelLayoutEditor.testPrint.sending') : t('cassetteLabelLayoutEditor.testPrint.sendButton')}
          </button>
        </div>
        {testStatus && (
          <div className={testStatus.ok ? 'ps-cassette-layout-ok' : 'ps-cassette-layout-warning'}>
            {testStatus.ok ? '✓ ' : '⚠ '}{testStatus.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default SlideLabelLayoutEditor;
