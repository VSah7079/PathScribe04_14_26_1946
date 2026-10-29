// src/pages/GrossingWorkspacePage/grossingQueue.ts
// Batch 720: which cases the Grossing workspace lists, and how an accession
// number typed or scanned there finds its case. Pure, no screen or service.
import type { Case } from '@/types/case/Case';

export interface GrossingQueueRow {
  id: string;
  accession: string;
  specimenCount: number;
  priority: 'Routine' | 'Rush' | 'STAT';
  accessionedAt?: string;
}

const PRIORITY_ORDER = { STAT: 0, Rush: 1, Routine: 2 } as const;

/** Cases logged in and not yet grossed (status "accessioned"), STAT first, then oldest first. */
export function waitingToGross(cases: readonly Case[]): GrossingQueueRow[] {
  return cases
    .filter(c => c.status === 'accessioned')
    .map(c => ({
      id: c.id,
      accession: c.accession?.fullAccession ?? c.id,
      specimenCount: (c.specimens ?? []).length,
      priority: (c.order?.priority ?? 'Routine') as GrossingQueueRow['priority'],
      accessionedAt: c.accession?.accessionedAt,
    }))
    .sort((a, b) =>
      PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      || (a.accessionedAt ?? '').localeCompare(b.accessionedAt ?? '')
      || a.accession.localeCompare(b.accession));
}

const norm = (s: string) => s.trim().toUpperCase().replace(/\s+/g, '');

/** The case whose accession number is the entry, ignoring case and spaces; null for no match or an empty entry. */
export function findByAccession(cases: readonly Case[], entry: string): Case | null {
  const want = norm(entry);
  if (!want) return null;
  return cases.find(c => norm(c.accession?.fullAccession ?? '') === want) ?? null;
}
