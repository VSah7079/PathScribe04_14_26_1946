import { describe, expect, it } from 'vitest';
import { isValidMonitoringDsn, isValidMonitoringEnvironment, resolveMonitoringConfig } from './monitoringConfig';

const DSN = 'https://abc123publickey@o4500.ingest.sentry.io/4506';

describe('resolveMonitoringConfig (PS-469)', () => {
  it('is on when both a valid address and an environment name are set', () => {
    expect(resolveMonitoringConfig(DSN, 'hospital-a-prod')).toEqual({ dsn: DSN, environment: 'hospital-a-prod' });
  });
  it('is off with no address, or no environment (no default "production" label)', () => {
    expect(resolveMonitoringConfig(undefined, 'validation')).toBeNull();
    expect(resolveMonitoringConfig('', 'validation')).toBeNull();
    expect(resolveMonitoringConfig(DSN, undefined)).toBeNull();
    expect(resolveMonitoringConfig(DSN, '  ')).toBeNull();
  });
  it('is off for an address that is not safe or well formed', () => {
    for (const bad of [
      'not a url', 'http://key@collector.example.com/1', 'https://collector.example.com/1', // not https / no public key
      'https://key:secret@collector.example.com/1', 'https://key@collector.example.com/1?x=1', 'https://key@collector.example.com/', 'ftp://key@h/1',
    ]) expect(isValidMonitoringDsn(bad), bad).toBe(false);
  });
  it('accepts a self-hosted collector, and plain http only to this computer', () => {
    expect(isValidMonitoringDsn('https://k@sentry.hospital.example/7')).toBe(true);
    expect(isValidMonitoringDsn('http://k@localhost:9000/1')).toBe(false); // production build rule
  });
  it('checks the environment name', () => {
    expect(isValidMonitoringEnvironment('validation')).toBe(true);
    expect(isValidMonitoringEnvironment('Jane Doe')).toBe(false);
    expect(isValidMonitoringEnvironment('x'.repeat(41))).toBe(false);
  });
  it('keeps a plain release label and drops an odd one', () => {
    expect(resolveMonitoringConfig(DSN, 'v', '1.4.2')?.release).toBe('1.4.2');
    expect(resolveMonitoringConfig(DSN, 'v', 'bad release!')?.release).toBeUndefined();
  });
});
