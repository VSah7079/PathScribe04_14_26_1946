// src/components/Config/System/ScopeReferenceSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 612: Configuration → System → Scope reference. Read only. For each setting
// area in services/scopeReference: whether it is set once for the organisation,
// separately for each performing facility, or at several levels, and how. Areas
// that have not been checked are not listed, and the screen says so.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { useTranslation } from 'react-i18next';
import { SETTING_SCOPES, entriesByScope } from '@/services/scopeReference/scopeReference';

const K = 'scopeReference';

const ScopeReferenceSection: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="ps-scope" data-testid="scope-reference-section">
      <div className="ps-conf-section-header">
        <div>
          <h2 className="ps-conf-section-title">{t(`${K}.title`)}</h2>
          <p className="ps-conf-section-subtitle">{t(`${K}.subtitle`)}</p>
        </div>
      </div>

      <section aria-labelledby="ps-scope-definitions">
        <h3 id="ps-scope-definitions" className="ps-scope-heading">{t(`${K}.definitions.heading`)}</h3>
        <dl className="ps-scope-definitions">
          {(['enterprise', 'facility', 'ordering'] as const).map(d => (
            <div key={d} className="ps-scope-definition">
              <dt>{t(`${K}.definitions.${d}Title`)}</dt>
              <dd>{t(`${K}.definitions.${d}Body`)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="ps-conf-table-wrap"><div className="ps-conf-table-scroll">
        <table className="ps-conf-table">
          <thead><tr>
            <th className="ps-conf-th">{t(`${K}.columns.area`)}</th>
            <th className="ps-conf-th">{t(`${K}.columns.scope`)}</th>
            <th className="ps-conf-th">{t(`${K}.columns.note`)}</th>
          </tr></thead>
          <tbody>
            {SETTING_SCOPES.flatMap(scope => entriesByScope(scope).map(e => (
              <tr key={e.id} className="ps-conf-tr" data-testid={`scope-row-${e.id}`}>
                <td className="ps-conf-td">{t(`${K}.entries.${e.id}.name`)}</td>
                <td className="ps-conf-td"><span className={`ps-scope-badge ps-scope-badge--${scope}`}>{t(`${K}.scopes.${scope}`)}</span></td>
                <td className="ps-conf-td">{t(`${K}.entries.${e.id}.note`)}</td>
              </tr>
            )))}
          </tbody>
        </table>
      </div></div>
      <p className="ps-scope-footer">{t(`${K}.footer`)}</p>
    </div>
  );
};

export default ScopeReferenceSection;
