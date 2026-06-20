// src/pages/ReportPreview/ReportPreviewRenderer.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Renders orchSections as a formatted clinical report.
// Template-driven: section headings, typography, and layout come from the
// resolved ReportTemplate. When ReportLab is ready, swap this for a PDF iframe.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef } from 'react';
import type { OrchestratorSection } from '@/pages/SynopticReportPage/components/OrchestratorSectionEditor';
import type { Case } from '@/types/case/Case';

interface Props {
  sections:    OrchestratorSection[];
  caseData:    Case | null;
  templateName?: string;
  resolvedBy?:   string;
  // ── Cross-pane sync (three-column layout) ──────────────────────────────────
  // Clicking a section heading here notifies the parent, which updates the
  // shared activeSectionId — the right-hand editor then scrolls to match.
  activeSectionId?:       string | null;
  onSectionClick?:        (id: string) => void;
}

// ── Institution data (mirrors OrchestratorReportPanel logic) ─────────────────
function getInstitution(originHospitalId?: string) {
  if (originHospitalId === 'HOSP-002') return {
    name:    'Manchester University NHS Foundation Trust',
    dept:    'Department of Anatomical Pathology',
    address: 'Oxford Road, Manchester M13 9WL, United Kingdom',
    phone:   '+44 161 276 1234',
  };
  if (originHospitalId === 'HOSP-003') return {
    name:    'PathScribe Reference Laboratory — West',
    dept:    'Department of Anatomical Pathology',
    address: '1234 Lab Drive, Suite 200, Tucson AZ 85701',
    phone:   '+1 520 555 0100',
  };
  return {
    name:    'PathScribe Reference Laboratory',
    dept:    'Department of Anatomical Pathology',
    address: '1234 Lab Drive, Suite 200, Tucson AZ 85701',
    phone:   '+1 520 555 0100',
  };
}

const ReportPreviewRenderer: React.FC<Props> = ({
  sections, caseData, templateName, resolvedBy, activeSectionId, onSectionClick,
}) => {
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Auto-scroll to follow activeSectionId when it changes from elsewhere
  // (navigator click, or editing in the right-hand section editor)
  useEffect(() => {
    if (!activeSectionId) return;
    const el = sectionRefs.current[activeSectionId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [activeSectionId]);

  const accession  = caseData?.accession?.fullAccession ?? caseData?.accession?.accessionNumber ?? '';
  const patient    = caseData?.patient
    ? `${caseData.patient.lastName}, ${caseData.patient.firstName}` : '';
  const mrn        = caseData?.patient?.mrn ?? '';
  const dob        = caseData?.patient?.dateOfBirth
    ? new Date(caseData.patient.dateOfBirth).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '';
  const sex        = caseData?.patient?.sex ?? '';
  const priority   = (caseData?.order as any)?.priority ?? '';
  const referring  = caseData?.order?.clientName ?? '';
  const clinician  = caseData?.order?.requestingProvider ?? '';
  const inst       = getInstitution(caseData?.originHospitalId);

  return (
    <div className="rp-page">

      {/* ── Institution header ────────────────────────────────────────── */}
      <div className="rp-inst-header">
        <div className="rp-inst-left">
          <div className="rp-inst-name">{inst.name}</div>
          <div className="rp-inst-dept">{inst.dept}</div>
          <div className="rp-inst-addr">{inst.address}</div>
          <div className="rp-inst-phone">{inst.phone}</div>
        </div>
        <div className="rp-inst-right">
          <div className="rp-logo-text">PathScribe</div>
          <div className="rp-logo-sub">Pathology Reporting</div>
        </div>
      </div>

      {/* ── Patient / case header ─────────────────────────────────────── */}
      <div className="rp-case-header">
        <div className="rp-case-header-top">
          <div className="rp-accession">{accession}</div>
          {priority && (
            <span className={`rp-priority${priority === 'STAT' ? ' rp-priority--stat' : ''}`}>
              {priority}
            </span>
          )}
        </div>
        <div className="rp-patient-grid">
          {patient   && <><span className="rp-field-key">Patient</span>    <span className="rp-field-val">{patient}</span></>}
          {mrn       && <><span className="rp-field-key">MRN</span>        <span className="rp-field-val">{mrn}</span></>}
          {dob       && <><span className="rp-field-key">Date of Birth</span><span className="rp-field-val">{dob}{sex ? ` · ${sex}` : ''}</span></>}
          {referring && <><span className="rp-field-key">Referring</span>  <span className="rp-field-val">{referring}</span></>}
          {clinician && <><span className="rp-field-key">Clinician</span>  <span className="rp-field-val">{clinician}</span></>}
        </div>

        {/* Template indicator */}
        {templateName && (
          <div className="rp-template-bar">
            <span className="rp-template-label">Report Template:</span>
            <span className="rp-template-name">{templateName}</span>
            {resolvedBy && (
              <span className="rp-template-by">resolved by {resolvedBy.replace(/-/g, ' ')}</span>
            )}
          </div>
        )}

        <div className="rp-case-rule" />
      </div>

      {/* ── Narrative sections ────────────────────────────────────────── */}
      <div className="rp-body">
        {sections.length === 0 ? (
          <div className="rp-empty">
            <div className="rp-empty-icon">✍️</div>
            <div className="rp-empty-text">No report sections yet</div>
            <div className="rp-empty-hint">Generate the report in the draft editor to see content here.</div>
          </div>
        ) : (
          sections.map(s => (
            <div
              key={s.id}
              id={`rp-section-${s.id}`}
              ref={el => { sectionRefs.current[s.id] = el; }}
              className={`rp-section${activeSectionId === s.id ? ' rp-section--active' : ''}`}
              onClick={() => onSectionClick?.(s.id)}
            >
              <div className={`rp-section-heading${s.committed ? ' rp-section-heading--accepted' : s.userEdited ? ' rp-section-heading--edited' : ''}`}>
                {s.label}
                {s.committed && <span className="rp-section-badge rp-section-badge--accepted">✓ Accepted</span>}
                {!s.committed && s.userEdited && <span className="rp-section-badge rp-section-badge--edited">Edited</span>}
                {!s.committed && !s.userEdited && s.aiGenerated && <span className="rp-section-badge rp-section-badge--ai">AI Draft</span>}
              </div>
              {s.text ? (
                <div
                  className="rp-section-body"
                  dangerouslySetInnerHTML={{ __html: s.text }}
                />
              ) : (
                <div className="rp-section-empty">
                  {s.required ? '⚠ Required — not yet completed' : 'No content'}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ── Report footer ─────────────────────────────────────────────── */}
      <div className="rp-footer">
        <div className="rp-footer-patient">
          {patient}{mrn ? ` · MRN ${mrn}` : ''}{accession ? ` · ${accession}` : ''}
        </div>
        <div className="rp-footer-conf">CONFIDENTIAL — PATHOLOGY REPORT</div>
        <div className="rp-footer-right">{inst.name}</div>
      </div>

    </div>
  );
};

export default ReportPreviewRenderer;
