// src/components/Config/AI/HostingRegionsCard.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 557 (PS-539 phase 2d; readiness review §9 item 7): where this
// deployment keeps its data, shown to administrators beside the AI service's
// region (Batch 536). The database and file storage regions come from the API
// server's /api/config (services/runtimeConfig). Read only: the regions are
// the hosting's, not a setting. In the demo there is no server, and it says so.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { useTranslation } from 'react-i18next';
import { serverHosting } from '@/services/runtimeConfig/runtimeEnv';
import { hostingRegionRows } from '@/services/runtimeConfig/hostingRegions';

export const HostingRegionsCard: React.FC<{ aiRegion?: string; hosting?: ReturnType<typeof serverHosting> }> = ({ aiRegion, hosting }) => {
  const { t } = useTranslation();
  const rows = hostingRegionRows(hosting ?? serverHosting(), aiRegion);
  return (
    <section className="ps-hosting-regions" aria-labelledby="ps-hosting-regions-title">
      <h4 id="ps-hosting-regions-title" className="ps-hosting-regions__title">{t('hostingRegions.title')}</h4>
      <dl className="ps-hosting-regions__list">
        {rows.map(r => (
          <div key={r.kind} className="ps-hosting-regions__row">
            <dt>{t(`hostingRegions.kinds.${r.kind}`)}</dt>
            <dd>{r.region ?? t('hostingRegions.notReported')}</dd>
          </div>
        ))}
      </dl>
      <p className="ps-aiprovider-hint">{t('hostingRegions.note')}</p>
    </section>
  );
};
