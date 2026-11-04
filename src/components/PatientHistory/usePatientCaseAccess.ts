// src/components/PatientHistory/usePatientCaseAccess.ts
// Batch 613: loads what the "patient's other cases" notice shows for one patient and case, and reloads it after
// an action. The decisions are in services/patientCaseAccess; this only fetches and holds the result.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getPatientCaseAccess, type PatientCaseAccessState } from '@/services/patientCaseAccess/patientCaseAccessService';
import type { AccessUser } from '@/services/patientCaseAccess/patientCaseAccessRules';

export function usePatientCaseAccess(patientId: string, caseId: string) {
  const { user } = useAuth();
  const [state, setState] = useState<PatientCaseAccessState | null>(null);
  const [version, setVersion] = useState(0);
  const accessUser = useMemo<AccessUser | null>(
    () => (user ? { id: user.id, name: user.name, role: user.role, organisationId: user.organisationId } : null),
    [user],
  );

  useEffect(() => {
    if (!accessUser || !patientId) { setState(null); return; }
    let live = true;
    getPatientCaseAccess().getState(patientId, caseId, accessUser)
      .then(s => { if (live) setState(s); })
      .catch(() => { if (live) setState(null); });
    return () => { live = false; };
  }, [accessUser, patientId, caseId, version]);

  const refresh = useCallback(() => setVersion(v => v + 1), []);
  return { state, user: accessUser, refresh };
}
