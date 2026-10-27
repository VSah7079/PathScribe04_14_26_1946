// src/services/worklist/rowCommands.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 663 (Pete): two Worklist voice commands that name a row instead of stepping to it.
//   "go to row 7"                   moves the highlight to row 7 of the list as shown. Out of range, or no number: nothing.
//   "open accession A26-4660"       finds that case in the list as shown, highlights it and opens it. Opens only when exactly
//                                    one case matches; the spoken value may omit the dash and spaces, or be the digits alone
//                                    (three or more) when only one visible accession ends in them.
// Both only move the highlight or open a case; neither selects or changes anything. Pure: WorklistPage listens and acts.
// ("open case" alone stays Open Selected, so these use "open accession".)
// ─────────────────────────────────────────────────────────────────────────────

export const GO_TO_ROW_EVENT = 'PATHSCRIBE_TABLE_GO_TO_ROW';
export const OPEN_ACCESSION_EVENT = 'PATHSCRIBE_TABLE_OPEN_ACCESSION';
export const ROW_COMMAND_EVENTS = [GO_TO_ROW_EVENT, OPEN_ACCESSION_EVENT] as const;

export interface RowCommandCase {
  id: string;
  accession?: { fullAccession?: string; accessionNumber?: string };
}

export interface RowCommandResult {
  /** Highlight this row (0-based). */
  index: number;
  /** Open the case with this id as well. */
  open?: string;
}

const WORDS: Readonly<Record<string, number>> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
};

/** The row number said, 1-based: digits or a number word up to twenty. Null when none. */
export function parseRowNumber(transcript: string): number | null {
  const text = transcript.toLowerCase();
  const digits = text.match(/\b(\d{1,4})\b/);
  if (digits) return parseInt(digits[1], 10);
  for (const [w, n] of Object.entries(WORDS)) if (new RegExp(`\\b${w}\\b`).test(text)) return n;
  return null;
}

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** What was said after the command words, with the command words themselves removed. */
function spokenAccession(transcript: string): string {
  return squash(transcript.replace(/^.*?\b(?:accession|case number)\b/i, ''));
}

export function resolveRowCommand(eventType: string, transcript: string, rows: readonly RowCommandCase[]): RowCommandResult | null {
  if (eventType === GO_TO_ROW_EVENT) {
    const n = parseRowNumber(transcript);
    return n !== null && n >= 1 && n <= rows.length ? { index: n - 1 } : null;
  }
  if (eventType !== OPEN_ACCESSION_EVENT) return null;
  const said = spokenAccession(transcript);
  if (!said) return null;
  const accessions = rows.map(r => squash(r.accession?.fullAccession ?? r.accession?.accessionNumber ?? ''));
  const exact = accessions.flatMap((a, i) => (a && a === said ? [i] : []));
  const hits = exact.length ? exact : /^\d{3,}$/.test(said) ? accessions.flatMap((a, i) => (a.endsWith(said) ? [i] : [])) : [];
  return hits.length === 1 ? { index: hits[0], open: rows[hits[0]].id } : null;
}
