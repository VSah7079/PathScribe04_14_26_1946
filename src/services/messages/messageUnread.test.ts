// Batch 669f (everyday-1): a person's own sent messages and replies are never unread for them.
import { describe, it, expect } from 'vitest';
import { canMarkUnread, compareMessageListOrder, isUnreadFor, lastActivityTime, lastWriterId } from './messageUnread';

const at = new Date();
const msg = (over = {}) => ({
  isRead: false, isDeleted: false, senderId: 'u1',
  thread: [{ sender: 'A', senderId: 'u1', text: 'hi', timestamp: at }], ...over,
});

describe('isUnreadFor', () => {
  it('is unread for the recipient, not for the sender who wrote it', () => {
    expect(isUnreadFor(msg(), 'u2')).toBe(true);
    expect(isUnreadFor(msg(), 'u1')).toBe(false);
  });
  it('after a reply it is unread for the original sender and not for the replier', () => {
    const replied = msg({ thread: [...msg().thread, { sender: 'B', senderId: 'u2', text: 're', timestamp: at }] });
    expect(lastWriterId(replied)).toBe('u2');
    expect(isUnreadFor(replied, 'u1')).toBe(true);
    expect(isUnreadFor(replied, 'u2')).toBe(false);
  });
  it('a read or deleted message is not unread for anyone', () => {
    expect(isUnreadFor(msg({ isRead: true }), 'u2')).toBe(false);
    expect(isUnreadFor(msg({ isDeleted: true }), 'u2')).toBe(false);
  });
  it('an empty thread falls back to the original sender', () => {
    expect(isUnreadFor(msg({ thread: [] }), 'u1')).toBe(false);
    expect(isUnreadFor(msg({ thread: [] }), 'u2')).toBe(true);
  });
});

describe('list order and Mark as unread (reviewer refinement)', () => {
  const old = new Date('2026-10-01T10:00:00Z');
  const newer = new Date('2026-10-02T10:00:00Z');
  const reply = new Date('2026-10-05T10:00:00Z');
  const m = (id: string, ts: Date, over = {}) => ({ id, isUrgent: false, timestamp: ts, isRead: true, isDeleted: false, senderId: 'u1', thread: [{ sender: 'A', senderId: 'u1', text: 'x', timestamp: ts }], ...over });
  it('a reply moves its conversation above a newer one, whoever wrote it', () => {
    const replied = m('old', old, { thread: [{ sender: 'A', senderId: 'u1', text: 'x', timestamp: old }, { sender: 'B', senderId: 'u2', text: 'r', timestamp: reply }] });
    expect(lastActivityTime(replied)).toBe(reply.getTime());
    const sorted = [m('new', newer), replied].sort(compareMessageListOrder);
    expect(sorted.map(x => x.id)).toEqual(['old', 'new']);
  });
  it('urgent threads stay first; an empty thread uses the message time', () => {
    const sorted = [m('a', reply), m('u', old, { isUrgent: true })].sort(compareMessageListOrder);
    expect(sorted[0].id).toBe('u');
    expect(lastActivityTime(m('e', old, { thread: [] }))).toBe(old.getTime());
  });
  it('canMarkUnread is false when you wrote the latest message', () => {
    expect(canMarkUnread(m('a', old), 'u1')).toBe(false);
    expect(canMarkUnread(m('a', old), 'u2')).toBe(true);
  });
});
