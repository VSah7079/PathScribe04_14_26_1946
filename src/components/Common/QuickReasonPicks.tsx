// src/components/Common/QuickReasonPicks.tsx
// Touch spec T3 (Batch 735); Batch 736 (Pete): the bench's preset reasons as one-tap chips, read from the Reason
// Dictionary so each lab words them its own way (Configuration → System → Bench Reasons). Tapping a reason chooses
// it (tapping it again clears it); the reason box beside it stays a free-text note, optional. The chosen reason's
// code goes with the record (services/reasons/benchReasons.ts).
import { useTranslation } from 'react-i18next';
import type { BenchReasonCategory, BenchReasonChoice } from '@/services/reasons/benchReasons';
import type { BenchReasonOption } from '@/hooks/useBenchReasons';
import './QuickReasonPicks.css';

export interface QuickReasonPicksProps {
  category: BenchReasonCategory;
  /** The category's reasons (useBenchReasons). */
  options: readonly BenchReasonOption[];
  value: BenchReasonChoice;
  onChange: (next: BenchReasonChoice) => void;
  disabled?: boolean;
}

export function QuickReasonPicks({ category, options, value, onChange, disabled }: QuickReasonPicksProps) {
  const { t } = useTranslation();
  if (options.length === 0) return null;
  return (
    <div className="ps-quick-reasons" role="radiogroup" aria-label={t('quickReasons.label')} data-reason-category={category}>
      {options.map(o => {
        const chosen = value.code === o.code;
        return (
          <button key={o.code} type="button" role="radio" aria-checked={chosen}
            className={`ps-quick-reason${chosen ? ' ps-quick-reason--chosen' : ''}`} disabled={disabled}
            onClick={() => onChange(chosen ? { note: value.note } : { code: o.code, label: o.label, note: value.note })}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export default QuickReasonPicks;
