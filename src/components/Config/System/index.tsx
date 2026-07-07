import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import '../../../pathscribe.css';
import FlagConfigPage            from './FlagConfigPage';
import SpecimenDictionarySection from './SpecimenDictionarySection';
import StainDictionarySection from './StainDictionarySection';
import ProtocolDictionarySection from './ProtocolDictionarySection';
import SpecimenCategoriesSection from './SpecimenCategoriesSection';
import SubspecialtiesSection     from './SubspecialtiesSection';
import FontsSection              from './FontsSection';
import LISSection                from './LISSection';
import RetentionSection          from './RetentionSection';
import { ClientDictionaryPage }  from '../../../pages/system/ClientDictionaryPage';
import PhysiciansSection         from './PhysiciansSection'; // ← was never registered here despite existing
import DeficienciesSection       from './DeficienciesSection';
import IdentifierFormatsSection  from './IdentifierFormatsSection';
import GoverningBodiesSection    from './GoverningBodiesSection';
import DelegationTypeSection     from './DelegationTypeSection';
import ParticipationTypesSection from './ParticipationTypesSection';
import CaseRoutingSection        from './CaseRoutingSection';
import RoutingRulesSection       from './RoutingRulesSection';
import TerminologyServicesSection from '../Terminology/TerminologyServicesSection';
import TATConfigSection          from './TATConfigSection'; // ← create this component

// ── Section registry ──────────────────────────────────────────────────────────

type SystemSection =
  | 'flags'
  | 'subspecialties'
  | 'specimens'
  | 'stains'
  | 'specimen_categories'
  | 'fonts'
  | 'lis'
  | 'retention'
  | 'clients'
  | 'physicians'
  | 'protocols'
  | 'deficiencies'
  | 'identifiers'
  | 'governing_bodies'
  | 'delegation_types'
  | 'participation_types'
  | 'case_routing'
  | 'routing_rules'
  | 'terminology'
  | 'tat_config';   // ← new

// Alphabetical by label
const SECTIONS: { id: SystemSection; emoji: string; label: string }[] = [
  { id: 'fonts',               emoji: '🔤', label: 'Approved Fonts'        },
  { id: 'case_routing',        emoji: '🔀', label: 'Case Routing'          },
  { id: 'clients',             emoji: '🏥', label: 'Client Dictionary'     },
  { id: 'retention',           emoji: '🗄️', label: 'Data Retention'        },
  { id: 'delegation_types',    emoji: '🔀', label: 'Delegation Types'      },
  { id: 'flags',               emoji: '🚩', label: 'Flags'                 },
  { id: 'governing_bodies',    emoji: '📋', label: 'Governing Bodies'      },
  { id: 'identifiers',         emoji: '🔍', label: 'Identifier Formats'    },
  { id: 'lis',                 emoji: '🔗', label: 'LIS Integration'       },
  { id: 'participation_types', emoji: '👥', label: 'Participation Types'   },
  { id: 'physicians',          emoji: '🩻', label: 'Physicians'            },
  { id: 'protocols',           emoji: '🧬', label: 'Protocol Dictionary'   },
  { id: 'routing_rules',       emoji: '📋', label: 'Routing Rules'         },
  { id: 'specimen_categories', emoji: '🗂️', label: 'Specimen Categories'   },
  { id: 'deficiencies',        emoji: '⚠️', label: 'Specimen Deficiencies' },
  { id: 'specimens',           emoji: '🔬', label: 'Specimen Dictionary'   },
  { id: 'stains',              emoji: '🧪', label: 'Stain Dictionary'      },
  { id: 'subspecialties',      emoji: '🩺', label: 'Subspecialties'        },
  { id: 'tat_config',          emoji: '⏱️', label: 'TAT Configuration'     }, // ← new
  { id: 'terminology',         emoji: '🔌', label: 'Terminology Services'  },
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
      case 'specimen_categories': return <SpecimenCategoriesSection />;
      case 'fonts':               return <FontsSection />;
      case 'lis':                 return <LISSection />;
      case 'retention':           return <RetentionSection />;
      case 'clients':             return <ClientDictionaryPage />;
      case 'identifiers':         return <IdentifierFormatsSection />;
      case 'governing_bodies':    return <GoverningBodiesSection isSuperAdmin={true} />;
      case 'delegation_types':    return <DelegationTypeSection />;
      case 'participation_types': return <ParticipationTypesSection />;
      case 'physicians':          return <PhysiciansSection />;
      case 'deficiencies':        return <DeficienciesSection />;
      case 'case_routing':        return <CaseRoutingSection />;
      case 'routing_rules':       return <RoutingRulesSection />;
      case 'terminology':         return <TerminologyServicesSection isSuperAdmin={true} />;
      case 'tat_config':          return <TATConfigSection />;  // ← new
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

      {/* ── Section content ── */}
      <div className="ps-confsys-content">
        {renderSection()}
      </div>

    </div>
  );
};

export default SystemTab;
