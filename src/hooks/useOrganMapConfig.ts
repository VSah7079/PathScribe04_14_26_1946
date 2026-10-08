// src/hooks/useOrganMapConfig.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 461: Configuration → Organ maps. Loads the stored colour layers and
// question bindings, the facilities (and their jurisdictions) and the
// synoptic templates; saves through services/organMapping/organMapConfig
// (each save checks its capability, validates and audits). Orchestration
// only: the edits themselves are pure functions in organMapConfigDraft.ts.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import { facilityService } from '@/services';
import { browserOrganMapConfigStore, saveOrganMapBinding, saveOrganMapSchemeLayer, type OrganMapSchemeScope } from '@/services/organMapping/organMapConfig';
import { organMapConfigDeps } from '@/services/organMapping/organMapLive';
import type { OrganMapSchemeLayers, PartialScheme } from '@/services/organMapping/organMapScheme';
import type { OrganMapBinding } from '@/services/organMapping/organMapBindings';
import { getTemplateCached, listTemplatesCached } from '@/services/templates/templateService';

export interface OrganMapConfigFacility { id: string; name: string; jurisdiction?: string }
export interface OrganMapConfigTemplate { id: string; name: string }

export function useOrganMapConfig(userName: string) {
  const [layers, setLayers] = useState<OrganMapSchemeLayers>({});
  const [bindings, setBindings] = useState<Record<string, OrganMapBinding>>({});
  const [facilities, setFacilities] = useState<OrganMapConfigFacility[]>([]);
  const [templates, setTemplates] = useState<OrganMapConfigTemplate[]>([]);
  /** True once the stored settings have been read (the editors start from them). */
  const [loaded, setLoaded] = useState(false);

  const reloadStored = useCallback(() => {
    setLayers(browserOrganMapConfigStore.getLayers());
    setBindings(browserOrganMapConfigStore.getBindings());
    setLoaded(true);
  }, []);

  useEffect(() => {
    reloadStored();
    void facilityService.getAll().then(r => {
      if (r.ok) setFacilities(r.data.map(f => ({ id: f.id, name: f.name, jurisdiction: (f as { jurisdiction?: string }).jurisdiction })));
    });
    void listTemplatesCached().then(list => setTemplates(list.map(p => ({ id: p.id, name: p.name })).sort((a, b) => a.name.localeCompare(b.name))));
  }, [reloadStored]);

  const saveLayer = useCallback(async (scope: OrganMapSchemeScope, layer: PartialScheme | null) => {
    // Batch 465: a facility's layer is validated against what it inherits, its jurisdiction's included.
    const facilityJurisdiction = scope.kind === 'facility' ? facilities.find(f => f.id === scope.facilityId)?.jurisdiction ?? null : null;
    // Batch 465b: every facility's jurisdiction, so the save can say which layers' rules now conflict.
    const facilityJurisdictions = Object.fromEntries(facilities.map(f => [f.id, f.jurisdiction ?? null]));
    const r = await saveOrganMapSchemeLayer({ scope, layer, facilityJurisdiction, facilityJurisdictions }, organMapConfigDeps(userName));
    if (r.ok) reloadStored();
    return r;
  }, [userName, reloadStored, facilities]);

  const loadTemplate = useCallback(async (templateId: string) => {
    const detail = await getTemplateCached(templateId).catch(() => null);
    return detail?.template ?? null;
  }, []);

  const saveBinding = useCallback(async (template: Parameters<typeof saveOrganMapBinding>[0]['template'], binding: OrganMapBinding | null) => {
    const r = await saveOrganMapBinding({ template, binding }, organMapConfigDeps(userName));
    if (r.ok) reloadStored();
    return r;
  }, [userName, reloadStored]);

  return { loaded, layers, bindings, facilities, templates, saveLayer, loadTemplate, saveBinding };
}
