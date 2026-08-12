import { IModelService, AIModel } from './IModelService';
import { ServiceResult, ID } from '../types';
import { storageGet, storageSet } from '../mockStorage';

const SEED_MODELS: AIModel[] = [
  {
    id: 'psv32', name: 'pathscribe', version: 'v3.2',
    type: 'Gross + Micro', accuracy: 94.2, casesProcessed: 12487,
    releaseDate: '2025-06-01', status: 'Active', isDefault: true,
    subspecialtyIds: [], notes: 'Current production model.',
<<<<<<< HEAD
=======
    // Matches .env's VITE_AI_MODEL exactly — this IS the org-wide
    // default every client falls back to absent an override.
    vendor: 'anthropic', requestFormat: 'structured_messages', apiModelId: 'claude-sonnet-4-6',
>>>>>>> upstream/main
  },
  {
    id: 'psv33', name: 'pathscribe', version: 'v3.3',
    type: 'Gross + Micro', accuracy: 96.1, casesProcessed: 842,
    releaseDate: '2026-01-15', status: 'Beta', isDefault: false,
    subspecialtyIds: [], notes: 'Beta — enhanced microscopic suggestion accuracy. Enrolling pilot labs.',
<<<<<<< HEAD
=======
    vendor: 'anthropic', requestFormat: 'structured_messages', apiModelId: 'claude-sonnet-5',
>>>>>>> upstream/main
  },
  {
    id: 'psv31', name: 'pathscribe', version: 'v3.1',
    type: 'Gross Only', accuracy: 91.8, casesProcessed: 45210,
    releaseDate: '2024-11-01', retiredDate: '2025-06-01', status: 'Retired', isDefault: false,
    subspecialtyIds: [], notes: 'Retired on v3.2 release. Gross-only model.',
<<<<<<< HEAD
=======
    vendor: 'anthropic', requestFormat: 'structured_messages', apiModelId: 'claude-sonnet-4-5-20250929',
>>>>>>> upstream/main
  },
  {
    id: 'psv30', name: 'pathscribe', version: 'v3.0',
    type: 'Gross Only', accuracy: 88.4, casesProcessed: 98341,
    releaseDate: '2024-04-01', retiredDate: '2024-11-01', status: 'Retired', isDefault: false,
    subspecialtyIds: [], notes: 'First production release.',
<<<<<<< HEAD
=======
    vendor: 'anthropic', requestFormat: 'structured_messages', apiModelId: 'claude-3-5-sonnet-20241022',
  },
  {
    id: 'psv-alt-gemini', name: 'pathscribe', version: 'v3.3-alt',
    type: 'Gross + Micro', accuracy: 93.5, casesProcessed: 0,
    releaseDate: '2026-06-01', status: 'Beta', isDefault: false,
    subspecialtyIds: [],
    notes: 'Candidate cross-vendor evaluation — not yet enrolled with any client, no cases processed. Kept as a real, live example that AIModel genuinely supports more than one vendor, not just multiple versions of the same one.',
    vendor: 'google', requestFormat: 'structured_content', apiModelId: 'gemini-2.5-pro',
  },
  {
    // Real fix, per direct product decision: voice dictation refinement
    // was previously a hardcoded 'gemini-2.0-flash-lite' string constant
    // in VoiceProvider.tsx, completely outside this catalog — no version
    // tracking, no vendor swappability, no validation gate before a new
    // version could go live. This is that same model, now a real,
    // trackable record. isDefault: true within the Voice Dictation group
    // specifically (see setDefault()'s type-aware grouping below) — the
    // model VoiceProvider.tsx actually resolves and calls today.
    id: 'psv-voice-gemini-flash-lite', name: 'pathscribe-voice', version: '2.0-flash-lite',
    type: 'Voice Dictation', accuracy: 92.0, casesProcessed: 0,
    releaseDate: '2026-01-01', status: 'Active', isDefault: true,
    subspecialtyIds: [],
    notes: 'Current production voice-dictation refinement model — corrects phonetic transcription errors, formats measurements, fixes capitalization. casesProcessed intentionally 0: this mock never had real usage-count tracking wired to it before now, so 0 is the honest starting point, not a claim about actual production volume.',
    vendor: 'google', requestFormat: 'structured_content', apiModelId: 'gemini-2.0-flash-lite',
>>>>>>> upstream/main
  },
];

const load = () => storageGet<AIModel[]>('pathscribe_models', SEED_MODELS);
const persist = (data: AIModel[]) => storageSet('pathscribe_models', data);
let MOCK_MODELS: AIModel[] = load();

const ok    = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const err   = <T>(error: string): ServiceResult<T> => ({ ok: false, error });
const delay = () => new Promise(r => setTimeout(r, 80));

export const mockModelService: IModelService = {
  async getAll() {
    await delay();
    return ok([...MOCK_MODELS]);
  },

  async getById(id: ID) {
    await delay();
    const m = MOCK_MODELS.find(m => m.id === id);
    return m ? ok({ ...m }) : err(`Model ${id} not found`);
  },

  async getActive() {
    await delay();
    return ok(MOCK_MODELS.filter(m => m.status === 'Active' || m.status === 'Beta').map(m => ({ ...m })));
  },

  async getDefault() {
    await delay();
<<<<<<< HEAD
    const m = MOCK_MODELS.find(m => m.isDefault);
=======
    // Real fix, found while adding voice as a second model type:
    // deliberately excludes Voice Dictation models here. Existing
    // callers (resolveClientAiModel.ts, Config/Models/index.tsx) both
    // predate voice support and genuinely mean "the report-generation
    // default" — this preserves that meaning rather than risk one of
    // them silently resolving to a voice model once one exists. See
    // getDefaultVoiceModel() below for the voice-specific equivalent.
    const m = MOCK_MODELS.find(m => m.isDefault && m.type !== 'Voice Dictation');
    return ok(m ? { ...m } : null);
  },

  /** Real fix, added alongside voice model support: a deployment
   *  needs one active report-generation model AND one active voice
   *  model at the same time — these are independent slots, not
   *  mutually exclusive, so this is deliberately a separate method
   *  rather than an overload of getDefault() above. */
  async getDefaultVoiceModel() {
    await delay();
    const m = MOCK_MODELS.find(m => m.isDefault && m.type === 'Voice Dictation');
>>>>>>> upstream/main
    return ok(m ? { ...m } : null);
  },

  async setDefault(id: ID) {
    await delay();
    const target = MOCK_MODELS.find(m => m.id === id);
    if (!target) return err(`Model ${id} not found`);
    if (target.status === 'Retired') return err(`Cannot set a retired model as default`);
<<<<<<< HEAD
    MOCK_MODELS = MOCK_MODELS.map(m => ({ ...m, isDefault: m.id === id }));
=======
    // Real fix: previously un-defaulted EVERY other model regardless
    // of type — correct when only report-generation models existed,
    // but wrong now that Voice Dictation is a genuinely separate
    // slot. Setting a voice model as default must not silently
    // un-default the report-generation model, and vice versa — only
    // un-default other models within the same group (voice vs
    // non-voice) as the one being set.
    const isVoice = target.type === 'Voice Dictation';
    MOCK_MODELS = MOCK_MODELS.map(m => {
      const sameGroup = (m.type === 'Voice Dictation') === isVoice;
      return sameGroup ? { ...m, isDefault: m.id === id } : m;
    });
>>>>>>> upstream/main
    persist(MOCK_MODELS);
    return ok({ ...target, isDefault: true });
  },

  async update(id, changes) {
    await delay();
    const idx = MOCK_MODELS.findIndex(m => m.id === id);
    if (idx === -1) return err(`Model ${id} not found`);
    MOCK_MODELS = MOCK_MODELS.map(m => m.id === id ? { ...m, ...changes } : m);
    persist(MOCK_MODELS);
    return ok({ ...MOCK_MODELS[idx], ...changes });
  },

  async retire(id) {
    await delay();
    const target = MOCK_MODELS.find(m => m.id === id);
    if (!target) return err(`Model ${id} not found`);
    if (target.isDefault) return err(`Cannot retire the default model. Set another model as default first.`);
    return mockModelService.update(id, { status: 'Retired', retiredDate: new Date().toISOString().split('T')[0] });
  },
<<<<<<< HEAD
=======

  async create(model) {
    await delay();
    const id = `psv-store-${Date.now().toString(36)}`;
    if (MOCK_MODELS.some(m => m.id === id)) return err(`Model ${id} already exists`);
    const created: AIModel = { ...model, id, isDefault: false, casesProcessed: 0 };
    MOCK_MODELS = [...MOCK_MODELS, created];
    persist(MOCK_MODELS);
    return ok({ ...created });
  },
>>>>>>> upstream/main
};
