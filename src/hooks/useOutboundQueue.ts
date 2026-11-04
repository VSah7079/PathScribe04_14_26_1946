// src/hooks/useOutboundQueue.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 619 (PS-800): loads the Outbound Queue for its screen and holds the
// screen's choices (filters, sort, the selection) and the result of the last
// action. What a message's state is, what each state allows and how an action
// went are worked out by services/outboundQueue (outboundQueueView.ts); the
// service checks the permissions and writes the audit.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  outboundQueueService, outboundActionAllowed,
  type HoldReason, type OutboundAction, type OutboundCounts, type OutboundFeed, type OutboundQueueItem, type OutboundSortKey, type OutboundState,
} from '@/services';
import type { DeadlineFlag, NotReportableReason, OutboundBillingCounts, OutboundDeadlineCounts, ResubmitReason, RetractReason } from '@/services/outboundQueue/outboundQueueTypes';
import { OUTBOUND_STATES } from '@/services/outboundQueue/outboundQueueTypes';
import { refsAllowing, summarizeResults, type ActionSummary } from '@/services/outboundQueue/outboundQueueView';

const NO_COUNTS = Object.fromEntries(OUTBOUND_STATES.map(s => [s, 0])) as OutboundCounts;

export function useOutboundQueue() {
  const [items, setItems] = useState<OutboundQueueItem[]>([]);
  const [counts, setCounts] = useState<OutboundCounts>(NO_COUNTS);
  const [deadlineCounts, setDeadlineCounts] = useState<OutboundDeadlineCounts>({ dueSoon: 0, overdue: 0 });
  const [billingCounts, setBillingCounts] = useState<OutboundBillingCounts>({ needsReview: 0, amendmentDelta: 0 });
  const [needsReview, setNeedsReview] = useState(false);
  const [facilityOptions, setFacilityOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [feeds, setFeeds] = useState<OutboundFeed[]>([]);
  const [states, setStates] = useState<OutboundState[]>([]);
  const [deadlines, setDeadlines] = useState<DeadlineFlag[]>([]);
  const [facilityId, setFacilityId] = useState('');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<OutboundSortKey>('state');
  const [direction, setDirection] = useState<'asc' | 'desc'>('asc');
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [summary, setSummary] = useState<(ActionSummary & { action: OutboundAction; skipped: number }) | null>(null);

  const reload = useCallback(async () => {
    const r = await outboundQueueService.list(
      { feeds, states, deadlines, needsReview, search, ...(facilityId ? { facilityIds: [facilityId] } : {}) },
      { key: sortKey, direction },
    );
    if (r.ok) {
      setItems(r.data.items); setCounts(r.data.counts); setDeadlineCounts(r.data.deadlineCounts); setBillingCounts(r.data.billingCounts); setFacilityOptions(r.data.facilityIds);
      setSelected(prev => new Set([...prev].filter(ref => r.data.items.some(i => i.ref === ref))));
    }
    setLoading(false);
  }, [feeds, states, deadlines, needsReview, search, facilityId, sortKey, direction]);
  useEffect(() => { void reload(); }, [reload]);

  const toggle = <T,>(list: T[], v: T): T[] => (list.includes(v) ? list.filter(x => x !== v) : [...list, v]);
  const toggleSelected = useCallback((ref: string) => setSelected(prev => { const n = new Set(prev); if (!n.delete(ref)) n.add(ref); return n; }), []);
  const selectAll = useCallback((on: boolean) => setSelected(on ? new Set(items.map(i => i.ref)) : new Set()), [items]);

  const run = useCallback(async (action: OutboundAction, call: (refs: string[]) => ReturnType<typeof outboundQueueService.hold>) => {
    const refs = refsAllowing(items, selected, action);
    const skipped = selected.size - refs.length;
    if (!refs.length) { setSummary({ action, succeeded: 0, refused: {}, skipped }); return; }
    const r = await call(refs);
    setSummary({ action, ...(r.ok ? summarizeResults(r.data) : { succeeded: 0, refused: { failed: refs.length } }), skipped });
    await reload();
  }, [items, selected, reload]);

  const actions = useMemo(() => ({
    hold: (reason: HoldReason, note?: string) => run('hold', refs => outboundQueueService.hold(refs, reason, note)),
    release: () => run('release', refs => outboundQueueService.release(refs)),
    retry: (reason?: ResubmitReason) => run('retry', refs => outboundQueueService.retry(refs, reason)),
    retract: (reason: RetractReason) => run('retract', refs => outboundQueueService.retract(refs, reason)),
    overrideRelease: () => run('overrideRelease', refs => outboundQueueService.overrideRelease(refs)),
    markNotReportable: (reason: NotReportableReason, note?: string) => run('markNotReportable', refs => outboundQueueService.markNotReportable(refs, reason, note)),
  }), [run]);

  return {
    items, counts, deadlineCounts, billingCounts, needsReview, toggleNeedsReview: () => setNeedsReview(v => !v), facilityOptions, loading, feeds, states, deadlines, facilityId, search, sortKey, direction, selected, summary,
    toggleFeed: (f: OutboundFeed) => setFeeds(l => toggle(l, f)),
    toggleState: (s: OutboundState) => setStates(l => toggle(l, s)),
    toggleDeadline: (d: DeadlineFlag) => setDeadlines(l => toggle(l, d)),
    setFacilityId, setSearch, setSortKey, setDirection, toggleSelected, selectAll, reload, actions,
    canAct: (action: OutboundAction) => refsAllowing(items, selected, action).length,
    allowed: outboundActionAllowed,
  };
}
