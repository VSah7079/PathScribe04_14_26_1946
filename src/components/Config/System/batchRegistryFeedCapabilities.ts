// src/components/Config/System/batchRegistryFeedCapabilities.ts
// Batch 620 part S (PS-800): the capabilities the batch file feed screen checks (the service checks them too).
export const BATCH_FEED_CAPABILITY = 'config:batch-registry-feed:manage' as const;
export const BATCH_FILE_GENERATE_CAPABILITY = 'registry:batch-file:generate' as const;
