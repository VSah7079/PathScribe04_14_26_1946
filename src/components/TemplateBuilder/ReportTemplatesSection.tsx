// src/components/TemplateBuilder/ReportTemplatesSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Wrapper rendered by ConfigurationPage when the "Report Templates" top-level
// tab is active.  Exposes a pill-style sub-tab toggle so that Part Library
// lives inside Report Templates rather than as a separate top-level tab.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import TemplateListTab  from './TemplateListTab';
import PartLibraryTab   from './PartLibraryTab';
import RoutingRulesTab  from './RoutingRulesTab';

type SubTab = 'templates' | 'parts' | 'routing';

const ReportTemplatesSection: React.FC = () => {
  const [subTab, setSubTab] = useState<SubTab>('templates');

  return (
    <div className="ps-rts-root">

      {/* ── Sub-tab pill toggle ── */}
      <div className="ps-rts-subtabs">
        <button
          onClick={() => setSubTab('templates')}
          className={`ps-sub-tab-btn${subTab === 'templates' ? ' active' : ''}`}
        >
          Report Templates
        </button>
        <button
          onClick={() => setSubTab('parts')}
          className={`ps-sub-tab-btn${subTab === 'parts' ? ' active' : ''}`}
        >
          Part Library
        </button>
        <button
          onClick={() => setSubTab('routing')}
          className={`ps-sub-tab-btn${subTab === 'routing' ? ' active' : ''}`}
        >
          Routing Rules
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
