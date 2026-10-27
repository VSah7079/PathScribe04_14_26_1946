// src/pages/SynopticReportPage/hooks/useCollaboratorCommand.ts
// Batch 664: "Add Collaborator [name]" by voice or key on the report screen. The decisions are services/cases/collaboratorCommand.ts;
// the save is saveCaseTeam (checks case:team:manage, the cytotech rule, and refuses to overwrite a newer team). This hook only
// listens, looks the staff up, saves and reports the outcome in a toast.
import { useEffect, useRef } from 'react';
import { actionRegistryService, saveCaseTeam, caseTeamSaveDeps, messageService } from '@/services';
import { isModalOpen } from '@/utils/modalFocus';
import type { Case } from '@/types/case/Case';
import { phrasesOf } from '@/services/voice/spokenAfterCommand';
import {
  ADD_COLLABORATOR_EVENT, ADD_COLLABORATOR_ACTION_ID, collaboratorCommandAllowed, collaboratorNotice, matchCollaborator, spokenName, withCollaborator,
} from '@/services/cases/collaboratorCommand';

export interface CollaboratorCommandInput {
  caseData: Case | null;
  userId: string | undefined;
  userName: string | undefined;
  /** Shows a toast from a translation key under synopticReportPage.toast. */
  notify: (key: string, params: Record<string, string>, kind?: 'success' | 'warning' | 'error') => void;
  onSaved: (updated: Case, version: number) => void;
}

export function useCollaboratorCommand(input: CollaboratorCommandInput): void {
  const latest = useRef(input);
  latest.current = input;
  useEffect(() => {
    const onCommand = async (e: Event) => {
      const i = latest.current;
      if (!i.caseData || !collaboratorCommandAllowed({ caseLoaded: true, modalOpen: isModalOpen() })) return;
      const transcript = String((e as CustomEvent<{ transcript?: unknown }>).detail?.transcript ?? '');
      const spoken = spokenName(transcript, phrasesOf(actionRegistryService.getActionById(ADD_COLLABORATOR_ACTION_ID as never)));
      const staff = await caseTeamSaveDeps.listStaff() as unknown as Parameters<typeof matchCollaborator>[1];
      const found = matchCollaborator(spoken, staff);
      if (found.kind === 'noName') return i.notify('synopticReportPage.toast.collaboratorNoName', {}, 'warning');
      if (found.kind === 'none') return i.notify('synopticReportPage.toast.collaboratorNotFound', { name: found.spoken }, 'warning');
      if (found.kind === 'ambiguous') return i.notify('synopticReportPage.toast.collaboratorAmbiguous', { name: found.spoken }, 'warning');
      const name = `${found.staff.firstName} ${found.staff.lastName}`;
      const added = withCollaborator(i.caseData.participants ?? [], found.staff, i.userId ?? 'unknown', new Date().toISOString());
      if (added.kind === 'already') return i.notify('synopticReportPage.toast.collaboratorAlready', { name });
      const res = await saveCaseTeam({ caseData: i.caseData, participants: added.participants, updatedBy: i.userId ?? 'unknown' }, caseTeamSaveDeps);
      if (res.ok === true) {
        i.onSaved({ ...i.caseData, ...res.updates }, res.version);
        // Batch 665: the new collaborator is told (an app notice, not a message the person wrote). A failed message never undoes the add.
        const sent = await messageService.send(collaboratorNotice({
          caseId: i.caseData.id, caseLabel: i.caseData.accession?.fullAccession ?? i.caseData.accession?.accessionNumber,
          from: { id: i.userId ?? 'unknown', name: i.userName ?? i.userId ?? 'unknown' }, to: { id: found.staff.id, name }, at: new Date(),
        })).catch(() => null);
        return sent?.ok === true ? i.notify('synopticReportPage.toast.collaboratorAdded', { name }, 'success')
          : i.notify('synopticReportPage.toast.collaboratorAddedNoMessage', { name }, 'warning');
      }
      const key = res.reason === 'notPermitted' ? 'collaboratorNotPermitted'
        : res.reason === 'cytotechPathologistType' ? 'collaboratorCytotech' : 'collaboratorNotSaved';
      i.notify(`synopticReportPage.toast.${key}`, { name }, 'warning');
    };
    window.addEventListener(ADD_COLLABORATOR_EVENT, onCommand);
    return () => window.removeEventListener(ADD_COLLABORATOR_EVENT, onCommand);
  }, []);
}
