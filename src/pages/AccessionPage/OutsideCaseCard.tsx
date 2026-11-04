// src/pages/AccessionPage/OutsideCaseCard.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The Outside Patient Data tab of Accession (Outside/Contract Case intake), moved out of AccessionPage.tsx unchanged in
// Batch 759 (AccessionPage.tsx is over 1,000 lines and may not grow), with one new section: the originating case
// (Patient Verification, Outside Case Tracking and Audit Logging spec §2.1, Pete, Nov 2, 2026). The comments on each
// section are the ones that stood in AccessionPage.tsx.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { OutsidePatientFinancialData } from '@/types/billing/OutsidePatientFinancialData';
import type { MasterPaymentType } from '@/types/billing/MasterPaymentType';
import type { JurisdictionPaymentMapping } from '@/types/billing/JurisdictionPaymentMapping';

/** What the accessioner types for the originating case (the saved form is types/case/OriginatingCase.ts). */
export interface OriginatingCaseDraft { caseNumber: string; institution?: string }

interface Props {
  outsidePatientData: OutsidePatientFinancialData;
  setOutsidePatientData: React.Dispatch<React.SetStateAction<OutsidePatientFinancialData>>;
  jurisdictionMappings: JurisdictionPaymentMapping[];
  masterPaymentTypes: MasterPaymentType[];
  selectedFacilityName?: string;
  requestingProvider: string;
  originating: OriginatingCaseDraft;
  onOriginatingChange: (next: OriginatingCaseDraft) => void;
}

const OutsideCaseCard: React.FC<Props> = ({ outsidePatientData, setOutsidePatientData, jurisdictionMappings, masterPaymentTypes, selectedFacilityName, requestingProvider, originating, onOriginatingChange }) => {
  const { t } = useTranslation();
  return (
      <div className="ps-card-dark ps-accession-card">
        <div className="ps-accession-outside-header">
          <h3 className="ps-accession-outside-title">{t('accessionPage.outsidePatient.title')}</h3>
          <p className="ps-accession-outside-subtitle">
            {t('accessionPage.outsidePatient.subtitle')}
          </p>
        </div>
        {/* Batch 759 (Patient Verification, Outside Case Tracking and Audit Logging spec §2.1): the originating
            institution's own case number, shown beside the PathScribe accession in every workspace header. */}
        <div className="ps-accession-outside-section">
          <div className="ps-accession-outside-section-title">{t('accessionPage.outsidePatient.originatingCase')}</div>
          <div className="ps-accession-grid">
            <div>
              <label className="ps-label">{t('accessionPage.outsidePatient.originatingCaseNumber')}</label>
              <input aria-label={t('accessionPage.outsidePatient.originatingCaseNumber')} className="ps-input-dark" data-phi="accession" value={originating.caseNumber}
                onChange={e => onOriginatingChange({ ...originating, caseNumber: e.target.value })} placeholder={t('accessionPage.outsidePatient.originatingCaseNumberPlaceholder')} />
            </div>
            <div>
              <label className="ps-label">{t('accessionPage.outsidePatient.originatingInstitution')}</label>
              <input aria-label={t('accessionPage.outsidePatient.originatingInstitution')} className="ps-input-dark" value={originating.institution ?? ''}
                onChange={e => onOriginatingChange({ ...originating, institution: e.target.value })} placeholder={selectedFacilityName ?? ''} />
            </div>
          </div>
        </div>

        {/* SECTION 1: CLIENT & ORIGIN — real, per direct guidance:
            Client Account and Ordering Provider reuse the existing
            Case & Patient tab's own clientId/requestingProvider
            selections directly rather than duplicating a second
            picker — confirmed there's no separate outside-client
            directory to build. Account Billing Type is the one
            genuinely new field here. */}
        <div className="ps-accession-outside-section">
          <div className="ps-accession-outside-section-title">{t('accessionPage.outsidePatient.facilityOrigin')}</div>
          <div className="ps-accession-grid">
            <div>
              <label className="ps-label">{t('accessionPage.outsidePatient.facilityAccount')}</label>
              <input aria-label={t('accessionPage.outsidePatient.facilityAccount')} className="ps-input-dark" disabled value={selectedFacilityName ?? t('accessionPage.outsidePatient.facilityAccountPlaceholder')} />
            </div>
            <div>
              <label className="ps-label">{t('accessionPage.outsidePatient.orderingProvider')}</label>
              <input aria-label={t('accessionPage.outsidePatient.orderingProvider')} className="ps-input-dark" disabled value={requestingProvider || t('accessionPage.outsidePatient.orderingProviderPlaceholder')} />
            </div>
            <div>
              <label className="ps-label">{t('accessionPage.outsidePatient.billingType')}</label>
              <input aria-label={t('accessionPage.outsidePatient.billingType')} className="ps-input-dark" value={outsidePatientData.accountBillingType ?? ''}
                onChange={e => setOutsidePatientData(d => ({ ...d, accountBillingType: e.target.value }))}
                placeholder={t('accessionPage.outsidePatient.billingTypePlaceholder')} />
            </div>
          </div>
        </div>

        {/* SECTION 2: PATIENT & JURISDICTION IDENTIFICATION — real,
            per direct guidance dynamic-behavior rule 2: changing
            Primary Jurisdiction updates the real Local ID Number
            label. Options are the real, distinct country codes
            actually present in the Jurisdiction Payment Mapping
            dictionary (services/billing/), not a separate,
            hardcoded country list that could drift from it. */}
        <div className="ps-accession-outside-section">
          <div className="ps-accession-outside-section-title">{t('accessionPage.outsidePatient.patientJurisdiction')}</div>
          <div className="ps-accession-grid">
            <div>
              <label className="ps-label">{t('accessionPage.outsidePatient.primaryJurisdiction')}</label>
              <select aria-label={t('accessionPage.outsidePatient.primaryJurisdiction')} className="ps-input-dark" value={outsidePatientData.primaryJurisdictionCountryCode ?? ''}
                onChange={e => setOutsidePatientData(d => ({ ...d, primaryJurisdictionCountryCode: e.target.value, primaryJurisdictionMappingId: undefined }))}>
                <option value="">{t('accessionPage.outsidePatient.select')}</option>
                {Array.from(new Set(jurisdictionMappings.map(m => m.countryCode))).sort().map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="ps-label">
                {(() => {
                  // Real, per direct guidance: the real, dynamic
                  // local-ID label now comes from the SPECIFIC
                  // scheme actually selected below, not just "the
                  // first scheme found in this jurisdiction" — a
                  // real, deliberate correction made alongside the
                  // precise-mapping-id fix, since the earlier,
                  // approximate label had the same real ambiguity
                  // risk this whole fix addresses.
                  const selected = jurisdictionMappings.find(m => m.id === outsidePatientData.primaryJurisdictionMappingId);
                  return selected ? t('accessionPage.outsidePatient.localIdNumberWithScheme', { scheme: selected.localSchemeCode }) : t('accessionPage.outsidePatient.localIdNumber');
                })()}
              </label>
              <input className="ps-input-dark" value={outsidePatientData.localIdNumber ?? ''}
                onChange={e => setOutsidePatientData(d => ({ ...d, localIdNumber: e.target.value }))}
                placeholder={outsidePatientData.primaryJurisdictionMappingId ? '' : t('accessionPage.outsidePatient.localIdPlaceholder')} />
            </div>
          </div>
        </div>

        {/* Real, per direct follow-up: the "Check for Existing
            Patient" search that used to live here moved to the
            Case & Patient tab, generalized to every intake type —
            it's a same_person question, not something specific to
            Outside/Contract Case. See that tab's own comment for
            the full account. */}

        {/* SECTION 3: FINANCIAL CLASS & COVERAGE ROUTING — real,
            per direct guidance: the Payment Category picker now
            selects the SPECIFIC JurisdictionPaymentMapping row, not
            a deduplicated Master Payment Type — a real, confirmed
            fix. A bare master category (e.g.
            STATUTORY_SOCIAL_HEALTH) is genuinely ambiguous the
            moment a country has more than one real local scheme
            mapping to it; nothing in the dictionary schema
            prevents that, even though today's 13 seed rows happen
            not to have a case of it. A downstream financial engine
            needs to know EXACTLY which real scheme applied to pick
            the right outbound claims format — see
            buildFinancialClassPayload.ts for the full account.
            Primary Payer/Fund is deliberately free text —
            confirmed directly no payer/fund registry exists in
            this app; see OutsidePatientFinancialData.ts's own
            header for why. */}
        <div className="ps-accession-outside-section">
          <div className="ps-accession-outside-section-title">{t('accessionPage.outsidePatient.financialClass')}</div>
          <div className="ps-accession-grid">
            <div>
              <label className="ps-label">{t('accessionPage.outsidePatient.paymentCategory')}</label>
              <select aria-label={t('accessionPage.outsidePatient.paymentCategory')} className="ps-input-dark" value={outsidePatientData.primaryJurisdictionMappingId ?? ''}
                onChange={e => setOutsidePatientData(d => ({ ...d, primaryJurisdictionMappingId: e.target.value }))}
                disabled={!outsidePatientData.primaryJurisdictionCountryCode}>
                <option value="">{t('accessionPage.outsidePatient.select')}</option>
                {jurisdictionMappings.filter(m => m.countryCode === outsidePatientData.primaryJurisdictionCountryCode).map(m => {
                  const departmentName = masterPaymentTypes.find(mpt => mpt.id === m.masterPaymentTypeId)?.displayName ?? m.masterPaymentTypeId;
                  return <option key={m.id} value={m.id}>{departmentName} — {m.localDisplayTerminology}</option>;
                })}
              </select>
            </div>
            <div>
              <label className="ps-label">{t('accessionPage.outsidePatient.primaryPayer')}</label>
              <input aria-label={t('accessionPage.outsidePatient.primaryPayer')} className="ps-input-dark" value={outsidePatientData.primaryPayerName ?? ''}
                onChange={e => setOutsidePatientData(d => ({ ...d, primaryPayerName: e.target.value }))} />
            </div>
            <div>
              <label className="ps-label">{t('accessionPage.outsidePatient.coveragePolicy')}</label>
              <input aria-label={t('accessionPage.outsidePatient.coveragePolicy')} className="ps-input-dark" value={outsidePatientData.coveragePolicyNumber ?? ''}
                onChange={e => setOutsidePatientData(d => ({ ...d, coveragePolicyNumber: e.target.value }))} />
            </div>
          </div>

          <label className="ps-accession-checkbox-row ps-accession-checkbox-row--spaced">
            <input type="checkbox" checked={!!outsidePatientData.hasSecondaryCoverage}
              onChange={e => setOutsidePatientData(d => ({ ...d, hasSecondaryCoverage: e.target.checked }))} />
            {t('accessionPage.outsidePatient.applySecondary')}
          </label>

          {outsidePatientData.hasSecondaryCoverage && (
            <div className="ps-accession-outside-secondary-box">
              <div className="ps-accession-grid">
                <div>
                  <label className="ps-label">{t('accessionPage.outsidePatient.secondaryCategory')}</label>
                  <select aria-label={t('accessionPage.outsidePatient.secondaryCategory')} className="ps-input-dark" value={outsidePatientData.secondaryJurisdictionMappingId ?? ''}
                    onChange={e => setOutsidePatientData(d => ({ ...d, secondaryJurisdictionMappingId: e.target.value }))}>
                    <option value="">{t('accessionPage.outsidePatient.select')}</option>
                    {jurisdictionMappings
                      .filter(m => m.countryCode === outsidePatientData.primaryJurisdictionCountryCode)
                      .filter(m => masterPaymentTypes.find(mpt => mpt.id === m.masterPaymentTypeId)?.supportsSplitBilling)
                      .map(m => {
                        const departmentName = masterPaymentTypes.find(mpt => mpt.id === m.masterPaymentTypeId)?.displayName ?? m.masterPaymentTypeId;
                        return <option key={m.id} value={m.id}>{departmentName} — {m.localDisplayTerminology}</option>;
                      })}
                  </select>
                </div>
                <div>
                  <label className="ps-label">{t('accessionPage.outsidePatient.secondaryPayer')}</label>
                  <input aria-label={t('accessionPage.outsidePatient.secondaryPayer')} className="ps-input-dark" value={outsidePatientData.secondaryPayerName ?? ''}
                    onChange={e => setOutsidePatientData(d => ({ ...d, secondaryPayerName: e.target.value }))} />
                </div>
                <div>
                  <label className="ps-label">{t('accessionPage.outsidePatient.memberCardId')}</label>
                  <input aria-label={t('accessionPage.outsidePatient.memberCardId')} className="ps-input-dark" value={outsidePatientData.secondaryMemberId ?? ''}
                    onChange={e => setOutsidePatientData(d => ({ ...d, secondaryMemberId: e.target.value }))} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
  );
};

export default OutsideCaseCard;
