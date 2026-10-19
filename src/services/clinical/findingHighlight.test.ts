// Batch 452 (PS-323, PS-133): where a detected critical finding is highlighted.
import { describe, expect, it } from 'vitest';
import { findFindingSpans, findingsForField, narrativeFieldForReportRow, narrativeFieldForSection, orchestratorNarrativeText, splitTextByFindings, type FindingHighlightTarget } from './findingHighlight';

const f = (term: string, sourceQuote = '', severity: FindingHighlightTarget['severity'] = 'Malignant'): FindingHighlightTarget => ({ term, sourceQuote, severity });
const marked = (text: string, findings: FindingHighlightTarget[]) => findFindingSpans(text, findings).map(s => [text.slice(s.from, s.to), s.match]);

describe('findFindingSpans', () => {
  it('1. exact quote: highlights the term inside the quote', () => {
    const text = 'Sections show invasive ductal carcinoma, grade 2.';
    expect(marked(text, [f('invasive ductal carcinoma', 'show invasive ductal carcinoma, grade 2')])).toEqual([['invasive ductal carcinoma', 'quote']]);
  });

  it('1. exact quote without the term in it: highlights the whole quote', () => {
    const text = 'Sheets of atypical melanocytes invade the dermis.';
    expect(marked(text, [f('melanoma', 'atypical melanocytes invade the dermis')])).toEqual([['atypical melanocytes invade the dermis', 'quote']]);
  });

  it('2. quote with different capitals or spacing still matches', () => {
    const text = 'SECTIONS SHOW  invasive   ductal carcinoma.';
    expect(marked(text, [f('invasive ductal carcinoma', 'sections show invasive ductal carcinoma')])).toEqual([['invasive   ductal carcinoma', 'quoteLoose']]);
  });

  it('3. quote edited away: falls back to the term, skipping negated mentions', () => {
    const text = 'Frozen: no evidence of carcinoma. Permanent: carcinoma is present.';
    const spans = findFindingSpans(text, [f('carcinoma', 'quote that is no longer in the text')]);
    expect(spans).toHaveLength(1);
    expect(spans[0].from).toBe(text.lastIndexOf('carcinoma'));
    expect(spans[0].match).toBe('term');
  });

  it('4. nothing matches (the words were deleted or only negated): no highlight', () => {
    expect(findFindingSpans('Benign tissue.', [f('carcinoma', 'invasive carcinoma')])).toEqual([]);
    expect(findFindingSpans('No evidence of carcinoma.', [f('carcinoma', 'gone')])).toEqual([]);
  });

  it('whole words only', () => {
    expect(findFindingSpans('Peritoneal carcinomatosis.', [f('carcinoma')])).toEqual([]);
  });

  it('overlapping findings: the more severe wins, the result is sorted and non-overlapping', () => {
    const text = 'Atypia. Invasive carcinoma with necrosis.';
    const spans = findFindingSpans(text, [f('carcinoma with necrosis', '', 'Abnormal'), f('invasive carcinoma', '', 'Malignant'), f('Atypia', '', 'Abnormal')]);
    expect(spans.map(s => text.slice(s.from, s.to))).toEqual(['Atypia', 'Invasive carcinoma']);
  });

  it('copes with empty input and regex characters', () => {
    expect(findFindingSpans('', [f('x')])).toEqual([]);
    expect(findFindingSpans('text', [])).toEqual([]);
    expect(() => findFindingSpans('Ki-67 (30%) [high]', [f('(30%) [high', '(30%) [high]')])).not.toThrow();
  });
});

describe('splitTextByFindings', () => {
  it('cuts text into plain and marked pieces that join back to the original', () => {
    const text = 'Invasive carcinoma. No metastasis.';
    const pieces = splitTextByFindings(text, [f('invasive carcinoma'), f('metastasis')]);
    expect(pieces.map(p => p.text).join('')).toBe(text);
    expect(pieces.filter(p => p.finding).map(p => p.text)).toEqual(['Invasive carcinoma']);
  });
});

describe('which narrative a finding belongs to', () => {
  it('maps Report Draft sections and Full Patient Report rows to the field detection reads', () => {
    expect(['gross_description', 'gross', 'microscopic', 'microscopic_description', 'ancillary_studies', 'ancillary', 'diagnosis'].map(id => narrativeFieldForSection(id)))
      .toEqual(['gross', 'gross', 'microscopic', 'microscopic', 'ancillary', 'ancillary', null]);
    expect(['grossDescription', 'microscopicFindings', 'ancillaryStudies', 'clinicalHistory'].map(narrativeFieldForReportRow))
      .toEqual(['gross', 'microscopic', 'ancillary', null]);
  });

  it('findingsForField keeps only that field (synoptic-rule findings never highlight narrative)', () => {
    const all = [
      { ...f('a'), sourceField: 'microscopic' }, { ...f('b'), sourceField: 'gross' }, { ...f('c'), sourceField: 'synoptic' },
    ];
    expect(findingsForField(all, 'microscopic').map(x => x.term)).toEqual(['a']);
    expect(findingsForField(all, null)).toEqual([]);
    expect(findingsForField(undefined, 'gross')).toEqual([]);
  });
});

describe('Report Draft sections with random ids (PS-323)', () => {
  it('finds the narrative field from the stable part id when the section id is a UUID', () => {
    expect(narrativeFieldForSection('3f2b8c1e-aaaa', 'std_body_gross')).toBe('gross');
    expect(narrativeFieldForSection('3f2b8c1e-bbbb', 'std_body_microscopic')).toBe('microscopic');
    expect(narrativeFieldForSection('3f2b8c1e-cccc', 'std_body_ancillary')).toBe('ancillary');
  });

  it('gives nothing for a section from another part', () => {
    expect(narrativeFieldForSection('3f2b8c1e-dddd', 'std_body_diagnosis')).toBeNull();
  });

  it('joins the text of every section that feeds a field', () => {
    const sections = [
      { id: 'u1', sourcePartId: 'std_body_gross', text: '<p>A</p>' },
      { id: 'u2', sourcePartId: 'std_body_gross', text: '<p>B</p>' },
      { id: 'u3', sourcePartId: 'std_body_microscopic', text: '<p>M</p>' },
      { id: 'u4', sourcePartId: 'std_body_diagnosis', text: '<p>D</p>' },
    ];
    expect(orchestratorNarrativeText(sections, 'gross')).toBe('<p>A</p><p>B</p>');
    expect(orchestratorNarrativeText(sections, 'microscopic')).toBe('<p>M</p>');
    expect(orchestratorNarrativeText(sections, 'ancillary')).toBe('');
  });
});
