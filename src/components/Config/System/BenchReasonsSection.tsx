// src/components/Config/System/BenchReasonsSection.tsx
// ───────────────────────────────────────────────────────────
// Batch 736 (Pete, Oct 30, 2026): Configuration → System → Bench Reasons. The tap-to-pick reasons the bench uses
// (Microtome Block exhausted; the answer to it and the Add-On builder's exhausted-block reason; Batch Management's
// Abort, complete with exceptions and cold-chain acknowledgement), worded by each lab. Each reason keeps its code
// when reworded, so reports count it the same way. A default reason shows its translation until it is reworded,
// and can go back to it. Changes save at once and need config:bench-reasons:manage, checked by the service.
// Rules: services/reasons/benchReasonAdmin.ts and benchReasons.ts.
// ───────────────────────────────────────────────────────────
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { reasonDictionaryService } from '@/services';
import type { ReasonDictionaryEntry } from '@/types/reasons/ReasonDictionaryEntry';
import { BENCH_REASON_CATEGORIES, activeBenchReasons, benchReasonLabel, hasDefaultWording, type BenchReasonCategory } from '@/services/reasons/benchReasons';
import { benchWordingProblem, defaultWordingOf, moveBenchReason, nextSortOrder } from '@/services/reasons/benchReasonAdmin';
import '@/pathscribe.css';
import './BenchReasonsSection.css';

const K = 'benchReasonsSection';

const BenchReasonsSection: React.FC = () => {
  const { t } = useTranslation();
  const [reasons, setReasons] = useState<Partial<Record<BenchReasonCategory, ReasonDictionaryEntry[]>>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const load = useCallback(async () => {
    const lists = await Promise.all(BENCH_REASON_CATEGORIES.map(c => reasonDictionaryService.getAll(c)));
    setReasons(Object.fromEntries(BENCH_REASON_CATEGORIES.map((c, i) => [c, lists[i].ok ? lists[i].data : []])));
  }, []);
  useEffect(() => { void load(); }, [load]);

  const shown = (e: ReasonDictionaryEntry) => benchReasonLabel(e, k => t(k));
  const run = async (work: () => Promise<{ ok: boolean }[]>) => {
    setBusy(true); setMessage(null);
    const results = await work();
    setBusy(false);
    setMessage(results.every(r => r.ok) ? { text: t(`${K}.saved`), error: false } : { text: t(`${K}.notSaved`), error: true });
    await load();
  };

  const saveWording = (category: BenchReasonCategory, entry: ReasonDictionaryEntry | undefined, key: string) => {
    const wording = (drafts[key] ?? '').trim();
    const problem = benchWordingProblem(wording, entry?.id, reasons[category] ?? [], shown);
    if (problem) { setMessage({ text: t(`${K}.errors.${problem}`), error: true }); return; }
    void run(async () => [entry
      ? await reasonDictionaryService.update(entry.id, { name: wording })
      : await reasonDictionaryService.add({ category, name: wording, description: '', status: 'Active', sortOrder: nextSortOrder(reasons[category] ?? []) })]);
    setDrafts(d => ({ ...d, [key]: '' }));
  };

  const move = (category: BenchReasonCategory, id: string, delta: -1 | 1) => {
    const changes = moveBenchReason(reasons[category] ?? [], id, delta);
    void run(() => Promise.all(changes.map(c => reasonDictionaryService.update(c.id, { sortOrder: c.sortOrder }))));
  };

  return (
    <div>
      <div className="ps-rbuf-header">
        <h2 className="ps-rbuf-title">{t(`${K}.title`)}</h2>
        <p className="ps-rbuf-subtitle">{t(`${K}.subtitle`)}</p>
      </div>
      {message && <p className={message.error ? 'ps-conf-error' : 'ps-specreq-meta'} role="status">{message.text}</p>}
      {BENCH_REASON_CATEGORIES.map(category => {
        const all = reasons[category] ?? [];
        const active = activeBenchReasons(all);
        const inactive = all.filter(e => e.status !== 'Active');
        const addKey = `new:${category}`;
        return (
          <div key={category} className="ps-conf-card ps-conf-card--spaced">
            <div className="ps-conf-card-title">{t(`${K}.categories.${category}`)}</div>
            <div className="ps-conf-table-wrap">
              <table className="ps-conf-table">
                <thead>
                  <tr>
                    <th className="ps-conf-th">{t(`${K}.columns.wording`)}</th>
                    <th className="ps-conf-th">{t(`${K}.columns.code`)}</th>
                    <th className="ps-conf-th">{t(`${K}.columns.actions`)}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...active, ...inactive].map((entry, i) => {
                    const isActive = entry.status === 'Active';
                    const isDefault = hasDefaultWording(entry);
                    return (
                      <tr key={entry.id} className="ps-conf-tr">
                        <td className="ps-conf-td">
                          <div className="ps-bench-reason-wording">
                            <input className="ps-conf-input" aria-label={t(`${K}.rewordAria`, { reason: shown(entry) })}
                              placeholder={shown(entry)} value={drafts[entry.id] ?? ''} disabled={busy || !isActive}
                              onChange={e => setDrafts(d => ({ ...d, [entry.id]: e.target.value }))} />
                            <button type="button" className="ps-conf-btn-secondary" disabled={busy || !(drafts[entry.id] ?? '').trim()}
                              onClick={() => saveWording(category, entry, entry.id)}>{t(`${K}.reword`)}</button>
                          </div>
                          <div className="ps-specreq-meta">
                            {isDefault ? t(`${K}.defaultWording`) : t(`${K}.labWording`)}
                            {!isActive && <> · {t('common.inactive')}</>}
                          </div>
                        </td>
                        <td className="ps-conf-td"><code>{entry.id}</code></td>
                        <td className="ps-conf-td">
                          <div className="ps-bench-reason-actions">
                            {isActive && (
                              <>
                                <button type="button" className="ps-conf-btn-secondary" disabled={busy || i === 0} aria-label={t(`${K}.moveUp`)} onClick={() => move(category, entry.id, -1)}>{t(`${K}.moveUpShort`)}</button>
                                <button type="button" className="ps-conf-btn-secondary" disabled={busy || i === active.length - 1} aria-label={t(`${K}.moveDown`)} onClick={() => move(category, entry.id, 1)}>{t(`${K}.moveDownShort`)}</button>
                              </>
                            )}
                            {!isDefault && defaultWordingOf(entry.id) && (
                              <button type="button" className="ps-conf-btn-secondary" disabled={busy}
                                onClick={() => void run(async () => [await reasonDictionaryService.update(entry.id, { name: defaultWordingOf(entry.id) })])}>{t(`${K}.useDefault`)}</button>
                            )}
                            <button type="button" className="ps-conf-btn-secondary" disabled={busy}
                              onClick={() => void run(async () => [await (isActive ? reasonDictionaryService.deactivate(entry.id) : reasonDictionaryService.reactivate(entry.id))])}>
                              {t(isActive ? `${K}.retire` : `${K}.restore`)}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="ps-conf-tr">
                    <td className="ps-conf-td" colSpan={3}>
                      <div className="ps-bench-reason-wording">
                        <input className="ps-conf-input" aria-label={t(`${K}.addAria`, { category: t(`${K}.categories.${category}`) })}
                          placeholder={t(`${K}.addPlaceholder`)} value={drafts[addKey] ?? ''} disabled={busy}
                          onChange={e => setDrafts(d => ({ ...d, [addKey]: e.target.value }))} />
                        <button type="button" className="ps-conf-btn-primary" disabled={busy || !(drafts[addKey] ?? '').trim()}
                          onClick={() => saveWording(category, undefined, addKey)}>{t(`${K}.add`)}</button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BenchReasonsSection;
