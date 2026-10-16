// src/services/reportAppearance/pageSetup.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 431 (Pete: page size is lab policy, set by the printer stock, not a
// personal choice): the lab's page size and margins for reports.
//
//   • Set in Configuration → System → Document Style; changing it needs
//     config:report-appearance:manage, the same as the rest of report
//     appearance, checked here.
//   • The template preview opens at this size. Trying another size in the
//     preview is for that preview only and isn't saved.
//   • Kept in the lab settings store (PS-345: the API server). The first read
//     carries over the size and margins the preview remembered before (the
//     old 'ps_preview_page_size' / 'ps_preview_margins' browser values).
//
// Not yet used by the PDF renderer (functions/main.py prints A4 today);
// that's server work, on PS-345.
// ─────────────────────────────────────────────────────────────────────────────

import { readLabSetting, saveLabSetting } from '../labSettings/labSettingsStore';
import { permitConfigChange } from '../authorization/guardConfigWrites';
import { dataStorage } from '../browserData/dataStorage';

// Paper size names (A4, US Letter, ...) are standard names and stay literal in
// every locale; only the "where it's used" text is translated.
export interface PageSize { id: string; label: string; widthMm: number; heightMm: number; }
export const PAGE_SIZES: readonly PageSize[] = [
  { id: 'a4',     label: 'A4',        widthMm: 210, heightMm: 297 },
  { id: 'letter', label: 'US Letter', widthMm: 216, heightMm: 279 },
  { id: 'legal',  label: 'US Legal',  widthMm: 216, heightMm: 356 },
  { id: 'a3',     label: 'A3',        widthMm: 297, heightMm: 420 },
  { id: 'b5',     label: 'B5',        widthMm: 176, heightMm: 250 },
];
export const PAGE_SIZE_REGION_KEY: Record<string, string> = {
  a4: 'templatePreviewPanel.pageSize.region.a4',
  letter: 'templatePreviewPanel.pageSize.region.letter',
  legal: 'templatePreviewPanel.pageSize.region.legal',
  a3: 'templatePreviewPanel.pageSize.region.a3',
  b5: 'templatePreviewPanel.pageSize.region.b5',
};

export interface Margins { top: number; right: number; bottom: number; left: number; }
export const DEFAULT_MARGINS: Margins = { top: 25, right: 20, bottom: 25, left: 20 };
export const MARGIN_LIMITS = { min: 5, max: 50 } as const;

export interface PageSetup { pageSizeId: string; margins: Margins; }
export const DEFAULT_PAGE_SETUP: PageSetup = { pageSizeId: 'a4', margins: DEFAULT_MARGINS };

const PAGE_SETUP_KEY = 'pathscribe_org_page_setup';
const LEGACY_SIZE_KEY = 'ps_preview_page_size';
const LEGACY_MARGINS_KEY = 'ps_preview_margins';

const clampMargin = (v: unknown, fallback: number): number => {
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : fallback;
  return Math.min(MARGIN_LIMITS.max, Math.max(MARGIN_LIMITS.min, n));
};

/** A usable page setup from whatever was saved (pure; tested). */
export function normalisePageSetup(raw: Partial<PageSetup> | null | undefined): PageSetup {
  const pageSizeId = PAGE_SIZES.some(p => p.id === raw?.pageSizeId) ? raw!.pageSizeId! : DEFAULT_PAGE_SETUP.pageSizeId;
  const m = raw?.margins ?? DEFAULT_MARGINS;
  return {
    pageSizeId,
    margins: {
      top: clampMargin(m.top, DEFAULT_MARGINS.top),
      right: clampMargin(m.right, DEFAULT_MARGINS.right),
      bottom: clampMargin(m.bottom, DEFAULT_MARGINS.bottom),
      left: clampMargin(m.left, DEFAULT_MARGINS.left),
    },
  };
}

function legacyPageSetup(): Partial<PageSetup> | null {
  try {
    const size = dataStorage.getItem(LEGACY_SIZE_KEY);
    const margins = dataStorage.getItem(LEGACY_MARGINS_KEY);
    if (size === null && margins === null) return null;
    return { pageSizeId: size ?? undefined, margins: margins ? JSON.parse(margins) as Margins : undefined };
  } catch { return null; }
}

/** The lab's page size and margins. */
export function getLabPageSetup(): PageSetup {
  const saved = readLabSetting<Partial<PageSetup> | null>(PAGE_SETUP_KEY, null);
  if (saved) return normalisePageSetup(saved);
  const legacy = legacyPageSetup();
  if (!legacy) return DEFAULT_PAGE_SETUP;
  const carried = normalisePageSetup(legacy);
  saveLabSetting(PAGE_SETUP_KEY, carried);
  try { dataStorage.removeItem(LEGACY_SIZE_KEY); dataStorage.removeItem(LEGACY_MARGINS_KEY); } catch { /* fine */ }
  return carried;
}

/** Saves the lab's page setup. False when refused (nothing saved). */
export async function saveLabPageSetup(setup: PageSetup): Promise<boolean> {
  const { authorizationService } = await import('../authorization/defaultAuthorizationService');
  if (!(await permitConfigChange(authorizationService.enforce('config:report-appearance:manage'), 'config:report-appearance:manage'))) return false;
  saveLabSetting(PAGE_SETUP_KEY, normalisePageSetup(setup));
  return true;
}
