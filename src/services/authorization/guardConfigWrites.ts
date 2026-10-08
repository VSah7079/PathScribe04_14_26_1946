// src/services/authorization/guardConfigWrites.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 428 (Pete: every Configuration section checks its own permission).
// Wraps a configuration service so each method that changes data is checked
// against its capability before it runs:
//
//   export const mockFlagService = guardConfigWrites(flagServiceUnchecked, [
//     ['config:case-flags:manage', ['add', 'update', 'deactivate', 'reactivate']],
//   ]);
//
//   • The check is authorizationService.enforce (audited: these are all
//     high-risk), at the service, so every screen and every other caller goes
//     through it. Reads pass straight through.
//   • A refused method changes nothing and returns { ok: false, error:
//     CONFIG_NOT_PERMITTED } (or throws it, for the few services that don't
//     return a ServiceResult).
//   • The service's own file keeps the unchecked object for the system paths
//     that aren't a person's action (an interface feed, a facility's automatic
//     catch-all subspecialty). Those are named …Unchecked and never imported
//     by screens.
//
// In production the API server makes the same check on the same endpoints
// (docs/architecture/AUTHORIZATION_API.md).
// ─────────────────────────────────────────────────────────────────────────────

export const CONFIG_NOT_PERMITTED = 'CONFIG_NOT_PERMITTED';

// ── Refusals, for the screen ────────────────────────────────────────────────
// Each section shows a failed save its own way, often with the raw error. The
// Configuration page subscribes here and shows one translated message naming
// the permission, whichever section refused.
type RefusalListener = (capability: string) => void;
const listeners = new Set<RefusalListener>();
export function onConfigRefused(listener: RefusalListener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function notifyConfigRefused(capability: string): void {
  for (const l of listeners) { try { l(capability); } catch { /* a screen's problem, not the save's */ } }
}

// ── Saves, for the unsaved-changes guard ─────────────────────────────────────
// Batch 437 (PS-128): a configuration write that went through tells the
// Configuration page, which then forgets edits made in open dialogs (a dialog
// that saves and stays open is no longer "unsaved").
type WrittenListener = () => void;
const writtenListeners = new Set<WrittenListener>();
export function onConfigWritten(listener: WrittenListener): () => void {
  writtenListeners.add(listener);
  return () => { writtenListeners.delete(listener); };
}
function notifyConfigWritten(): void {
  for (const l of writtenListeners) { try { l(); } catch { /* a screen's problem, not the save's */ } }
}
/** Whether a guarded write's result means it went through (pure). */
export function writeSucceeded(result: unknown): boolean {
  return !(result && typeof result === 'object' && (result as { ok?: unknown }).ok === false);
}

/** Whether an error is a Configuration refusal (for actions that throw it). */
export function isConfigRefusal(e: unknown): boolean {
  return e instanceof Error && e.message === CONFIG_NOT_PERMITTED;
}

/** Checks one Configuration capability at an action, telling the screen when it's refused. */
export async function permitConfigChange(decision: Promise<{ allowed: boolean }>, capability: string): Promise<boolean> {
  const { allowed } = await decision;
  if (!allowed) notifyConfigRefused(capability);
  return allowed;
}

export type ConfigWriteRules<T> = ReadonlyArray<readonly [capability: string, methods: ReadonlyArray<keyof T & string>]>;

export interface GuardOptions {
  /** How a refusal comes back: a failed ServiceResult (default) or a thrown Error. */
  refuse?: 'result' | 'throw';
  /** The check (a fake in tests). Defaults to the app's authorization service. */
  enforce?: (capability: string) => Promise<{ allowed: boolean }>;
}

const defaultEnforce = async (capability: string) => {
  // Imported when first used: the authorization service reads roles and staff
  // through services that some guarded services sit beside.
  const { authorizationService } = await import('./defaultAuthorizationService');
  return authorizationService.enforce(capability);
};

/** The capability each method needs, from the rules (pure; tested). */
export function capabilityByMethod<T>(rules: ConfigWriteRules<T>): Map<string, string> {
  const map = new Map<string, string>();
  for (const [capability, methods] of rules) {
    for (const m of methods) {
      if (map.has(m)) throw new Error(`guardConfigWrites: ${m} is listed under two capabilities`);
      map.set(m, capability);
    }
  }
  return map;
}

export function guardConfigWrites<T extends object>(service: T, rules: ConfigWriteRules<T>, options: GuardOptions = {}): T {
  const needs = capabilityByMethod(rules);
  const enforce = options.enforce ?? defaultEnforce;
  return new Proxy(service, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== 'function') return value;
      const capability = typeof prop === 'string' ? needs.get(prop) : undefined;
      if (!capability) return value.bind(target);
      return async (...args: unknown[]) => {
        const decision = await enforce(capability);
        if (!decision.allowed) {
          notifyConfigRefused(capability);
          if (options.refuse === 'throw') throw new Error(CONFIG_NOT_PERMITTED);
          return { ok: false, error: CONFIG_NOT_PERMITTED };
        }
        const result = await value.apply(target, args);
        if (writeSucceeded(result)) notifyConfigWritten();
        return result;
      };
    },
  });
}
