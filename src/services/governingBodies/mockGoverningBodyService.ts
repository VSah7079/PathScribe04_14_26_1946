// src/services/governingBodies/mockGoverningBodyService.ts
import type { GoverningBody, IGoverningBodyService } from './IGoverningBodyService';

const STORAGE_KEY = 'pathscribe_governing_bodies';
const delay = (ms = 60) => new Promise(res => setTimeout(res, ms));

// Real seed, migrated from the hardcoded DEFAULT_BODIES constant that
// used to live directly in GoverningBodiesSection.tsx.
const DEFAULT_BODIES: GoverningBody[] = [
  { id: 'CAP',    label: 'CAP',    fullName: 'College of American Pathologists',               region: 'United States',          website: 'https://www.cap.org',        enabled: true,  syncEnabled: true,  isCustom: false },
  { id: 'RCPath', label: 'RCPath', fullName: 'Royal College of Pathologists',                  region: 'United Kingdom',          website: 'https://www.rcpath.org',     enabled: true,  syncEnabled: true,  isCustom: false },
  { id: 'ICCR',   label: 'ICCR',   fullName: 'International Collaboration on Cancer Reporting', region: 'International',           website: 'https://www.iccr-cancer.org',enabled: true,  syncEnabled: true,  isCustom: false },
  { id: 'RCPA',   label: 'RCPA',   fullName: 'Royal College of Pathologists of Australasia',   region: 'Australia / New Zealand', website: 'https://www.rcpa.edu.au',    enabled: false, syncEnabled: false, isCustom: false },
];

function loadBodies(): GoverningBody[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* fall through to seed */ }
  return DEFAULT_BODIES;
}

export const mockGoverningBodyService: IGoverningBodyService = {
  async getAll(): Promise<GoverningBody[]> {
    await delay();
    return loadBodies();
  },

  async saveAll(bodies: GoverningBody[]): Promise<void> {
    await delay();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bodies));
    } catch {
      // Real failure signal, not silently swallowed — the caller (Save
      // button handler) needs to know a save genuinely didn't happen,
      // the exact class of bug this whole fix exists to close.
      throw new Error('Failed to save governing bodies — storage write failed.');
    }
  },
};
