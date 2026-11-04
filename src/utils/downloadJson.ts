// src/utils/downloadJson.ts
// Browser download of a JSON document (pretty-printed, UTF-8). The JSON
// counterpart of utils/csv.ts's downloadCsv.
import { captureDownload } from './downloadCapture';

export function downloadJson(filename: string, data: unknown): void {
  const jsonName = filename.endsWith('.json') ? filename : `${filename}.json`;
  if (captureDownload({ filename: jsonName, content: JSON.stringify(data, null, 2), mime: 'application/json;charset=utf-8;' })) return; // Batch 611: the simulated export server keeps it
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.json') ? filename : `${filename}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
