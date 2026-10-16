import { describe, it, expect } from 'vitest';
import { scrubClientError, scrubMessage, scrubRoute, scrubStack } from './scrubClientError';

describe('scrubClientError (Batch 502, PS-472): no patient data in a crash report', () => {
  it('removes quoted text, e-mail addresses, number runs and long ids from the message', () => {
    expect(scrubMessage(`Cannot read 'mrn' of "Jane Doe"`)).toBe('Cannot read … of …');
    expect(scrubMessage('Case S26-004512 failed for jane.doe@hospital.org')).toBe('Case S26-# failed for [email]');
    expect(scrubMessage('DOB 1988-04-02 phone 5551234')).toBe('DOB #-04-02 phone #');
    expect(scrubMessage('token abcdefghijklmnopqrstuvwxyz0123 bad')).toBe('token [token] bad');
    expect(scrubMessage('x'.repeat(400)).length).toBeLessThanOrEqual(301);
  });

  it('removes name-like words an app error might carry, but keeps error vocabulary', () => {
    expect(scrubMessage('No report for Jane DOE on case')).toBe('No report for … … on case');
    expect(scrubMessage('TypeError Failed to fetch JSON from API')).toBe('TypeError Failed to fetch JSON from API');
  });

  it('keeps only stack frame locations, without query strings', () => {
    const stack = 'TypeError: boom for Jane\n    at render (https://app/assets/index-abc.js?v=Jane:10:5)\n    at Foo (https://app/assets/x.js:2:3)\nnot a frame';
    expect(scrubStack(stack)).toEqual(['at render (https://app/assets/index-abc.js:10:5)', 'at Foo (https://app/assets/x.js:2:3)']);
  });

  it('turns ids in the route into :id and drops the query string', () => {
    expect(scrubRoute('/case/S26-4512/synoptic?search=Jane%20Doe')).toBe('/case/:id/synoptic');
    expect(scrubRoute('/worklist')).toBe('/worklist');
    expect(scrubRoute('/report/0f8c2b1e-3c1b-4c55-9f1e-aaaaaaaaaaaa')).toBe('/report/:id');
  });

  it('accepts a thrown non-Error, and a hostile error name', () => {
    expect(scrubClientError('plain string for 12345', '/x')).toMatchObject({ name: 'Error', message: 'plain string for #' });
    expect(scrubClientError({ name: 'Jane Doe <script>', message: 'm' }, '/').name).toBe('Error');
  });
});
