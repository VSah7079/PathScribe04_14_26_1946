// src/services/messages/messageUnread.ts
// Batch 669f (everyday-1): whether a message counts as unread FOR ONE PERSON.
// A message holds one shared read flag, so who the unread belongs to is decided by who wrote last: the
// person who wrote the latest entry in the thread never has it unread (their own sent message, or their
// own reply); the other participant has it unread until they open it. A reply sets the flag back to
// unread (mockMessageService.reply), so the other person is told, and the replier is not.
// This file is the ONE place unread is decided: isUnreadFor(message, currentUserId). The SQL Server per-recipient
// version (a read-state row per message and recipient) changes only the inside of that function; no component
// computes unread itself (messageUnread.guard.test.ts), and nothing is kept in browser storage.
import type { Message } from './IMessageService';

/** Who wrote last: the final thread entry, or the original sender when the thread is empty. */
export function lastWriterId(m: Pick<Message, 'senderId' | 'thread'>): string {
  const last = m.thread?.length ? m.thread[m.thread.length - 1] : undefined;
  return last?.senderId ?? m.senderId;
}

/** True when the message is unread for this person (not deleted, not read, and not written last by them). */
export function isUnreadFor(m: Pick<Message, 'isRead' | 'isDeleted' | 'senderId' | 'thread'>, userId: string): boolean {
  return !m.isRead && !m.isDeleted && lastWriterId(m) !== userId;
}

/** When the thread last moved: the latest entry's time, or the message's own time when the thread is empty. */
export function lastActivityTime(m: Pick<Message, 'timestamp' | 'thread'>): number {
  const last = m.thread?.length ? m.thread[m.thread.length - 1] : undefined;
  return new Date(last?.timestamp ?? m.timestamp).getTime();
}

/** List order (reviewer refinement): urgent first, then the thread with the most recent message (a reply, sent or received, moves it to the top). */
export function compareMessageListOrder(
  a: Pick<Message, 'isUrgent' | 'timestamp' | 'thread'>,
  b: Pick<Message, 'isUrgent' | 'timestamp' | 'thread'>,
): number {
  if (a.isUrgent !== b.isUrgent) return a.isUrgent ? -1 : 1;
  return lastActivityTime(b) - lastActivityTime(a);
}

/** Whether "Mark as unread" does anything for this person: not when they wrote the latest message (it would still not be unread for them). */
export function canMarkUnread(m: Pick<Message, 'senderId' | 'thread'>, userId: string): boolean {
  return lastWriterId(m) !== userId;
}
