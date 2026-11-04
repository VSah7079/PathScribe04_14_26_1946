// src/audit/auditLogger.test.ts
import { describe, it, expect, beforeEach } from 'vitest';

const store = new Map<string, string>();
const keysWritten: string[] = [];
(globalThis as any).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { keysWritten.push(k); store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
};

const { logEvent } = await import('./auditLogger');
const { mockAuditService } = await import('../services/auditlog/mockAuditService');

describe('audit/auditLogger.ts — real bug fix: events now reach the actual System Audit store', () => {
  beforeEach(() => { store.clear(); keysWritten.length = 0; });

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
    logEvent({ user: 'Dr. Reviewer', category: 'user', action: 'user_edited_field', detail: 'Field edited' });
    logEvent({ user: 'System', category: 'system', action: 'system_autosave', detail: 'Draft autosaved' });
    await new Promise(res => setTimeout(res, 100));

    const typeOf = async (action: string) => {
      const logsRes = await mockAuditService.getAuditLogs({ search: action });
      // PS-39: a store error must fail the test, never skip it.
      expect(logsRes.ok).toBe(true);
      if (!logsRes.ok) throw new Error(`getAuditLogs failed for ${action}`);
      const entry = logsRes.data.find(l => l.event === action);
      expect(entry).toBeDefined();
      return entry!.type;
    };
    expect(await typeOf('ai_generated_synoptic')).toBe('ai');
    expect(await typeOf('user_edited_field')).toBe('user');
    expect(await typeOf('system_autosave')).toBe('system');
  });

  it('PS-39: the legacy logger writes only the shared audit store, never its own private ps_audit_log_v1 key', async () => {
    logEvent({ user: 'Dr. Reviewer', category: 'user', action: 'ps39_probe', detail: 'probe' });
    await new Promise(res => setTimeout(res, 100));

    expect(store.has('ps_audit_log_v1')).toBe(false);
    expect(keysWritten).not.toContain('ps_audit_log_v1');
    // Every key it wrote is the shared mock audit store the System Audit page reads.
    expect(keysWritten.length).toBeGreaterThan(0);
    expect(new Set(keysWritten)).toEqual(new Set(['pathscribe_mock_pathscribe_audit_logs']));
    const shared = JSON.parse(store.get('pathscribe_mock_pathscribe_audit_logs')!) as Array<{ event: string }>;
    expect(shared.some(l => l.event === 'ps39_probe')).toBe(true);
  });
});
