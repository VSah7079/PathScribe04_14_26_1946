// src/services/cytology/cytologyTemplateLibraryDeps.ts
// Batch 519 (PS-273): the Synoptic Library, as the Cytology template registry reads it
// (cytologySynopticTemplateRegistry.ts). Kept apart so the registry stays testable without the template service.
import { getTemplateCached, listTemplatesCached } from '@/services/templates/templateService';
import { refreshCytologySynopticTemplates, type CytologyTemplateLibraryDeps } from './cytologySynopticTemplateRegistry';

export const cytologyTemplateLibraryDeps: CytologyTemplateLibraryDeps = {
  listProtocols: () => listTemplatesCached(),
  getTemplate: id => getTemplateCached(id).then(d => d.template),
};

/** Reads the Synoptic Library's cytology protocols for the Cytology screens; resolves with the picker's choices. */
export const refreshCytologySynopticLibrary = () => refreshCytologySynopticTemplates(cytologyTemplateLibraryDeps);
