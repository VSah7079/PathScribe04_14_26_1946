// src/pages/BatchManagement/BatchColdChainPanel.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 610 (queue entry #17): the cold-chain readings for the smart container
// checked out to this batch, with the labelled Simulated temperature control.
// An excursion posted here goes through the ingestion service: the batch is held
// (the banner above shows it) and an open cold-chain deficiency is raised.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AssetReadingsPanel } from '@/components/ColdChain/AssetReadingsPanel';
import { hardwareContainerRegistryService, batchService } from '@/services';
import type { Batch } from '@/services/batches/IBatchService';
import type { HardwareContainer } from '@/services/hardwareContainers/IHardwareContainerRegistryService';

interface Props {
  batch: Batch;
  onBatchUpdated: (batch: Batch) => void;
}

export const BatchColdChainPanel: React.FC<Props> = ({ batch, onBatchUpdated }) => {
  const { t } = useTranslation();
  const [container, setContainer] = useState<HardwareContainer | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    hardwareContainerRegistryService.getAll().then(res => {
      if (cancelled) return;
      setContainer(res.ok ? res.data.find(c => c.isSmartContainer && c.currentBatchId === batch.id) ?? null : null);
    });
    return () => { cancelled = true; };
  }, [batch.id]);

  if (container === undefined) return null;
  return (
    <details className="ps-coldchain-batch" data-testid="batch-coldchain" open={!!batch.coldChainExcursion}>
      <summary className="ps-coldchain-batch-summary">{t('coldChain.batch.title')}</summary>
      {container ? (
        <AssetReadingsPanel
          assetType="hardware_container" assetId={container.id} assetLabel={container.rackId}
          onPosted={() => { void batchService.getById(batch.id).then(r => { if (r.ok) onBatchUpdated(r.data); }); }}
        />
      ) : (
        <p className="ps-conf-identity-sub" data-testid="batch-coldchain-none">{t('coldChain.batch.noSmartContainer')}</p>
      )}
    </details>
  );
};
