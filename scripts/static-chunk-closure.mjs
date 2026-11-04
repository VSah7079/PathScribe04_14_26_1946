// scripts/static-chunk-closure.mjs
// Batch 549 (PS-539 phase 2d): the chunks to preload for the app's start
// (used by scripts/vite/preloadAppStart.ts). Kept in a plain .mjs file, like the
// other build scripts, so its tests can import it without a separate build of
// the Node tsconfig project. Pure.

/** The chunk files to preload: the entry's chunk and its static imports, each once. */
export function staticChunkClosure(chunks, entrySuffix) {
  const entry = Object.values(chunks).find(c => c.type === 'chunk' && (c.facadeModuleId ?? '').replace(/\\/g, '/').endsWith(entrySuffix));
  if (!entry) return [];
  const out = [];
  const visit = fileName => {
    if (out.includes(fileName)) return;
    out.push(fileName);
    for (const dep of chunks[fileName]?.imports ?? []) visit(dep);
  };
  visit(entry.fileName);
  return out;
}
