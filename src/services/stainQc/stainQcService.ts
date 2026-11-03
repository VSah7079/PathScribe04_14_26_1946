// src/services/stainQc/stainQcService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 763: the Post-Stain / Pre-Distribution QC checkpoint, built from its dependencies (the demo's wiring is
// mockStainQcService.ts; the API server's is httpStainQcService.ts).
//
//   openRun            the staining run's QC opens when the stainer reports Run Completed or the rack reaches Slide
//                      Distribution: its slides go to QC Pending, or straight on when its stainer auto-accepts. System.
//   vendorRunResult    Option A: the stainer's own sign-off, through the interface engine. System.
//   signOffRun         Option B: stain:qc:sign-off (and stain:qc:override over a run waiting for Option A)    audited
//   queueImages        scanned images that wait for QC when their scan batch is unloaded. System.
//   decideImage        scan:image-qc:sign-off                                                                 audited
//   getCheckpoint      what waits; saveSettings config:stain-qc:manage                                          audited
//
// A run leaves Staining for distribution only once its QC is decided (runQcAllowsDistribution): checked by the batch
// service when the rack is moved on. Slides that failed stay held (QC Failed: re-stain; Recut Requested: re-cut), and
// Slide Distribution refuses them. Audit text is literal English and names the rack, the slides and the instrument.
// ─────────────────────────────────────────────────────────────────────────────
import type { ServiceResult } from '../types';
import type { IAuthorizationService } from '../authorization/authorizationService';
import { STAIN_QC_ERRORS as E, type IStainQcService } from './IStainQcService';
import { qcModeFor, runStatusFrom, signOffProblems, slideStatusFromQc, DEFAULT_STAIN_QC_SETTINGS } from './stainQcRules';
import type { ImageQcItem, QcMode, SlideQcOutcome, StainQcSettings, StainRunQc } from './stainQcTypes';
import { QC_MODES } from './stainQcTypes';

export interface StainQcStore {
  settings(): Promise<StainQcSettings | null>;
  saveSettings(s: StainQcSettings): Promise<void>;
  runs(): Promise<StainRunQc[]>;
  saveRuns(r: StainRunQc[]): Promise<void>;
  images(): Promise<ImageQcItem[]>;
  saveImages(i: ImageQcItem[]): Promise<void>;
}

export interface StainQcDeps {
  authorization: Pick<IAuthorizationService, 'enforce' | 'evaluate'>;
  store: StainQcStore;
  /** An instrument by its id or code (the register's), or null. */
  equipment: (idOrCode: string) => Promise<{ id: string; code: string; kind: string; qcMode?: QcMode } | null>;
  /** Writes each slide's new stain status on its case. */
  setSlideStatuses: (updates: { slideId: string; caseAccession: string; status: string }[]) => Promise<void>;
  /** Writes a scanned slide's image decision: released to the pathologist ('scanned'), or back to be scanned again
   *  ('imageQcFailed'). */
  setImageOutcome: (u: { caseId: string; stainId: string; blockId: string; outcome: 'scanned' | 'imageQcFailed' }) => Promise<void>;
  /** Records a PathScribe sign-off as the run's visual read, so the sign-out QC gate (resolveStainQcGate.ts) sees it too. */
  recordVisualRead?: (batchId: string, actor: { userId: string; userName: string }) => Promise<unknown>;
  now: () => Date;
  actor: () => { userId: string; userName: string };
  audit: (entry: { event: string; detail: string; caseId: string | null; user: string; type?: 'user' | 'system' }) => Promise<unknown>;
}

const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const refuse = <T>(error: string): ServiceResult<T> => ({ ok: false, error });

export interface StainQcService extends IStainQcService {
  /** Opens (once) the QC of a staining run; returns it. System: no capability (the stainer's report, or the rack scanned
   *  at Slide Distribution). */
  openRun(run: { batchId: string; masterBarcode: string; stainerIdOrCode?: string | null; slides: { slideId: string; caseAccession: string }[] }): Promise<StainRunQc>;
  /** The QC of a run, or null. */
  runQc(batchId: string): Promise<StainRunQc | null>;
  /** Option A: the stainer's own sign-off (the interface engine's message). System. */
  vendorRunResult(r: { batchId: string; result: 'pass' | 'fail'; failedSlideIds?: string[]; vendorRef?: string }): Promise<ServiceResult<StainRunQc>>;
  /** The image QC mode of a scanner (its own, else the default). */
  scannerMode(scannerInstrumentId: string): Promise<QcMode>;
  /** Scanned images of an unloaded scan batch that wait for QC (the batch's unload already marked them). System. */
  queueImages(items: Omit<ImageQcItem, 'status' | 'receivedAt'>[]): Promise<void>;
}

export function createStainQcService(deps: StainQcDeps): StainQcService {
  const log = (event: string, detail: string, caseId: string | null, type: 'user' | 'system' = 'user') =>
    deps.audit({ event, detail, caseId, user: type === 'system' ? 'System' : deps.actor().userName, type }).catch(() => undefined);
  const settings = async () => (await deps.store.settings()) ?? DEFAULT_STAIN_QC_SETTINGS;
  const saveRun = async (run: StainRunQc) => {
    const all = await deps.store.runs();
    await deps.store.saveRuns(all.some(r => r.batchId === run.batchId) ? all.map(r => (r.batchId === run.batchId ? run : r)) : [run, ...all].slice(0, 500));
  };
  const allowed = async (key: 'stain:qc:sign-off' | 'scan:image-qc:sign-off') => (await deps.authorization.evaluate(key)).allowed;

  async function decide(run: StainRunQc, outcomes: SlideQcOutcome[], via: 'auto' | 'vendor' | 'pathscribe', by: string, extra: Partial<StainRunQc> = {}): Promise<StainRunQc> {
    const decided: StainRunQc = { ...run, ...extra, status: runStatusFrom(outcomes), outcomes, via, decidedAt: deps.now().toISOString(), decidedBy: by };
    await saveRun(decided);
    await deps.setSlideStatuses(outcomes.map(o => ({ slideId: o.slideId, caseAccession: o.caseAccession, status: slideStatusFromQc(o) }))).catch(() => undefined);
    if (via === 'pathscribe' && deps.recordVisualRead) await deps.recordVisualRead(run.batchId, deps.actor()).catch(() => undefined);
    const failed = outcomes.filter(o => o.outcome === 'fail');
    const accessions = [...new Set(outcomes.map(o => o.caseAccession))];
    for (const acc of accessions) {
      const mine = failed.filter(o => o.caseAccession === acc);
      void log(mine.length ? 'Stain QC Failed' : 'Stain QC Passed',
        `Staining run ${run.masterBarcode}${run.stainerEquipmentId ? ` (stainer ${run.stainerEquipmentId})` : ''}: QC ${via === 'auto' ? 'auto-accepted' : via === 'vendor' ? 'signed off by the instrument' : run.mode === 'vendorSignOff' ? 'signed off in PathScribe instead of the stainer (override)' : 'signed off in PathScribe'}; ${mine.length ? mine.map(o => `${o.slideId} failed${o.reason ? ` (${o.reason})` : ''}, ${o.action === 'recut' ? 're-cut' : 're-stain'} requested`).join('; ') : 'all slides passed'}.`,
        acc, via === 'pathscribe' ? 'user' : 'system');
    }
    return decided;
  }

  return {
    async getSettings() {
      // Reading the defaults is allowed to anyone who signs off or configures QC (evaluated, so nothing is audited as refused).
      const any = (await allowed('stain:qc:sign-off')) || (await allowed('scan:image-qc:sign-off')) || (await deps.authorization.evaluate('config:stain-qc:manage')).allowed;
      if (!any) return refuse(E.notPermitted);
      return ok(await settings());
    },

    async saveSettings(s) {
      if (!(await deps.authorization.enforce('config:stain-qc:manage')).allowed) return refuse(E.notPermitted);
      if (!QC_MODES.includes(s.defaultStainerMode) || !QC_MODES.includes(s.defaultScannerMode)) return refuse(E.invalid);
      const saved: StainQcSettings = { defaultStainerMode: s.defaultStainerMode, defaultScannerMode: s.defaultScannerMode, updatedAt: deps.now().toISOString(), updatedBy: deps.actor().userName };
      await deps.store.saveSettings(saved);
      void log('Stain QC Settings Saved', `QC defaults: stainers ${saved.defaultStainerMode}, scanners ${saved.defaultScannerMode}.`, null);
      return ok(saved);
    },

    async getCheckpoint() {
      const [runs, images] = await Promise.all([deps.store.runs(), deps.store.images()]);
      const seeRuns = await allowed('stain:qc:sign-off');
      const seeImages = await allowed('scan:image-qc:sign-off');
      if (!seeRuns && !seeImages) return refuse(E.notPermitted);
      return ok({
        runs: seeRuns ? runs.filter(r => r.status === 'pending').sort((a, b) => a.openedAt.localeCompare(b.openedAt)) : [],
        images: seeImages ? images.filter(i => i.status === 'pending').sort((a, b) => a.receivedAt.localeCompare(b.receivedAt)) : [],
      });
    },

    async openRun(r) {
      const existing = (await deps.store.runs()).find(x => x.batchId === r.batchId);
      if (existing) return existing;
      const stainer = r.stainerIdOrCode ? await deps.equipment(r.stainerIdOrCode) : null;
      const mode = qcModeFor(stainer, await settings(), 'stainer');
      const run: StainRunQc = { batchId: r.batchId, masterBarcode: r.masterBarcode, stainerEquipmentId: stainer?.id ?? null, mode, status: 'pending', slides: r.slides, openedAt: deps.now().toISOString() };
      // A run with no slides has nothing to check.
      if (mode === 'autoAccept' || r.slides.length === 0) return decide(run, r.slides.map(s => ({ ...s, outcome: 'pass' as const })), 'auto', 'System');
      await saveRun(run);
      await deps.setSlideStatuses(r.slides.map(s => ({ ...s, status: 'QC Pending' }))).catch(() => undefined);
      void log('Stain QC Pending', `Staining run ${r.masterBarcode}${run.stainerEquipmentId ? ` (stainer ${run.stainerEquipmentId})` : ''}: ${r.slides.length} slide(s) wait for QC (${mode === 'vendorSignOff' ? "the instrument's sign-off" : 'a PathScribe sign-off'}).`, null, 'system');
      return run;
    },

    async runQc(batchId) {
      return (await deps.store.runs()).find(r => r.batchId === batchId) ?? null;
    },

    async vendorRunResult(r) {
      const run = (await deps.store.runs()).find(x => x.batchId === r.batchId);
      if (!run) return refuse(E.notFound);
      if (run.status !== 'pending') return refuse(E.alreadyDecided);
      // Only a stainer set to sign off its own runs decides them; otherwise a person signs off in PathScribe.
      if (run.mode !== 'vendorSignOff') {
        void log('Stain QC Instrument Result Ignored', `Staining run ${run.masterBarcode}: the instrument sent a QC ${r.result}, but this run is signed off in PathScribe; the result was not applied.`, null, 'system');
        return refuse(E.notVendorMode);
      }
      const failed = new Set(r.result === 'fail' ? (r.failedSlideIds?.length ? r.failedSlideIds : run.slides.map(s => s.slideId)) : []);
      // The instrument cannot say re-cut from re-stain: a failed slide is held for re-stain, and the technologist can
      // ask for a re-cut on the case.
      const outcomes = run.slides.map(s => (failed.has(s.slideId) ? { ...s, outcome: 'fail' as const, action: 'restain' as const } : { ...s, outcome: 'pass' as const }));
      return ok(await decide(run, outcomes, 'vendor', 'System', r.vendorRef ? { vendorRef: r.vendorRef } : {}));
    },

    async signOffRun(batchId, outcomes, stainerEquipmentId) {
      if (!(await deps.authorization.enforce('stain:qc:sign-off')).allowed) return refuse(E.notPermitted);
      const run = (await deps.store.runs()).find(x => x.batchId === batchId);
      if (!run) return refuse(E.notFound);
      if (run.status !== 'pending') return refuse(E.alreadyDecided);
      if (run.mode === 'vendorSignOff' && !(await deps.authorization.enforce('stain:qc:override')).allowed) return refuse(E.notPermitted);
      // Only the run's own slides, in its order.
      const bySlide = new Map(outcomes.map(o => [o.slideId, o]));
      const clean = run.slides.filter(s => bySlide.has(s.slideId)).map(s => ({ ...bySlide.get(s.slideId)!, caseAccession: s.caseAccession }));
      if (signOffProblems(run.slides, clean).length) return refuse(E.invalid);
      return ok(await decide(run, clean, 'pathscribe', deps.actor().userName, stainerEquipmentId !== undefined ? { stainerEquipmentId } : {}));
    },

    async scannerMode(scannerInstrumentId) {
      return qcModeFor(await deps.equipment(scannerInstrumentId), await settings(), 'scanner');
    },

    async queueImages(items) {
      if (!items.length) return;
      const now = deps.now().toISOString();
      const added: ImageQcItem[] = items.map(i => ({ ...i, status: 'pending', receivedAt: now }));
      const keep = (await deps.store.images()).filter(i => i.status !== 'pending' || !added.some(a => a.stainId === i.stainId));
      await deps.store.saveImages([...added, ...keep].slice(0, 1000));
      const first = added[0];
      void log('Image QC Pending', `Scan batch ${first.scanBatchBarcode} on ${first.scannerInstrumentId}: ${added.length} image(s) wait for QC before the pathologist sees them (${first.mode === 'vendorSignOff' ? "no pass from the scanner's own image check" : 'a PathScribe sign-off'}).`, null, 'system');
    },

    async decideImage(stainId, outcome, reason) {
      if (!(await deps.authorization.enforce('scan:image-qc:sign-off')).allowed) return refuse(E.notPermitted);
      const all = await deps.store.images();
      const item = all.find(i => i.stainId === stainId && i.status === 'pending');
      if (!item) return refuse(E.notFound);
      if (outcome === 'fail' && !reason) return refuse(E.invalid);
      const decided: ImageQcItem = { ...item, status: outcome === 'pass' ? 'passed' : 'failed', via: 'pathscribe', decidedAt: deps.now().toISOString(), decidedBy: deps.actor().userName, ...(reason ? { reason } : {}) };
      await deps.store.saveImages(all.map(i => (i === item ? decided : i)));
      await deps.setImageOutcome({ caseId: item.caseId, stainId: item.stainId, blockId: item.blockId, outcome: outcome === 'pass' ? 'scanned' : 'imageQcFailed' }).catch(() => undefined);
      void log(outcome === 'pass' ? 'Image QC Passed' : 'Image QC Failed', `Slide ${item.slideLabel} (scan batch ${item.scanBatchBarcode}, ${item.scannerInstrumentId}): ${outcome === 'pass' ? 'image released to the pathologist' : `sent back to be scanned again (${reason})`}.`, item.caseAccession);
      return ok(decided);
    },
  };
}
