// src/components/Workstation/BenchIdentity.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 759 (Patient Verification, Outside Case Tracking and Audit Logging spec, Pete, Nov 2, 2026). Two small pieces
// every bench header uses; presentation only (services/material/benchIdentity.ts decides what is shown):
//   ForeignIdTag    — for an outside case, the Foreign Identifier, highlighted, beside the accession number (§2.1);
//   TypedEntryCheck — after an id was typed instead of scanned, the two identifiers to check against the container:
//                     the accession and the specimen source (§2.3, §3). Inline: nothing to click.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { useTranslation } from 'react-i18next';
import { foreignIdentifiersOf } from '@/services/material/benchIdentity';
import type { OriginatingCase } from '@/types/case/OriginatingCase';
import './BenchIdentity.css';

export const ForeignIdTag: React.FC<{
  order?: { originatingCase?: OriginatingCase };
  /** The item being worked, then what it came from (block, then specimen); the first outside number is shown. */
  items?: readonly ({ externalId?: string; externalIdSource?: string } | null | undefined)[];
}> = ({ order, items }) => {
  const { t } = useTranslation();
  const ids = foreignIdentifiersOf(order, items);
  if (ids.length === 0) return null;
  return (
    <>
      {ids.map(id => (
        <span key={`${id.scope}-${id.value}`} className="ps-foreign-id" data-phi="accession">
          <span className="ps-foreign-id-label">{t(id.scope === 'case' ? 'benchIdentity.foreignCase' : 'benchIdentity.foreignItem')}</span>
          <strong className="ps-foreign-id-value">{id.value}</strong>
          {id.source && <span className="ps-foreign-id-source">{t('benchIdentity.foreignSource', { source: id.source })}</span>}
        </span>
      ))}
    </>
  );
};

export const TypedEntryCheck: React.FC<{ accession: string; source?: string }> = ({ accession, source }) => {
  const { t } = useTranslation();
  return (
    <p className="ps-typed-entry-check" role="status" data-phi="accession">
      {source ? t('benchIdentity.typedCheck', { accession, source }) : t('benchIdentity.typedCheckAccession', { accession })}
    </p>
  );
};
