// src/components/Workstation/StationScanField.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Touch spec T1 (Pete, Oct 30, 2026): the one scan field every station uses. A keyboard-wedge scanner types into
// it like a keyboard, so it:
//   • never raises the on-screen keyboard (`inputmode="none"`), unless the person taps the keyboard button to type
//     an id by hand;
//   • is focused when the screen opens and gets focus back after every scan (useScanFieldFocus);
//   • submits on Enter, which every scanner sends at the end of a barcode.
// The page decides what a scan does (onScan); this component only takes the scan in.
// ─────────────────────────────────────────────────────────────────────────────
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useScanFieldFocus } from '@/hooks/useScanFieldFocus';
import { scanFieldInputMode } from '@/utils/touch/scanFieldFocus';
import './StationScanField.css';

export interface StationScanFieldProps {
  /** Called with the trimmed text when a scan (or a typed id) is submitted. The field clears afterwards. */
  onScan: (value: string) => void | Promise<void>;
  placeholder: string;
  /** The submit button's text (Open, Scan, Look up…). */
  submitLabel: string;
  /** Read out by screen readers; the placeholder when not given. */
  ariaLabel?: string;
  id?: string;
  /** Compact: one line beside other controls (a context bar), no bottom margin. */
  compact?: boolean;
  /** Set when the field holds a patient identifier (an accession number). */
  phiKind?: string;
  /** Turn off focus keeping (for example while the screen shows a window of its own). */
  keepFocus?: boolean;
  /** Clears any "not found" message when the text changes. */
  onTextChange?: (value: string) => void;
}

export function StationScanField({ onScan, placeholder, submitLabel, ariaLabel, id, compact, phiKind, keepFocus = true, onTextChange }: StationScanFieldProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  const [typing, setTyping] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const reclaim = useScanFieldFocus(ref, keepFocus);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const scanned = value.trim();
    if (!scanned || busy) return;
    setBusy(true);
    try { await onScan(scanned); } finally {
      setBusy(false);
      setValue('');
      setTyping(false);
      // Back to the field for the next scan, unless the scan opened a window or moved focus on purpose.
      window.setTimeout(reclaim, 0);
    }
  };

  const toggleTyping = () => {
    setTyping(v => !v);
    // Re-focus so the keyboard opens (or closes) with the new input mode.
    window.setTimeout(() => { ref.current?.blur(); ref.current?.focus(); }, 0);
  };

  return (
    <form className={`ps-station-scan${compact ? ' ps-station-scan--compact' : ''}`} onSubmit={submit} role="search">
      <input
        ref={ref}
        id={id}
        type="text"
        className="ps-station-scan-input"
        inputMode={scanFieldInputMode(typing)}
        enterKeyHint="go"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="characters"
        spellCheck={false}
        value={value}
        onChange={e => { setValue(e.target.value); onTextChange?.(e.target.value); }}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        data-scan-field="true"
        {...(phiKind ? { 'data-phi': phiKind } : {})}
      />
      <button
        type="button"
        className={`ps-station-scan-keyboard${typing ? ' ps-station-scan-keyboard--on' : ''}`}
        onClick={toggleTyping}
        aria-pressed={typing}
        aria-label={t(typing ? 'stationScan.backToScanning' : 'stationScan.typeAnId')}
      >
        {t(typing ? 'stationScan.backToScanningShort' : 'stationScan.typeAnIdShort')}
      </button>
      <button type="submit" className="ps-btn-primary ps-station-scan-submit" disabled={busy || !value.trim()}>{submitLabel}</button>
    </form>
  );
}

export default StationScanField;
