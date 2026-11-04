// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { editFieldRequest } from './editFieldCommand';

const PHRASES = ['edit field', 'change field', 'modifier le champ', 'feld bearbeiten', '필드 편집'];

describe('editFieldRequest', () => {
  it('no name: the section being worked on', () => {
    expect(editFieldRequest('edit field', PHRASES)).toEqual({ active: true });
    expect(editFieldRequest(undefined, PHRASES)).toEqual({ active: true });
  });
  it('names the kind of section, in any of the six languages', () => {
    expect(editFieldRequest('edit field microscopic', PHRASES)).toEqual({ kind: 'microscopic', label: 'microscopic' });
    expect(editFieldRequest('Edit Field Clinical History', PHRASES)).toEqual({ kind: 'admin', label: 'clinical history' });
    expect(editFieldRequest('feld bearbeiten Mikroskopie', PHRASES)).toMatchObject({ kind: 'microscopic' });
    expect(editFieldRequest('modifier le champ diagnostic', PHRASES)).toMatchObject({ kind: 'diagnosis' });
    expect(editFieldRequest('필드 편집 진단', PHRASES)).toMatchObject({ kind: 'diagnosis' });
  });
  it('any other name is looked up by the section label', () => {
    expect(editFieldRequest('change field special stains', PHRASES)).toEqual({ label: 'special stains' });
  });
});

import { matchSynopticField, isFieldNameRequest, requestSynopticFieldEdit, EDIT_SYNOPTIC_FIELD_EVENT } from './editFieldCommand';

describe('matchSynopticField (Batch 665)', () => {
  const fields = [
    { fieldId: 'f1', sectionId: 's1', label: 'Tumor Size' }, { fieldId: 'f2', sectionId: 's1', label: 'Tumor Site' },
    { fieldId: 'f3', sectionId: 's2', label: 'Margin Status' }, { fieldId: 'f4', sectionId: 's2', label: 'Lymph Node Status' },
  ];
  it('matches an exact label, or every spoken word in exactly one label', () => {
    expect(matchSynopticField('tumor size', fields)?.fieldId).toBe('f1');
    expect(matchSynopticField('margin', fields)?.fieldId).toBe('f3');
    expect(matchSynopticField('lymph node', fields)?.fieldId).toBe('f4');
  });
  it('picks nothing when the name is empty, unknown or shared by several fields', () => {
    expect(matchSynopticField('', fields)).toBeNull();
    expect(matchSynopticField('tumor', fields)).toBeNull();
    expect(matchSynopticField('status', fields)).toBeNull();
    expect(matchSynopticField('grade', fields)).toBeNull();
  });
});

describe('field-name requests', () => {
  it('only a name that is not a section word (and not empty) is a field-name request', () => {
    expect(isFieldNameRequest(editFieldRequest('edit field tumor size', PHRASES))).toBe(true);
    expect(isFieldNameRequest(editFieldRequest('edit field microscopic', PHRASES))).toBe(false);
    expect(isFieldNameRequest(editFieldRequest('edit field', PHRASES))).toBe(false);
  });
});

describe('requestSynopticFieldEdit', () => {
  it('reports whether the panel took it', () => {
    expect(requestSynopticFieldEdit('tumor size')).toBe(false);          // nobody listening
    const h = (e: Event) => { (e as CustomEvent).detail.handled = true; };
    window.addEventListener(EDIT_SYNOPTIC_FIELD_EVENT, h);
    expect(requestSynopticFieldEdit('tumor size')).toBe(true);
    window.removeEventListener(EDIT_SYNOPTIC_FIELD_EVENT, h);
  });
});
