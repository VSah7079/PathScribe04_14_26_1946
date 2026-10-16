// src/components/QualityAssurance/QaActivityBoardTab.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 518 (PS-120): Quality Assurance → Activities. One generic tile per QA
// activity — every active Standard and Custom activity type, plus Countersign
// through an adapter — and, for the chosen one, a generic table whose columns
// come from the activity's own review fields.
//
// Tiles show pending (where the activity has a queue), completed in the last
// 30 days, turnaround compliance against the activity's TAT target, and the
// discrepancy rate; "—" where an activity can't know. The figures come from
// services/quality/qaActivityBoard.ts. The existing specialised tabs under
// Operations (Discordance, Countersign turnaround, Credentialing review) stay
// for now; this board is the generic view PS-120 asked for.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { qaActivityTypeService, qaActivityRecordService, countersignService, tatTargetService } from '@/services';
import {
  activityTypeSources, countersignSource, activityTatTargetHours, qaBoardTile, orderedSources, BOARD_PERIOD_DAYS,
  type QaBoardSource,
} from '@/services/quality/qaActivityBoard';
import type { TATEntry } from '@/types/quality/TatConfigEntry';
import { formatDateTime } from '@/utils/formatDate';
import { formatPercent } from '@/utils/formatPercent';
import { LoadingState } from '@/components/Common/LoadingState';

const K = 'qaActivityBoard';

export const QaActivityBoardTab: React.FC<{ onOpenCase?: (caseId: string) => void }> = ({ onOpenCase }) => {
  const { t, i18n } = useTranslation();
  const [sources, setSources] = useState<QaBoardSource[] | null>(null);
  const [tat, setTat] = useState<TATEntry[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void Promise.all([qaActivityTypeService.getAll(), qaActivityRecordService.getAll(), countersignService.getAll(), tatTargetService.getAll()])
      .then(([types, records, countersigns, entries]) => {
        if (!live) return;
        const built = orderedSources([
          ...activityTypeSources(types.ok ? types.data : [], records.ok ? records.data : []),
          countersignSource(countersigns.ok ? countersigns.data : []),
        ]);
        setSources(built);
        setTat(entries.ok ? entries.data : []);
        setSelected(prev => prev ?? built[0]?.id ?? null);
      });
    return () => { live = false; };
  }, []);

  const now = Date.now();
  const tiles = useMemo(() => (sources ?? []).map(s => ({ source: s, tile: qaBoardTile(s, activityTatTargetHours(tat, s.id), now) })), [sources, tat, now]);
  const current = sources?.find(s => s.id === selected) ?? null;
  const nameOf = (s: QaBoardSource) => (s.scope === 'adapter' ? t(`${K}.countersign.name`) : s.name);
  const pct = (v: number | null) => (v === null ? '—' : formatPercent(v, i18n.language));
  const cell = (s: QaBoardSource, colId: string, v: string) =>
    s.scope === 'adapter' && colId === 'status' && v ? t(`${K}.countersign.statuses.${v}`) : v;

  if (!sources) return <LoadingState label={t(`${K}.loading`)} />;

  return (
    <div className="ps-qa-board">
      <p className="ps-conf-hint">{t(`${K}.intro`, { days: BOARD_PERIOD_DAYS })}</p>
      <div className="ps-qa-board-tiles">
        {tiles.map(({ source, tile }) => (
          <button key={source.id} type="button"
            className={`ps-qa-board-tile${selected === source.id ? ' ps-qa-board-tile--active' : ''}`}
            aria-pressed={selected === source.id} onClick={() => setSelected(source.id)}>
            <span className="ps-qa-board-tile-name">{nameOf(source)}</span>
            <span className="ps-qa-board-tile-scope">{t(`${K}.scopes.${source.scope}`)}</span>
            <dl className="ps-qa-board-tile-stats">
              <dt>{t(`${K}.pending`)}</dt><dd>{tile.pending ?? '—'}</dd>
              <dt>{t(`${K}.completed`)}</dt><dd>{tile.completed}</dd>
              <dt>{t(`${K}.tatCompliance`)}</dt><dd>{pct(tile.tatCompliance)}</dd>
              <dt>{t(`${K}.discrepancyRate`)}</dt><dd>{pct(tile.discrepancyRate)}</dd>
            </dl>
          </button>
        ))}
      </div>

      {current && (
        <div className="ps-conf-table-wrap">
          <div className="ps-conf-table-scroll">
            <table className="ps-conf-table">
              <caption className="ps-qa-board-caption">{nameOf(current)}</caption>
              <thead className="ps-conf-thead-sticky">
                <tr>
                  <th className="ps-conf-th">{t('qualityAssurance.common.case')}</th>
                  <th className="ps-conf-th">{t(`${K}.completedAt`)}</th>
                  <th className="ps-conf-th">{t(`${K}.by`)}</th>
                  {current.columns.map(c => <th key={c.id} className="ps-conf-th">{c.labelKey ? t(c.labelKey) : c.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {current.rows.map(r => (
                  <tr key={r.id} className="ps-conf-tr">
                    <td className="ps-conf-td">
                      {onOpenCase
                        ? <button type="button" className="ps-conf-btn-row" data-phi="accession" onClick={() => onOpenCase(r.caseId)}>{r.caseId}</button>
                        : <span data-phi="accession">{r.caseId}</span>}
                    </td>
                    <td className="ps-conf-td">{r.completedAt ? formatDateTime(r.completedAt, i18n.language) : t(`${K}.notYet`)}</td>
                    <td className="ps-conf-td">{r.by ?? '—'}</td>
                    {current.columns.map(c => <td key={c.id} className="ps-conf-td">{cell(current, c.id, r.values[c.id] ?? '')}</td>)}
                  </tr>
                ))}
                {current.rows.length === 0 && (
                  <tr><td className="ps-conf-empty-row" colSpan={3 + current.columns.length}>{t(`${K}.empty`)}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default QaActivityBoardTab;
