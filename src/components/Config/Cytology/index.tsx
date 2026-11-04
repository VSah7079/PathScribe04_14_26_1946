// src/components/Config/Cytology/index.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Real, per direct guidance: "I want a new Configuration Subtab for
// Cytology." Consolidates every real Cytology admin screen — the
// three that already existed under System (Interpretation and
// Recommendations, QC Random Selection Rate, Cyto-Histologic
// Correlation) plus the six real, confirmed-missing cascade settings
// screens this same pass builds — into one, dedicated tab, rather
// than leaving Cytology config scattered across System's own,
// unrelated groups. Same real sidebar+content shell
// (Config/System/index.tsx's own `.ps-confsys-*` classes) for visual
// consistency, simplified to skip the group-tabs layer System uses —
// every section here already belongs to the same one real group.
// ─────────────────────────────────────────────────────────────────────────────

// i18n note: sidebar labels reuse existing exact-text keys where the
// wording matches another on-screen use of the same phrase
// (`cytologyCategoriesSection.title`, `configSearchIndex.entries
// .sys-non-gyn-cytology-categories.label`, `cytologyCategoriesSection
// .nomenclatureLabel`); the rest are shorter nav-only phrasings that
// don't exactly match their destination section's own (longer) title,
// so they got new keys under `cytologyTab.sections`.

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import '../../../pathscribe.css';
import { resetConfigScroll } from '../../../utils/resetConfigScroll';
import CytologyCategoriesSection from '../System/CytologyCategoriesSection';
import CytologyQcSettingsSection from '../System/CytologyQcSettingsSection';
import SnomedCervicalHistologySeverityMappingSection from '../System/SnomedCervicalHistologySeverityMappingSection';
import CytologyNomenclatureSettingsSection from './CytologyNomenclatureSettingsSection';
import CytologyRegistrySettingsSection from './CytologyRegistrySettingsSection';
import CytologyRoutingSettingsSection from './CytologyRoutingSettingsSection';
import CytologyScreeningStrategySection from './CytologyScreeningStrategySection';
import CytologyHistologyCorrelationSection from './CytologyHistologyCorrelationSection';
import CytologyWorkloadCapSettingsSection from './CytologyWorkloadCapSettingsSection';
import CytologyComplianceFeaturesSection from './CytologyComplianceFeaturesSection';
import CytologyInstrumentationSection from './CytologyInstrumentationSection';
import NonGynCytologyCategoriesSection from './NonGynCytologyCategoriesSection';
import ConfigSectionGate from '../ConfigSectionGate';
import { SECTIONS, type CytologyConfigSection } from './cytologySections';
import { useConfigNavigationGuard } from '../configDirtyGuardContext';
import { useRegisterConfigHelpSection } from '../help/ConfigHelpContext';

// Batch 431: the section list lives in ./cytologySections.ts (shared with the
// Configuration search).
export type { CytologyConfigSection } from './cytologySections';

const CytologyTab: React.FC = () => {
  // PS-128 (Batch 437): moving to another section asks first when something is unsaved.
  const guardNav = useConfigNavigationGuard();
  const { t } = useTranslation();
  const location = useLocation();
  const [active, setActive] = useState<CytologyConfigSection>(() => {
    const section = new URLSearchParams(location.search).get('section') as CytologyConfigSection | null;
    return section && SECTIONS.some(s => s.id === section) ? section : SECTIONS[0].id;
  });

  useRegisterConfigHelpSection(active); // Batch 646: the Help button opens this section of the Administrator Guide

  useEffect(() => {
    const section = new URLSearchParams(location.search).get('section') as CytologyConfigSection | null;
    if (section && SECTIONS.some(s => s.id === section)) { setActive(section); resetConfigScroll(); }
  }, [location.search]);

  const renderSection = () => {
    switch (active) {
      case 'cytology_categories': return <CytologyCategoriesSection />;
      case 'non_gyn_cytology_categories': return <NonGynCytologyCategoriesSection />;
      case 'cytology_nomenclature': return <CytologyNomenclatureSettingsSection />;
      case 'cytology_screening_strategy': return <CytologyScreeningStrategySection />;
      case 'cytology_routing': return <CytologyRoutingSettingsSection />;
      case 'cytology_registry': return <CytologyRegistrySettingsSection />;
      case 'cytology_qc_settings': return <CytologyQcSettingsSection />;
      case 'cytology_compliance_features': return <CytologyComplianceFeaturesSection />;
      case 'cytology_workload_cap': return <CytologyWorkloadCapSettingsSection />;
      case 'cytology_instrumentation': return <CytologyInstrumentationSection />;
      case 'snomed_histology_severity_mapping': return <SnomedCervicalHistologySeverityMappingSection />;
      case 'cytology_histology_correlation': return <CytologyHistologyCorrelationSection />;
      default: return null;
    }
  };

  return (
    <div className="ps-confsys-shell">
      <div className="ps-confsys-sidebar">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => guardNav(() => { setActive(s.id); resetConfigScroll(); })}
            className={`ps-confsys-nav-btn${active === s.id ? ' ps-confsys-nav-btn--active' : ''}`}
          >
            {s.emoji} {t(s.labelKey)}
          </button>
        ))}
      </div>
      <div className="ps-confsys-content">
        {/* Batch 429: view only for someone who can't change this section. */}
        <ConfigSectionGate key={active} section={active}>{renderSection()}</ConfigSectionGate>
      </div>
    </div>
  );
};

export default CytologyTab;
