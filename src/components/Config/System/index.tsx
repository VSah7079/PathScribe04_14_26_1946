import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import { useIsSuperAdmin } from '../../../contexts/AuthContext';
import '../../../pathscribe.css';
import { getActivePerformingLabs } from '../../../utils/performingLabs';
import type { Facility } from '../../../services';
import FlagConfigPage            from './FlagConfigPage';
import SpecimenDictionarySection from './SpecimenDictionarySection';
import StainDictionarySection from './StainDictionarySection';
import VendorIntegrationsSection from './VendorIntegrationsSection';
import CytologyQcRulesSection from './CytologyQcRulesSection';
import OrSuiteTerminalsSection from './OrSuiteTerminalsSection';
import IntraopCriticalResultsSection from './IntraopCriticalResultsSection';
import DisplayProfilesSection from './DisplayProfilesSection';
import MigrationFieldMappingsSection from './MigrationFieldMappingsSection';
import CancerRegistrySettingsSection from './CancerRegistrySettingsSection';
import ProtocolDictionarySection from './ProtocolDictionarySection';
import PrinterProfilesSection from './PrinterProfilesSection';
import SiteAgentsSection from './SiteAgentsSection';
import AssistLisPollingSection from './AssistLisPollingSection';
import GrossingRouteOverridesSection from './GrossingRouteOverridesSection';
import DepartmentsSection from './DepartmentsSection';
import AssetLocationDictionarySection from './AssetLocationDictionarySection';
import ContainerTypesSection from './ContainerTypesSection';
import ReagentLotsSection from './ReagentLotsSection';
import WorkstationGroupsSection from './WorkstationGroupsSection';
import ActionGroupsSection from './ActionGroupsSection';
import ScanStationsSection from './ScanStationsSection';
import EquipmentSection from './EquipmentSection';
import GrossingHardwareSection from './GrossingHardwareSection';
import CassetteRoutingRulesSection from './CassetteRoutingRulesSection';
import CassetteColorsSection from './CassetteColorsSection';
import InkColorsSection from './InkColorsSection';
import InkingValidationModeSection from './InkingValidationModeSection';
import PrintSettingsSection from './PrintSettingsSection';
import LabelDesignerPage from '../../../pages/LabelDesignerPage/LabelDesignerPage';
import SubspecialtiesSection     from './SubspecialtiesSection';
import FontsSection              from './FontsSection';
import DocumentStyleSection      from './DocumentStyleSection';
import RetentionSection          from './RetentionSection';
import GoverningBodiesSection    from './GoverningBodiesSection';
import DelegationTypeSection     from './DelegationTypeSection';
import RvuCodeMapSection         from './RvuCodeMapSection';
import NcciEditRulesSection      from './NcciEditRulesSection';
import MasterPaymentTypeDictionarySection from './MasterPaymentTypeDictionarySection';
import OutboundMessagePreviewSection from './OutboundMessagePreviewSection';
import JurisdictionPaymentMappingSection  from './JurisdictionPaymentMappingSection';
import DftExportPreviewSection   from './DftExportPreviewSection';
import BillingDictionarySection  from './BillingDictionarySection';
import PendingApprovalSection from './PendingApprovalSection';
import CodeImportSection from './CodeImportSection';
import ModifierDictionarySection from './ModifierDictionarySection';
import BillingTypeTriggerSection from './BillingTypeTriggerSection';
import ParticipationTypesSection from './ParticipationTypesSection';
import CountrySigningRulesSection from './CountrySigningRulesSection';
import SessionSecuritySection    from './SessionSecuritySection';
import SupportAccessSection      from './SupportAccessSection';
import FieldRequirementsSection  from './FieldRequirementsSection';
import ReleaseBufferSection      from './ReleaseBufferSection';
import ConcordanceReviewSettingsSection from './ConcordanceReviewSettingsSection';
import DeliveryRulesSection from './DeliveryRulesSection';
import PrintRoutingRuleSection from './PrintRoutingRuleSection';
import ContributionSettingsSection from './ContributionSettingsSection';
import ExternalResourcesSection  from './ExternalResourcesSection';
import ResearchFeedSection      from './ResearchFeedSection';
// Real, per direct request: the following 11 imports were previously
// registered in Integrations/index.tsx, which was its own top-level
// Configuration tab (a real, documented PS-85 reorg that moved them
// OUT of System). Per direct follow-up, moved back - but as a real,
// named group WITHIN System (matching this file's own existing
// group-tag pattern) rather than restoring the old, ungrouped flat
// list they lived in before PS-85. Integrations/index.tsx itself is
// now fully superseded and deleted - these are the exact same real
// components, imported from wherever each one actually lives, not
// duplicated.
import TerminologyServicesSection from '../Terminology/TerminologyServicesSection';
import CrosswalkSection from './CrosswalkSection';
import { FacilityDictionaryPage } from '../../../pages/system/FacilityDictionaryPage';
import CaseMaskConfigSection from './CaseMaskConfigSection';
import CasePoolAssignmentSection from './CasePoolAssignmentSection';
import RoutingRulesSection from './RoutingRulesSection';
import PhysiciansSection from './PhysiciansSection';
import DeficienciesSection from './DeficienciesSection';
import AbnormalTriggerRulesSection from './AbnormalTriggerRulesSection';
import QAConfigurationCenterSection from './QAConfigurationCenterSection';
import BiopsyResectionCorrelationSection from './BiopsyResectionCorrelationSection';
import TumorBoardRulesSection from './TumorBoardRulesSection';
import FollowUpTrackingSection from './FollowUpTrackingSection';
import OrganMapsSection from './OrganMapsSection';
import QaTrendPolicySection from './QaTrendPolicySection';
import FeedbackSection from './FeedbackSection';
import TemplateGovernanceSection from './TemplateGovernanceSection';
import { resetConfigScroll } from '../../../utils/resetConfigScroll';
import ConfigSectionGate from '../ConfigSectionGate';
import { SECTIONS, GROUP_LABEL_KEY, type SystemSection } from './systemSections';
import { useConfigNavigationGuard } from '../configDirtyGuardContext';
import RevisionReasonsSection from './RevisionReasonsSection';
import PeerReviewGateSection from './PeerReviewGateSection';
import ClinicalMismatchRulesSection from './ClinicalMismatchRulesSection';
import AiInstructionsSection from './AiInstructionsSection';

// ── Section registry ──────────────────────────────────────────────────────────

// Batch 431: the section list lives in ./systemSections.ts (shared with the
// Configuration search).



// ── Main component ────────────────────────────────────────────────────────────

// Real, per direct guidance and a real, confirmed reference screenshot
// (Configuration → Validation Studies' own real Studies/Dashboard/Reports
// row) — the real, generic ps-sub-tab-group/ps-sub-tab-btn pattern
// already proven there, reused here rather than a new one invented.
// Derived, not hand-maintained — GROUPS is every real, distinct group
// in SECTIONS, in the same order groups first appear there, so adding
// a new section to an existing group never needs a second, parallel
// edit here.
const GROUPS: string[] = Array.from(new Set(SECTIONS.map(s => s.group)));

const SystemTab: React.FC = () => {
  // PS-128 (Batch 437): moving to another section asks first when something is unsaved.
  const guardNav = useConfigNavigationGuard();
  const { t } = useTranslation();
  // Batch 371: the terminology endpoint details are shown to PathScribe
  // support (Superadmin) only; this used to be hard-coded true for everyone.
  const isSuperAdmin = useIsSuperAdmin();
  const location = useLocation();
  const [active, setActiveRaw] = useState<SystemSection>(() => {
    const section = new URLSearchParams(location.search).get('section') as SystemSection | null;
    return section && SECTIONS.some(s => s.id === section) ? section : SECTIONS[0].id;
  });
  // Real, per the group-tab redesign — the sidebar now shows only the
  // active group's own items, so a real, single source of truth for
  // "which section is selected" must always keep this in sync,
  // regardless of which of the four real entry points changed it
  // (deep-link, voice nav, a sidebar click, or a group-tab click) —
  // selectSection below is the one real place that ever happens, so
  // none of those four paths can drift out of sync with each other.
  const [activeGroup, setActiveGroup] = useState<string>(() => SECTIONS.find(s => s.id === active)?.group ?? GROUPS[0]);

  // Real, per direct guidance (Workstation & Hardware redesign): one
  // real facility choice, shared across Scan Stations/Printer
  // Profiles/Print Settings — picked once here, at the group level,
  // rather than three independent (or missing) per-screen filters an
  // admin would otherwise have to re-select on every tab. Lives at
  // this level (not inside any one section) specifically so it
  // survives switching between the three sibling sections within the
  // group — each section fully unmounts/remounts via renderSection()
  // below, so state that needs to persist across that has to live
  // above it. Deliberately NOT persisted to the URL/storage — a real,
  // session-scoped convenience, not a saved admin preference.
  const [workstationFacilityId, setWorkstationFacilityId] = useState('');
  const [workstationLabs, setWorkstationLabs] = useState<Facility[]>([]);
  useEffect(() => { getActivePerformingLabs().then(setWorkstationLabs); }, []);

  const selectSection = (id: SystemSection) => {
    setActiveRaw(id);
    const g = SECTIONS.find(s => s.id === id)?.group;
    if (g) setActiveGroup(g);
  };

  // Re-activate if URL changes (e.g. deep-link navigation)
  useEffect(() => {
    const section = new URLSearchParams(location.search).get('section') as SystemSection | null;
    if (section && SECTIONS.some(s => s.id === section)) { selectSection(section); resetConfigScroll(); }
  }, [location.search]);

  const renderSection = () => {
    switch (active) {
      case 'flags':               return <FlagConfigPage />;
      case 'subspecialties':      return <SubspecialtiesSection />;
      case 'specimens':           return <SpecimenDictionarySection />;
      case 'stains':              return <StainDictionarySection />;
      case 'vendor_integrations': return <VendorIntegrationsSection />;
      case 'cytology_qc_rules': return <CytologyQcRulesSection />;
      case 'or_suite_terminals':  return <OrSuiteTerminalsSection />;
      case 'intraop_critical_results': return <IntraopCriticalResultsSection />;
      case 'display_profiles':    return <DisplayProfilesSection />;
      case 'migration_field_mappings': return <MigrationFieldMappingsSection />;
      case 'cancer_registry_settings': return <CancerRegistrySettingsSection />;
      case 'protocols':           return <ProtocolDictionarySection />;
      case 'printer_profiles':    return <PrinterProfilesSection selectedFacilityId={workstationFacilityId || undefined} />;
      case 'grossing_route_overrides': return <GrossingRouteOverridesSection />;
      case 'departments': return <DepartmentsSection />;
      case 'asset_locations': return <AssetLocationDictionarySection />;
      case 'container_types': return <ContainerTypesSection />;
      case 'reagent_lots': return <ReagentLotsSection />;
      case 'workstation_groups': return <WorkstationGroupsSection />;
      case 'action_groups': return <ActionGroupsSection />;
      case 'scan_stations': return <ScanStationsSection selectedFacilityId={workstationFacilityId || undefined} />;
      case 'site_agents': return <SiteAgentsSection selectedFacilityId={workstationFacilityId || undefined} />;
      case 'equipment': return <EquipmentSection selectedFacilityId={workstationFacilityId || undefined} />;
      case 'grossing_hardware': return <GrossingHardwareSection selectedFacilityId={workstationFacilityId || undefined} />;
      case 'cassette_routing_rules': return <CassetteRoutingRulesSection />;
      case 'cassette_colors': return <CassetteColorsSection />;
      case 'ink_colors': return <InkColorsSection />;
      case 'inking_validation_mode': return <InkingValidationModeSection />;
      case 'print_settings': return <PrintSettingsSection selectedFacilityId={workstationFacilityId || undefined} />;
      case 'label_designer': return <LabelDesignerPage />;
      case 'fonts':               return <FontsSection />;
      case 'document_style':      return <DocumentStyleSection />;
      case 'retention':           return <RetentionSection />;
      case 'governing_bodies':    return <GoverningBodiesSection />;
      case 'delegation_types':    return <DelegationTypeSection />;
      case 'billing_dictionary':  return <BillingDictionarySection />;
      case 'pending_approvals': return <PendingApprovalSection />;
      case 'code_import': return <CodeImportSection />;
      case 'modifier_dictionary': return <ModifierDictionarySection />;
      case 'billing_type_triggers': return <BillingTypeTriggerSection />;
      case 'rvu_code_map':        return <RvuCodeMapSection />;
      case 'ncci_edit_rules':     return <NcciEditRulesSection />;
      case 'master_payment_types': return <MasterPaymentTypeDictionarySection />;
      case 'jurisdiction_payment_mappings': return <JurisdictionPaymentMappingSection />;
      case 'outbound_message_preview': return <OutboundMessagePreviewSection />;
      case 'dft_export_preview':  return <DftExportPreviewSection />;
      case 'participation_types': return <ParticipationTypesSection />;
      case 'country_signing_rules': return <CountrySigningRulesSection />;
      case 'session_security':    return <SessionSecuritySection />;
      case 'support_access':      return <SupportAccessSection />;
      case 'field_requirements':  return <FieldRequirementsSection />;
      case 'release_buffer':      return <ReleaseBufferSection />;
      case 'concordance_review_settings': return <ConcordanceReviewSettingsSection />;
      case 'template_governance': return <TemplateGovernanceSection />;
      case 'delivery_rules': return <DeliveryRulesSection />;
      case 'print_routing_rules': return <PrintRoutingRuleSection />;
      case 'contribution_settings': return <ContributionSettingsSection />;
      case 'external_resources':  return <ExternalResourcesSection />;
      case 'research_feed':       return <ResearchFeedSection />;
      case 'terminology':      return <TerminologyServicesSection isSuperAdmin={isSuperAdmin} />;
      case 'clients':          return <FacilityDictionaryPage />;
      case 'crosswalk':        return <CrosswalkSection />;
      case 'case_mask_config': return <CaseMaskConfigSection />;
      case 'case_routing':     return <CasePoolAssignmentSection />;
      case 'routing_rules':    return <RoutingRulesSection />;
      case 'physicians':       return <PhysiciansSection />;
      case 'deficiencies':     return <DeficienciesSection />;
      case 'abnormal_trigger_rules': return <AbnormalTriggerRulesSection />;
      case 'assist_lis_polling': return <AssistLisPollingSection />;
      case 'qa_config_center': return <QAConfigurationCenterSection />;
      case 'biopsy_resection_correlation': return <BiopsyResectionCorrelationSection />;
      case 'tumor_board_rules': return <TumorBoardRulesSection />;
      case 'follow_up_tracking': return <FollowUpTrackingSection />;
      case 'organ_maps':         return <OrganMapsSection />;
      case 'revision_reasons': return <RevisionReasonsSection />;
      case 'peer_review_gate': return <PeerReviewGateSection />;
      case 'clinical_mismatch_rules': return <ClinicalMismatchRulesSection />;
      case 'ai_instructions': return <AiInstructionsSection />;
      case 'qa_trend_policy': return <QaTrendPolicySection />;
      case 'feedback': return <FeedbackSection />;
      default:                    return null;
    }
  };

  // ── Voice sub-navigation ───────────────────────────────────────────────────
  React.useEffect(() => {
    const handler = (e: CustomEvent) => {
      const section = e.detail?.section as SystemSection;
      if (section) { selectSection(section); resetConfigScroll(); }
    };
    window.addEventListener('PATHSCRIBE_SYSTEM_NAVIGATE', handler as EventListener);
    return () => window.removeEventListener('PATHSCRIBE_SYSTEM_NAVIGATE', handler as EventListener);
  }, []);

  return (
    <div>
      {/* ── Real, per the confirmed group-tab redesign — one tab per real
          group, selecting a tab jumps the sidebar+content to that
          group's own first real section. ── */}
      <div className="ps-sub-tab-group ps-sub-tab-group--gap-below">
        {GROUPS.map(g => (
          <button
            key={g}
            onClick={() => guardNav(() => {
              setActiveGroup(g);
              const first = SECTIONS.find(s => s.group === g);
              if (first) setActiveRaw(first.id);
              resetConfigScroll();
            })}
            className={`ps-sub-tab-btn${activeGroup === g ? ' active' : ''}`}
          >
            {t(GROUP_LABEL_KEY[g])}
          </button>
        ))}
      </div>

      {/* Real, per direct guidance: one facility selector shared
          across the Workstation & Hardware sections (Equipment added in Batch 356/358) — placed
          above the sidebar+content shell (not inside it) so it spans
          the full width rather than becoming a third flex column.
          Never rendered for any other group, since no other group's
          sections have this same real, cross-cutting facility
          relationship. */}
      {activeGroup === 'Workstation & Hardware' && (
        <div className="ps-conf-callout-banner ps-confsys-facility-selector">
          <span className="ps-conf-callout-banner-text">{t('systemTab.facilityLabel')}</span>
          <select
            aria-label={t('systemTab.facilityLabel')}
            className="ps-conf-select"
            value={workstationFacilityId}
            onChange={e => { const next = e.target.value; guardNav(() => setWorkstationFacilityId(next)); }}
          >
            <option value="">{t('systemTab.allFacilitiesOption')}</option>
            {workstationLabs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
      )}

      <div className="ps-confsys-shell">

        {/* ── Sidebar nav — real, per the confirmed redesign: only the
            active group's own items, no more group-header dividers,
            since only one group is ever visible at a time now. ── */}
        <div className="ps-confsys-sidebar">
          {SECTIONS.filter(s => s.group === activeGroup).map(s => (
            <button
              key={s.id}
              onClick={() => guardNav(() => { selectSection(s.id); resetConfigScroll(); })}
              className={`ps-confsys-nav-btn${active === s.id ? ' ps-confsys-nav-btn--active' : ''}`}
            >
              {s.emoji} {t(s.labelKey)}
            </button>
          ))}
        </div>

        {/* ── Section content ── */}
        <div className="ps-confsys-content">
          {/* Batch 429: view only for someone who can't change this section. */}
          <ConfigSectionGate key={active} section={active}>{renderSection()}</ConfigSectionGate>
        </div>

      </div>
    </div>
  );
};

export default SystemTab;
