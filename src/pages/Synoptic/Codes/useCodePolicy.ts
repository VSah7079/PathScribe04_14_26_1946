// Batch 607 (#137, #182): the code-system policy for the case's jurisdiction, loaded for the Add Code window.
import { useEffect, useState } from 'react';
import { codeSystemPolicyService } from '@/services';
import { getCurrentJurisdiction } from '@/services/retentionPolicy/RetentionPolicy';
import { isoDayOf } from '@/services/coding/codePolicyEnforcement';
import { defaultCodePolicy, type CodeSystemPolicy } from '@/services/coding/codeSystemPolicy';
import type { Jurisdiction } from '@/types/systemConfig';

/** The policy in force (the default until it loads) and today's date. */
export function useCodePolicy(jurisdiction?: Jurisdiction): { policy: CodeSystemPolicy; today: string; jurisdiction: Jurisdiction } {
  const j = jurisdiction ?? getCurrentJurisdiction();
  const [policy, setPolicy] = useState<CodeSystemPolicy>(() => defaultCodePolicy(j));
  useEffect(() => {
    let live = true;
    // Batch 614: a screen whose tests do not provide the policy service keeps the default policy.
    try {
      codeSystemPolicyService.policyFor(j).then(p => { if (live) setPolicy(p); }).catch(() => undefined);
    } catch { /* default policy stays */ }
    return () => { live = false; };
  }, [j]);
  return { policy, today: isoDayOf(new Date()), jurisdiction: j };
}
