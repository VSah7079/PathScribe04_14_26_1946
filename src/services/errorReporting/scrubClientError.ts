// src/services/errorReporting/scrubClientError.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 502 (PS-472): what a crash report may contain. Pure.
//
// An error message can carry patient data ("Cannot read 'mrn' of Jane Doe",
// an accession in a thrown string, a URL with ?search=<name>). Until PS-469
// decides the monitoring provider and its patient-data agreement, every
// report is scrubbed to things that can't identify a patient:
//   • message — quoted text removed, e-mail addresses removed, long tokens
//     (ids) and any run of 3+ digits replaced, name-like words (Capitalised
//     or ALL CAPS, except the first word and common error vocabulary)
//     replaced by '…', then capped;
//   • stack — frame locations only (function and bundle file:line:col), no
//     query strings, at most 10 frames;
//   • route — the path with every segment that holds a digit, or is longer
//     than 24 characters, replaced by ':id'; no query string or hash.
// This is deliberately blunt: losing some detail is better than shipping a
// patient's name to a log.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_MESSAGE = 300;
const MAX_FRAMES = 10;
/** Capitalised words that are error vocabulary, not names. */
const ERROR_VOCABULARY = new Set([
  'Error', 'TypeError', 'RangeError', 'ReferenceError', 'SyntaxError', 'Failed', 'Cannot', 'Network', 'Request', 'Response',
  'Unexpected', 'Maximum', 'Minified', 'React', 'Invalid', 'Object', 'Array', 'Promise', 'Function', 'Undefined', 'Null', 'NaN',
  'JSON', 'HTTP', 'HTTPS', 'URL', 'API', 'DOM', 'SVG', 'PDF', 'CORS', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ROSE', 'TIFF',
  'Loading', 'Load', 'ChunkLoadError', 'Timeout', 'Abort', 'AbortError', 'Script', 'Module', 'Dynamically', 'Import', 'Fetch',
]);

export function scrubMessage(message: unknown): string {
  let m = String(message ?? '');
  m = m.replace(/(["'`“”‘’])(?:(?!\1).){0,500}\1/g, '…');          // quoted text
  m = m.replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, '[email]');             // e-mail addresses
  m = m.replace(/\b[A-Za-z0-9_-]{25,}\b/g, '[token]');               // long opaque ids
  m = m.replace(/\d{3,}/g, '#');                                     // ids, accessions, dates, phone numbers
  // Name-like words (Capitalised or ALL CAPS) other than the first word and
  // common error vocabulary: a surname thrown in an app error is removed.
  m = m.split(' ').map((w, i) => {
    const bare = w.replace(/[^A-Za-z]/g, '');
    const nameLike = /^[A-Z][a-z]+$/.test(bare) || /^[A-Z]{3,}$/.test(bare);
    return i > 0 && nameLike && !ERROR_VOCABULARY.has(bare) ? '…' : w;
  }).join(' ');
  m = m.replace(/\s+/g, ' ').trim();
  return m.length > MAX_MESSAGE ? `${m.slice(0, MAX_MESSAGE)}…` : m;
}

export function scrubStack(stack: unknown): string[] {
  return String(stack ?? '')
    .split('\n')
    .map(line => line.trim())
    .filter(line => /^at\s|@/.test(line))
    .slice(0, MAX_FRAMES)
    .map(line => line.replace(/\?[^:)\s]*/g, '').replace(/[^\w\s.:/()<>@$-]/g, ''));
}

export function scrubRoute(pathname: unknown): string {
  const path = String(pathname ?? '/').split(/[?#]/)[0] || '/';
  return path.split('/').map(seg => (seg && (/\d/.test(seg) || seg.length > 24) ? ':id' : seg)).join('/') || '/';
}

export interface ScrubbedClientError {
  name: string;
  message: string;
  stack: string[];
  route: string;
}

export function scrubClientError(error: unknown, pathname: unknown): ScrubbedClientError {
  const e = error as { name?: unknown; message?: unknown; stack?: unknown } | null;
  const isObj = !!e && typeof e === 'object';
  const name = isObj && typeof e.name === 'string' && /^[A-Za-z]{1,40}$/.test(e.name) ? e.name : 'Error';
  return {
    name,
    message: scrubMessage(isObj ? e.message : error),
    stack: scrubStack(isObj ? e.stack : ''),
    route: scrubRoute(pathname),
  };
}
