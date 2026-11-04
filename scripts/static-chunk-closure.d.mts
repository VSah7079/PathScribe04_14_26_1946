// Type declarations for static-chunk-closure.mjs (Batch 549, PS-539).
export declare function staticChunkClosure(
  chunks: Record<string, { type: string; fileName: string; facadeModuleId?: string | null; imports?: string[] }>,
  entrySuffix: string,
): string[];
