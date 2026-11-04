// src/services/typeSafety/countExplicitAny.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 504 (PS-470 / PS-478): counts explicit `any` in a source file (every
// `any` type keyword the TypeScript parser sees, comments excluded). Used by
// explicitAny.guard.test.ts to stop new ones; not used by the app.
// ─────────────────────────────────────────────────────────────────────────────

import ts from 'typescript';

export function countExplicitAny(fileName: string, text: string): number {
  const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, false, fileName.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  let count = 0;
  const visit = (node: ts.Node) => {
    if (node.kind === ts.SyntaxKind.AnyKeyword) count += 1;
    ts.forEachChild(node, visit);
  };
  visit(source);
  return count;
}
