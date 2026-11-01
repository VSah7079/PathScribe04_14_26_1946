// src/services/batches/wallDisplayDemoBatches.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 747 (Pete's seed row S8, Video 6: "Eight to fifteen items per view, mixing STAT, near target and overdue. All
// times relative to the reset moment"). The open batches that carry the wall-volume cases' material
// (services/cases/demoWallVolumeCases.ts) through Desert Valley's histology:
//   Grossing and Intake       three decalcification vessels (one overdue, one due within 30 minutes, one with hours
//                             left) and five processor baskets, one STAT
//   Embedding and Microtome   three baskets at Embedding and three racks at the microtome, one STAT (with the open
//                             add-on orders the view adds itself)
//   Staining and IHC          seven staining racks on the stainers (loaded, in process, completed, one run failed),
//                             one STAT
//   Send-Out and Reference    seven referral batches to the three reference laboratories, one STAT, one with a
//                             cold-chain excursion not yet acknowledged
// and, at the second facility (Midwest Pathology Associates), a processor basket, two microtome racks and two staining
// racks, so a profile there shows its own, quieter lab.
// The scanner runs for Diagnostic Sign-Out and Scanner are wallScanDemoBatches below. Added to a browser's stored
// batches when missing (mockBatchService.ts), like batchDemoSeeds.ts. Pure: takes a clock.
// ─────────────────────────────────────────────────────────────────────────────

import type { Batch, BatchItem } from './IBatchService';
import type { WsiScanBatch, WsiSlideScanStatus } from '../digitalPathology/IWsiScanBatchService';
import { REFERENCE_LAB_IDS } from '../facilities/referenceLabSeeds';
import { WALL_VOLUME_CASE_SPECS, wallVolumeBlockIds, wallVolumeSlideIds, type WallVolumeCaseSpec, type WallVolumeStage } from '../cases/demoWallVolumeCases';

const at = (stage: WallVolumeStage, site: WallVolumeCaseSpec['site'] = 'dvmc') => WALL_VOLUME_CASE_SPECS.filter(s => s.stage === stage && s.site === site);
const TECH = { createdByUserId: 'HT-001', createdByUserName: 'Kevin Brooks' };

export function wallDisplayDemoBatches(now: number = Date.now()): Batch[] {
  const minutesAgo = (m: number) => new Date(now - m * 60_000).toISOString();
  const items = (cases: readonly WallVolumeCaseSpec[], material: 'block' | 'slide', addedMinutesAgo: number): BatchItem[] =>
    cases.flatMap(c => (material === 'block' ? wallVolumeBlockIds(c) : wallVolumeSlideIds(c)).map((displayId, i) => ({
      id: `bdi-wall-${displayId}`, materialType: material, displayId, caseAccession: c.id, addedAt: minutesAgo(addedMinutesAgo - i),
      addedByUserId: TECH.createdByUserId, addedByUserName: TECH.createdByUserName,
    })));
  const batch = (id: string, masterBarcode: string, fields: Partial<Batch> & Pick<Batch, 'processingNode' | 'containerType' | 'protocol' | 'items'>, createdMinutesAgo: number): Batch => ({
    id, masterBarcode, identifierMode: 'disposable', priority: fields.items.some(i => WALL_VOLUME_CASE_SPECS.find(c => c.id === i.caseAccession)?.stat) ? 'STAT' : 'Routine',
    status: 'active', unexpectedScans: [], createdAt: minutesAgo(createdMinutesAgo), ...TECH, ...fields,
  } as Batch);

  const decal = at('decal');
  const processing = at('processing');
  const embedding = at('embedding');
  const microtomy = at('microtomy');
  const staining = at('staining');
  const referral = at('referral');

  // Decalcification: elapsed against target gives overdue, due within 30 minutes, and hours left.
  const DECAL: { solutionType: Batch['solutionType']; target: number; elapsed: number }[] = [
    { solutionType: 'Rapid Decal (Formic/HCl)', target: 240, elapsed: 290 },
    { solutionType: 'EDTA', target: 480, elapsed: 460 },
    { solutionType: 'EDTA', target: 1440, elapsed: 150 },
  ];
  const PROTOCOLS = ['Biopsy, rapid', 'Overnight routine', 'Biopsy, rapid', 'Overnight routine', 'Fatty tissue, extended'];
  const STAINERS: Batch['stainingInstrumentStatus'][] = ['In Process', 'In Process', 'Loaded to Instrument', 'Run Completed', 'In Process', 'Run Failed', 'Loaded to Instrument'];
  const LABS = [REFERENCE_LAB_IDS.summit, REFERENCE_LAB_IDS.pacific, REFERENCE_LAB_IDS.greatLakes];
  const TESTS = ['NGS Solid Tumor Panel', 'MSI by PCR', 'Lymphoma FISH Panel', 'BRAF V600E mutation PCR', 'NGS Solid Tumor Panel', 'Sarcoma FISH Panel', 'Thyroid molecular panel'];

  return [
    ...decal.map((c, i) => batch(`batch-wall-decal-${i + 1}`, `CONT-DCL-WALL-${i + 1}`, {
      processingNode: 'Decal / Special Processing', containerType: 'Decal Vessel', protocol: DECAL[i].solutionType!,
      solutionType: DECAL[i].solutionType, targetDurationMinutes: DECAL[i].target, items: items([c], 'block', DECAL[i].elapsed),
    }, DECAL[i].elapsed)),
    ...[0, 1, 2, 3, 4].map(i => batch(`batch-wall-proc-${i + 1}`, `CONT-PRC-WALL-${i + 1}`, {
      processingNode: 'Processing', containerType: 'Tissue Processor Basket', protocol: PROTOCOLS[i],
      items: items(processing.slice(i * 2, i * 2 + 2), 'block', 40 + i * 70),
    }, 30 + i * 70)),
    ...embedding.map((c, i) => batch(`batch-wall-embed-${i + 1}`, `CONT-EMB-WALL-${i + 1}`, {
      processingNode: 'Embedding', containerType: 'Tissue Processor Basket', protocol: 'Overnight routine', items: items([c], 'block', 25 + i * 35),
    }, 20 + i * 35)),
    ...microtomy.map((c, i) => batch(`batch-wall-micro-${i + 1}`, `CONT-MIC-WALL-${i + 1}`, {
      processingNode: 'Microtomy / Sectioning', containerType: 'Ad-Hoc Batch', protocol: 'H&E levels', items: items([c], 'block', 15 + i * 40),
    }, 10 + i * 40)),
    ...staining.map((c, i) => batch(`batch-wall-stain-${i + 1}`, `CONT-STN-WALL-${i + 1}`, {
      processingNode: 'Staining', containerType: 'Staining Rack', protocol: 'H&E routine', stainingInstrumentStatus: STAINERS[i],
      items: items([c], 'slide', 12 + i * 22),
    }, 8 + i * 22)),
    // The second facility.
    batch('batch-wall-mpa-proc-1', 'CONT-PRC-WALL-MPA-1', { processingNode: 'Processing', containerType: 'Tissue Processor Basket', protocol: 'Overnight routine', items: items(at('processing', 'mpa'), 'block', 100) }, 95),
    ...at('microtomy', 'mpa').map((c, i) => batch(`batch-wall-mpa-micro-${i + 1}`, `CONT-MIC-WALL-MPA-${i + 1}`, {
      processingNode: 'Microtomy / Sectioning', containerType: 'Ad-Hoc Batch', protocol: 'H&E levels', items: items([c], 'block', 30 + i * 45),
    }, 25 + i * 45)),
    ...at('staining', 'mpa').map((c, i) => batch(`batch-wall-mpa-stain-${i + 1}`, `CONT-STN-WALL-MPA-${i + 1}`, {
      processingNode: 'Staining', containerType: 'Staining Rack', protocol: 'H&E routine', stainingInstrumentStatus: i === 0 ? 'In Process' : 'Loaded to Instrument',
      items: items([c], 'slide', 20 + i * 30),
    }, 15 + i * 30)),
    ...referral.map((c, i) => batch(`batch-wall-ref-${i + 1}`, `CONT-REF-WALL-${i + 1}`, {
      processingNode: 'External Referral', containerType: 'Ad-Hoc Batch', protocol: i === 2 ? 'Refrigerated courier' : 'Ambient courier',
      referralDestinationFacilityId: LABS[i % LABS.length], referralTestRequested: TESTS[i],
      ...(i === 2 ? { coldChainExcursion: { detectedAt: minutesAgo(50), readingId: 'demo-reading-wall-3', temperatureCelsius: 9.8 } } : {}),
      items: items([c], 'block', 90 + i * 150),
    }, 80 + i * 150)),
  ];
}

/** Diagnostic Sign-Out and Scanner: eight scanner runs of the scanning cases' H&E slides, loaded to completed, with one
 *  slide that failed to scan and one whose image failed quality control. */
export function wallScanDemoBatches(now: number = Date.now()): WsiScanBatch[] {
  const minutesAgo = (m: number) => new Date(now - m * 60_000).toISOString();
  const cases = at('scanning');
  const RUNS: { status: WsiScanBatch['status']; slides: WsiSlideScanStatus[]; failure?: 'scan' | 'qc' }[] = [
    { status: 'loaded', slides: ['pending', 'pending'] },
    { status: 'scanning', slides: ['completed', 'scanning'] },
    { status: 'scanning', slides: ['scanning', 'pending'] },
    { status: 'scanning', slides: ['completed', 'failed'], failure: 'scan' },
    { status: 'completed', slides: ['completed', 'completed'] },
    { status: 'completed', slides: ['completed', 'completed'], failure: 'qc' },
    { status: 'loaded', slides: ['pending', 'pending'] },
    { status: 'scanning', slides: ['completed', 'scanning'] },
  ];
  return cases.map((c, i) => {
    const run = RUNS[i % RUNS.length];
    const loaded = 15 + i * 25;
    return {
      id: `wsi-batch-wall-${i + 1}`, batchBarcode: `WSI-WALL-${String(i + 1).padStart(4, '0')}`, scannerInstrumentId: i % 2 === 0 ? 'APERIO_GT450_01' : 'APERIO_GT450_02',
      status: run.status, loadedAt: minutesAgo(loaded), dispatchedAt: minutesAgo(loaded - 3),
      slides: run.slides.map((scanStatus, s) => ({
        slidePosition: String(s + 1), caseId: c.id, specimenId: `${c.id}-SP-1`, scanStatus, acquisitionMode: 'single_plane' as const,
        ...(scanStatus === 'completed' ? { qcPassed: !(run.failure === 'qc' && s === 1), scanCompletedAt: minutesAgo(loaded - 8 - s * 4) } : {}),
        ...(scanStatus === 'failed' ? { failureReason: 'Slide label unreadable' } : {}),
        ...(run.failure === 'qc' && s === 1 ? { failureReason: 'Out-of-focus' } : {}),
      })),
    } as WsiScanBatch;
  });
}
