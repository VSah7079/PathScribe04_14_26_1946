// src/components/Search/Report/SynopticValueFilters.tsx
// ─────────────────────────────────────────────────
// Batch 613: search on what a synoptic report says. Each row is a protocol, one of its questions,
// an operator and a value; every row must match (a case matches a row when one of its reports
// from that protocol has a matching answer). The questions and choices come from the protocol
// registry, so only what a protocol really asks is offered.
// ─────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { caseSearchService } from '@/services';
import type { SynopticProtocolInfo } from '@/services/caseSearch/ICaseSearchService';
import {
  MAX_SYNOPTIC_VALUE_CRITERIA, operatorNeedsValue, operatorsForKind, type SynopticValueCriterion, type SynopticValueOperator,
} from '@/services/caseSearch/synopticValueCriteria';

interface Props {
  criteria: SynopticValueCriterion[];
  onChange(next: SynopticValueCriterion[]): void;
}

export const SynopticValueFilters: React.FC<Props> = ({ criteria, onChange }) => {
  const { t } = useTranslation();
  const [protocols, setProtocols] = useState<SynopticProtocolInfo[]>([]);
  useEffect(() => {
    let cancelled = false;
    void caseSearchService.listSynopticProtocols().then(r => { if (!cancelled && r.ok) setProtocols(r.data); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const patch = (i: number, p: Partial<SynopticValueCriterion>) => onChange(criteria.map((k, j) => (j === i ? { ...k, ...p } : k)));
  const fieldOf = (k: SynopticValueCriterion) => protocols.find(p => p.templateId === k.templateId)?.fields.find(f => f.id === k.fieldId);

  const add = () => {
    const first = protocols[0];
    const field = first?.fields[0];
    if (!first || !field) return;
    onChange([...criteria, { templateId: first.templateId, fieldId: field.id, operator: operatorsForKind(field.kind)[0], value: '' }]);
  };

  return (
    <div className="ps-svf" data-testid="synoptic-value-filters">
      {criteria.map((k, i) => {
        const protocol = protocols.find(p => p.templateId === k.templateId);
        const field = fieldOf(k);
        const operators = field ? operatorsForKind(field.kind) : [];
        return (
          <div className="ps-svf-row" key={i}>
            <select className="ps-searchpage-basis-select" aria-label={t('searchPage.synopticValues.protocol')} value={k.templateId}
              onChange={e => {
                const p = protocols.find(x => x.templateId === e.target.value);
                const f = p?.fields[0];
                patch(i, { templateId: e.target.value, fieldId: f?.id ?? '', operator: f ? operatorsForKind(f.kind)[0] : 'is', value: '' });
              }}>
              {protocols.map(p => <option key={p.templateId} value={p.templateId}>{p.name}</option>)}
            </select>
            <select className="ps-searchpage-basis-select" aria-label={t('searchPage.synopticValues.question')} value={k.fieldId}
              onChange={e => {
                const f = protocol?.fields.find(x => x.id === e.target.value);
                patch(i, { fieldId: e.target.value, operator: f ? operatorsForKind(f.kind)[0] : 'is', value: '' });
              }}>
              {(protocol?.fields ?? []).map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
            <select className="ps-searchpage-basis-select" aria-label={t('searchPage.synopticValues.operatorLabel')} value={k.operator}
              onChange={e => patch(i, { operator: e.target.value as SynopticValueOperator, value: operatorNeedsValue(e.target.value as SynopticValueOperator) ? k.value : '' })}>
              {operators.map(op => <option key={op} value={op}>{t(`searchPage.synopticValues.operator.${op}`)}</option>)}
            </select>
            {operatorNeedsValue(k.operator) && (field && (field.kind === 'choice' || field.kind === 'multi') ? (
              <select className="ps-searchpage-basis-select" aria-label={t('searchPage.synopticValues.value')} value={k.value} onChange={e => patch(i, { value: e.target.value })}>
                <option value="">{t('searchPage.synopticValues.chooseValue')}</option>
                {field.options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            ) : (
              <input className="ps-searchpage-basis-select" aria-label={t('searchPage.synopticValues.value')} value={k.value}
                inputMode={field?.kind === 'number' ? 'decimal' : undefined}
                placeholder={field?.unit ? t('searchPage.synopticValues.valueIn', { unit: field.unit }) : t('searchPage.synopticValues.value')}
                onChange={e => patch(i, { value: e.target.value })} />
            ))}
            <button type="button" className="ps-searchpage-chip-remove" aria-label={t('searchPage.synopticValues.remove')} onClick={() => onChange(criteria.filter((_, j) => j !== i))}>×</button>
          </div>
        );
      })}
      <button type="button" className="ps-searchpage-export-btn" onClick={add} disabled={protocols.length === 0 || criteria.length >= MAX_SYNOPTIC_VALUE_CRITERIA}>
        {t('searchPage.synopticValues.add')}
      </button>
      {criteria.length > 0 && <p className="ps-svf-hint">{t('searchPage.synopticValues.hint')}</p>}
    </div>
  );
};
