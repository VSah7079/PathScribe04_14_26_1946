// src/hooks/useGuideAssets.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 505 (PS-475): the user and admin guides (utils/guideAssets.ts, about
// 5.5 MB of base64 PDF) were bundled into the start-up download, so every
// user fetched both guides before the app could start. They now load only
// when the About menu opens. The guide window must open straight from the
// click (browsers block a pop-up opened after a wait), so the buttons are
// enabled once the guides have arrived.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';

type GuideAssets = typeof import('@/utils/guideAssets');

let loading: Promise<GuideAssets> | null = null;
const loadGuideAssets = () => (loading ??= import('@/utils/guideAssets'));

/** The guide URLs once loaded (null until then); starts loading when `active`. */
export function useGuideAssets(active: boolean): GuideAssets | null {
  const [assets, setAssets] = useState<GuideAssets | null>(null);
  useEffect(() => {
    if (!active || assets) return;
    let live = true;
    void loadGuideAssets().then(m => { if (live) setAssets(m); });
    return () => { live = false; };
  }, [active, assets]);
  return assets;
}
