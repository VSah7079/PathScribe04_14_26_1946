// src/components/ValidationStudies/validationSubTabs.ts
// Batch 646: moved out of ValidationStudiesSection.tsx (CLAUDE.md rule 10) with no change in behaviour.
// The text key for each Validation sub-tab's label.
import type { VALIDATION_SECTIONS } from '@/constants/configSearchIndex';

type SubTab = (typeof VALIDATION_SECTIONS)[number]['id'];

export const SUBTAB_LABEL_KEY: Record<SubTab, string> = {
  studies:   'validationStudies.tabs.studies',
  dashboard: 'validationStudies.tabs.dashboard',
  reports:   'validationStudies.tabs.reports',
};
