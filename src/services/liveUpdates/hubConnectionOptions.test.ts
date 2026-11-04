// Batch 655: the live-update hub is reached with the session cookie; no access token goes in the URL.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { hubConnectionOptions } from './signalRLiveUpdateService';

describe('hub connection options', () => {
  it('sends the session cookie and no token factory by default', () => {
    expect(hubConnectionOptions()).toEqual({ withCredentials: true });
  });
  it('uses a factory only when one is handed in explicitly (a terminal device token)', () => {
    const f = () => 'device-token';
    expect(hubConnectionOptions(f)).toEqual({ withCredentials: true, accessTokenFactory: f });
  });
  it('the app wiring never passes the signed-in user\'s access token to the hub', () => {
    const wiring = readFileSync('src/services/liveUpdates/liveUpdateService.ts', 'utf8');
    expect(wiring).not.toMatch(/accessTokenFactory\s*:\s*getAccessToken/);
    expect(wiring).not.toMatch(/import\s*\{\s*getAccessToken\s*\}/);
  });
});
