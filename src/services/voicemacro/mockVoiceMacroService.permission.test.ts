// @vitest-environment happy-dom
// Batch 430: a person's own voice macros are theirs; shared or other people's need config:macros:manage.
import { describe, expect, it, vi, beforeEach } from 'vitest';

let allow = false;
const asked: string[] = [];
let userId = 'u1';
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async (c: string) => { asked.push(c); return { allowed: allow }; } },
}));
vi.mock('../auth/caseAccessControl', () => ({ getSessionUser: () => ({ id: userId }) }));

import { MockVoiceMacroService } from './mockVoiceMacroService';
import { CONFIG_NOT_PERMITTED } from '../authorization/guardConfigWrites';

beforeEach(() => { localStorage.clear(); allow = false; asked.length = 0; userId = 'u1'; });

describe('voice macro permissions (Batch 430)', () => {
  it('a person adds, edits and deletes their own macro without any permission', async () => {
    const svc = new MockVoiceMacroService();
    const id = await svc.addPersonalMacro({ spoken: 'hi', written: 'hello', isActive: true });
    await svc.updateMacro(id, { written: 'hello there' });
    expect((await svc.getMacrosForCurrentUser()).find(m => m.id === id)).toMatchObject({ ownerUserId: 'u1', written: 'hello there' });
    await svc.deleteMacro(id);
    expect(asked).toEqual([]);
  });
  it('someone else\'s macro, or a shared one, needs config:macros:manage', async () => {
    const svc = new MockVoiceMacroService();
    const mine = await svc.addPersonalMacro({ spoken: 'a', written: 'b', isActive: true });
    userId = 'u2';
    await expect(svc.updateMacro(mine, { written: 'x' })).rejects.toThrow(CONFIG_NOT_PERMITTED);
    await expect(svc.addMacro({ spoken: 'c', written: 'd', isActive: true })).rejects.toThrow(CONFIG_NOT_PERMITTED);
    expect(asked).toEqual(['config:macros:manage', 'config:macros:manage']);
    // and u2 doesn't see u1's personal macro
    expect((await svc.getMacrosForCurrentUser()).some(m => m.id === mine)).toBe(false);
    allow = true;
    await expect(svc.addMacro({ spoken: 'c', written: 'd', isActive: true })).resolves.toBeTruthy();
  });
});
