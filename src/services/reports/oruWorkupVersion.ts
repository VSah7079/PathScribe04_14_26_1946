// src/services/reports/oruWorkupVersion.ts
// Batch 559: a result message whose workup version isn't known. With the API server, a list of report
// versions that couldn't all be read would number the workup too low (buildOruR01Payload.ts counts the
// workup's signed versions), so the payload is marked, with a symbol that is never sent, and
// prepareOruR01Dispatch.ts holds the message for retry. Its own module, so tests that replace the
// payload builder keep the real check.
export const WORKUP_VERSION_UNKNOWN = Symbol('workupVersionUnknown');

export function markWorkupVersionUnknown<T extends object>(payload: T): T {
  Object.defineProperty(payload, WORKUP_VERSION_UNKNOWN, { value: true, enumerable: false });
  return payload;
}

export function workupVersionUnknown(payload: object): boolean {
  return (payload as { [WORKUP_VERSION_UNKNOWN]?: boolean })[WORKUP_VERSION_UNKNOWN] === true;
}
