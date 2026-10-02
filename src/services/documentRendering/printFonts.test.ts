import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { jsPDF } from 'jspdf';
import { loadPrintFont, needsPrintFont, registerPrintFont, printFontLanguageFor, PRETENDARD_PRINT_FONT_FAMILY } from './printFonts';
import { ALLOWED_PRINT_FONTS } from './validatePrintLayoutGovernance';

import { readFontFromDisk } from './readFontFromDisk.testSupport';

const root = path.resolve(__dirname, '../../..');

describe('print fonts (Batch 391)', () => {
  it('only Korean needs a font other than Liberation Sans', () => {
    expect(needsPrintFont('ko')).toBe(true);
    for (const l of ['en', 'fr', 'fr-BE', 'de', 'nl', 'nl-BE', undefined]) expect(needsPrintFont(l)).toBe(false);
  });
  it('nothing is loaded for a Latin language', async () => {
    expect(await loadPrintFont('de', async () => { throw new Error('must not fetch'); })).toBeUndefined();
  });
  it('Korean loads Pretendard, the same unmodified files the renderer ships, and it is an allowed print font', async () => {
    const font = (await loadPrintFont('ko', readFontFromDisk))!;
    expect(font.family).toBe(PRETENDARD_PRINT_FONT_FAMILY);
    expect(ALLOWED_PRINT_FONTS).toContain(font.family);
    const shipped = fs.readFileSync(path.join(root, 'functions/fonts/Pretendard-Regular.ttf'));
    expect(Buffer.from(font.regularBase64, 'base64').equals(shipped)).toBe(true);
  });
  it('a PDF with Korean text embeds only what it uses, with a Unicode map so the text can be copied', async () => {
    const font = (await loadPrintFont('ko', readFontFromDisk))!;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    registerPrintFont(doc, font);
    registerPrintFont(doc, font); // twice is harmless
    doc.setFont(PRETENDARD_PRINT_FONT_FAMILY, 'bold');
    doc.text('세포검사 보고서', 10, 10);
    doc.setFont(PRETENDARD_PRINT_FONT_FAMILY, 'normal');
    doc.text('환자: 김민지 · Reason: ÄÖü', 10, 20);
    const out = doc.output();
    expect(out).toContain('/BaseFont /Pretendard');
    expect(out).toContain('/Encoding /Identity-H');
    expect(out).toContain('/ToUnicode');
    expect(out.length).toBeLessThan(800_000); // about 300 KB per weight used; the full font is 2.7 MB
  });
  it('a font that cannot be fetched is an error, not a silent Latin fallback', async () => {
    await expect(loadPrintFont('ko', async () => { throw new Error('offline'); })).rejects.toThrow('offline');
  });
  it('Batch 393: a report with Hangul anywhere (a Korean name in a US lab) needs Pretendard too', () => {
    expect(printFontLanguageFor({ language: 'en', patientName: '김민지' } as any)).toBe('ko');
    expect(printFontLanguageFor({ language: 'ko' })).toBe('ko');
    expect(printFontLanguageFor({ language: 'de', patientName: 'Müller' } as any)).toBe('de');
    expect(printFontLanguageFor(undefined)).toBeUndefined();
  });
  it('Batch 393 follow-up: nothing in src/ imports the pretendard package (a missing package must not break unrelated code)', () => {
    const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap(d => d.isDirectory() ? (d.name === 'node_modules' ? [] : walk(path.join(dir, d.name))) : [path.join(dir, d.name)]);
    const offenders = walk(path.join(root, 'src')).filter(f => /\.(ts|tsx|css)$/.test(f) && /from ['"]pretendard\/|import ['"]pretendard\//.test(fs.readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
  it('the web and PDF copies ship with their licence', () => {
    for (const f of ['public/fonts/pretendard/Pretendard-LICENSE.txt', 'functions/fonts/Pretendard-LICENSE.txt']) expect(fs.readFileSync(path.join(root, f), 'utf8')).toContain('SIL Open Font License');
    expect(Buffer.compare(fs.readFileSync(path.join(root, 'public/fonts/pretendard/Pretendard-Bold.ttf')), fs.readFileSync(path.join(root, 'functions/fonts/Pretendard-Bold.ttf')))).toBe(0);
  });
});
