// @vitest-environment happy-dom
// Batch 611 (#194): the download helpers keep their file while a capture runs.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { captureDownload, captureDownloads, saveToDevice } from './downloadCapture';
import { downloadCsv } from './csv';
import { downloadCSV } from './csvExport';
import { downloadText } from './downloadText';
import { downloadJson } from './downloadJson';

afterEach(() => { vi.restoreAllMocks(); });

describe('captureDownloads', () => {
  it('keeps the file each helper would have downloaded, and downloads nothing', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const { files } = await captureDownloads(() => {
      downloadCsv('rows', 'a,b\r\n1,2');
      downloadCSV('x,y\n3,4', 'audit.csv');
      downloadText('t.txt', 'hello', 'text/plain');
      downloadJson('d', { ok: true });
    });
    expect(click).not.toHaveBeenCalled();
    expect(files.map(f => f.filename)).toEqual(['rows.csv', 'audit.csv', 't.txt', 'd.json']);
    expect(files[0].content).toBe('﻿a,b\r\n1,2');
    expect(files[0].mime).toContain('text/csv');
    expect(files[3].content).toBe(JSON.stringify({ ok: true }, null, 2));
  });

  it('waits for an async builder and returns its result', async () => {
    const { result, files } = await captureDownloads(async () => {
      await Promise.resolve();
      downloadCsv('late', 'h\r\n1');
      return 42;
    });
    expect(result).toBe(42);
    expect(files).toHaveLength(1);
  });

  it('stops capturing when the builder throws, so the next download is a real one', async () => {
    await expect(captureDownloads(() => { throw new Error('boom'); })).rejects.toThrow('boom');
    expect(captureDownload({ filename: 'x', content: 'y', mime: 'text/plain' })).toBe(false);
  });

  it('an inner capture keeps its own files; the outer one gets none of them', async () => {
    const outer = await captureDownloads(async () => {
      const inner = await captureDownloads(() => { downloadText('in.txt', 'i', 'text/plain'); });
      expect(inner.files).toHaveLength(1);
      downloadText('out.txt', 'o', 'text/plain');
    });
    expect(outer.files.map(f => f.filename)).toEqual(['out.txt']);
  });

  it('outside a capture the helpers still download in the browser', () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    downloadText('t.txt', 'hello', 'text/plain');
    expect(click).toHaveBeenCalledTimes(1);
  });
});

describe('saveToDevice', () => {
  it('starts a real browser download, never captured', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    const { files } = await captureDownloads(() => saveToDevice({ filename: 'f.csv', content: 'a', mime: 'text/csv' }));
    expect(files).toEqual([]);
    expect(click).toHaveBeenCalledTimes(1);
  });
});
