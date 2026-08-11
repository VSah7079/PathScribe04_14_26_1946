/**
 * IdentifierFormatsSection.tsx
 * src/components/Config/System/IdentifierFormatsSection.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Read-only display of system-defined identifier formats per jurisdiction.
 * Admins can:
 *   - Enable / disable each format via toggle
 *   - Select a LIS preset to filter relevant formats
 *   - Test any format against a real value (type or barcode scan)
 *
 * Formats are system-defined and validated — not editable by admins.
 * To add or modify a format, submit an enhancement request.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useCallback } from 'react';
import '../../../pathscribe.css';
import { useSystemConfig } from '../../../contexts/SystemConfigContext';
import { useScanner } from '../../../contexts/ScannerProvider';
import { useAuditLog } from '../../Audit/useAuditLog';
import {
  IDENTIFIER_FORMAT_LIBRARY,
  JURISDICTION_LOCALE,
  PATIENT_ID_BY_JURISDICTION,
  deriveLegacyFormats,
  type IdentifierFormat,
  type IdentifierKind,
  type LisPreset,
} from '../../../types/systemConfig';
import { dateFormatHint } from '../../../utils/formatDate';

// ── Constants ─────────────────────────────────────────────────────────────────

const KIND_LABELS: Record<IdentifierKind, string> = {
  accession:    'Accession Number',
  mrn:          'Patient Identifier',
  slide:        'Slide Barcode',
  requisition:  'Requisition Number',
  block:        'Block / Cassette ID',
  external_ref: 'External Reference',
};

const KIND_COLOURS: Record<IdentifierKind, string> = {
  accession:    '#8b5cf6',
  mrn:          '#0891B2',
  slide:        '#10b981',
  requisition:  '#f59e0b',
  block:        '#64748b',
  external_ref: '#6366f1',
};

const BARCODE_LABELS: Record<string, string> = {
  '1d_code128':    '1D Code 128',
  '1d_code39':     '1D Code 39',
  '2d_datamatrix': '2D DataMatrix',
  '2d_qr':         '2D QR',
  '2d_pdf417':     '2D PDF417',
};

const LIS_OPTIONS: { value: LisPreset; label: string }[] = [
  { value: 'generic',       label: 'Generic / All' },
  { value: 'copath',        label: 'CoPath' },
  { value: 'epic_beaker',   label: 'Epic Beaker' },
  { value: 'sunquest',      label: 'Sunquest' },
  { value: 'cerner_pathnet',label: 'Cerner PathNet' },
  { value: 'meditech',      label: 'Meditech' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const testPattern = (pattern: string, value: string): boolean => {
  try { return new RegExp(pattern).test(value); } catch { return false; }
};

// ── Format row ────────────────────────────────────────────────────────────────

const FormatRow: React.FC<{
  format:    IdentifierFormat;
  onToggle:  (id: string, enabled: boolean) => void;
}> = ({ format, onToggle }) => {
  const [testValue,  setTestValue]  = useState('');
  const [showRegex,  setShowRegex]  = useState(false);

  const matches   = testValue ? testPattern(format.pattern, testValue) : null;
  const kindColor = KIND_COLOURS[format.kind];
  const is2D      = format.barcodeTypes.some(b => b.startsWith('2d'));

  return (
    <div className={`ps-idf-row${format.enabled ? '' : ' ps-idf-row--disabled'}`}>

      {/* Header row */}
      <div className="ps-idf-row-header">
        <div className="ps-idf-row-left">
          <span
            className="ps-idf-kind-badge"
            style={{ background: kindColor + '22', color: kindColor, border: `1px solid ${kindColor}44` }}
          >
            {KIND_LABELS[format.kind]}
          </span>
          <span className="ps-idf-row-label">{format.label}</span>
          {format.tier === 1 && (
            <span className="ps-idf-tier-badge ps-idf-tier-badge--1">Tier 1 · Search</span>
          )}
          {format.tier === 2 && (
            <span className="ps-idf-tier-badge ps-idf-tier-badge--2">Tier 2 · Internal</span>
          )}
          {format.navigateToCaseOnMatch && (
            <span className="ps-idf-nav-badge">⚡ Opens case directly</span>
          )}
          {is2D && (
            <span className="ps-idf-barcode-badge ps-idf-barcode-badge--2d">2D</span>
          )}
        </div>
        <div className="ps-idf-row-right">
          <div
            className={`ps-toggle-track${format.enabled ? ' on' : ' off'}`}
            onClick={() => onToggle(format.id, !format.enabled)}
          >
            <div className="ps-toggle-thumb" />
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="ps-idf-desc">{format.description}</div>

      {/* Barcode types */}
      <div className="ps-idf-barcodes">
        {format.barcodeTypes.map(b => (
          <span key={b} className="ps-idf-barcode-chip">{BARCODE_LABELS[b] ?? b}</span>
        ))}
      </div>

      {/* Test field */}
      {format.enabled && (
        <div className="ps-idf-test-row">
          <div className="ps-idf-test-field">
            <input
              className={`ps-idf-test-input${matches === false ? ' ps-idf-test-input--fail' : matches === true ? ' ps-idf-test-input--pass' : ''}`}
              value={testValue}
              onChange={e => setTestValue(e.target.value)}
              placeholder={is2D
                ? `Scan a ${format.barcodeTypes[0]} barcode or paste payload…`
                : `Type or scan a value (e.g. ${format.example})`}
              spellCheck={false}
            />
            {testValue && matches !== null && (
              <span className={`ps-idf-test-result${matches ? ' ps-idf-test-result--pass' : ' ps-idf-test-result--fail'}`}>
                {matches ? '✓ match' : '✗ no match'}
              </span>
            )}
          </div>
          {testValue && matches !== null && (
            <div className={`ps-idf-test-banner${matches ? ' ps-idf-test-banner--pass' : ' ps-idf-test-banner--fail'}`}>
              {matches
                ? `✓ "${testValue}" matches — will be detected as ${KIND_LABELS[format.kind]}${format.navigateToCaseOnMatch ? ' and open the case directly' : ''}`
                : `✗ "${testValue}" does not match — check your test value`}
            </div>
          )}
        </div>
      )}

      {/* Regex toggle — read-only */}
      <div className="ps-idf-regex-toggle">
        <button
          className="ps-idf-regex-btn"
          onClick={() => setShowRegex(v => !v)}
        >
          {showRegex ? 'Hide pattern' : 'Show pattern'}
        </button>
        {format.payload2DSchema && (
          <span className="ps-idf-schema-hint">2D schema: {format.payload2DSchema}</span>
        )}
      </div>
      {showRegex && (
        <div className="ps-idf-regex-display">
          <code>{format.pattern}</code>
          <span className="ps-idf-regex-note">System-defined — not editable. Submit an enhancement request to modify.</span>
        </div>
      )}

    </div>
  );
};

// ── Simulate a scan ──────────────────────────────────────────────────────────
// No physical scanner needed to test this — HID scanners are just fast
// keyboard bursts, and the timing-detection that tells them apart from
// human typing is a separate, already-working concern from what actually
// changed today (multi-format matching). This bypasses the keystroke
// timing capture and calls the real detection logic directly.

const SimulateScanTool: React.FC = () => {
  const { simulateScan, lastScan } = useScanner();
  const [value, setValue] = useState('');
  const [fired, setFired] = useState(false);

  const handleRun = () => {
    if (!value.trim()) return;
    setFired(true);
    simulateScan(value);
  };

  return (
    <div className="ps-idf-locale-card">
      <div className="ps-idf-locale-row ps-idf-simulate-label-row">
        <span className="ps-idf-locale-label">Simulate a scan (no scanner needed)</span>
      </div>
      <div className="ps-idf-simulate-row">
        <input
          className="ps-idf-test-input ps-idf-simulate-input"
          value={value}
          onChange={e => { setValue(e.target.value); setFired(false); }}
          onKeyDown={e => { if (e.key === 'Enter') handleRun(); }}
          placeholder="Type a value exactly as it would scan, e.g. SP26-4200 or 943 476 5919"
          spellCheck={false}
        />
        <button className="ps-btn-secondary ps-idf-simulate-btn" onClick={handleRun}>Simulate Scan</button>
      </div>
      {fired && lastScan && (
        <div className={`ps-idf-test-banner${lastScan.type !== 'unknown' ? ' ps-idf-test-banner--pass' : ' ps-idf-test-banner--fail'}`}>
          {lastScan.type === 'accession' && `✓ Detected as Accession Number — navigating to /case/${lastScan.matchedAccession}/synoptic, same as a real scan.`}
          {lastScan.type === 'mrn' && `✓ Detected as a Patient ID (MRN/NHS/CHI/etc.) format.`}
          {lastScan.type === 'unknown' && `✗ Didn't match any enabled Accession or Patient ID format. Check the formats are toggled on below, or that this value's shape matches one of their patterns.`}
        </div>
      )}
      <div className="ps-idf-regex-note ps-idf-simulate-note">
        This runs the exact same detection code a real scan triggers — if the value matches an
        enabled Accession or Slide format, this will navigate away from this page, same as scanning
        the physical label would.
      </div>
    </div>
  );
};

// ── Main section ──────────────────────────────────────────────────────────────

const IdentifierFormatsSection: React.FC = () => {
  const { config, updateConfig } = useSystemConfig();
  const { log } = useAuditLog();
  const jurisdiction = config.jurisdiction;
  const jLocale      = JURISDICTION_LOCALE[jurisdiction];
  const patientId    = PATIENT_ID_BY_JURISDICTION[jurisdiction];

  // Initialise from library, filtered by jurisdiction
  const initFormats = (): IdentifierFormat[] =>
    IDENTIFIER_FORMAT_LIBRARY.map(f => {
      // Check if this format applies to this jurisdiction
      const jurisdictionMatch =
        f.jurisdictions.length === 0 || f.jurisdictions.includes(jurisdiction);

      // Check if already enabled in config
      const configFormat = config.identifierFormats?.formats?.find(cf => cf.id === f.id);
      const enabled = configFormat
        ? configFormat.enabled
        : (jurisdictionMatch && f.enabled);

      return { ...f, enabled };
    });

  const [formats,    setFormats]    = useState<IdentifierFormat[]>(initFormats);
  const [lisFilter,  setLisFilter]  = useState<LisPreset>('generic');
  const [hasChanges, setHasChanges] = useState(false);

  const handleToggle = useCallback((id: string, enabled: boolean) => {
    setFormats(prev => prev.map(f => f.id === id ? { ...f, enabled } : f));
    setHasChanges(true);
    const fmt = formats.find(f => f.id === id);
    if (fmt) log('identifier_format_toggled', { formatId: id, label: fmt.label, enabled });
  }, [formats, log]);

  const handleSave = () => {
    const legacy = deriveLegacyFormats(formats);
    updateConfig({
      identifierFormats: {
        formats,
        ...legacy,
      },
    });
    log('identifier_formats_saved', {
      jurisdiction,
      enabledCount: formats.filter(f => f.enabled).length,
    });
    setHasChanges(false);
  };

  // Filter by LIS preset
  const visibleFormats = formats.filter(f =>
    lisFilter === 'generic'
      ? true
      : f.lisPresets.length === 0 || f.lisPresets.includes(lisFilter)
  );

  // Group by kind
  const tier1 = visibleFormats.filter(f => f.tier === 1);
  const tier2 = visibleFormats.filter(f => f.tier === 2);

  // Every enabled patient-ID format, for the summary card above — not just
  // the single format tied to the system-wide jurisdiction default. Once
  // an admin enables e.g. NHS Number alongside MRN, the card should say
  // so, not keep showing only the one jurisdiction's default as if it
  // were the only format recognized.
  const enabledPatientIdFormats = formats.filter(f => f.kind === 'mrn' && f.enabled);

  return (
    <div className="ps-idf-shell">

      {/* Header */}
      <div className="ps-idf-header">
        <div className="ps-idf-header-text">
          <h3 className="ps-idf-title">Identifier Formats</h3>
          <p className="ps-idf-subtitle">
            Enable the identifier patterns your institution's clients use — multiple
            jurisdictions can be enabled at once (e.g. US and UK simultaneously).
            Slide barcodes (Tier 1) open the case directly in the Synoptic Report page when scanned.
          </p>
        </div>
        <div className="ps-idf-header-actions">
          {hasChanges && <span className="ps-idf-unsaved">● Unsaved changes</span>}
          {hasChanges && (
            <button className="ps-btn-primary" onClick={handleSave}>Save Changes</button>
          )}
        </div>
      </div>

      {/* Jurisdiction & locale info — this card is a SYSTEM-WIDE FALLBACK
          default, not a live per-case value. The actual jurisdiction for
          any given case is resolved from that case's Submitting Client
          (Facility.jurisdiction, set in Facility Configuration) — a Fenwick
          case gets NHS Number/British spelling, a Metro General case gets
          MRN/US spelling, regardless of what's shown here. This default
          is only used as a last resort when no client context is
          available (e.g. before a client is selected on the Accession
          page). Relabeled June 2026 — this used to just say
          "Jurisdiction," which read as if it were the live, active value
          for whatever case/user you were looking at. */}
      <div className="ps-idf-locale-card">
        <div className="ps-idf-locale-row">
          <span className="ps-idf-locale-label">System default jurisdiction</span>
          <span className="ps-idf-locale-value">{jurisdiction}</span>
        </div>
        <div className="ps-idf-locale-row">
          <span className="ps-idf-locale-label">Date format</span>
          <span className="ps-idf-locale-value">{dateFormatHint(jurisdiction)}</span>
        </div>
        <div className="ps-idf-locale-row">
          <span className="ps-idf-locale-label">Time format</span>
          <span className="ps-idf-locale-value">{jLocale.timeFormat === '24h' ? '24-hour' : '12-hour'}</span>
        </div>
        <div className="ps-idf-locale-row">
          <span className="ps-idf-locale-label">Locale</span>
          <span className="ps-idf-locale-value">{jLocale.locale}</span>
        </div>
        <div className="ps-idf-locale-row">
          <span className="ps-idf-locale-label">Spell check</span>
          <span className="ps-idf-locale-value">{jLocale.spellLang}</span>
        </div>
        <div className="ps-idf-locale-row">
          <span className="ps-idf-locale-label">Patient ID standard{enabledPatientIdFormats.length > 1 ? 's' : ''}</span>
          <span className="ps-idf-locale-value">
            {enabledPatientIdFormats.length > 0
              ? enabledPatientIdFormats.map(f => `${f.label} — ${f.example}`).join(', ')
              : `${patientId.label} — ${patientId.format} (default — no MRN-kind format currently enabled)`}
          </span>
        </div>
      </div>
      <p className="ps-idf-fallback-note">
        These are the <strong>system fallback</strong> defaults, used only when a case has no
        Submitting Client context to resolve from. Each case's actual date format, spelling, and
        patient ID standard come from its Submitting Client's own jurisdiction — see the Client
        Dictionary — not from this page.
      </p>

      {/* Detection order note */}
      <div className="ps-idf-detection-note">
        <span className="ps-idf-detection-label">Detection order: </span>
        Slide barcode → Accession number → Patient ID → Requisition → Patient name → All fields (ambiguous)
      </div>

      {/* Simulate a scan — tests the real end-to-end detection + navigation
          logic without a physical scanner. Calls the exact same handleScan()
          a real HID scanner triggers (via useScanner().simulateScan), not a
          reimplementation — so this genuinely tests what's shipped, not an
          approximation of it. Unlike each format row's own test field below
          (which only checks one pattern in isolation), this runs the full
          detection order across every enabled format, and will actually
          navigate if the value matches an Accession or Slide format —
          same as a real scan would. */}
      <SimulateScanTool />

      {/* LIS preset filter */}
      <div className="ps-idf-lis-row">
        <span className="ps-idf-lis-label">Filter by LIS:</span>
        <div className="ps-idf-lis-options">
          {LIS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`ps-idf-lis-btn${lisFilter === opt.value ? ' ps-idf-lis-btn--active' : ''}`}
              onClick={() => setLisFilter(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tier 1 — Search box + direct navigation */}
      <div className="ps-idf-section">
        <div className="ps-idf-section-header">
          <span className="ps-idf-section-title">Tier 1 — Smart Search & Direct Navigation</span>
          <span className="ps-idf-section-desc">
            These formats are detected in the Search identifier box.
            Slide barcodes (⚡) navigate directly to the Synoptic Report page.
          </span>
        </div>
        <div className="ps-idf-list">
          {tier1.length === 0
            ? <div className="ps-idf-empty">No Tier 1 formats available for this LIS filter.</div>
            : tier1.map(f => <FormatRow key={f.id} format={f} onToggle={handleToggle} />)
          }
        </div>
      </div>

      {/* Tier 2 — Internal mapping */}
      <div className="ps-idf-section">
        <div className="ps-idf-section-header">
          <span className="ps-idf-section-title">Tier 2 — Internal Mapping</span>
          <span className="ps-idf-section-desc">
            Used by the Computational Sidecar for result-to-specimen mapping and HL7 OBR segment matching.
            Not detected in the Search box.
          </span>
        </div>
        <div className="ps-idf-list">
          {tier2.length === 0
            ? <div className="ps-idf-empty">No Tier 2 formats available for this LIS filter.</div>
            : tier2.map(f => <FormatRow key={f.id} format={f} onToggle={handleToggle} />)
          }
        </div>
      </div>

      {/* Enhancement request note */}
      <div className="ps-idf-enhance-note">
        Identifier patterns are system-defined and validated. To add a new format or modify an existing one,
        submit an Enhancement Request via the nav bar.
      </div>

    </div>
  );
};

export default IdentifierFormatsSection;
