import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import '../../../pathscribe.css';
import FlagConfigPage            from './FlagConfigPage';
import SpecimenDictionarySection from './SpecimenDictionarySection';
import StainDictionarySection from './StainDictionarySection';
import ProtocolDictionarySection from './ProtocolDictionarySection';
import GrossingRouteOverridesSection from './GrossingRouteOverridesSection';
import SpecimenCategoriesSection from './SpecimenCategoriesSection';
import ContainerTypesSection from './ContainerTypesSection';
import SubspecialtiesSection     from './SubspecialtiesSection';
import FontsSection              from './FontsSection';
import DocumentStyleSection      from './DocumentStyleSection';
import RetentionSection          from './RetentionSection';
import { ClientDictionaryPage }  from '../../../pages/system/ClientDictionaryPage';
import PhysiciansSection         from './PhysiciansSection'; 
import DeficienciesSection       from './DeficienciesSection';
import GoverningBodiesSection    from './GoverningBodiesSection';
import DelegationTypeSection     from './DelegationTypeSection';
import RvuCodeMapSection         from './RvuCodeMapSection';
import ParticipationTypesSection from './ParticipationTypesSection';
import CasePoolAssignmentSection from './CasePoolAssignmentSection';
import RoutingRulesSection       from './RoutingRulesSection';
import SessionSecuritySection    from './SessionSecuritySection';
import ContributionSettingsSection from './ContributionSettingsSection';
import ExternalResourcesSection  from './ExternalResourcesSection';
import ResearchFeedSection      from './ResearchFeedSection';

// ── Section registry ──────────────────────────────────────────────────────────

type SystemSection =
  | 'flags'
  | 'subspecialties'
  | 'specimens'
  | 'stains'
  | 'specimen_categories'
  | 'container_types'
  | 'fonts'
  | 'document_style'
  | 'retention'
  | 'session_security'
  | 'contribution_settings'
  | 'external_resources'
  | 'research_feed'
  | 'clients'
  | 'physicians'
  | 'protocols'
  | 'grossing_route_overrides'
  | 'deficiencies'
  | 'governing_bodies'
  | 'delegation_types'
  | 'rvu_code_map'
  | 'participation_types'
  | 'case_routing'
  | 'routing_rules';

// Alphabetical by label
// Grouped by verified dependency, not alphabetized. Group boundaries reflect
// real code relationships checked before this reorganization — several
// initially-plausible edges (Container Types, Stain Dictionary, Specimen
// Deficiencies, Case Routing, Delegation Types, Participation Types) turned
// out to have no actual field-level dependency anywhere in the codebase, so
// they stay in the independent group rather than being force-fit into a
// dependency story that doesn't hold up. Within a group, order is alphabetical
// since there's no real ordering constraint there — only kept alphabetical
// where it was already true, not applied as a fallback everywhere.
const SECTIONS: { id: SystemSection; emoji: string; label: string; group: string }[] = [
  // ── Foundational / independent — no confirmed dependency in either direction ──
  { id: 'fonts',               emoji: '🔤', label: 'Approved Fonts'        , group: 'Independent' },
  { id: 'document_style',      emoji: '🖋', label: 'Document Style'        , group: 'Independent' },
  { id: 'case_routing',        emoji: '🔀', label: 'Case Routing'          , group: 'Independent' },
  { id: 'container_types',     emoji: '🧪', label: 'Container Types'       , group: 'Independent' },
  { id: 'retention',           emoji: '🗄️', label: 'Data Retention'        , group: 'Independent' },
  { id: 'delegation_types',    emoji: '🔀', label: 'Delegation Types'      , group: 'Independent' },
  { id: 'flags',               emoji: '🚩', label: 'Flags'                 , group: 'Independent' },
  { id: 'participation_types', emoji: '👥', label: 'Participation Types'   , group: 'Independent' },
  { id: 'protocols',           emoji: '🧬', label: 'Protocol Dictionary'   , group: 'Independent' },
  { id: 'deficiencies',        emoji: '⚠️', label: 'Specimen Deficiencies' , group: 'Independent' },
  { id: 'stains',              emoji: '🧪', label: 'Stain Dictionary'      , group: 'Independent' },
  { id: 'session_security',    emoji: '🔒', label: 'Session Security'      , group: 'Independent' },
  { id: 'contribution_settings', emoji: '📊', label: 'Contribution Dashboard' , group: 'Independent' },
  { id: 'external_resources',  emoji: '🌐', label: 'External Resources'    , group: 'Independent' },
  { id: 'research_feed',       emoji: '📰', label: 'Research Feed'         , group: 'Independent' },
  { id: 'rvu_code_map',        emoji: '💲', label: 'RVU Code Map'          , group: 'Independent' },

  // ── Reference data — real dependents exist below, set these up first ──
  { id: 'clients',             emoji: '🏥', label: 'Facility Configuration' , group: 'Reference Data (set up first)' },
  { id: 'governing_bodies',    emoji: '📋', label: 'Governing Bodies'      , group: 'Reference Data (set up first)' },
  { id: 'specimen_categories', emoji: '🗂️', label: 'Specimen Categories'   , group: 'Reference Data (set up first)' },
  { id: 'subspecialties',      emoji: '🩺', label: 'Subspecialties'        , group: 'Reference Data (set up first)' },

  // ── Dependent settings — each references a real field from a group above ──
  { id: 'grossing_route_overrides', emoji: '🔀', label: 'Grossing Route Overrides — uses Facility Configuration' , group: 'Depends on reference data above' },
  { id: 'physicians',          emoji: '🩻', label: 'Physicians — uses Facility Configuration'                    , group: 'Depends on reference data above' },
  { id: 'routing_rules',       emoji: '📋', label: 'Routing Rules — uses Subspecialties'                    , group: 'Depends on reference data above' },
  { id: 'specimens',           emoji: '🔬', label: 'Specimen Dictionary — uses Specimen Categories'         , group: 'Depends on reference data above' },
];

// ── Main component ────────────────────────────────────────────────────────────

const SystemTab: React.FC = () => {
  const location = useLocation();
  const [active, setActive] = useState<SystemSection>(() => {
    const section = new URLSearchParams(location.search).get('section') as SystemSection | null;
    return section && SECTIONS.some(s => s.id === section) ? section : SECTIONS[0].id;
  });

  // Re-activate if URL changes (e.g. deep-link navigation)
  useEffect(() => {
    const section = new URLSearchParams(location.search).get('section') as SystemSection | null;
    if (section && SECTIONS.some(s => s.id === section)) setActive(section);
  }, [location.search]);

  const renderSection = () => {
    switch (active) {
      case 'flags':               return <FlagConfigPage />;
      case 'subspecialties':      return <SubspecialtiesSection />;
      case 'specimens':           return <SpecimenDictionarySection />;
      case 'stains':              return <StainDictionarySection />;
      case 'protocols':           return <ProtocolDictionarySection />;
      case 'grossing_route_overrides': return <GrossingRouteOverridesSection />;
      case 'specimen_categories': return <SpecimenCategoriesSection />;
      case 'container_types': return <ContainerTypesSection />;
      case 'fonts':               return <FontsSection />;
      case 'document_style':      return <DocumentStyleSection />;
      case 'retention':           return <RetentionSection />;
      case 'clients':             return <ClientDictionaryPage />;
      case 'governing_bodies':    return <GoverningBodiesSection isSuperAdmin={true} />;
      case 'delegation_types':    return <DelegationTypeSection />;
      case 'rvu_code_map':        return <RvuCodeMapSection />;
      case 'participation_types': return <ParticipationTypesSection />;
      case 'physicians':          return <PhysiciansSection />;
      case 'deficiencies':        return <DeficienciesSection />;
      case 'case_routing':        return <CasePoolAssignmentSection />;
      case 'routing_rules':       return <RoutingRulesSection />;
      case 'session_security':    return <SessionSecuritySection />;
      case 'contribution_settings': return <ContributionSettingsSection />;
      case 'external_resources':  return <ExternalResourcesSection />;
      case 'research_feed':       return <ResearchFeedSection />;
      default:                    return null;
    }
  };

  // ── Voice sub-navigation ───────────────────────────────────────────────────
  React.useEffect(() => {
    const handler = (e: CustomEvent) => {
      const section = e.detail?.section as SystemSection;
      if (section) setActive(section);
    };
    window.addEventListener('PATHSCRIBE_SYSTEM_NAVIGATE', handler as EventListener);
    return () => window.removeEventListener('PATHSCRIBE_SYSTEM_NAVIGATE', handler as EventListener);
  }, []);

  return (
    <div className="ps-confsys-shell">

      {/* ── Sidebar nav — sticky, own scroll if the list itself is tall ── */}
      <div className="ps-confsys-sidebar">
        {SECTIONS.map((s, i) => (
          <React.Fragment key={s.id}>
            {(i === 0 || SECTIONS[i - 1].group !== s.group) && (
              <div className="ps-confsys-nav-group-header">{s.group}</div>
            )}
            <button
              onClick={() => setActive(s.id)}
              className={`ps-confsys-nav-btn${active === s.id ? ' ps-confsys-nav-btn--active' : ''}`}
            >
              {s.emoji} {s.label}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* ── Section content ── */}
      <div className="ps-confsys-content">
        {renderSection()}
      </div>

    </div>
  );
};

export default SystemTab;
