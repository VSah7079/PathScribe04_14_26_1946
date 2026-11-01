// src/hooks/useBenchReasons.ts
// Batch 736: the active bench reasons of a category from the Reason Dictionary (the lab's words and order), with
// the text each shows (services/reasons/benchReasons.ts), and the join for a reason plus a note in this language.
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { reasonDictionaryService } from '@/services/reasons/reasonDictionaryServiceInstance';
import { activeBenchReasons, benchReasonLabel, benchReasonText, type BenchReasonCategory, type BenchReasonChoice } from '@/services/reasons/benchReasons';

export interface BenchReasonOption { code: string; label: string }

export function useBenchReasons(category: BenchReasonCategory): { options: BenchReasonOption[]; textOf: (choice: BenchReasonChoice) => string } {
  const { t } = useTranslation();
  const [options, setOptions] = useState<BenchReasonOption[]>([]);
  useEffect(() => {
    let cancelled = false;
    void reasonDictionaryService.getAll(category).then(r => {
      if (cancelled || !r.ok) return;
      setOptions(activeBenchReasons(r.data).map(e => ({ code: e.id, label: benchReasonLabel(e, k => t(k)) })));
    });
    return () => { cancelled = true; };
  }, [category, t]);
  const textOf = useCallback((choice: BenchReasonChoice) => benchReasonText(choice, (reason, note) => t('quickReasons.withNote', { reason, note })), [t]);
  return { options, textOf };
}
