// Type declarations for hash-demo-password.mjs (Batch 511, PS-478: the tests
// that import it type-check under noImplicitAny).
export declare const ITERATIONS: number;
export declare function hashDemoPassword(
  password: string,
  salt?: Uint8Array,
  iterations?: number,
): { iterations: number; salt: string; hash: string };
