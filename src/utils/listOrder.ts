// src/utils/listOrder.ts
// Reordering a list of ids. Batch 735 (touch spec T4): the Microtome's slide order in Batch print mode is set by
// dragging a row onto another (moveIdOnto) or, with a finger, by Move up and Move down (moveIdBy). Pure.

/** The ids with `moving` placed where `target` is. Unchanged when either is missing or they are the same. */
export function moveIdOnto(ids: readonly string[], moving: string, target: string): string[] {
  const out = [...ids];
  const from = out.indexOf(moving);
  const to = out.indexOf(target);
  if (from === -1 || to === -1 || from === to) return out;
  out.splice(from, 1);
  out.splice(to, 0, moving);
  return out;
}

/** The ids with `moving` moved `delta` places (-1 up, +1 down), stopping at the ends. */
export function moveIdBy(ids: readonly string[], moving: string, delta: number): string[] {
  const from = ids.indexOf(moving);
  if (from === -1) return [...ids];
  const to = Math.max(0, Math.min(ids.length - 1, from + delta));
  return to === from ? [...ids] : moveIdOnto(ids, moving, ids[to]);
}
