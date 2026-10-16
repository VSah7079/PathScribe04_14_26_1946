// Batch 525 (PS-485): browser storage is touched directly only by the modules
// that keep preferences, workstation settings and the sign-in session. Every
// service that holds data goes through browserData/dataStorage.ts, which
// keeps it in memory on a server deployment. App-wide; the allowed list is
// below, each with its reason.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { LOCAL_KEEP, SESSION_KEEP } from './browserKeepList';

const ROOT = join(__dirname, '..', '..', '..');
const SRC = join(ROOT, 'src');

/** May use localStorage / sessionStorage directly, and why. */
const ALLOWED: Record<string, string> = {
  'src/services/browserData/dataStorage.ts': 'the policy store itself',
  'src/services/browserData/browserKeepList.ts': 'the start-up clean-up',
  'src/utils/uiPreferences.ts': 'display preferences (ps_ui_*)',
  'src/utils/workstationSettings.ts': 'settings that belong to the computer',
  'src/utils/effectiveScanStation.ts': "this computer's scan station",
  'src/utils/deviceDetection.ts': "this tab's desktop-view override",
  'src/i18n/config.ts': 'the language',
  'src/services/auth/sessionProfile.ts': 'the sign-in session (minimal form on a server deployment)',
  'src/services/auth/authSessionInstance.ts': 'signing confirmation and signing lock markers (staff, not data); its signature-use record goes through dataStorage',
  'src/services/auth/sso/ssoClient.ts': 'SSO sign-in state and tokens (this tab)',
  'src/services/session/sessionSupersedeService.ts': 'one-session-per-user markers',
  'src/services/biometric/mockBiometricService.ts': "this tab's biometric verification marker; credentials go through dataStorage",
  'src/services/biometric/firestoreBiometricService.ts': "this tab's biometric verification marker",
  'src/services/research/pubmedResearchFeedService.ts': 'PubMed headline cache (published literature)',
  'src/services/browserCleanup/retiredBrowserKeys.ts': 'removes retired keys',
  'src/services/demoReset/demoReset.ts': 'the demo reset (demo only)',
};

function files(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === 'node_modules' || name === '__tests__' ? [] : files(p);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.|\.d\.ts$/.test(name) ? [p] : [];
  });
}

const withoutComments = (t: string) => t
  .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
  .replace(/(^|[^:'"`])\/\/[^\n]*/g, (m, lead: string) => lead + ' '.repeat(m.length - lead.length));

const RAW = /\b(localStorage|sessionStorage|indexedDB)\b/;

describe('browser storage (PS-485)', () => {
  it('no file outside the allowed list uses localStorage, sessionStorage or IndexedDB directly', () => {
    const offenders = files(SRC)
      .map(f => relative(ROOT, f).split('\\').join('/'))
      .filter(rel => !(rel in ALLOWED))
      .filter(rel => RAW.test(withoutComments(readFileSync(join(ROOT, rel), 'utf8')).replace(/(['"`])(?:localStorage|sessionStorage)\1/g, '')));
    expect(offenders, 'use dataStorage / tabDataStorage (services/browserData/dataStorage.ts)').toEqual([]);
  });

  it('nothing uses IndexedDB, even in the allowed files', () => {
    const users = files(SRC).filter(f => /\bindexedDB\b/.test(withoutComments(readFileSync(f, 'utf8'))));
    expect(users.map(f => relative(ROOT, f))).toEqual([]);
  });

  it('every allowed file exists and still needs to be allowed', () => {
    for (const rel of Object.keys(ALLOWED)) {
      const code = readFileSync(join(ROOT, rel), 'utf8').split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
      expect(RAW.test(code), rel).toBe(true);
    }
  });

  it('every key on the keep list is written by the module named beside it', () => {
    const all = files(SRC).map(f => readFileSync(f, 'utf8')).join('\n');
    for (const key of [...LOCAL_KEEP.keys, ...SESSION_KEEP.keys, ...LOCAL_KEEP.prefixes, ...SESSION_KEEP.prefixes]) {
      expect(all.split(key).length - 1, key).toBeGreaterThan(1); // the keep list plus at least one user
    }
  });
});
