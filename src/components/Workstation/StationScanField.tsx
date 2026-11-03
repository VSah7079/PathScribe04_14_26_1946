// src/components/Workstation/StationScanField.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Touch spec T1 (Pete, Oct 30, 2026): the one scan field every station uses. A keyboard-wedge scanner types into
// it like a keyboard, so it:
//   • never raises the on-screen keyboard (`inputmode="none"`), unless the person taps the keyboard button to type
//     an id by hand;
//   • is focused when the screen opens and gets focus back after every scan (useScanFieldFocus);
//   • submits on Enter, which every scanner sends at the end of a barcode.
// Batch 756 (Pete, Nov 1, 2026: "can't the field listen but also receive keyboard data?"): it always takes both, a
// scanner and a physical keyboard. The keyboard and submit buttons are for touch screens only (no physical Enter key,
// and an on-screen keyboard to open on purpose), so they show only when the station uses the touch layout.
// The page decides what a scan does (onScan); this component only takes the scan in.
// Batch 759 (Patient Verification spec §2.2): it also tells a scan from a typed id (services/scanEntry/entryMethod.ts).
// A typed id goes through at once, like a scan, and the Manual Entry flag is recorded (useManualEntryRecorder); the
// screen that opens the item shows the identifiers to check (useTypedEntryCheck). onScan gets how it was entered.
// ─────────────────────────────────────────────────────────────────────────────
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useScanFieldFocus } from '@/hooks/useScanFieldFocus';
import { useTouchLayout } from '@/hooks/useTouchLayout';
import { scanFieldInputMode } from '@/utils/touch/scanFieldFocus';
import { useManualEntryRecorder } from '@/hooks/useManualEntryRecorder';
import { createEntryTracker, type EntryMethod } from '@/services/scanEntry/entryMethod';
import { noteEntry } from '@/services/scanEntry/lastEntry';
import './StationScanField.css';

export interface StationScanFieldProps {
  /** Called with the trimmed text when a scan (or a typed id) is submitted. The field clears afterwards. */
  onScan: (value: string, entry?: { method: EntryMethod }) => void | Promise<void>;
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
  const { active: touch } = useTouchLayout();
  const tracker = useRef(createEntryTracker());
  const recordManualEntry = useManualEntryRecorder();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const scanned = value.trim();
    if (!scanned) return;
    const method = typing ? 'manual' : tracker.current.method();
    tracker.current.reset();
    noteEntry(scanned, method);
    if (method === 'manual') void recordManualEntry(scanned, { via: 'scanField' });
    // Batch 757: the field clears at once and takes the next scan straight away. It used to ignore a scan that came
    // while the last one was still being handled, so a fast scanner lost every other cassette; the page handles the
    // scans in order (useStationCarrier queues them).
    setValue('');
    setTyping(false);
    setBusy(true);
    try { await onScan(scanned, { method }); } finally {
      setBusy(false);
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
        onChange={e => { tracker.current.change(value, e.target.value); setValue(e.target.value); onTextChange?.(e.target.value); }}
        onKeyDown={e => tracker.current.key(e.key, e.timeStamp)}
        onPaste={() => tracker.current.paste()}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        data-scan-field="true"
        {...(phiKind ? { 'data-phi': phiKind } : {})}
      />
      {touch && (
        <>
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
        </>
      )}
    </form>
  );
}

export default StationScanField;
