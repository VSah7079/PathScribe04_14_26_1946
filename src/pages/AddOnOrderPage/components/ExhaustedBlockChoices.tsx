// src/pages/AddOnOrderPage/components/ExhaustedBlockChoices.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 731 (Lab Workflow & Batch spec §10.6, decided Oct 29, 2026). When the
// pathologist selects an exhausted block, the builder no longer refuses it
// flatly: it says the block is exhausted and what remains, then shows each order
// line's outcome. A line that needs a new section (a recut or levels) is blocked
// until an alternative is chosen for it: an unstained slide already cut (only
// for a line that can use one), re-embedding of remnant or wet tissue (the order
// waits until the block is re-embedded; needs material:reembed:request), or
// another block of the same part. A reason is required and the order is audited.
// Inline in the builder (no window). Presentation only: the per-line check is
// utils/exhaustedBlockRules.ts, and services/addOnOrders checks it all again.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Specimen } from '@/types/case/Specimen';
import type { AddOnOrderLineInput } from '@/utils/addOnOrderOperations';
import { onExhaustedTissue } from '@/utils/blockPieceRules';
import {
  whatRemains, checkExhaustedLines, lineChoiceOptions, encodeLineChoice, decodeLineChoice, choicesForSubmit,
  type CartExhaustedChoice, type ExhaustedLineChoice, type WhatRemains,
} from '@/utils/exhaustedBlockRules';
import { formatList } from '@/utils/formatList';
import { QuickReasonPicks } from '@/components/Common/QuickReasonPicks';
import { useBenchReasons } from '@/hooks/useBenchReasons';
import './ExhaustedBlockChoices.css';

export interface ExhaustedBlockChoicesProps {
  specimens: Specimen[];
  selectedBlockIds: string[];
  cart: (AddOnOrderLineInput & { cartId: string })[];
  choices: Record<string, CartExhaustedChoice>;
  onChange: (blockId: string, next: CartExhaustedChoice) => void;
  canRequestReembed: boolean;
  /** Batch 732 (spec §11.5): the pieces chosen per block; an order for pieces all used up gets the same choices. */
  pieceTargets?: Record<string, string[]>;
}

const EMPTY: CartExhaustedChoice = { byCart: {}, reason: '' };

const ExhaustedBlockChoices: React.FC<ExhaustedBlockChoicesProps> = ({ specimens, selectedBlockIds, cart, choices, onChange, canRequestReembed, pieceTargets = {} }) => {
  const { t, i18n } = useTranslation();
  const reasons = useBenchReasons('BENCH_ADDON_EXHAUSTED');
  const none = t('exhaustedBlock.none');
  const optionLabel = (c: ExhaustedLineChoice, remains: WhatRemains): string => {
    if (c.kind === 'useSlide') return t('addOnOrder.exhausted.useSlide', { level: remains.unstained.find(s => s.id === c.slideId)?.level ?? '' });
    if (c.kind === 'otherBlock') return t('addOnOrder.exhausted.otherBlock', { block: remains.otherBlocks.find(b => b.id === c.blockId)?.label ?? '' });
    if (c.kind === 'otherPiece') { const p = remains.otherPieces.find(x => x.id === c.pieceId); return t('addOnOrder.exhausted.otherPiece', { position: p?.position ?? '', part: p?.partLabel ?? '' }); }
    return t('addOnOrder.exhausted.reembed');
  };

  const exhausted = specimens.flatMap(sp => (sp.blocks ?? []).filter(b => selectedBlockIds.includes(b.id) && onExhaustedTissue(b, pieceTargets[b.id])).map(b => ({ sp, b })));
  if (exhausted.length === 0) return null;

  return (
    <div className="ps-addon-exhausted">
      {exhausted.map(({ sp, b }) => {
        const remains = whatRemains(sp, b.id);
        if (!remains) return null;
        const choice = choices[b.id] ?? EMPTY;
        const checks = checkExhaustedLines(sp, b.id, cart, choicesForSubmit(cart.map(l => l.cartId), { [b.id]: choice }, reasons.textOf)[b.id]);
        return (
          <section key={b.id} className="ps-addon-exhausted-block" aria-label={t('exhaustedBlock.title', { block: remains.blockLabel })}>
            <p className="ps-addon-exhausted-title" role="status">
              <strong>{t(b.status === 'Exhausted' ? 'exhaustedBlock.title' : 'exhaustedBlock.piecesTitle', { block: remains.blockLabel })}</strong>{' '}
              {t('exhaustedBlock.remains', {
                unstained: remains.unstained.length ? formatList(remains.unstained.map(s => s.level), i18n.language) : none,
                blocks: remains.otherBlocks.length ? formatList(remains.otherBlocks.map(o => o.label), i18n.language) : none,
              })}
            </p>
            {cart.length === 0 && <p className="ps-addon-exhausted-note">{t('addOnOrder.exhausted.addLines')}</p>}
            <ul className="ps-addon-exhausted-lines">
              {cart.map((line, i) => {
                const check = checks[i];
                const options = lineChoiceOptions(remains, line, canRequestReembed);
                const id = `ps-addon-exhausted-${b.id}-${line.cartId}`;
                return (
                  <li key={line.cartId} className={`ps-addon-exhausted-line${check?.ok ? '' : ' ps-addon-exhausted-line--blocked'}`}>
                    <label htmlFor={id} className="ps-addon-exhausted-line-name">{line.stainType.name}</label>
                    <select id={id} className="ps-addon-field-input" value={encodeLineChoice(choice.byCart[line.cartId])}
                      onChange={e => onChange(b.id, { ...choice, byCart: { ...choice.byCart, [line.cartId]: decodeLineChoice(e.target.value) } })}>
                      <option value="">{t('addOnOrder.exhausted.choose')}</option>
                      {options.map(o => <option key={encodeLineChoice(o)} value={encodeLineChoice(o)}>{optionLabel(o, remains)}</option>)}
                    </select>
                    {check && !check.ok && (
                      <span className="ps-addon-exhausted-problem">
                        {t(`addOnOrder.exhausted.problem.${check.problem}`)}
                        {options.length === 0 && ` ${t('addOnOrder.exhausted.noAlternative')}`}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
            <label className="ps-addon-field-label" htmlFor={`ps-addon-exhausted-reason-${b.id}`}>
              {t('addOnOrder.exhausted.reason')}<span className="ps-conf-required"> *</span>
            </label>
            {/* Batch 736: the lab's reasons (Reason Dictionary), one tap; the box below is an optional note. */}
            <QuickReasonPicks category="BENCH_ADDON_EXHAUSTED" options={reasons.options}
              value={{ code: choice.pick?.code, label: choice.pick?.label, note: choice.reason }}
              onChange={next => onChange(b.id, { ...choice, pick: next.code && next.label ? { code: next.code, label: next.label } : undefined })} />
            <textarea id={`ps-addon-exhausted-reason-${b.id}`} className="ps-addon-field-textarea" rows={2} value={choice.reason}
              onChange={e => onChange(b.id, { ...choice, reason: e.target.value })} />
            <p className="ps-addon-exhausted-note">{t('addOnOrder.exhausted.controlsNote')}</p>
          </section>
        );
      })}
    </div>
  );
};

export default ExhaustedBlockChoices;
