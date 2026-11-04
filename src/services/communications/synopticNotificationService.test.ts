// src/services/communications/synopticNotificationService.test.ts
// Batch 583 (PS-63): a template lifecycle event goes to the server as the event alone.
import { describe, it, expect, vi } from 'vitest';
import { sendSynopticNotification } from './synopticNotificationService';
import { buildTemplateLifecycleEventPayload, isNotifiableTemplateEvent } from './templateLifecycleEvent';
import type { SynopticAuditEvent } from '../../types/SynopticAuditEvents';

const NOW = new Date('2026-10-16T01:02:03.000Z');
const ev = (over: Partial<SynopticAuditEvent>): SynopticAuditEvent =>
  ({ user: 'Dr Lee', category: 'user', action: 'template.approved', templateId: 't1', ...over });

describe('template lifecycle event payload (Batch 583)', () => {
  it('carries the event and nothing about recipients, e-mail text or language', () => {
    const p = buildTemplateLifecycleEventPayload(ev({ templateName: 'Kidney Resection', version: '4.2', prevVersion: '4.1', source: 'CAP' }), { now: NOW, appBaseUrl: 'https://ps.example' });
    expect(p).toEqual({
      action: 'template.approved', templateId: 't1', templateName: 'Kidney Resection', source: 'CAP', version: '4.2',
      previousVersion: '4.1', triggeredByName: 'Dr Lee', occurredAt: '2026-10-16T01:02:03.000Z', appBaseUrl: 'https://ps.example',
    });
    expect(Object.keys(p!).some(k => /recipient|to$|subject|body|locale|language/i.test(k))).toBe(false);
  });

  it('passes the reviewer reason on "changes requested"', () => {
    const p = buildTemplateLifecycleEventPayload(ev({ action: 'template.needs_changes', note: 'Add units' }), { now: NOW, appBaseUrl: 'x' });
    expect(p?.note).toBe('Add units');
  });

  it.each(['sync.new_template_found', 'sync.template_updated', 'sync.auto_failed', 'sync.manual_upload',
    'template.submitted_for_review', 'template.needs_changes', 'template.approved', 'template.published'] as const)(
    '%s sends an event', a => { expect(isNotifiableTemplateEvent(a)).toBe(true); });

  it.each(['template.created', 'template.field_added', 'template.reset', 'template.archived', 'sync.auto_completed'] as const)(
    '%s sends nothing', a => {
      expect(isNotifiableTemplateEvent(a)).toBe(false);
      expect(buildTemplateLifecycleEventPayload(ev({ action: a }), { now: NOW, appBaseUrl: 'x' })).toBeNull();
    });
});

describe('sendSynopticNotification (Batch 583)', () => {
  it('posts the event once and reports the server\'s answer', async () => {
    const post = vi.fn().mockResolvedValue(true);
    const ok = await sendSynopticNotification(ev({ action: 'template.published' }), { post, now: () => NOW, appBaseUrl: 'https://ps.example' });
    expect(ok).toBe(true);
    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0][0]).toMatchObject({ action: 'template.published', templateId: 't1', appBaseUrl: 'https://ps.example' });
  });

  it('posts nothing for an action that sends no e-mail', async () => {
    const post = vi.fn();
    expect(await sendSynopticNotification(ev({ action: 'template.created' }), { post, now: () => NOW, appBaseUrl: 'x' })).toBe(false);
    expect(post).not.toHaveBeenCalled();
  });

  it('makes no staff or owner lookup in the browser', () => {
    const calls: string[] = [];
    const orig = globalThis.fetch;
    globalThis.fetch = (async (url: string) => { calls.push(String(url)); return { ok: true, text: async () => '' } as Response; }) as typeof fetch;
    return import('./notificationService').then(async m => {
      await m.postTemplateLifecycleEvent({ action: 'template.approved', templateId: 't1', triggeredByName: 'x', occurredAt: 'x', appBaseUrl: 'x' });
      globalThis.fetch = orig;
      expect(calls).toEqual(['/api/notifications/template-events']);
    });
  });
});
