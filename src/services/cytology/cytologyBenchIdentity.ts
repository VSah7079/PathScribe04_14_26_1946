// src/services/cytology/cytologyBenchIdentity.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 760 (Cytology Workspace & Automated Screening Module spec §2.1, Pete, Nov 2, 2026): what the cytology
// screening and review screens show to identify a case, with no patient name, date of birth or MRN: the accession, the
// specimen or vial type (ThinPrep, SurePath, with the specimen's description), and the slide source identifiers (the
// ids on the slides' labels). Pure.
// ─────────────────────────────────────────────────────────────────────────────

interface SlideLike { displayId?: string }
interface SpecimenLike {
  label: string;
  description?: string;
  cytologyScreening?: { liquidBasedPlatform?: 'ThinPrep' | 'SurePath' | 'other' };
  decants?: readonly { stains?: readonly SlideLike[] }[];
  blocks?: readonly { stains?: readonly SlideLike[] }[];
}

export interface CytologyVial { label: string; platform?: 'ThinPrep' | 'SurePath'; description: string }
export interface CytologyCaseIdentity { accession: string; vials: CytologyVial[]; slideIds: string[] }

/** At most this many slide ids are listed (a case can have many slides; the rest are on the material panel). */
export const MAX_SLIDE_IDS = 3;

export function cytologyCaseIdentity(c: { id: string; accession?: { fullAccession?: string }; specimens?: readonly SpecimenLike[] }): CytologyCaseIdentity {
  const specimens = c.specimens ?? [];
  const vials = specimens.map(s => {
    const platform = s.cytologyScreening?.liquidBasedPlatform;
    return { label: s.label, description: s.description?.trim() || '—', ...(platform === 'ThinPrep' || platform === 'SurePath' ? { platform } : {}) };
  });
  const slideIds: string[] = [];
  for (const s of specimens) {
    for (const parent of [...(s.decants ?? []), ...(s.blocks ?? [])]) {
      for (const slide of parent.stains ?? []) if (slide.displayId && !slideIds.includes(slide.displayId)) slideIds.push(slide.displayId);
    }
  }
  return { accession: c.accession?.fullAccession ?? c.id, vials, slideIds: slideIds.slice(0, MAX_SLIDE_IDS) };
}
