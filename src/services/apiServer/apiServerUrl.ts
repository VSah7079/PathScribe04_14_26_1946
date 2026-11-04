// src/services/apiServer/apiServerUrl.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 551 (PS-539): the API server's address for the services that call it
// directly (exports, server jobs), checked the way sign-in checks it: https,
// or plain http only to this computer in a development build. Null with no
// API server (the demo) or an address that fails the check (logged).
// ─────────────────────────────────────────────────────────────────────────────
import { appEnv } from '@/services/runtimeConfig/runtimeEnv';
import { resolveServiceEndpoint } from '@/utils/serviceEndpoint';

export const isProductionBuild = (): boolean => !!import.meta.env.PROD;

export function apiServerUrl(component: string): string | null {
  const configured: unknown = appEnv().VITE_API_BASE_URL;
  if (typeof configured !== 'string' || !configured.trim()) return null;
  const r = resolveServiceEndpoint({ name: 'PathScribe API server', envVar: 'VITE_API_BASE_URL', configured: configured.trim(), devDefault: '', isProduction: isProductionBuild() });
  if (r.ok === false) { console.error(`[${component}] ${r.message} Working without the API server.`); return null; }
  return r.url;
}
