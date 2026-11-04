// Reviewer refinement (everyday-1): unread is decided in one place, isUnreadFor(message, currentUserId) in
// messageUnread.ts, so the SQL Server per-recipient version only changes its internals. No component, context
// or hook may read the shared flag (`.isRead`) to decide what is unread.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const walk = (dir: string): string[] => readdirSync(dir).flatMap(f => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(f) && !/\.test\./.test(f) ? [p] : [];
});

describe('unread is decided only through isUnreadFor', () => {
  const root = join(__dirname, '..', '..');
  const ui = [...walk(join(root, 'components')), ...walk(join(root, 'contexts')), ...walk(join(root, 'hooks')), ...walk(join(root, 'pages'))];
  it('no component, context, hook or page reads message.isRead or !m.isRead', () => {
    const offenders = ui.filter(f => /\b(m|msg|message)\.isRead\b/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
  it('the messaging badge and the list row both call isUnreadFor', () => {
    expect(readFileSync(join(root, 'contexts', 'MessagingContext.tsx'), 'utf8')).toContain('isUnreadFor(');
    expect(readFileSync(join(root, 'components', 'AppShell', 'AppShell.tsx'), 'utf8')).toContain('isUnreadFor(');
  });
});
