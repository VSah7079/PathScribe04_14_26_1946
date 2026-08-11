// src/services/specimenDictionary/mockSpecimenDictionaryService.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { mockSpecimenDictionaryService } from './mockSpecimenDictionaryService';

beforeEach(() => {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };
});

describe('mockSpecimenDictionaryService seed data — real, demo-labeled CPT assignments (per direct request)', () => {
  it('a well-established Level IV specimen type carries its real, researched code', async () => {
    const res = await mockSpecimenDictionaryService.getAll();
    if (!res.ok) throw new Error('setup failed');
    const breastCore = res.data.find(e => e.name === 'Core Needle Biopsy — Breast');
    expect(breastCore?.defaultBaseCptCode).toBe('88305');
  });

  it('a well-established Level VI specimen type (major cancer resection) carries its real, researched code', async () => {
    const res = await mockSpecimenDictionaryService.getAll();
    if (!res.ok) throw new Error('setup failed');
    const whipple = res.data.find(e => e.name === 'Pancreaticoduodenectomy');
    expect(whipple?.defaultBaseCptCode).toBe('88309');
  });

  it('the manually-appended native kidney biopsy entry also carries its real, matching code', async () => {
    const res = await mockSpecimenDictionaryService.getAll();
    if (!res.ok) throw new Error('setup failed');
    const nativeKidney = res.data.find(e => e.id === 'sp-kidney-native-biopsy');
    expect(nativeKidney?.defaultBaseCptCode).toBe('88305');
  });

  it('cytology, FNA, and molecular specimen types are never assigned a fabricated surgical-pathology code - different, unverified code families', async () => {
    const res = await mockSpecimenDictionaryService.getAll();
    if (!res.ok) throw new Error('setup failed');
    const outOfScope = res.data.filter(e => ['Cytology', 'FNA', 'Molecular', 'Autopsy', 'Consult', 'Gross Only'].includes(e.type));
    expect(outOfScope.length).toBeGreaterThan(0); // real seed data exists to check
    outOfScope.forEach(e => expect(e.defaultBaseCptCode).toBeUndefined());
  });
});
