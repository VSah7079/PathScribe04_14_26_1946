// src/pages/WorklistPage/hooks/usePoolAssignmentTimeout.ts
// Batch 652: the pool client's scheduler for the Assignment Timeout. The decision is in
// services/cases/poolAssignmentTimeout.ts; this only starts and stops the sweep with the page.
import { useEffect, useRef } from 'react';
import type { Case } from '@/types/case/Case';
import { startAssignmentTimeoutSweep } from '@/services/cases/poolAssignmentTimeout';

export function usePoolAssignmentTimeout(cases: Case[], setCases: (updater: (prev: Case[]) => Case[]) => void): void {
  const casesRef = useRef(cases);
  casesRef.current = cases;
  useEffect(() => startAssignmentTimeoutSweep(() => casesRef.current, ids => {
    const routed = new Set(ids);
    setCases(prev => prev.map(c => (routed.has(c.id) ? { ...c, status: 'pool' } : c)));
  }), [setCases]);
}
