import { describe, it, expect } from 'vitest';
import { regenerateSectionsSequentially, buildManualEntrySections, perSpecimenSectionLabel } from './orchestratorSections';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(r => { resolve = r; });
  return { promise, resolve };
}

describe('regenerateSectionsSequentially (PS-317 Regen All)', () => {
  it('starts each section only after the previous one has finished, in list order', async () => {
    const log: string[] = [];
    const pending = new Map<string, ReturnType<typeof deferred>>();
    const regenerate = (id: string) => {
      log.push(`start:${id}`);
      const d = deferred();
      pending.set(id, d);
      return d.promise.then(() => { log.push(`end:${id}`); });
    };

    const run = regenerateSectionsSequentially(['gross', 'micro', 'dx'], regenerate);
    await Promise.resolve();
    // only the first one is in flight
    expect(log).toEqual(['start:gross']);
    expect(pending.has('micro')).toBe(false);

    pending.get('gross')!.resolve();
    await new Promise(r => setTimeout(r, 0));
    expect(log).toEqual(['start:gross', 'end:gross', 'start:micro']);
    expect(pending.has('dx')).toBe(false);

    pending.get('micro')!.resolve();
    await new Promise(r => setTimeout(r, 0));
    pending.get('dx')!.resolve();
    await run;
    expect(log).toEqual(['start:gross', 'end:gross', 'start:micro', 'end:micro', 'start:dx', 'end:dx']);
  });

  it('never has more than one regeneration in flight at a time', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    await regenerateSectionsSequentially(['a', 'b', 'c', 'd'], async () => {
      inFlight++; maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise(r => setTimeout(r, 1));
      inFlight--;
    });
    expect(maxInFlight).toBe(1);
  });

  it('works with a synchronous regenerate callback and an empty list', async () => {
    const seen: string[] = [];
    await regenerateSectionsSequentially(['x', 'y'], id => { seen.push(id); });
    await regenerateSectionsSequentially([], () => { throw new Error('never called'); });
    expect(seen).toEqual(['x', 'y']);
  });
});

describe('buildManualEntrySections (PS-317 per-specimen Gross labels)', () => {
  const template = [
    { id: 'sec-micro', title: 'Microscopic Description', enabled: true, order: 2, sourcePartId: 'std_body_micro' },
    { id: 'sec-gross', title: 'Gross Description', enabled: true, order: 1, sourcePartId: 'std_body_gross' },
    { id: 'sec-off',   title: 'Disabled', enabled: false, order: 0 },
  ];
  const specimens = [
    { id: 'sp-A', label: 'A', description: 'Left breast, lumpectomy' },
    { id: 'sp-B', label: 'B' },
  ];

  it("labels each per-specimen gross section 'Gross Description — Specimen A: …'", () => {
    const sections = buildManualEntrySections(template, specimens);
    const gross = sections.filter(s => s.sourcePartId === 'std_body_gross');
    expect(gross.map(s => s.label)).toEqual([
      'Gross Description — Specimen A: Left breast, lumpectomy',
      'Gross Description — Specimen B',
    ]);
    expect(gross.map(s => s.id)).toEqual(['sec-gross_sp-A', 'sec-gross_sp-B']);
    expect(gross.map(s => s.specimenId)).toEqual(['sp-A', 'sp-B']);
  });

  it('keeps every other section single and case-wide, skips disabled ones, and follows template order', () => {
    const sections = buildManualEntrySections(template, specimens);
    expect(sections.map(s => s.label)).toEqual([
      'Gross Description — Specimen A: Left breast, lumpectomy',
      'Gross Description — Specimen B',
      'Microscopic Description',
    ]);
    expect(sections.every(s => s.text === '' && !s.isStreaming && !s.userEdited)).toBe(true);
  });

  it('with no specimens, Gross Description stays one section with its plain title', () => {
    const sections = buildManualEntrySections(template, []);
    expect(sections[0]).toMatchObject({ id: 'sec-gross', label: 'Gross Description' });
  });

  it('perSpecimenSectionLabel always starts with the section title', () => {
    expect(perSpecimenSectionLabel('Gross Description', { id: 'x', label: 'C', description: null })).toBe('Gross Description — Specimen C');
  });
});
