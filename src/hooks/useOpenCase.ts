// src/hooks/useOpenCase.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 446: open a case page by its reference address, never its accession.
//   const openCase = useOpenCase();
//   openCase(caseId);                                   // the report editor
//   openCase(caseId, 'report', { state: { fromFilter } });
// The address comes from services/caseAddresses (the reference is created
// the first time a case is opened), so the accession never reaches the
// address bar or browser history.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback } from 'react';
import { useNavigate, type NavigateOptions } from 'react-router';
import { caseAddresses } from '@/services/caseAddresses/caseAddressesInstance';
import type { CaseView } from '@/services/caseAddresses/caseAddresses';
import { useGuardedNavigate } from '@/hooks/useGuardedNavigate';

export interface OpenCaseOptions extends NavigateOptions {
  /** Extra query parameters, e.g. { specimen: 'A' }. Never a patient identifier. */
  query?: Record<string, string>;
}

export type OpenCase = (caseId: string, view?: CaseView, options?: OpenCaseOptions) => Promise<void>;

export function useOpenCase(): OpenCase {
  const navigate = useNavigate();
  return useCallback(async (caseId, view = 'synoptic', options = {}) => {
    const { query, ...navOptions } = options;
    const address = await caseAddresses.addressOf(caseId, view, query);
    if (address) navigate(address, navOptions);
    else console.error('[caseAddresses] No reference could be created for this case.');
  }, [navigate]);
}

/**
 * The same, through the unsaved-changes guard (useGuardedNavigate), for the
 * app header's case search: with unsaved changes open, the page asks first.
 */
export function useOpenCaseGuarded(): (caseId: string, view?: CaseView, query?: Record<string, string>) => Promise<void> {
  const guardedNavigate = useGuardedNavigate();
  return useCallback(async (caseId, view = 'synoptic', query) => {
    const address = await caseAddresses.addressOf(caseId, view, query);
    if (address) guardedNavigate(address);
    else console.error('[caseAddresses] No reference could be created for this case.');
  }, [guardedNavigate]);
}
