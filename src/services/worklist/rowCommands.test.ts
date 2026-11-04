import { describe, it, expect } from 'vitest';
import { parseRowNumber, resolveRowCommand, GO_TO_ROW_EVENT, OPEN_ACCESSION_EVENT } from './rowCommands';

const rows = [
  { id: 'c1', accession: { fullAccession: 'A26-4660' } },
  { id: 'c2', accession: { fullAccession: 'A26-4661' } },
  { id: 'c3', accession: { accessionNumber: 'S26-0042' } },
];

describe('go to row', () => {
  it('reads digits and number words', () => {
    expect(parseRowNumber('go to row 7')).toBe(7);
    expect(parseRowNumber('go to row seven')).toBe(7);
    expect(parseRowNumber('go to row')).toBeNull();
  });
  it('moves the highlight within the list and does nothing outside it', () => {
    expect(resolveRowCommand(GO_TO_ROW_EVENT, 'go to row 2', rows)).toEqual({ index: 1 });
    expect(resolveRowCommand(GO_TO_ROW_EVENT, 'go to row 4', rows)).toBeNull();
    expect(resolveRowCommand(GO_TO_ROW_EVENT, 'go to row 0', rows)).toBeNull();
    expect(resolveRowCommand(GO_TO_ROW_EVENT, 'go to row', rows)).toBeNull();
  });
});

describe('open accession', () => {
  it('finds the case whatever the spacing and dashes, and opens it', () => {
    expect(resolveRowCommand(OPEN_ACCESSION_EVENT, 'open accession A26-4660', rows)).toEqual({ index: 0, open: 'c1' });
    expect(resolveRowCommand(OPEN_ACCESSION_EVENT, 'open accession a 26 4661', rows)).toEqual({ index: 1, open: 'c2' });
    expect(resolveRowCommand(OPEN_ACCESSION_EVENT, 'open accession S26 0042', rows)).toEqual({ index: 2, open: 'c3' });
  });
  it('accepts the digits alone only when exactly one visible accession ends in them', () => {
    expect(resolveRowCommand(OPEN_ACCESSION_EVENT, 'open accession 4660', rows)).toEqual({ index: 0, open: 'c1' });
    expect(resolveRowCommand(OPEN_ACCESSION_EVENT, 'open accession 466', rows)).toBeNull();
    expect(resolveRowCommand(OPEN_ACCESSION_EVENT, 'open accession 26', rows)).toBeNull();
  });
  it('opens nothing when it is not in the list or nothing was said', () => {
    expect(resolveRowCommand(OPEN_ACCESSION_EVENT, 'open accession A26-9999', rows)).toBeNull();
    expect(resolveRowCommand(OPEN_ACCESSION_EVENT, 'open accession', rows)).toBeNull();
    expect(resolveRowCommand('PATHSCRIBE_OTHER', 'go to row 1', rows)).toBeNull();
  });
});
