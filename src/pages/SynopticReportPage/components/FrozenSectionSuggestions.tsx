// src/pages/SynopticReportPage/components/FrozenSectionSuggestions.tsx
// Batch 605: frozen section CPT suggestions in the billing review, labelled unconfirmed, accept or dismiss, audited.
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { intraoperativeService } from '@/services';
import { buildFrozenSuggestionRows, decideFrozenSuggestion, type FrozenSuggestionRow, type FrozenDecision } from '@/services/billing/frozenSectionSuggestionReview';
import { readSessionProfile } from '@/services/auth/sessionProfile';

const FrozenSectionSuggestions: React.FC<{ caseId: string }> = ({ caseId }) => {
  const { t } = useTranslation();
  const [rows, setRows] = useState<FrozenSuggestionRow[]>([]);

  const load = useCallback(async () => {
    const res = await intraoperativeService.getAll();
    const entries = res.ok ? res.data.filter(e => e.mergedIntoCaseId === caseId) : [];
    setRows(buildFrozenSuggestionRows(caseId, entries.flatMap(e => e.specimens ?? [])));
  }, [caseId]);
  useEffect(() => { void load(); }, [load]);

  const decide = async (row: FrozenSuggestionRow, d: FrozenDecision) => {
    await decideFrozenSuggestion(caseId, row, d, readSessionProfile()?.name ?? 'unknown');
    await load();
  };

  if (rows.length === 0) return null;
  return (
    <div className="ps-billing-frozen" data-testid="frozen-suggestions">
      <h4>{t('frozenSectionSuggestions.title')}</h4>
      <p className="ps-conf-hint">{t('frozenSectionSuggestions.unconfirmed')}</p>
      <ul>
        {rows.map(r => (
          <li key={r.key} data-testid={`frozen-row-${r.key}`}>
            <span>{t('frozenSectionSuggestions.row', { cpt: r.cpt, specimen: r.specimenLabel, n: r.ordinal })}</span>{' '}
            {r.decision ? <span className="ps-conf-badge">{t(`frozenSectionSuggestions.decision.${r.decision}`)}</span> : (
              <>
                <button type="button" className="ps-conf-btn-primary" onClick={() => decide(r, 'accepted')}>{t('frozenSectionSuggestions.accept')}</button>{' '}
                <button type="button" className="ps-conf-btn-secondary" onClick={() => decide(r, 'dismissed')}>{t('frozenSectionSuggestions.dismiss')}</button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FrozenSectionSuggestions;
