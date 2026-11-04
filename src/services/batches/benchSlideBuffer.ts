// src/services/batches/benchSlideBuffer.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 758 (Pete, Nov 1, 2026: "Order B, Scan-Last"): slides cut and confirmed
// at a Microtome station before any staining rack was scanned wait on the bench
// here. Scanning a staining rack then puts every slide on that station's bench
// into it and seals it. Scan-First (rack scanned before the first slide) is
// unchanged: each confirmed slide goes straight into the open rack.
//
// The bench belongs to one station only (Pete: "strictly scoped to the specific
// station"): technician A's rack scan never sweeps technician B's bench. Station
// ids are unique across facilities and tenants, so the station id alone scopes
// it. It is kept per station through dataStorage, so a page reload or a
// navigation keeps it; with the API server configured dataStorage is in memory,
// which is why the bench asks before the tab closes or the user signs out.
// Planned: held by the API server per station (docs/architecture/STATION_TRACKING_API.md).
// ─────────────────────────────────────────────────────────────────────────────
import { dataStorage } from '@/services/browserData/dataStorage';

/** One slide on the bench, not yet in a rack. */
export interface BenchSlide {
  slideId: string;
  caseAccession?: string;
  confirmedAt: string;
  userId: string;
}

const KEY_PREFIX = 'pathscribe.benchSlides.';

export interface BenchSlideBuffer {
  list(stationId: string): BenchSlide[];
  /** Adds a slide (once); returns the bench as it is now. */
  add(stationId: string, slide: BenchSlide): BenchSlide[];
  /** Takes slides off the bench (they went into a rack); returns the bench as it is now. */
  remove(stationId: string, slideIds: readonly string[]): BenchSlide[];
}

export function createBenchSlideBuffer(storage: Storage = dataStorage): BenchSlideBuffer {
  const read = (stationId: string): BenchSlide[] => {
    try {
      const raw = storage.getItem(KEY_PREFIX + stationId);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter(s => s && typeof s.slideId === 'string') : [];
    } catch { return []; }
  };
  const write = (stationId: string, slides: BenchSlide[]): BenchSlide[] => {
    if (slides.length === 0) storage.removeItem(KEY_PREFIX + stationId);
    else storage.setItem(KEY_PREFIX + stationId, JSON.stringify(slides));
    return slides;
  };
  const same = (a: string, b: string) => a.toUpperCase() === b.toUpperCase();
  return {
    list: stationId => (stationId ? read(stationId) : []),
    add: (stationId, slide) => {
      const now = read(stationId);
      return now.some(s => same(s.slideId, slide.slideId)) ? now : write(stationId, [...now, slide]);
    },
    remove: (stationId, slideIds) => write(stationId, read(stationId).filter(s => !slideIds.some(id => same(id, s.slideId)))),
  };
}

export const benchSlideBuffer = createBenchSlideBuffer();
