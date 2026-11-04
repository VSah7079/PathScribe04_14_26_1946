// src/utils/downloadFromUrl.ts
// Batch 550 (PS-539): starts the browser's download of a file the server made
// (an export's signed link). Only an absolute https link is followed; plain
// http only to this computer (localhost) when `allowLocalHttp` is set (a
// development API server). The link sets Content-Disposition: attachment with
// the file name, because the `download` attribute is ignored across origins;
// it is set here too for a same-origin link. False: the link was refused.
export function downloadFromUrl(url: string, filename: string, opts: { allowLocalHttp?: boolean } = {}): boolean {
  let parsed: URL;
  try { parsed = new URL(url); } catch { return false; }
  const local = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  if (parsed.protocol !== 'https:' && !(opts.allowLocalHttp && local && parsed.protocol === 'http:')) return false;
  if (parsed.username || parsed.password) return false;
  const a = document.createElement('a');
  a.href = parsed.href;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  return true;
}

/** A link the server gave as a path ('/api/exports/x/file?t=…') is on the API server, not this site. */
export function absoluteDownloadUrl(url: string, apiBaseUrl: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return url;
  if (url.startsWith('//')) return ''; // another site, scheme-relative: refused
  try { return new URL(url, apiBaseUrl.replace(/\/*$/, '/')).href; } catch { return ''; }
}
