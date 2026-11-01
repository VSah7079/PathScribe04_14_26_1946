// Type declarations for check-production-bundle.mjs (Batch 527, PS-486; Batch 754: the demonstration checklists).
export declare const DEMO_TOOL_MODULES: string[];
export declare const DEMO_CHECKLIST_FILES: string[];
export declare function inspectManifest(manifest: Record<string, { src?: string }>, demoChecklistFiles?: string[]): { demoTools: string[]; demoChecklists: string[]; mockModules: string[] };
