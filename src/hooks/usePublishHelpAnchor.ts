// src/hooks/usePublishHelpAnchor.ts — Batch 669d: a screen tells the top-bar Administrator Guide button which section is open.
import { useEffect, useSyncExternalStore } from 'react';
import { getHelpAnchor, setHelpAnchor, subscribeHelpAnchor } from '@/services/help/helpAnchorStore';

/** Publishes `anchor` for the top bar while the calling screen is mounted. */
export function usePublishHelpAnchor(anchor: string | null): void {
  useEffect(() => {
    setHelpAnchor(anchor);
    return () => setHelpAnchor(null);
  }, [anchor]);
}

/** The anchor a screen has published, or null. */
export function usePublishedHelpAnchor(): string | null {
  return useSyncExternalStore(subscribeHelpAnchor, getHelpAnchor, () => null);
}
