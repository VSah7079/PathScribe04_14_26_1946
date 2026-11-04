// src/pages/ConsultLinksAuditSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 522 (PS-290): Audit Log → Consult links. Every outside consult link
// on every case, newest first, so whoever oversees access can see what is
// open to outside parties and close it:
//   - the case, the consultant, the scope, who issued it and when;
//   - when it expires, its status (active, expired, revoked) and its views;
//   - Revoke, for an active link (case:consult-link:revoke, checked in the
//     service with the case).
// Seeing the list needs audit:consult-links:view, checked in the service
// (consultTokenService.listAll); refused, the section says so.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { consultTokenService } from '@/services';
import { resolveConsultTokenStatus, type ConsultToken } from '@/services/consultAccess/IConsultTokenService';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { formatDateTime } from '@/utils/formatDate';
import { consultLinksShown } from '@/services/consultAccess/consultLinkRules';
import { LoadingState } from '@/components/Common/LoadingState';
import { ConsultLifetimeLine } from '@/components/ExternalConsult/ConsultLifetimeLine';
import { CONSULT_REVEAL_NOT_PERMITTED } from '@/services/consultAccess/IConsultTokenService';
import type { ConsultPatientView } from '@/services/consultAccess/consultIdentityMask';
import './consultLinksAudit.css';

const K = 'consultLinksAudit';

const ConsultLinksAuditSection: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [links, setLinks] = useState<ConsultToken[] | null>(null);
  const [refused, setRefused] = useState(false);
  const [activeOnly, setActiveOnly] = useState(true);

  const load = useCallback(() => {
    void consultTokenService.listAll().then(r => {
      setRefused(!r.ok);
      setLinks(r.ok ? r.data : []);
    });
  }, []);
  useEffect(load, [load]);

  // Batch 669 (access-11): identity preview for someone who may reveal identity but not issue links.
  const [preview, setPreview] = useState<{ id: string; patient: ConsultPatientView | null; refused: boolean } | null>(null);
  const previewIdentity = async (id: string) => {
    const r = await consultTokenService.previewIdentity(id);
    setPreview({ id, patient: r.ok ? r.data : null, refused: !r.ok && r.error === CONSULT_REVEAL_NOT_PERMITTED });
  };

  const revoke = async (id: string) => {
    await consultTokenService.revoke(id);
    load();
  };

  if (!links) return <LoadingState label={t(`${K}.loading`)} />;
  if (refused) return <div className="ps-auditlog-empty"><div className="ps-auditlog-empty-text">{t(`${K}.notPermitted`)}</div></div>;

  const shown = consultLinksShown(links, activeOnly);
  return (
    <section className="ps-consult-links" aria-labelledby="consult-links-title">
      <div className="ps-consult-links-head">
        <div>
          <h3 id="consult-links-title" className="ps-consult-links-title">{t(`${K}.title`)}</h3>
          <p className="ps-conf-hint">{t(`${K}.hint`)}</p>
        </div>
        <label className="ps-consult-links-filter">
          <input type="checkbox" checked={activeOnly} onChange={e => setActiveOnly(e.target.checked)} />
          {t(`${K}.activeOnly`)}
        </label>
      </div>
      {shown.length === 0 ? (
        <p className="ps-conf-hint">{t(activeOnly ? `${K}.emptyActive` : `${K}.empty`)}</p>
      ) : (
        <div className="ps-conf-table-wrap">
          <table className="ps-conf-table">
            <thead>
              <tr>
                <th className="ps-conf-th">{t(`${K}.columns.issued`)}</th>
                <th className="ps-conf-th">{t(`${K}.columns.case`)}</th>
                <th className="ps-conf-th">{t(`${K}.columns.consultant`)}</th>
                <th className="ps-conf-th">{t(`${K}.columns.scope`)}</th>
                <th className="ps-conf-th">{t(`${K}.columns.issuedBy`)}</th>
                <th className="ps-conf-th">{t(`${K}.columns.expires`)}</th>
                <th className="ps-conf-th">{t(`${K}.columns.status`)}</th>
                <th className="ps-conf-th">{t(`${K}.columns.views`)}</th>
                <th className="ps-conf-th"><span className="ps-sr-only">{t(`${K}.columns.actions`)}</span></th>
              </tr>
            </thead>
            <tbody>
              {shown.map(l => {
                const status = resolveConsultTokenStatus(l);
                return (
                  <tr key={l.id} className="ps-conf-tr">
                    <td className="ps-conf-td">{formatDateTime(l.issuedAt, i18n.language)}</td>
                    <td className="ps-conf-td" data-phi="accession">{l.scope.caseAccessionNumber}</td>
                    <td className="ps-conf-td">
                      {l.consultantIdentifier}
                      {l.consultantOrganization && <div className="ps-conf-hint">{l.consultantOrganization}</div>}
                    </td>
                    <td className="ps-conf-td">{l.scope.slideIds?.length ? t('externalConsultAccessModal.slideCount', { count: l.scope.slideIds.length }) : t('externalConsultAccessModal.fullCase')}</td>
                    <td className="ps-conf-td">{l.issuedByName}</td>
                    <td className="ps-conf-td">{formatDateTime(l.expiresAt, i18n.language)}</td>
                    <td className="ps-conf-td">
                      <span className={`eca-status-badge eca-status-badge--${status.toLowerCase()}`}>{t(`externalConsultAccessModal.status.${status.toLowerCase()}`)}</span>
                      <ConsultLifetimeLine link={l} />
                      {status === 'Revoked' && l.revokedAt && (
                        <div className="ps-conf-hint">{t(`${K}.revokedBy`, { name: l.revokedByName ?? l.revokedByUserId ?? '', date: formatDateTime(l.revokedAt, i18n.language) })}</div>
                      )}
                    </td>
                    <td className="ps-conf-td">
                      {l.accessCount > 0 ? t('externalConsultAccessModal.viewedCount', { count: l.accessCount, last: formatDateTime(l.lastAccessedAt, i18n.language) }) : t(`${K}.notViewed`)}
                    </td>
                    <td className="ps-conf-td">
                      <CapabilityButton capability="case:consult-link:reveal-identity" context={{ caseId: l.scope.caseId }} onClick={() => void previewIdentity(l.id)} className="eca-revoke-btn">
                        {t(`${K}.previewIdentity`)}
                      </CapabilityButton>
                      {preview?.id === l.id && (
                        <div className="ps-consult-identity-preview" data-phi="true" role="status">
                          {preview.patient?.identity === 'full' ? (
                            <>
                              {t('externalConsultViewPage.patientName', { lastName: preview.patient.lastName, firstName: preview.patient.firstName })}
                              {preview.patient.dateOfBirth && <>{t('externalConsultViewPage.separator')}{t('externalConsultViewPage.dobPrefix', { date: preview.patient.dateOfBirth })}</>}
                              <div className="ps-consult-identity-preview-note">{t(`${K}.previewAudited`)}</div>
                            </>
                          ) : t(preview.refused ? 'externalConsultAccessModal.revealNotPermitted' : `${K}.previewFailed`)}
                        </div>
                      )}
                      {status === 'Active' && (
                        <CapabilityButton capability="case:consult-link:revoke" context={{ caseId: l.scope.caseId }} onClick={() => void revoke(l.id)} className="eca-revoke-btn">
                          {t('externalConsultAccessModal.revoke')}
                        </CapabilityButton>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default ConsultLinksAuditSection;
