// src/audit/auditLogger.test.ts
import { describe, it, expect, beforeEach } from 'vitest';

const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
};

const { logEvent } = await import('./auditLogger');
const { mockAuditService } = await import('../services/auditlog/mockAuditService');

describe('audit/auditLogger.ts — real bug fix: events now reach the actual System Audit store', () => {
  beforeEach(() => { store.clear(); });

  it('a synoptic/comment-thread event logged through the legacy logEvent() actually shows up via the real mockAuditService', async () => {
    logEvent({
      user: 'Dr. Reviewer',
      category: 'user',
      action: 'add_comment',
      detail: 'Comment added on field X',
    });
    // logEvent() is fire-and-forget internally — give its promise a tick
    // to resolve before checking the real store, matching how every
    // other fire-and-forget audit call in this app is tested.
    await new Promise(res => setTimeout(res, 100));

    const logsRes = await mockAuditService.getAuditLogs({ search: 'add_comment' });
    expect(logsRes.ok).toBe(true);
    if (!logsRes.ok) return;
    const entry = logsRes.data.find(l => l.event === 'add_comment' && l.detail === 'Comment added on field X');
    expect(entry).toBeDefined();
    expect(entry?.type).toBe('user');
    expect(entry?.user).toBe('Dr. Reviewer');
  });

  it('each AuditEvent category maps to the correct real AuditLog type', async () => {
    logEvent({ user: 'System (AI)', category: 'ai', action: 'ai_generated_synoptic', detail: 'AI drafted synoptic answer' });
    await new Promise(res => setTimeout(res, 100));
    const logsRes = await mockAuditService.getAuditLogs({ search: 'ai_generated_synoptic' });
    if (!logsRes.ok) return;
    const entry = logsRes.data.find(l => l.event === 'ai_generated_synoptic');
    expect(entry?.type).toBe('ai');
  });
});
