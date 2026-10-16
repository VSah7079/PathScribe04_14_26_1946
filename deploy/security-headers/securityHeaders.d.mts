// Type declarations for securityHeaders.mjs (Batch 511, PS-478).
export interface SecurityHeaderOrigins {
  connect?: string[];
  hub?: string[];
  img?: string[];
  frame?: string[];
  formAction?: string[];
  https?: boolean;
  /** Batch 546: false leaves out the loopback workstation print bridges (default: included). */
  workstationBridges?: boolean;
}
export declare const PUBLIC_REFERENCE_ORIGINS: string[];
export declare const WORKSTATION_BRIDGE_ORIGINS: string[];
export declare const RUNTIME_CONFIG_ORIGIN_KEYS: { connect: string[]; hub: string[]; formAction: string[] };
export declare function originsWithRuntimeConfig(origins?: SecurityHeaderOrigins, runtimeConfig?: Record<string, unknown>): SecurityHeaderOrigins;
export declare function originOf(url: string): string | null;
export declare function contentSecurityPolicy(origins?: SecurityHeaderOrigins): string;
export declare function securityHeaders(origins?: SecurityHeaderOrigins): Array<[string, string]>;
