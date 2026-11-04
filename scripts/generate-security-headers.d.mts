// Type declarations for generate-security-headers.mjs (Batch 511, PS-478).
type HeaderPairs = Array<[string, string]>;
export declare function renderNginx(h: HeaderPairs): string;
export declare function renderWebConfig(h: HeaderPairs): string;
export declare function renderStaticWebApp(h: HeaderPairs): string;
export declare function renderFrontDoor(h: HeaderPairs): string;
export declare function renderVercelHeaders(h: HeaderPairs): Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
export declare function renderPlain(h: HeaderPairs): string;
