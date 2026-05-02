// PathScribe — ComputationalPanel
// Standalone two-pane panel for the Computational tab in SynopticReportPage.
// Uses the same service-fetch logic as SidecarDrawer to get case-specific flags,
// and the same Navigator + Display layout — no SidecarContext dependency.

import React, { useCallback, useEffect, useState } from 'react';
import { Flag }               from '@/services/flags/IFlagService';
import { ComputationalResult } from '@/types/smarttag.types';
import { flagService, caseService, messageService } from '@/services';
import SidecarDisplay   from './SidecarDisplay';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  caseId:          string;
  /** All active computational flag definitions — passed from parent. */
  allCompFlags:    Flag[];
  /** AI suggestions from RightSynopticPanel for concordance checking. */
  aiSuggestions?:  Record<string, any>;
}

// ─── ComputationalPanel ───────────────────────────────────────────────────────

const ComputationalPanel: React.FC<Props> = ({ caseId, allCompFlags, aiSuggestions }) => {
  const { log } = useAuditLog();
  const [caseFlags,    setCaseFlags]    = useState<Flag[]>([]);
  const [orderableFlags, setOrderableFlags] = useState<Flag[]>([]); // comp flags NOT yet on case
  const [availableProtocols, setAvailableProtocols] = useState<Record<string, string>>({});
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null); // null = all specimens
  const [caseSpecimens,  setCaseSpecimens]  = useState<Array<{ id: string; label: string; description: string }>>([]);
  const [orderSearch,    setOrderSearch]    = useState('');
  const [pendingOrders,  setPendingOrders]  = useState<Array<{ flag: Flag; specimenId: string | null }>>([]);
  const [placing,        setPlacing]        = useState(false);
  const [cancelTarget,   setCancelTarget]   = useState<Flag | null>(null);
  const [cancelling,     setCancelling]     = useState(false);
  const [selectedFlag, setSelectedFlag] = useState<Flag | null>(null);
  const [results,      setResults]      = useState<Record<string, ComputationalResult | null>>({});

  // ── Load protocol names for display in confirmation modal ────────────────
  useEffect(() => {
    import('@/services/templates/templateService').then(m =>
      m.listTemplates('published').then((templates: any[]) => {
        const map: Record<string, string> = {};
        templates.forEach((t: any) => { map[t.id] = t.name; });
        setAvailableProtocols(map);
      })
    ).catch(() => {});
  }, []);

  // ── Fetch case-specific flags (same logic as SidecarDrawer) ──────────────
  useEffect(() => {
    if (!caseId || allCompFlags.length === 0) return;

    caseService.getCase(caseId).then(caseData => {
      if (!caseData) { setCaseFlags(allCompFlags); return; }

      // Store specimen list for the order modal selector
      const specs = ((caseData as any).specimens ?? []).map((sp: any) => ({
        id: sp.id, label: sp.label, description: sp.description ?? '',
      }));
      setCaseSpecimens(specs);

      const lisCodes = new Set<string>();
      const addCode  = (f: any) => { if (f?.lisCode) lisCodes.add(f.lisCode); };

      ((caseData as any).caseFlags     ?? []).forEach(addCode);
      ((caseData as any).specimenFlags ?? []).forEach(addCode);
      ((caseData as any).specimens     ?? []).forEach((sp: any) =>
        (sp.specimenFlags ?? sp.flags ?? []).forEach(addCode)
      );

      const filtered = lisCodes.size > 0
        ? allCompFlags.filter(f => f.lisCode && lisCodes.has(f.lisCode))
        : allCompFlags;

      setCaseFlags(filtered);
      if (filtered.length > 0) setSelectedFlag(filtered[0]);

      // Orderable = active computational flags NOT already on this case
      const filteredIds = new Set(filtered.map(f => f.id));
      setOrderableFlags(
        allCompFlags.filter(f =>
          f.status === 'Active' &&
          f.tagClass === 'COMPUTATIONAL' &&
          !filteredIds.has(f.id)
        )
      );
    }).catch(() => setCaseFlags(allCompFlags));
  }, [caseId, allCompFlags.length]);

  // ── Fetch all results for Navigator dot colours ───────────────────────────
  useEffect(() => {
    if (!caseId || caseFlags.length === 0) return;
    import('@/services').then(({ resultService }) => {
      caseFlags.forEach(flag => {
        const sourceId = flag.dataSource?.sourceId;
        if (!sourceId) return;
        resultService.getResult(sourceId, caseId)
          .then((result: ComputationalResult) =>
            setResults(prev => ({ ...prev, [flag.id]: result }))
          )
          .catch(() => {});
      });
    });
  }, [caseId, caseFlags.length]);




  const togglePendingOrder = useCallback((flag: Flag, specimenId: string | null) => {
    setPendingOrders(prev => {
      const exists = prev.find(o => o.flag.id === flag.id);
      if (exists) return prev.filter(o => o.flag.id !== flag.id);
      return [...prev, { flag, specimenId }];
    });
  }, []);

  const handlePlaceOrders = useCallback(async () => {
    if (pendingOrders.length === 0) return;
    setPlacing(true);
    try {
      for (const { flag, specimenId } of pendingOrders) {
        await flagService.add({
          ...flag, status: 'Active', tagClass: 'COMPUTATIONAL',
          orderedVia: 'pathscribe',
          ...(specimenId ? { specimenId } : {}),
        });
        await messageService.send?.({
          subject: `Order Request: ${flag.name}`,
          body: `Order request for ${flag.name} (${flag.lisCode}) on case ${caseId}.`,
          type: 'order-request', caseId,
        }).catch(() => {});
        if (flag.defaultProtocolIds?.length && caseId) {
          window.dispatchEvent(new CustomEvent('ps:suggest-protocols', {
            detail: { caseId, protocolIds: flag.defaultProtocolIds, flagName: flag.name }
          }));
        }
      }
      log(COMP_AUDIT.USE_ORDERS_PLACED, {
        caseId,
        count: pendingOrders.length,
        flags: pendingOrders.map(o => ({
          flagId: o.flag.id, lisCode: o.flag.lisCode, specimenId: o.specimenId
        })),
      });
      const orderedIds = new Set(pendingOrders.map(o => o.flag.id));
      setCaseFlags(prev => [...prev, ...pendingOrders.map(o => ({ ...o.flag }))]);
      setOrderableFlags(prev => prev.filter(f => !orderedIds.has(f.id)));
      setPendingOrders([]);
      setShowOrderModal(false);
    } catch (e) {
      console.error('[ComputationalPanel] Order request failed:', e);
    } finally {
      setPlacing(false);
    }
  }, [pendingOrders, caseId]);


  const handleCancelOrder = useCallback(async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      const orderedVia = (cancelTarget as any).orderedVia ?? 'lis';

      log(COMP_AUDIT.USE_ORDER_CANCELLED, {
        caseId,
        flagId: cancelTarget.id,
        flagName: cancelTarget.name,
        orderedVia: (cancelTarget as any).orderedVia ?? 'lis',
      });

      // Send cancellation notification (non-blocking)
      await messageService.send?.({
        subject: `Cancellation Request: ${cancelTarget.name}`,
        body: `Cancellation request for ${cancelTarget.name} (${cancelTarget.lisCode}) on case ${caseId}. ` +
              (orderedVia === 'pathscribe'
                ? 'Order was placed via PathScribe — lab notified to cancel.'
                : 'Order originated in LIS — PathScribe has notified the lab. Please also cancel in your LIS system.'),
        type: 'cancel-request', caseId,
      }).catch(() => {});

      // Remove from case flags
      setCaseFlags(prev => prev.filter(f => f.id !== cancelTarget.id));
      setOrderableFlags(prev => [...prev, cancelTarget]);
      setCancelTarget(null);
    } catch (e) {
      console.error('[ComputationalPanel] Cancellation failed:', e);
    } finally {
      setCancelling(false);
    }
  }, [cancelTarget, caseId]);

  // ── Voice event handlers ──────────────────────────────────────────────
  useEffect(() => {
    const nextAssay = () => {
      setCaseFlags(prev => {
        const idx = prev.findIndex(f => f.id === selectedFlag?.id);
        const next = prev[idx + 1];
        if (next) setSelectedFlag(next);
        return prev;
      });
    };
    const prevAssay = () => {
      setCaseFlags(prev => {
        const idx = prev.findIndex(f => f.id === selectedFlag?.id);
        const prev2 = prev[idx - 1];
        if (prev2) setSelectedFlag(prev2);
        return prev;
      });
    };
    const readResult = () => {
      if (!selectedFlag || !window.speechSynthesis) return;
      const result = results[selectedFlag.id];
      if (!result || !result.data) {
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(`${selectedFlag.name}: no result available yet.`));
        return;
      }
      const lines = Object.entries(result.data)
        .filter(([, v]) => v !== null)
        .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
        .join('. ');
      const u = new SpeechSynthesisUtterance(`${selectedFlag.name}. ${lines}`);
      u.rate = 0.95;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
      log(COMP_AUDIT.USE_RESULT_READ_ALOUD, { caseId, flagId: selectedFlag.id });
    };
    const openOrderModal = () => {
      setShowOrderModal(true);
      setOrderSearch('');
      setPendingOrders([]);
      setSelectedTarget(null);
      log(COMP_AUDIT.USE_ORDER_MODAL_OPENED, { caseId });
    };

    window.addEventListener(COMP_EVENT.NEXT_ASSAY,       nextAssay);
    window.addEventListener(COMP_EVENT.PREV_ASSAY,       prevAssay);
    window.addEventListener(COMP_EVENT.READ_RESULT,      readResult);
    window.addEventListener('PATHSCRIBE_COMP_OPEN_ORDER_MODAL_INTERNAL', openOrderModal);

    return () => {
      window.removeEventListener(COMP_EVENT.NEXT_ASSAY,  nextAssay);
      window.removeEventListener(COMP_EVENT.PREV_ASSAY,  prevAssay);
      window.removeEventListener(COMP_EVENT.READ_RESULT, readResult);
      window.removeEventListener('PATHSCRIBE_COMP_OPEN_ORDER_MODAL_INTERNAL', openOrderModal);
    };
  }, [selectedFlag, results, caseId]);

  const handleResultLoaded = useCallback((flagId: string, result: ComputationalResult) => {
    setResults(prev => ({ ...prev, [flagId]: result }));
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const specimenLabel = (spId: string | null | undefined) => {
    if (!spId) return 'Case level';
    const sp = caseSpecimens.find(s => s.id === spId);
    return sp ? `${sp.label}: ${sp.description}` : spId;
  };

  // ── Empty state ───────────────────────────────────────────────────────────
  if (caseFlags.length === 0) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', color: '#4e607a', fontSize: 13,
      }}>
        No computational assays ordered for this case.
      </div>
    );
  }

  // ── Two-pane layout (matches worklist overlay) ───────────────────────────
  return (
    <>
      <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
        {/* Navigator + orderable section */}
        <div style={{
          width:      220,
          flexShrink: 0,
          borderRight:'1px solid rgba(30,41,59,0.9)',
          display:    'flex',
          flexDirection: 'column',
          overflow:   'hidden',
        }}>
          {/* Ordered assays — inline navigator with trash icon on pending */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div className="fm-col-label" style={{ padding: '10px 12px 6px' }}>Data sources</div>
            {caseFlags.length === 0 && (
              <div className="fm-flag-desc" style={{ padding: '16px 12px' }}>No computational flags on this case.</div>
            )}
            {caseFlags.map(flag => {
              const result    = results[flag.id];
              const status    = result?.status;
              const isPending = !status || status === 'PENDING';
              const isSelected = selectedFlag?.id === flag.id;
              const color = status === 'FINAL' && result?.actionability === 'ACTIONABLE' ? '#dc2626'
                : status === 'FINAL' ? '#059669'
                : status === 'PRELIMINARY' ? '#f59e0b'
                : '#0891B2';
              return (
                <div key={flag.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '8px 10px 8px 8px', cursor: 'pointer',
                    background: isSelected ? 'rgba(56,189,248,0.08)' : 'transparent',
                    borderLeft: `2px solid ${isSelected ? '#38bdf8' : 'transparent'}`,
                  }}
                  onClick={() => {
                    setSelectedFlag(flag);
                    const st = results[flag.id]?.status;
                    log(COMP_AUDIT.USE_RESULT_VIEWED, {
                      caseId, flagId: flag.id, flagName: flag.name,
                      status: st ?? 'PENDING'
                    });
                  }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0, marginRight: 2 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="fm-flag-name" style={{ color: isSelected ? '#e2e8f0' : '#8a9db5' }}>{flag.name}</div>
                    <div className="fm-flag-desc">{flag.lisCode}</div>
                  </div>
                  {isPending && (
                    <button
                      title="Cancel this order"
                      onClick={e => { e.stopPropagation(); setCancelTarget(flag); }}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#475569', padding: '2px 3px', borderRadius: 4,
                        flexShrink: 0, display: 'flex', alignItems: 'center',
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#ef4444'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#475569'}
                    >
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                        <path d="M3 4h10M6 4V3h4v1M7 7v5M9 7v5M4 4l1 9h6l1-9"
                          stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Order button — opens modal */}
          {orderableFlags.length > 0 && (
            <div style={{ flexShrink: 0, padding: '10px 12px', borderTop: '1px solid rgba(30,41,59,0.9)' }}>
              <button
                onClick={() => { setShowOrderModal(true); setOrderSearch(''); setPendingOrders([]); setSelectedTarget(null); }}
                style={{
                  width: '100%', padding: '7px 0', fontSize: 12, fontWeight: 600,
                  color: '#0891B2', background: 'rgba(8,145,178,0.06)',
                  border: '1px solid rgba(8,145,178,0.25)', borderRadius: 6,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(8,145,178,0.12)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(8,145,178,0.06)'; }}
              >
                + Order additional test
              </button>
            </div>
          )}
        </div>

        {/* Display pane */}
        <div style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
          {selectedFlag ? (
            <SidecarDisplay
              key={selectedFlag.id}
              flag={selectedFlag}
              caseId={caseId}
              aiSuggestions={aiSuggestions}
              onResultLoaded={handleResultLoaded}
            />
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: '100%', color: '#4e607a', fontSize: 13,
            }}>
              Select an assay from the list
            </div>
          )}
        </div>
      </div>

      {/* ── Order Additional Test modal — Flag Manager style ── */}
      {showOrderModal && (
        <div className="fm-overlay" style={{ zIndex: 10100 }} onClick={() => setShowOrderModal(false)}>
          <div className="fm-modal" onClick={e => e.stopPropagation()}
            style={{ width: 'min(680px, 92vw)', height: 560, borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--ps-navy-right, #0d1829)' }}>

            {/* Header */}
            <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid rgba(30,41,59,0.9)', flexShrink: 0 }}>
              <div className="fm-eyebrow">Computational Data</div>
              <div className="fm-title-row">
                <span className="fm-title">Order Additional Test</span>
                <span className="fm-active-badge">{orderableFlags.length} available</span>
              </div>
            </div>

            {/* Body: left specimen selector + right test list */}
            <div className="fm-body">

            {/* Left — specimen selector + pending orders */}
            <div className="fm-left" style={{ width: 240 }}>

              {/* Pending orders list */}
              <div className="fm-col-label" style={{ padding: '0 14px 6px' }}>
                Pending orders
                {pendingOrders.length > 0 && (
                  <span className="fm-count-badge" style={{ marginLeft: 6 }}>{pendingOrders.length}</span>
                )}
              </div>
              {pendingOrders.length === 0 ? (
                <div className="fm-no-flags-note">No orders staged yet</div>
              ) : (
                pendingOrders.map(({ flag, specimenId }) => (
                  <div key={flag.id} className="fm-flag-chip">
                    <span className="fm-flag-chip-name">
                      <strong>{flag.lisCode}</strong> — {flag.name}
                      {specimenId && <span style={{ display: 'block', fontSize: 10, color: '#64748b', marginTop: 1 }}>{specimenLabel(specimenId)}</span>}
                    </span>
                    <button
                      className="fm-chip-remove-btn"
                      onClick={() => setPendingOrders(prev => prev.filter(o => o.flag.id !== flag.id))}
                      title="Remove from order"
                    >
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                        <path d="M3 4h10M6 4V3h4v1M7 7v5M9 7v5M4 4l1 9h6l1-9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                ))
              )}

              <div className="fm-divider" style={{ margin: '10px 0' }} />
              <div className="fm-col-label" style={{ padding: '0 14px 8px' }}>Apply to</div>

              {/* Case level */}
              <div
                onClick={() => setSelectedTarget(null)}
                style={{
                  padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  background: selectedTarget === null ? 'rgba(56,189,248,0.08)' : 'transparent',
                  borderLeft: `2px solid ${selectedTarget === null ? '#38bdf8' : 'transparent'}`,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: '#94a3b8' }}>
                  <rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M4 8h8M8 4v8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                <div>
                  <div style={{ fontSize: 13, fontWeight: selectedTarget === null ? 600 : 400, color: selectedTarget === null ? '#e2e8f0' : '#94a3b8' }}>All Specimens</div>
                </div>
              </div>

              {/* Per-specimen options */}
              {caseSpecimens.map(sp => (
                <div
                  key={sp.id}
                  onClick={() => setSelectedTarget(sp.id)}
                  style={{
                    padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 8,
                    background: selectedTarget === sp.id ? 'rgba(56,189,248,0.08)' : 'transparent',
                    borderLeft: `2px solid ${selectedTarget === sp.id ? '#38bdf8' : 'transparent'}`,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 2, color: '#94a3b8' }}>
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/>
                    <circle cx="8" cy="8" r="2" fill={selectedTarget === sp.id ? '#38bdf8' : 'transparent'} stroke="currentColor" strokeWidth="1.2"/>
                  </svg>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: selectedTarget === sp.id ? '#e2e8f0' : '#94a3b8' }}>{sp.label}:</div>
                    <div style={{ fontSize: 11, color: '#64748b', whiteSpace: 'normal', lineHeight: 1.4 }}>{sp.description}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Right — test catalog */}
            <div className="fm-right">

            {/* Search */}
            <div className="fm-search-bar">
              <svg className="fm-search-icon" width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <input
                className="fm-search-input"
                placeholder="Search tests by name or code..."
                value={orderSearch}
                onChange={e => setOrderSearch(e.target.value)}
                autoFocus
              />
              {orderSearch && (
                <button className="fm-search-clear" onClick={() => setOrderSearch('')}>✕</button>
              )}
            </div>

            {/* Column header */}
            <div className="fm-col-header" style={{ gridTemplateColumns: '70px 1fr 90px' }}>
              <span className="fm-col-label">Code</span>
              <span className="fm-col-label">Test <span className="fm-col-label-note">· suggested protocol</span></span>
              <span className="fm-col-label">Action</span>
            </div>

            {/* Test list */}
            <div className="fm-flag-list">
              {orderableFlags
                .filter(f => !orderSearch ||
                  f.name.toLowerCase().includes(orderSearch.toLowerCase()) ||
                  (f.lisCode ?? '').toLowerCase().includes(orderSearch.toLowerCase()) ||
                  (f.description ?? '').toLowerCase().includes(orderSearch.toLowerCase())
                )
                .map(flag => (
                  <div
                    key={flag.id}
                    className={`fm-flag-card${pendingOrders.find(o => o.flag.id === flag.id) ? ' applied' : ''}`}
                    style={{ gridTemplateColumns: '70px 1fr 90px' }}
                    onClick={() => { if (!orderableFlags.find(f => f.id === flag.id)) return; togglePendingOrder(flag, selectedTarget); }}
                  >
                    <span className={`fm-code-chip${pendingOrders.find(o => o.flag.id === flag.id) ? ' applied' : ''}`}>
                      {flag.lisCode}
                    </span>
                    <div className="fm-flag-info">
                      <div className="fm-flag-name-row">
                        <span className="fm-flag-name">{flag.name}</span>
                      </div>
                      <span className="fm-flag-desc">
                        {flag.defaultProtocolIds?.length
                          ? `Suggests: ${flag.defaultProtocolIds.map(id => availableProtocols[id] ?? id).join(', ')}`
                          : flag.description ?? 'No linked protocol'}
                      </span>
                    </div>
                    <span className="fm-apply-btn" style={{ color: pendingOrders.find(o => o.flag.id === flag.id) ? '#34d399' : undefined }}>
                      {pendingOrders.find(o => o.flag.id === flag.id) ? '✓ Staged' : '+ Order'}
                    </span>
                  </div>
                ))
              }
              {orderableFlags.filter(f => !orderSearch ||
                f.name.toLowerCase().includes(orderSearch.toLowerCase()) ||
                (f.lisCode ?? '').toLowerCase().includes(orderSearch.toLowerCase())
).length === 0 && (
                <div style={{ padding: '24px 0', textAlign: 'center', color: '#4e607a', fontSize: 13 }}>
                  No tests match your search.
                </div>
              )}
            </div>

            </div>{/* end fm-right */}
            </div>{/* end fm-body */}

            {/* Footer */}
            <div style={{ padding: '12px 22px', borderTop: '1px solid rgba(30,41,59,0.9)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button className="ps-btn-ghost-dark" onClick={() => setShowOrderModal(false)}>
                Cancel
              </button>
              <button
                onClick={handlePlaceOrders}
                disabled={pendingOrders.length === 0 || placing}
                style={{
                  padding: '9px 22px', fontSize: 13, fontWeight: 700,
                  background: pendingOrders.length > 0 ? '#0891B2' : 'rgba(8,145,178,0.2)',
                  border: 'none', borderRadius: 8, color: '#fff',
                  cursor: pendingOrders.length > 0 ? 'pointer' : 'default',
                  transition: 'background 0.15s',
                  opacity: placing ? 0.7 : 1,
                }}
              >
                {placing ? 'Placing orders…' : `Place ${pendingOrders.length > 0 ? pendingOrders.length : ''} Order${pendingOrders.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cancel order confirmation modal ── */}
      {cancelTarget && (
        <div className="fm-overlay" style={{ zIndex: 10200 }} onClick={() => !cancelling && setCancelTarget(null)}>
          <div className="ps-modal-dark" onClick={e => e.stopPropagation()} style={{ width: 'min(480px, 90vw)' }}>

            <div className="ps-modal-dark-header">
              <svg width="36" height="34" viewBox="0 0 40 36" fill="none">
                <polygon points="20,2 38,34 2,34" fill="#f59e0b" stroke="#92400e" strokeWidth="1.5" strokeLinejoin="round"/>
                <text x="20" y="29" textAnchor="middle" fontSize="17" fontWeight="900" fill="#1c1007" fontFamily="Arial, sans-serif">!</text>
              </svg>
              <span className="ps-modal-dark-title">Cancel Order</span>
            </div>

            <div className="fm-flag-card" style={{ cursor: 'default', marginBottom: 4 }}>
              <span className="fm-code-chip">{cancelTarget.lisCode}</span>
              <div className="fm-flag-info">
                <span className="fm-flag-name">{cancelTarget.name}</span>
                <span className="fm-flag-desc">{cancelTarget.description}</span>
              </div>
            </div>

            {/* Messaging differs by order origin */}
            {(cancelTarget as any).orderedVia === 'lis' ? (
              <div style={{ padding: '10px 12px', borderRadius: 6, background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.25)', fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
                <strong style={{ color: '#fbbf24' }}>This order originated in the LIS.</strong><br/>
                PathScribe will notify the laboratory, but you must also cancel this order in your LIS system to prevent the test from being processed.
              </div>
            ) : (
              <p className="ps-modal-dark-body">
                PathScribe will notify the laboratory to cancel this order. The test will be removed from the Computational panel.
              </p>
            )}

            <div className="ps-modal-dark-footer">
              <button className="ps-btn-ghost-dark" onClick={() => setCancelTarget(null)} disabled={cancelling}>
                Keep Order
              </button>
              <button
                className="ps-btn-amber"
                onClick={handleCancelOrder}
                disabled={cancelling}
              >
                {cancelling ? 'Cancelling…' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}


    </>
  );
};

export default ComputationalPanel;
