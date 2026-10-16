// src/services/security/securityHeaders.guard.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 503 (PS-474): the browser security headers stay strict, every hosting
// option's generated config matches the one policy, and nothing in the app
// reaches for an outside origin the policy would block.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { contentSecurityPolicy, securityHeaders, originOf, WORKSTATION_BRIDGE_ORIGINS } from '../../../deploy/security-headers/securityHeaders.mjs';
import { AGENT_PORTS } from '@/utils/labels/pathscribeAgent/agentProtocol';
import { renderNginx, renderWebConfig, renderStaticWebApp, renderFrontDoor, renderVercelHeaders, renderPlain } from '../../../scripts/generate-security-headers.mjs';

const ROOT = process.cwd();
const read = (p: string) => readFileSync(resolve(ROOT, p), 'utf8');
const directive = (csp: string, name: string) => csp.split('; ').find(d => d.startsWith(`${name} `)) ?? '';

describe('security headers (PS-474)', () => {
  const csp: string = contentSecurityPolicy({});

  it('script: self and WebAssembly compile only — no inline script, no eval', () => {
    expect(directive(csp, 'script-src')).toBe("script-src 'self' 'wasm-unsafe-eval'");
    expect(csp).not.toMatch(/'unsafe-eval'/);
  });

  it('cannot be framed, no plugins, no base-URL or form hijack', () => {
    expect(directive(csp, 'frame-ancestors')).toBe("frame-ancestors 'none'");
    expect(directive(csp, 'object-src')).toBe("object-src 'none'");
    expect(directive(csp, 'base-uri')).toBe("base-uri 'self'");
    expect(directive(csp, 'form-action')).toBe("form-action 'self'");
  });

  it('only the hub (and the loopback workstation bridges) get a WebSocket origin; paths are dropped', () => {
    const c: string = contentSecurityPolicy({ connect: ['https://api.example/x/y'], hub: ['https://hub.example/hubs/live'] });
    const sockets = directive(c, 'connect-src').split(' ').filter(o => o.startsWith('wss://'));
    expect(sockets.filter(o => !WORKSTATION_BRIDGE_ORIGINS.includes(o))).toEqual(['wss://hub.example']);
    expect(directive(c, 'connect-src')).toContain('https://api.example');
    expect(directive(c, 'connect-src')).not.toContain('wss://api.example');
    expect(directive(c, 'connect-src')).toContain('wss://hub.example');
    expect(originOf('javascript:alert(1)')).toBeNull();
  });

  it('Batch 546 (F4): the workstation agent and QZ Tray are allowed, on loopback only, and can be left out', () => {
    const connect = directive(csp, 'connect-src');
    for (const p of AGENT_PORTS) {
      expect(connect).toContain(`wss://127.0.0.1:${p}`);
      expect(connect).toContain(`https://127.0.0.1:${p}`); // the scale (resolveScaleWeightCapture.ts)
    }
    expect(connect).toContain('wss://localhost:8181');
    for (const o of WORKSTATION_BRIDGE_ORIGINS) expect(new URL(o).hostname).toMatch(/^(127\.0\.0\.1|localhost|localhost\.qz\.io)$/);
    expect(connect).not.toMatch(/\bws:\/\//);
    expect(directive(contentSecurityPolicy({ https: false }), 'connect-src')).toContain('ws://localhost:8182');
    const without = directive(contentSecurityPolicy({ workstationBridges: false }), 'connect-src');
    expect(without).not.toContain('127.0.0.1');
    expect(without).not.toContain('localhost');
  });

  it('the header set: HSTS on https only, framing, sniffing, referrer, permissions', () => {
    const names = (h: [string, string][]) => h.map(([n]) => n);
    expect(names(securityHeaders({}))).toEqual(['Content-Security-Policy', 'Strict-Transport-Security', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'Permissions-Policy', 'Cross-Origin-Resource-Policy']);
    expect(names(securityHeaders({ https: false }))).not.toContain('Strict-Transport-Security');
    expect(contentSecurityPolicy({ https: false })).not.toContain('upgrade-insecure-requests');
    const h = Object.fromEntries(securityHeaders({}));
    expect(h['Referrer-Policy']).toBe('no-referrer');
    expect(h['X-Frame-Options']).toBe('DENY');
  });

  it('every generated hosting config matches the policy (re-run the generator after a policy change)', () => {
    for (const [dir, originsFile] of [['deploy/security-headers/generated', 'deploy/security-headers/origins.example.json'], ['deploy/security-headers/generated-demo', 'deploy/security-headers/origins.demo.json']]) {
      const h = securityHeaders(JSON.parse(read(originsFile)));
      expect(read(`${dir}/nginx.conf`)).toBe(renderNginx(h));
      expect(read(`${dir}/web.config`)).toBe(renderWebConfig(h));
      expect(read(`${dir}/staticwebapp.config.json`)).toBe(renderStaticWebApp(h));
      expect(read(`${dir}/azure-front-door-rules.json`)).toBe(renderFrontDoor(h));
      expect(read(`${dir}/headers.txt`)).toBe(renderPlain(h));
    }
  });

  it('the Vercel demo serves the demo policy', () => {
    const vercel = JSON.parse(read('vercel.json'));
    expect(vercel.headers).toEqual(renderVercelHeaders(securityHeaders(JSON.parse(read('deploy/security-headers/origins.demo.json')))));
  });

  it('index.html has no inline script and loads nothing from another origin', () => {
    const html = read('index.html');
    expect(html).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/);
    expect(html).not.toMatch(/(src|href)=["']https?:\/\//);
  });

  it('no stylesheet, font or sound is fetched from another origin by the app', () => {
    const files: string[] = [];
    const walk = (d: string) => { for (const n of readdirSync(d)) { const f = join(d, n); if (statSync(f).isDirectory()) { if (n !== 'node_modules') walk(f); } else if (/\.(css|tsx?)$/.test(n) && !/\.test\.tsx?$/.test(n)) files.push(f); } };
    walk(resolve(ROOT, 'src'));
    const offenders = files.filter(f => {
      const t = readFileSync(f, 'utf8');
      return /@import\s+url\(\s*['"]?https?:/.test(t) || /fonts\.(googleapis|gstatic)\.com/.test(t) || /new Audio\(\s*['"`]https?:/.test(t);
    }).map(f => f.slice(ROOT.length + 1));
    expect(offenders).toEqual([]);
    expect(existsSync(resolve(ROOT, 'node_modules/@fontsource/inter/400.css'))).toBe(true);
  });
});
