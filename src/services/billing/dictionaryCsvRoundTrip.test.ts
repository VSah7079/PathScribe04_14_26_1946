// PS-48 (Batch 451): two manual-maintenance dictionaries, the CPT Modifier
// Dictionary and the NCCI PTP Edit Rules, export their upload template and
// read uploads through the strict-CSV utility (utils/csv). Each template is
// written with toCsv, read back with parseCsv and the dictionary's own upload
// parser, and must come back as the entries it describes; a real upload with
// quoted fields and bad rows is parsed the same way the screens do it.
import { describe, it, expect } from 'vitest';
import { toCsv, parseCsv } from '@/utils/csv';
import {
  modifierUploadTemplateRows, MODIFIER_UPLOAD_TEMPLATE_FILENAME, parseModifierUploadRows, DEFAULT_CPT_MODIFIERS,
} from './cptModifierDictionary';
import { ncciUploadTemplateRows, NCCI_UPLOAD_TEMPLATE_FILENAME, parseNcciUploadRows } from './ncciEditUtils';

/** What a browser hands back when the downloaded file is uploaded again:
 *  downloadCsv prepends a UTF-8 BOM, and FileReader.readAsText (UTF-8
 *  decode) strips it, as TextDecoder does. */
const asDownloadedAndReuploaded = (csv: string) => new TextDecoder().decode(new TextEncoder().encode('﻿' + csv));

describe('CPT Modifier Dictionary CSV (PS-48)', () => {
  it('the template is a .csv with the Code and Description columns the upload reads', () => {
    expect(MODIFIER_UPLOAD_TEMPLATE_FILENAME).toMatch(/\.csv$/);
    const csv = toCsv(modifierUploadTemplateRows());
    expect(csv.split('\r\n')[0]).toBe('Code,Description');
    expect(csv.split('\r\n')).toHaveLength(3);
  });

  it('the downloaded template, uploaded unchanged, reads back as the example modifiers', () => {
    const text = asDownloadedAndReuploaded(toCsv(modifierUploadTemplateRows()));
    expect(parseModifierUploadRows(parseCsv(text))).toEqual({ entries: DEFAULT_CPT_MODIFIERS.slice(0, 2), problems: [] });
  });

  it('an edited upload keeps quoted commas and quotes, skips blank lines and reports rows with no code', () => {
    const text = 'Code,Description\r\n59,"Distinct procedural service, ""XE/XS/XP/XU"" preferred"\r\n,No code here\r\n\r\nGA,\r\n';
    const { entries, problems } = parseModifierUploadRows(parseCsv(text));
    expect(entries).toEqual([
      { code: '59', description: 'Distinct procedural service, "XE/XS/XP/XU" preferred' },
      { code: 'GA', description: 'Modifier GA' },
    ]);
    expect(problems).toEqual([{ row: 2 }]);
  });
});

describe('NCCI PTP Edit Rules CSV (PS-48)', () => {
  it('the template is a .csv with the columns the upload reads', () => {
    expect(NCCI_UPLOAD_TEMPLATE_FILENAME).toMatch(/\.csv$/);
    expect(toCsv(ncciUploadTemplateRows()).split('\r\n')[0]).toBe('Column 1,Column 2,Modifier Indicator,Effective Date,Deletion Date');
  });

  it('the downloaded template, uploaded unchanged, reads back as its example pair', () => {
    const text = asDownloadedAndReuploaded(toCsv(ncciUploadTemplateRows()));
    expect(parseNcciUploadRows(parseCsv(text))).toEqual({
      pairs: [{ columnOneCode: '88305', columnTwoCode: '88300', modifierIndicator: '0', effectiveDate: '2026-01-01', deletionDate: undefined }],
      problems: [],
    });
  });

  it('an upload of several pairs reports each bad row by its spreadsheet row number', () => {
    const rows = [
      ...ncciUploadTemplateRows(),
      { 'Column 1': '88342', 'Column 2': '88341', 'Modifier Indicator': '1', 'Effective Date': '2026-04-01', 'Deletion Date': '2026-12-31' },
      { 'Column 1': '88342', 'Column 2': '', 'Modifier Indicator': '1', 'Effective Date': '2026-04-01', 'Deletion Date': '' },
      { 'Column 1': '88360', 'Column 2': '88361', 'Modifier Indicator': '5', 'Effective Date': '2026-04-01', 'Deletion Date': '' },
      { 'Column 1': '88360', 'Column 2': '88367', 'Modifier Indicator': '9', 'Effective Date': '', 'Deletion Date': '' },
    ];
    const { pairs, problems } = parseNcciUploadRows(parseCsv(toCsv(rows)));
    expect(pairs.map(p => `${p.columnOneCode}/${p.columnTwoCode}/${p.modifierIndicator}/${p.deletionDate ?? ''}`))
      .toEqual(['88305/88300/0/', '88342/88341/1/2026-12-31']);
    expect(problems).toEqual([
      { row: 4, kind: 'missing_codes' },
      { row: 5, kind: 'invalid_modifier', columnOneCode: '88360', columnTwoCode: '88361', modifierRaw: '5' },
      { row: 6, kind: 'missing_effective_date', columnOneCode: '88360', columnTwoCode: '88367' },
    ]);
  });
});
