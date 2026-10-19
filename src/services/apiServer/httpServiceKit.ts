// src/services/apiServer/httpServiceKit.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 615 (PS-482 to PS-484, PS-498 to PS-515): the shared kit every HTTP
// service is built from. A server version of a service is a TABLE, not
// hand-written code: for each method of the service's interface, the call it
// makes (verb, path, body, headers) and what it does with the answer.
//
//   export const createHttpFooService = (c: ApiHttpClient): IFooService =>
//     buildHttpService<IFooService>(c, {
//       listFoos:  list('GET', () => route('listFoos')),
//       getFoo:    value('GET', (id: string) => `${route('getFoo')}${queryString({ id })}`, { missing: null }),
//       saveFoo:   result('POST', () => route('saveFoo'), { body: (f: Foo) => f }),
//     });
//
// The table must have an entry for EVERY method of the interface (the type
// checks it), so a method added to the interface can't be forgotten on the
// server side. The entry decides the answer's shape:
//   result()  the interface returns Promise<ServiceResult<T>>: pass through.
//   value()   the interface returns a plain Promise<T>: the data, or `missing`
//             for NOT_FOUND, or the `fallback` for any other failure.
//   done()    the interface returns Promise<void>: failures throw ApiCallError.
//   required() the interface returns a plain Promise<T> that is never null (Batch 616): the data, or throws ApiCallError.
// See docs/architecture/HTTP_SERVICES_PATTERN.md.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient, ApiRequestOptions, ApiResult } from './apiHttpClient';
import type { ServiceResult, ServiceResultMeta } from '../types';

export type HttpVerb = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Thrown by `done()` entries (methods that return nothing) when the server refuses; carries a fixed code only. */
export class ApiCallError extends Error {
  readonly code: string;
  readonly currentVersion?: number;
  constructor(code: string, currentVersion?: number) {
    super(`API call failed: ${code}`);
    this.name = 'ApiCallError';
    this.code = code;
    this.currentVersion = currentVersion;
  }
}

/** Encode one path segment (ids can contain characters that mean something in a URL). */
export const enc = (segment: string | number): string => encodeURIComponent(String(segment));

/**
 * The one route style (Batch 617, Pete's decision): `/api/<area>/<service>/<method-name>`, kebab-case, one route per interface method.
 * `base` is `/api/<area>/<service>`; `method` is the interface method's name. See HTTP_SERVICES_PATTERN.md section 7.
 */
export const kebabCase = (name: string): string =>
  name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2').toLowerCase();
export const methodPath = (base: string, method: string): string => `${base}/${kebabCase(method)}`;

/** Build `?a=1&b=2` from the parameters that have a value (arrays repeat the name). Empty when none. */
export function queryString(params: Record<string, string | number | boolean | readonly (string | number)[] | null | undefined>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v)) { for (const item of v) parts.push(`${enc(k)}=${enc(item)}`); continue; }
    parts.push(`${enc(k)}=${enc(String(v))}`);
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

// The path, body and headers each take the method's arguments (they may use fewer or more of them than the others do).
type ArgsFn<R> = (...args: never) => R;
interface CallParts {
  verb: HttpVerb;
  path: ArgsFn<string>;
  body?: ArgsFn<unknown>;
  headers?: ArgsFn<Record<string, string> | undefined>;
}
export type RouteOptions = Pick<CallParts, 'body' | 'headers'>;

type Call = (client: ApiHttpClient, args: unknown[]) => Promise<ApiResult<unknown>>;
const apply = <R>(fn: ArgsFn<R>, args: unknown[]): R => (fn as unknown as (...a: unknown[]) => R)(...args);
const makeCall = (p: CallParts): Call => (client, a) => {
  const o: ApiRequestOptions | undefined = p.headers ? { headers: apply(p.headers, a) } : undefined;
  const path = apply(p.path, a);
  const bodyOf = (): unknown => (p.body ? apply(p.body, a) : undefined);
  switch (p.verb) {
    case 'GET': return client.get(path, o);
    case 'DELETE': return client.delete(path, o);
    case 'POST': return client.post(path, bodyOf(), o);
    case 'PUT': return client.put(path, bodyOf(), o);
    default: return client.patch(path, bodyOf(), o);
  }
};

/** One interface method's server call. `kind` says how the answer is shaped. */
export type Route =
  | { kind: 'result'; call: Call; pick?: (data: unknown) => unknown; meta?: (data: unknown) => ServiceResultMeta | undefined }
  | { kind: 'value'; call: Call; pick?: (data: unknown) => unknown; missing: unknown; fallback: unknown }
  | { kind: 'done'; call: Call }
  | { kind: 'required'; call: Call; pick?: (data: unknown) => unknown };

/** Returns Promise<ServiceResult<T>>. `pick` takes the part of the reply to use (default: all of it). */
export const result = (verb: HttpVerb, path: ArgsFn<string>, o: RouteOptions & { pick?: (data: never) => unknown; meta?: (data: never) => ServiceResultMeta | undefined } = {}): Route =>
  ({ kind: 'result', call: makeCall({ verb, path, body: o.body, headers: o.headers }), pick: o.pick as ((d: unknown) => unknown) | undefined, meta: o.meta as ((d: unknown) => ServiceResultMeta | undefined) | undefined });

/** Returns a plain Promise<T>: the data; `missing` when the server says NOT_FOUND; `fallback` (default `missing`) for any other failure. */
export const value = (verb: HttpVerb, path: ArgsFn<string>, o: RouteOptions & { pick?: (data: never) => unknown; missing?: unknown; fallback?: unknown } = {}): Route =>
  ({ kind: 'value', call: makeCall({ verb, path, body: o.body, headers: o.headers }), pick: o.pick as ((d: unknown) => unknown) | undefined, missing: 'missing' in o ? o.missing : null, fallback: 'fallback' in o ? o.fallback : ('missing' in o ? o.missing : null) });

/** A list: like `value` but an empty list stands in for "nothing" and for failures. */
export const list = (verb: HttpVerb, path: ArgsFn<string>, o: RouteOptions & { pick?: (data: never) => unknown } = {}): Route =>
  value(verb, path, { ...o, missing: [], fallback: [] });

/** Returns Promise<void>: resolves when the server accepts; throws ApiCallError (code only) when it refuses. */
export const done = (verb: HttpVerb, path: ArgsFn<string>, o: RouteOptions = {}): Route =>
  ({ kind: 'done', call: makeCall({ verb, path, body: o.body, headers: o.headers }) });

/** Returns a plain Promise<T> that is never "nothing" (a record, a result object): the data, or throws ApiCallError (code only) on any failure. For writes where a silent default would hide a refusal (Batch 616). */
export const required = (verb: HttpVerb, path: ArgsFn<string>, o: RouteOptions & { pick?: (data: never) => unknown } = {}): Route =>
  ({ kind: 'required', call: makeCall({ verb, path, body: o.body, headers: o.headers }), pick: o.pick as ((d: unknown) => unknown) | undefined });

/** Every method of the interface needs a route (the type enforces it). */
export type RouteTable<I> = { [K in keyof I]: Route };

const failure = (r: ApiResult<unknown>): { error: string; currentVersion?: number } =>
  r.ok === false ? { error: r.error, currentVersion: (r as { currentVersion?: number }).currentVersion } : { error: 'UNAVAILABLE' };

export function buildHttpService<I>(client: ApiHttpClient, routes: RouteTable<I>): I {
  const service: Record<string, unknown> = {};
  for (const name of Object.keys(routes) as (keyof I & string)[]) {
    const route = routes[name];
    service[name] = async (...args: unknown[]) => {
      const r = await route.call(client, args);
      if (route.kind === 'result') {
        if (r.ok !== true) return r as ServiceResult<never>;
        const meta = route.meta?.(r.data);
        return { ...r, data: route.pick ? route.pick(r.data) : r.data, ...(meta ? { meta } : {}) };
      }
      if (route.kind === 'value') {
        if (r.ok === true) return route.pick ? route.pick(r.data) : r.data;
        return failure(r).error === 'NOT_FOUND' ? route.missing : route.fallback;
      }
      if (route.kind === 'required') {
        if (r.ok !== true) { const f = failure(r); throw new ApiCallError(f.error, f.currentVersion); }
        return route.pick ? route.pick(r.data) : r.data;
      }
      if (r.ok !== true) { const f = failure(r); throw new ApiCallError(f.error, f.currentVersion); }
      return undefined;
    };
  }
  return service as I;
}
