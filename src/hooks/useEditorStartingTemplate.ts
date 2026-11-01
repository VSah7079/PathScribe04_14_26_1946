// src/hooks/useEditorStartingTemplate.ts
// The synoptic editor's starting template: a blank one, the protocol opened for editing, or a copy (Duplicate / New
// Version) of it. Moved out of SynopticEditor.tsx unchanged in Batch 755a (PS-497 split-on-touch), which added the copy
// refusal: a demonstration checklist is never the source of a copy (services/templates/demoChecklists.ts), so the
// editor shows why instead of opening one. templateService.saveDraft refuses such a copy as well.
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { EditorTemplate } from '@/components/Config/Protocols/SynopticEditor';
import { PROTOCOL_REGISTRY, type Protocol } from '@/components/Config/Protocols/protocolShared';
import { getTemplate } from '@/services/templates/templateService';
import { prepareProtocolCopy, type ProtocolCopyKind } from '@/services/templates/protocolLifecycle';
import { checklistCopyRefusal, type ChecklistCopyRefusal } from '@/services/templates/demoChecklists';

export interface EditorStartingTemplateDeps {
  blankTemplate: () => EditorTemplate;
  blankSection: () => EditorTemplate['sections'][number];
  newId: () => string;
}

export function useEditorStartingTemplate(templateId: string | undefined, isNew: boolean, copyKind: ProtocolCopyKind | null, deps: EditorStartingTemplateDeps) {
  const { t } = useTranslation();
  const copyRefused: ChecklistCopyRefusal | null = copyKind ? checklistCopyRefusal(templateId) : null;
  const [template, setTemplate]               = useState<EditorTemplate>(deps.blankTemplate);
  const [templateLoading, setTemplateLoading] = useState(!isNew && !copyRefused);
  const [registryEntry, setRegistryEntry]     = useState<Protocol | null>(null);

  React.useEffect(() => {
    if (isNew || !templateId || copyRefused) return;
    setTemplateLoading(true);
    // A copy is a new protocol: the source's review state/notes don't apply to it.
    const entry = copyKind ? null : PROTOCOL_REGISTRY.find(p => p.id === templateId) ?? null;
    setRegistryEntry(entry);
    // Duplicate / New Version: the editor opens a COPY with a new id; the
    // source is never edited. What changes on the copy (name, version,
    // lineage) is decided in services/templates/protocolLifecycle.ts.
    const asCopy = (loaded: EditorTemplate) =>
      copyKind ? prepareProtocolCopy(loaded, copyKind, { copyName: name => t('common.copyOfName', { name }), newId: deps.newId }) : loaded;
    getTemplate(templateId)
      .then(detail => setTemplate(asCopy(detail.template)))
      .catch(() => {
        const source = PROTOCOL_REGISTRY.find(p => p.id === templateId);
        if (source) {
          setTemplate(asCopy({ id: source.id, name: source.name, source: source.source, version: source.version, category: source.category, sections: [deps.blankSection()] }));
        }
      })
      .finally(() => setTemplateLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId, isNew, copyKind]);

  /** The source's name, for the refusal message. */
  const sourceName = copyRefused ? PROTOCOL_REGISTRY.find(p => p.id === templateId)?.name ?? templateId ?? '' : '';
  return { template, setTemplate, templateLoading, registryEntry, copyRefused, sourceName };
}
