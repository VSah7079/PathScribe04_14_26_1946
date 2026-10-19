// src/services/models/modelOverrides.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 609 (#173): the per-adoption overrides an organisation can set on an
// AI model it has adopted. Pure.
//
// The adoption record has always had `configOverrides` and `thresholdOverrides`,
// but nothing wrote them and nothing read them. They now carry a closed set of
// keys, each of which something actually uses:
//
//   configOverrides.maxTokens          caps the output length of every AI call
//                                       made with this model (callAi)
//   thresholdOverrides.confidenceThreshold  the confidence (0 to 100) a
//                                       suggestion needs before it is treated as
//                                       above threshold, for this model, in place
//                                       of the organisation-wide AI setting
//
// Any other key is refused, so an unused setting can't be saved and mislead.
// ─────────────────────────────────────────────────────────────────────────────

export type ConfigOverrides = Record<string, string | number | boolean>;
export type ThresholdOverrides = Record<string, number>;

export interface OverrideKeySpec { key: string; min: number; max: number }

export const CONFIG_OVERRIDE_KEYS: readonly OverrideKeySpec[] = [{ key: 'maxTokens', min: 50, max: 8000 }];
export const THRESHOLD_OVERRIDE_KEYS: readonly OverrideKeySpec[] = [{ key: 'confidenceThreshold', min: 0, max: 100 }];

export type OverrideErrorCode = 'NOT_A_WHOLE_NUMBER' | 'OUT_OF_RANGE' | 'UNKNOWN_KEY';

export interface OverrideIssue { key: string; code: OverrideErrorCode; min?: number; max?: number }

export interface OverrideSet { configOverrides?: ConfigOverrides; thresholdOverrides?: ThresholdOverrides }

const check = (specs: readonly OverrideKeySpec[], values: Record<string, unknown> | undefined, issues: OverrideIssue[]): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const [key, raw] of Object.entries(values ?? {})) {
    const spec = specs.find(s => s.key === key);
    if (!spec) { issues.push({ key, code: 'UNKNOWN_KEY' }); continue; }
    if (typeof raw !== 'number' || !Number.isInteger(raw)) { issues.push({ key, code: 'NOT_A_WHOLE_NUMBER' }); continue; }
    if (raw < spec.min || raw > spec.max) { issues.push({ key, code: 'OUT_OF_RANGE', min: spec.min, max: spec.max }); continue; }
    out[key] = raw;
  }
  return out;
};

/** Validates a set of overrides; an empty section is dropped. */
export function validateOverrides(input: OverrideSet): { ok: true; value: OverrideSet } | { ok: false; issues: OverrideIssue[] } {
  const issues: OverrideIssue[] = [];
  const config = check(CONFIG_OVERRIDE_KEYS, input.configOverrides, issues);
  const threshold = check(THRESHOLD_OVERRIDE_KEYS, input.thresholdOverrides, issues);
  if (issues.length) return { ok: false, issues };
  return {
    ok: true,
    value: {
      ...(Object.keys(config).length ? { configOverrides: config } : {}),
      ...(Object.keys(threshold).length ? { thresholdOverrides: threshold } : {}),
    },
  };
}

/** What the editor form holds: text per field, blank meaning "use the organisation setting". */
export interface OverrideForm { maxTokens: string; confidenceThreshold: string }

export function overrideFormFrom(set: OverrideSet | undefined): OverrideForm {
  const mt = set?.configOverrides?.maxTokens;
  const ct = set?.thresholdOverrides?.confidenceThreshold;
  return { maxTokens: typeof mt === 'number' ? String(mt) : '', confidenceThreshold: typeof ct === 'number' ? String(ct) : '' };
}

/** Form text → overrides. Text that isn't a whole number is kept as NaN so validation reports it. */
export function overridesFromForm(form: OverrideForm): OverrideSet {
  const num = (s: string) => (s.trim() === '' ? undefined : /^-?\d+$/.test(s.trim()) ? Number(s.trim()) : NaN);
  const mt = num(form.maxTokens);
  const ct = num(form.confidenceThreshold);
  return {
    ...(mt !== undefined ? { configOverrides: { maxTokens: mt } } : {}),
    ...(ct !== undefined ? { thresholdOverrides: { confidenceThreshold: ct } } : {}),
  };
}

type WithOverrides = { configOverrides?: ConfigOverrides; thresholdOverrides?: ThresholdOverrides } | null | undefined;

/** The output cap for a call: the lower of what the caller asked for and the model's override. */
export function effectiveMaxTokens(requested: number | undefined, model: WithOverrides): number | undefined {
  const cap = model?.configOverrides?.maxTokens;
  if (typeof cap !== 'number') return requested;
  return requested === undefined ? cap : Math.min(requested, cap);
}

/** The confidence threshold for a model: its own override, else the organisation-wide setting. */
export function effectiveConfidenceThreshold(organisationThreshold: number, model: WithOverrides): number {
  const own = model?.thresholdOverrides?.confidenceThreshold;
  return typeof own === 'number' ? own : organisationThreshold;
}
