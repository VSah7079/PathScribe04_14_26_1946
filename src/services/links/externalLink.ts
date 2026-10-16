// src/services/links/externalLink.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 549 (PS-539; carried over from Batch 544). PathScribe stores links to
// images and attachments, never the files (Pete, Oct 13, 2026;
// docs/architecture/BLOB_STORAGE_API.md §6). Every field that holds such a link
// takes the same kind: an https:// link to a named host. This is the one check,
// used by the staff signature (Batch 544), the facility and department
// letterhead logo, and the gross imaging system's address (Batch 549). Pure.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * An https:// link to a named host: no data: URL, no http://, no user name or
 * password in the link, and no single-label host (`https://intranet`), so a
 * link names a real server. Blocking private and loopback addresses is the
 * server's job when it fetches one.
 */
export function isHttpsLink(value: string): boolean {
  const v = value.trim();
  if (!/^https:\/\/\S+$/i.test(v)) return false;
  try {
    const u = new URL(v);
    return !u.username && !u.password && u.hostname.includes('.') && !u.hostname.endsWith('.');
  } catch { return false; }
}

/** What's wrong with an optional link field, or null (empty is fine). */
export function linkFieldProblem(value: string | undefined | null): 'invalidLink' | null {
  const v = (value ?? '').trim();
  return v && !isHttpsLink(v) ? 'invalidLink' : null;
}
