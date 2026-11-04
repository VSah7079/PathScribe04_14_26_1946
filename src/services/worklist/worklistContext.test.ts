import { describe, it, expect } from 'vitest';
import { worklistContextForCase, resolveWorklistContextParam, worklistPathForCase } from './worklistContext';

describe('worklistContext (Batch 703)', () => {
  it('an Orchestration case (O26-…) is listed under Outreach', () => {
    expect(worklistContextForCase('O26-0031')).toBe('outreach');
  });
  it('an LIS case is listed under LIS Cases', () => {
    expect(worklistContextForCase('S26-4403')).toBe('lis');
    expect(worklistContextForCase(undefined)).toBe('lis');
  });
  it('Go to Worklist after saving an Orchestration case opens the Outreach context', () => {
    expect(worklistPathForCase('O26-0031')).toBe('/worklist?context=outreach');
    expect(worklistPathForCase('S26-4403')).toBe('/worklist?context=lis');
    expect(worklistPathForCase(null)).toBe('/worklist');
  });
  it('accepts only the two known contexts from the address', () => {
    expect(resolveWorklistContextParam('outreach')).toBe('outreach');
    expect(resolveWorklistContextParam('lis')).toBe('lis');
    expect(resolveWorklistContextParam('x')).toBeNull();
    expect(resolveWorklistContextParam(null)).toBeNull();
  });
});

import { initialWorklistContext } from './worklistContext';
describe('initialWorklistContext (Batch 703)', () => {
  it('an address context wins over the session, then the session, then LIS Cases', () => {
    expect(initialWorklistContext('?context=outreach', 'lis')).toBe('outreach');
    expect(initialWorklistContext('', 'outreach')).toBe('outreach');
    expect(initialWorklistContext('?context=bogus', 'nonsense')).toBe('lis');
    expect(initialWorklistContext('', null)).toBe('lis');
  });
});
