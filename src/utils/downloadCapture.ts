// src/utils/downloadCapture.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 611 (#194): the simulated export server builds a file the way the
// browser always has (CSV, text and JSON downloads) but keeps it instead of
// saving it, so a long export can show "Preparing", appear in My exports and
// download later. While `captureDownloads` runs, the download helpers
// (utils/csv.ts, csvExport.ts, downloadText.ts, downloadJson.ts) hand their
// file here instead of starting a browser download. Outside it they behave
// exactly as before. `saveToDevice` is the real browser download, never
// captured.
// ─────────────────────────────────────────────────────────────────────────────

export interface CapturedFile {
  filename: string;
  /** Text content, with any byte-order mark the helper adds already in place. */
  content: string;
  mime: string;
}

let sink: CapturedFile[] | null = null;

/** Called by each download helper first. True: the file was kept, so the helper must not download it. */
export function captureDownload(file: CapturedFile): boolean {
  if (!sink) return false;
  sink.push(file);
  return true;
}

/**
 * Runs `build` and returns the files it would have downloaded instead of
 * downloading them. Captures nest safely: an inner call takes its own files
 * and the outer one gets none of them.
 */
export async function captureDownloads<T>(build: () => Promise<T> | T): Promise<{ result: T; files: CapturedFile[] }> {
  const previous = sink;
  const mine: CapturedFile[] = [];
  sink = mine;
  try {
    const result = await build();
    return { result, files: mine };
  } finally {
    sink = previous;
  }
}

/** The real browser download of text already built (never captured). */
export function saveToDevice(file: CapturedFile): void {
  const blob = new Blob([file.content], { type: file.mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
