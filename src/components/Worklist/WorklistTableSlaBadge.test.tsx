// @vitest-environment happy-dom
// Batch 610 (#164): an open case past its client's SLA target carries a badge
// on the worklist; a case that is not past it does not.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { openCaseSlaBreaches } from '@/services/clientSLA/clientSlaRules';

describe('worklist SLA badge (#164)', () => {
  const sla = { id: 's1', assigningAuthority: 'AUTH', clientName: 'Mercy', firstTouchTargetHrs: 4, totalTatTargetHrs: 48, active: true };
  const facilities = [{ id: 'f1', name: 'Mercy', assigningAuthority: 'AUTH' }];
  const now = new Date('2026-10-20T12:00:00Z');

  it('lists an open case past its total target and not one still within it', () => {
    const late = { id: 'late', order: { facilityId: 'f1', receivedDate: '2026-10-15T12:00:00Z' }, firstOpenedAt: '2026-10-15T13:00:00Z' };
    const fine = { id: 'fine', order: { facilityId: 'f1', receivedDate: '2026-10-20T10:00:00Z' }, firstOpenedAt: '2026-10-20T10:30:00Z' };
    const map = openCaseSlaBreaches([late, fine], [sla], facilities, now);
    expect(map.get('late')).toBe('total');
    expect(map.has('fine')).toBe(false);
  });

  it('is drawn in both the card and the table views of the worklist', () => {
    const src = readFileSync('src/components/Worklist/WorklistTable.tsx', 'utf8');
    expect(src.match(/renderSlaBadge\(slaBreaches, c\)/g)?.length).toBe(2);
  });
});
