// src/components/InterfaceDictionary/ScopeReference.tsx
// ─────────────────────────────────────────────────
// Batch 612: what the mapping tool handles by configuration, and what still needs a
// code release. The lists are services/interfaceDictionary/scopeGuard.ts.
// ─────────────────────────────────────────────────
import React from 'react';
import { useTranslation } from 'react-i18next';
import { SCOPE_HANDLED_BY_MAPPER, SCOPE_NEEDS_CODE_RELEASE } from '@/services';

export const ScopeReference: React.FC = () => {
  const { t } = useTranslation();
  return (
    <details className="ps-idict-scope" data-testid="idict-scope">
      <summary>{t('interfaceDictionary.scope.title')}</summary>
      <div className="ps-idict-scope-cols">
        <div>
          <h5>{t('interfaceDictionary.scope.handledTitle')}</h5>
          <ul>{SCOPE_HANDLED_BY_MAPPER.map(id => <li key={id}>{t(`interfaceDictionary.scope.handled.${id}`)}</li>)}</ul>
        </div>
        <div>
          <h5>{t('interfaceDictionary.scope.releaseTitle')}</h5>
          <ul>{SCOPE_NEEDS_CODE_RELEASE.map(id => <li key={id}>{t(`interfaceDictionary.scope.release.${id}`)}</li>)}</ul>
        </div>
      </div>
    </details>
  );
};
