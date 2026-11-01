// Type declarations for remove-demo-checklists.mjs (Batch 754).
export declare const ENDPOINT: string;
export declare function parseArgs(argv: string[]): { api?: string; organisationId?: string; apply: boolean; problems: string[] };
export declare function buildRequest(args: { api?: string; organisationId?: string; apply: boolean }, token: string): { url: string; init: { method: string; headers: Record<string, string>; body: string } };
export declare function describeResult(status: number, body: unknown, apply: boolean): { ok: boolean; lines: string[] };
