// Batch 549 (PS-539, carried over from Batch 544): images and attachments are links to the hospital's own systems.
import { describe, it, expect } from 'vitest';
import { isHttpsLink, linkFieldProblem } from './externalLink';
import { isHttpsLink as staffIsHttpsLink } from '../staff/staffFormChecks';

describe('the shared https link check', () => {
  it('accepts an https link with a dotted host, trimming spaces', () => {
    expect(isHttpsLink('https://images.hospital.example/logo.png')).toBe(true);
    expect(isHttpsLink('  HTTPS://pacs.hospital.example:8443/view?id=1 ')).toBe(true);
  });
  it('refuses http, data:, a user name or password, a single-label host, a trailing dot, spaces and plain text', () => {
    for (const bad of ['http://x.example/a', 'data:image/png;base64,AAAA', 'https://u:p@x.example/a', 'https://u@x.example/a',
      'https://intranet/a', 'https://x.example./a', 'https://x.example/a b', 'x.example/a', '', 'javascript:alert(1)']) {
      expect(isHttpsLink(bad)).toBe(false);
    }
  });
  it('an empty field is not a problem; anything else that is not an https link is', () => {
    expect(linkFieldProblem(undefined)).toBeNull();
    expect(linkFieldProblem(' ')).toBeNull();
    expect(linkFieldProblem('https://x.example/a')).toBeNull();
    expect(linkFieldProblem('http://x.example/a')).toBe('invalidLink');
  });
  it('the staff signature check is the same function', () => {
    expect(staffIsHttpsLink).toBe(isHttpsLink);
  });
});
