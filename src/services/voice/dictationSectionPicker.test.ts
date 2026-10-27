// Batch 650, item 2: which section each Enter-... / dictate command points at.
import { describe, it, expect } from 'vitest';
import { pickDictationSection, ENTER_COMMAND_KIND, type PickableSection } from './dictationSectionPicker';

const sections: PickableSection[] = [
  { id: 'u1', label: 'Administrative & Clinical Header', sourcePartId: 'std_body_demographics' },
  { id: 'u2', label: 'Gross Description — Specimen A', sourcePartId: 'std_body_gross' },
  { id: 'u3', label: 'Gross Description — Specimen B', sourcePartId: 'std_body_gross' },
  { id: 'u4', label: 'Microscopic Description', sourcePartId: 'std_body_microscopic' },
  { id: 'u5', label: 'Final Diagnosis', sourcePartId: 'std_body_diagnosis' },
];

describe('pickDictationSection', () => {
  it('ENTER_GROSS, ENTER_MICRO and ENTER_DIAGNOSIS each point at their own kind of section', () => {
    expect(pickDictationSection(sections, { kind: ENTER_COMMAND_KIND.ENTER_GROSS })?.id).toBe('u2');
    expect(pickDictationSection(sections, { kind: ENTER_COMMAND_KIND.ENTER_MICRO })?.id).toBe('u4');
    expect(pickDictationSection(sections, { kind: ENTER_COMMAND_KIND.ENTER_DIAGNOSIS })?.id).toBe('u5');
  });
  it('with one Gross Description per specimen, the section being worked on wins', () => {
    expect(pickDictationSection(sections, { kind: 'gross' }, 'u3')?.id).toBe('u3');
    expect(pickDictationSection(sections, { kind: 'gross' }, 'u4')?.id).toBe('u2');
  });
  it('a locked (committed) section is skipped', () => {
    const locked = sections.map(s => (s.id === 'u2' ? { ...s, committed: true } : s));
    expect(pickDictationSection(locked, { kind: 'gross' })?.id).toBe('u3');
    expect(pickDictationSection(locked.map(s => ({ ...s, committed: s.sourcePartId === 'std_body_gross' })), { kind: 'gross' })).toBeUndefined();
  });
  it('finds a section by the words in its label when it has no known part id, else by position', () => {
    const custom: PickableSection[] = [{ id: 'a', label: 'Header' }, { id: 'b', label: 'Macroscopic findings' }, { id: 'c', label: 'Comment' }];
    expect(pickDictationSection(custom, { kind: 'gross' })?.id).toBe('b');
    expect(pickDictationSection(custom, { kind: 'diagnosis', sectionIndex: 2 })?.id).toBe('c');
    expect(pickDictationSection(custom, { kind: 'diagnosis' })).toBeUndefined();
  });
  it('an id, a label or an index still work', () => {
    expect(pickDictationSection(sections, { sectionId: 'u4' })?.id).toBe('u4');
    expect(pickDictationSection(sections, { label: 'final' })?.id).toBe('u5');
    expect(pickDictationSection(sections, { sectionIndex: 1 })?.id).toBe('u2');
  });
});

describe('Edit Field requests (Batch 664)', () => {
  const secs = [
    { id: 'a', label: 'Clinical History', sourcePartId: 'std_body_demographics' },
    { id: 'm', label: 'Microscopic Description', sourcePartId: 'std_body_microscopic' },
    { id: 'd', label: 'Diagnóstico', committed: true },
    { id: 'x', label: 'Special Stains' },
  ];
  it('no name means the section being worked on', () => {
    expect(pickDictationSection(secs, { active: true }, 'm')?.id).toBe('m');
    expect(pickDictationSection(secs, { active: true }, undefined)).toBeUndefined();
  });
  it('a name falls back to the label, ignoring accents and never choosing a locked section', () => {
    expect(pickDictationSection(secs, { label: 'stains' })?.id).toBe('x');
    expect(pickDictationSection(secs, { label: 'diagnostico' })).toBeUndefined();
  });
});
