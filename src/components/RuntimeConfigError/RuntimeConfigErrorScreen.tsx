// src/components/RuntimeConfigError/RuntimeConfigErrorScreen.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 547 (PS-539 phase 2d): what the hospital's IT sees when config.json is
// wrong: each problem, by setting name, in plain words. No setting value is
// shown (a value can name an internal host), only its name.
// Batch 557: a problem in the API server's /api/config says so.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { RuntimeConfigProblem } from '@/services/runtimeConfig/runtimeSettings';

export const RuntimeConfigErrorScreen: React.FC<{ problems: RuntimeConfigProblem[] }> = ({ problems }) => {
  const { t } = useTranslation();
  return (
    <main className="ps-runtime-config-error">
      <div role="alert">
      <h1 className="ps-runtime-config-error__title">{t('runtimeConfigError.title')}</h1>
      <p className="ps-runtime-config-error__intro">{t('runtimeConfigError.intro')}</p>
      <ul className="ps-runtime-config-error__list">
        {problems.map((p, i) => (
          <li key={`${p.key ?? ''}-${p.code}-${i}`} className="ps-runtime-config-error__item">
            {p.key && <code className="ps-runtime-config-error__key">{p.key}</code>}
            {p.from === 'server' && <span className="ps-runtime-config-error__from">{t('runtimeConfigError.fromServer')}</span>}
            <span>{t(`runtimeConfigError.problems.${p.code}`)}</span>
          </li>
        ))}
      </ul>
      <p className="ps-runtime-config-error__help">{t('runtimeConfigError.help')}</p>
      </div>
    </main>
  );
};
