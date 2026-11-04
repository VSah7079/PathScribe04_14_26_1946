// src/components/Config/System/JurisdictionOverviewSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 610 (#163): Configuration → System → Jurisdiction Overview. A read-only
// picture of how each jurisdiction is set up: its facilities, the roles offered
// and who can sign out, the code systems, the AI policy, the retention body and
// the cancer registries. Each setting is edited on its own screen, so every row
// links there. Nothing on this page changes a setting. The data is gathered by
// services/jurisdictionOverview.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { loadJurisdictionOverview, JURISDICTION_SETTING_LINKS, type JurisdictionOverviewRow } from '@/services';
import '@/pathscribe.css';

const K = 'jurisdictionOverviewSection';

const JurisdictionOverviewSection: React.FC = () => {
  const { t } = useTranslation();
  const [rows, setRows] = useState<JurisdictionOverviewRow[] | null>(null);

  useEffect(() => { void loadJurisdictionOverview().then(setRows).catch(() => setRows([])); }, []);

  if (!rows) return null;

  const none = t(`${K}.none`);
  const list = (items: string[]) => (items.length ? items.join(', ') : none);

  return (
    <div data-testid="jurisdiction-overview">
      <div className="ps-rbuf-header">
        <h2 className="ps-rbuf-title">{t(`${K}.title`)}</h2>
        <p className="ps-rbuf-subtitle">{t(`${K}.subtitle`)}</p>
      </div>
      <p className="ps-conf-field-hint">{t(`${K}.readOnly`)}</p>

      {rows.map(row => {
        const j = row.jurisdiction;
        const aiText = row.aiPolicy.kind === 'unrestricted'
          ? t(`${K}.ai.unrestricted`)
          : [
            row.aiPolicy.services ? t(`${K}.ai.services`, { services: row.aiPolicy.services.join(', ') }) : t(`${K}.ai.allServices`),
            row.aiPolicy.regionLimited ? t(`${K}.ai.regionLimited`) : null,
            row.aiPolicy.facilityRules > 0 ? t(`${K}.ai.facilityRules`, { count: row.aiPolicy.facilityRules }) : null,
          ].filter(Boolean).join('; ');
        const codeText = row.codeSystems.length
          ? row.codeSystems.map(c => t(`${K}.codeSystem`, {
            system: t(`addCodeModal.systemLabel.${c.system}`, { defaultValue: c.system }),
            role: t(`${K}.role.${c.role}`),
          })).join(', ')
          : none;
        return (
          <div key={j} className="ps-conf-card ps-conf-card--spaced" data-testid={`jurisdiction-${j}`}>
            <div className="ps-conf-card-title">
              {t(`jurisdictionNames.${j}`)}
              {row.isLabDefault && <span className="ps-conf-badge">{t(`${K}.labDefault`)}</span>}
            </div>
            <table className="ps-conf-table">
              <tbody>
                <tr className="ps-conf-tr">
                  <th scope="row" className="ps-conf-th">{t(`${K}.rows.facilities`)}</th>
                  <td className="ps-conf-td">
                    {row.facilities.length === 0 ? none : row.facilities.map(f => f.active ? f.name : t(`${K}.inactiveFacility`, { name: f.name })).join(', ')}
                  </td>
                  <td className="ps-conf-td"><Link to={JURISDICTION_SETTING_LINKS.facilities}>{t(`${K}.change`)}</Link></td>
                </tr>
                <tr className="ps-conf-tr">
                  <th scope="row" className="ps-conf-th">{t(`${K}.rows.roles`)}</th>
                  <td className="ps-conf-td">{t(`${K}.rolesOffered`, { count: row.rolesOffered.length })}</td>
                  <td className="ps-conf-td"><Link to={JURISDICTION_SETTING_LINKS.roles}>{t(`${K}.change`)}</Link></td>
                </tr>
                <tr className="ps-conf-tr">
                  <th scope="row" className="ps-conf-th">{t(`${K}.rows.signing`)}</th>
                  <td className="ps-conf-td">
                    <div>{t(`${K}.canSignOut`, { roles: list(row.canSignOut) })}</div>
                    <div>{t(`${K}.needsCountersign`, { roles: list(row.needsCountersign) })}</div>
                  </td>
                  <td className="ps-conf-td"><Link to={JURISDICTION_SETTING_LINKS.signing}>{t(`${K}.change`)}</Link></td>
                </tr>
                <tr className="ps-conf-tr">
                  <th scope="row" className="ps-conf-th">{t(`${K}.rows.codeSystems`)}</th>
                  <td className="ps-conf-td">
                    {codeText} <span className="ps-conf-field-hint">{t(row.codePolicyIsCustom ? `${K}.policySaved` : `${K}.policyDefault`)}</span>
                  </td>
                  <td className="ps-conf-td"><Link to={JURISDICTION_SETTING_LINKS.codeSystems}>{t(`${K}.change`)}</Link></td>
                </tr>
                <tr className="ps-conf-tr">
                  <th scope="row" className="ps-conf-th">{t(`${K}.rows.ai`)}</th>
                  <td className="ps-conf-td">{aiText}</td>
                  <td className="ps-conf-td"><Link to={JURISDICTION_SETTING_LINKS.aiPolicy}>{t(`${K}.change`)}</Link></td>
                </tr>
                <tr className="ps-conf-tr">
                  <th scope="row" className="ps-conf-th">{t(`${K}.rows.retention`)}</th>
                  <td className="ps-conf-td">{list(row.retentionBodies)}</td>
                  <td className="ps-conf-td"><Link to={JURISDICTION_SETTING_LINKS.retention}>{t(`${K}.change`)}</Link></td>
                </tr>
                <tr className="ps-conf-tr">
                  <th scope="row" className="ps-conf-th">{t(`${K}.rows.registries`)}</th>
                  <td className="ps-conf-td">{list(row.registryLabelIds.map(id => t(`cancerRegistrySection.registries.${id}`, { defaultValue: id })))}</td>
                  <td className="ps-conf-td"><Link to={JURISDICTION_SETTING_LINKS.registries}>{t(`${K}.change`)}</Link></td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
};

export default JurisdictionOverviewSection;
