// src/hooks/useCytologyQcCodeCategories.ts
// Batch 669f (cyt-6): the active cytology categories, which the Record Discrepancy window uses to judge
// whether the primary and secondary codes diverge significantly (services/cytologyQc/resolveQcCodeDivergence.ts).
import { useEffect, useState } from 'react';
import { cytologyCategoryService } from '@/services';
import type { CytologyCategoryEntry } from '@/services/cytology/ICytologyCategoryService';

export function useCytologyQcCodeCategories(): CytologyCategoryEntry[] {
  const [categories, setCategories] = useState<CytologyCategoryEntry[]>([]);
  useEffect(() => {
    let live = true;
    void cytologyCategoryService.getActive().then(r => { if (live && r.ok) setCategories(r.data); });
    return () => { live = false; };
  }, []);
  return categories;
}
