// src/hooks/usePatientRegistryDetailsEditor.ts
// Batch 425: the patient details editor after accessioning (national identifiers, registry opt-outs).
// Loads the case's patient and saves through services/patients/patientRegistryDetails.ts.
import { useCallback, useEffect, useState } from 'react';
import { caseRegistryDetails, saveCaseRegistryDetails, type CaseRegistryDetails } from '@/services/patients/patientRegistryDetails';
import { recordNationalPatientIdentifier } from '@/services/patientIdentifiers/recordNationalPatientIdentifier';
import { recordNationalPatientIdentifierDeps } from '@/services/patientIdentifiers/recordNationalPatientIdentifierDeps';
import { recordPatientRegistryConsent } from '@/services/registryConsent/recordPatientRegistryConsent';
import { recordPatientRegistryConsentDeps } from '@/services/registryConsent/recordPatientRegistryConsentDeps';

export function usePatientRegistryDetailsEditor(caseId: string | null, user: { id: string; name: string } | null | undefined) {
  const [before, setBefore] = useState<CaseRegistryDetails | null>(null);
  const [draft, setDraft] = useState<CaseRegistryDetails | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setBefore(null); setDraft(null);
    if (!caseId) return;
    recordNationalPatientIdentifierDeps.getCase(caseId).then(c => {
      if (cancelled || !c) return;
      const d = caseRegistryDetails(c.patient);
      setBefore(d); setDraft(d);
    });
    return () => { cancelled = true; };
  }, [caseId]);

  const save = useCallback(async () => {
    if (!caseId || !before || !draft) return null;
    setSaving(true);
    const who = { id: user?.id ?? '', name: user?.name ?? '' };
    try {
      return await saveCaseRegistryDetails({ caseId, before, after: draft }, {
        recordIdentifier: input => recordNationalPatientIdentifier(input, who, recordNationalPatientIdentifierDeps),
        recordConsent: input => recordPatientRegistryConsent(input, who, recordPatientRegistryConsentDeps),
      });
    } finally { setSaving(false); }
  }, [caseId, before, draft, user]);

  return { loaded: !!draft, draft, setDraft, saving, save };
}
