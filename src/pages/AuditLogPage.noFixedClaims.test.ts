// access-1 (Batch 669): the Audit Log must not print fixed status or compliance claims.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('AuditLogPage footer', () => {
  const source = readFileSync(resolve(__dirname, 'AuditLogPage.tsx'), 'utf8');
  it('has no page footer and no fixed "systems operational" or "HIPAA" claim', () => {
    expect(source).not.toMatch(/<footer/);
    expect(source).not.toMatch(/systemsOperational|auditLog\.page\.footer/);
    expect(source).not.toMatch(/HIPAA|SYSTEMS OPERATIONAL/i);
  });
  it('keeps the computed per-tab entry counts', () => {
    expect(source).toMatch(/auditTab\.footerCount/);
  });
});
