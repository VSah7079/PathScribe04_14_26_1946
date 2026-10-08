// src/components/TemplateBuilder/ReportTemplatesSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Wrapper rendered by ConfigurationPage when the "Report Templates" top-level
// tab is active.  Exposes a pill-style sub-tab toggle so that Part Library
// lives inside Report Templates rather than as a separate top-level tab.
//
// i18n note: "Report Templates"/"Part Library" reuse
// `templateListTab.title`/`templateAssemblyPage.partLibraryTitle`
// (exact-text matches — each sub-tab's own on-screen page heading).
// "Routing Rules" does NOT reuse `routingRulesTab.header.title`
// ("Template Routing Rules") — that full page heading is worded
// differently from this shorter pill label, so a new key was added
// instead, per the established precedent that a short nav label and
// a fuller page title are separate strings even when related.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import { TEMPLATE_SECTIONS } from '@/constants/configSearchIndex';
import { pickConfigSection } from '@/utils/configSectionParam';
import TemplateListTab  from './TemplateListTab';
import PartLibraryTab   from './PartLibraryTab';
import RoutingRulesTab  from './RoutingRulesTab';

type SubTab = (typeof TEMPLATE_SECTIONS)[number]['id'];
const SUBTAB_IDS = TEMPLATE_SECTIONS.map(s => s.id);

const ReportTemplatesSection: React.FC = () => {
  const { t } = useTranslation();
  // Batch 449: Configuration search can open an inner tab directly (?section=).
  const location = useLocation();
  const [subTab, setSubTab] = useState<SubTab>(() => pickConfigSection(location.search, SUBTAB_IDS));
  useEffect(() => { setSubTab(pickConfigSection(location.search, SUBTAB_IDS)); }, [location.search]);

  return (
    <div className="ps-rts-root">

      {/* ── Sub-tab pill toggle ── */}
      <div className="ps-rts-subtabs">
        <button
          onClick={() => setSubTab('templates')}
          className={`ps-sub-tab-btn${subTab === 'templates' ? ' active' : ''}`}
        >
          {t('templateListTab.title')}
        </button>
        <button
          onClick={() => setSubTab('parts')}
          className={`ps-sub-tab-btn${subTab === 'parts' ? ' active' : ''}`}
        >
          {t('templateAssemblyPage.partLibraryTitle')}
        </button>
        <button
          onClick={() => setSubTab('routing')}
          className={`ps-sub-tab-btn${subTab === 'routing' ? ' active' : ''}`}
        >
          {t('reportTemplatesSection.subtabs.routingRules')}
        </button>
      </div>

      {/* ── Content ── */}
      <div className="ps-rts-content">
        {subTab === 'templates' ? <TemplateListTab /> : subTab === 'parts' ? <PartLibraryTab /> : <RoutingRulesTab />}
      </div>

    </div>
  );
};


export default ReportTemplatesSection;
