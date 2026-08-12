// src/components/Config/Integrations/index.tsx
// ─────────────────────────────────────────────────────────────────────────────
// New top-level config tab, per direct request: consolidates the real
// interoperability-related sections that were scattered in
// System/index.tsx's flat "Independent" group (LIS Integration,
// Identifier Formats, Terminology Services) into their own major
// configuration tab, alongside the new HL7 Crosswalk admin UI. RVU Code
// Map deliberately stays in System — it's billing/coding rules, not
// external-system connectivity, a real, different concern.
//
// Same sidebar + section-router structure as System/index.tsx,
// deliberately not reinvented.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import '../../../pathscribe.css';
import LISSection from './LISSection';
import IdentifierFormatsSection from './IdentifierFormatsSection';
import TerminologyServicesSection from '../Terminology/TerminologyServicesSection';
import CrosswalkSection from './CrosswalkSection';

type IntegrationsSection =
  | 'lis'
  | 'identifiers'
  | 'terminology'
  | 'crosswalk';

const SECTIONS: { id: IntegrationsSection; emoji: string; label: string }[] = [
  { id: 'lis',          emoji: '🔗', label: 'LIS Integration' },
  { id: 'crosswalk',    emoji: '🧩', label: 'Specimen Code Map' },
  { id: 'identifiers',  emoji: '🔍', label: 'Identifier Formats' },
  { id: 'terminology',  emoji: '🔌', label: 'Terminology Services' },
];

const IntegrationsTab: React.FC = () => {
  const location = useLocation();
  const [active, setActive] = useState<IntegrationsSection>(() => {
    const section = new URLSearchParams(location.search).get('section') as IntegrationsSection | null;
    return section && SECTIONS.some(s => s.id === section) ? section : SECTIONS[0].id;
  });

  useEffect(() => {
    const section = new URLSearchParams(location.search).get('section') as IntegrationsSection | null;
    if (section && SECTIONS.some(s => s.id === section)) setActive(section);
  }, [location.search]);

  const renderSection = () => {
    switch (active) {
      case 'lis':         return <LISSection />;
      case 'crosswalk':   return <CrosswalkSection />;
      case 'identifiers': return <IdentifierFormatsSection />;
      case 'terminology': return <TerminologyServicesSection isSuperAdmin={true} />;
      default:            return null;
    }
  };

  return (
    <div className="ps-confsys-shell">
      <div className="ps-confsys-sidebar">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setActive(s.id)}
            className={`ps-confsys-nav-btn${active === s.id ? ' ps-confsys-nav-btn--active' : ''}`}
          >
            {s.emoji} {s.label}
          </button>
        ))}
      </div>
      <div className="ps-confsys-content">
        {renderSection()}
      </div>
    </div>
  );
};

export default IntegrationsTab;
