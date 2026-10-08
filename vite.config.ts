import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Version is read here so package.json stays the single source of truth and
// `npm version` is the only place a release number is ever typed. Resolved
// against __dirname rather than cwd, so it holds regardless of where the
// build is invoked from.
const pkg = JSON.parse(
  readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'),
) as { version: string };

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Batch 444: one Gemini route per client path. The model name comes from
  // the browser, so it's checked before it goes into the upstream path.
  const geminiRoute = (upstream: (model: string) => string) => ({
    target:       'https://generativelanguage.googleapis.com',
    changeOrigin: true,
    secure:       true,
    rewrite: (p: string) => {
      const asked = new URL(p, 'http://localhost').searchParams.get('model') ?? 'gemini-1.5-flash';
      const model = /^[A-Za-z0-9._-]+$/.test(asked) ? asked : 'gemini-1.5-flash';
      return upstream(model);
    },
    configure: (proxy: { on: (e: 'proxyReq', cb: (r: { setHeader: (k: string, v: string) => void; removeHeader: (k: string) => void }) => void) => void }) => {
      proxy.on('proxyReq', (proxyReq) => {
        proxyReq.setHeader('x-goog-api-key', env.GEMINI_API_KEY ?? '');
        proxyReq.removeHeader('origin');
      });
    },
  });

  return {
    plugins: [react()],
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    resolve: {
      alias: {
        '@components': path.resolve(__dirname, 'src/components'),
        '@pages':      path.resolve(__dirname, 'src/pages'),
        '@theme':      path.resolve(__dirname, 'src/theme'),
        '@':           path.resolve(__dirname, 'src'),
        '@hooks':      path.resolve(__dirname, 'src/hooks'),
        '@contexts':   path.resolve(__dirname, 'src/contexts'),
      },
    },
    // Without this, Vite's dependency scanner auto-discovers EVERY .html
    // file in the project as a potential entry point — including
    // docs/Pathscribe_Worklist_User_Guide.html and
    // docs/Specs/qc_module_prototype.html, neither of which is a real app
    // entry, and one or both of which has malformed markup that crashes
    // the scanner outright ("Failed to run dependency scan"). Scoping
    // explicitly to the real entry point is the fix, independent of
    // whatever's actually wrong in those docs files.
    optimizeDeps: {
      entries: ['index.html'],
      // Batch 371: pre-bundle these at start-up. They're reached only through
      // lazily loaded modules (single sign-on, live updates), so Vite found
      // them mid-session, re-bundled, and the open page failed with
      // "504 (Outdated Optimize Dep)" for oidc-client-ts.
      include: ['oidc-client-ts', '@microsoft/signalr'],
    },
    server: {
      port: 5173,
      host: true,
      allowedHosts: true,
      proxy: {

        // ── Anthropic (Claude) ─────────────────────────────────────────────
        // Client calls: POST /api/ai/anthropic/v1/messages
        // Forwards to:  https://api.anthropic.com/v1/messages
        '/api/ai/anthropic': {
          target:       'https://api.anthropic.com',
          changeOrigin: true,
          secure:       true,
          rewrite:      (p: string) => p.replace(/^\/api\/ai\/anthropic/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('x-api-key', env.AI_API_KEY ?? '');
              proxyReq.setHeader('anthropic-version', '2023-06-01');
              proxyReq.removeHeader('origin');
            });
          },
        },

        // ── Gemini (Google) ────────────────────────────────────────────────
        // Client calls: POST /api/ai/gemini/generate?model=gemini-1.5-flash
        //               POST /api/ai/gemini/stream?model=gemini-1.5-flash
        //               GET  /api/ai/gemini/models          (System Info check)
        // Forwards to:  https://generativelanguage.googleapis.com/v1beta/models/<model>:generateContent
        //               …:streamGenerateContent?alt=sse, and /v1beta/models
        //
        // Using clean paths avoids the colon in the client URL
        // (gemini-1.5-flash:generateContent) which confuses Vite's proxy router.
        // The colon is constructed here instead. Batch 444: the key travels in
        // the x-goog-api-key header, not the URL, and only from this proxy.
        '/api/ai/gemini/generate': geminiRoute((model) => `/v1beta/models/${model}:generateContent`),
        '/api/ai/gemini/stream':   geminiRoute((model) => `/v1beta/models/${model}:streamGenerateContent?alt=sse`),
        '/api/ai/gemini/models':   geminiRoute(() => '/v1beta/models'),

        // ── OpenAI-shaped chat completions (Batch 444) ────────────────────
        // Client calls: POST /api/ai/openai/v1/chat/completions
        // Forwards to:  https://api.openai.com/v1/chat/completions
        '/api/ai/openai': {
          target:       'https://api.openai.com',
          changeOrigin: true,
          secure:       true,
          rewrite:      (p: string) => p.replace(/^\/api\/ai\/openai/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('authorization', `Bearer ${env.OPENAI_API_KEY ?? ''}`);
              proxyReq.removeHeader('origin');
            });
          },
        },

        // ── Managed (Azure-style) deployment, only when configured ────────
        // Client calls: POST /api/ai/azure/chat/completions
        // Forwards to:  <AZURE_OPENAI_ENDPOINT>/openai/deployments/<AZURE_OPENAI_DEPLOYMENT>/chat/completions
        ...(env.AZURE_OPENAI_ENDPOINT && env.AZURE_OPENAI_DEPLOYMENT ? {
          '/api/ai/azure': {
            target:       env.AZURE_OPENAI_ENDPOINT,
            changeOrigin: true,
            secure:       true,
            rewrite:      () => `/openai/deployments/${encodeURIComponent(env.AZURE_OPENAI_DEPLOYMENT)}/chat/completions?api-version=2024-02-15-preview`,
            configure: (proxy) => {
              proxy.on('proxyReq', (proxyReq) => {
                proxyReq.setHeader('api-key', env.AZURE_OPENAI_API_KEY ?? '');
                proxyReq.removeHeader('origin');
              });
            },
          },
        } : {}),

        // ── Custom OpenAI-compatible endpoint, only when configured ───────
        // Client calls: POST /api/ai/custom/chat/completions
        // Forwards to:  <CUSTOM_AI_ENDPOINT>/chat/completions
        ...(env.CUSTOM_AI_ENDPOINT ? {
          '/api/ai/custom': {
            target:       env.CUSTOM_AI_ENDPOINT,
            changeOrigin: true,
            secure:       true,
            rewrite:      (p: string) => `${new URL(env.CUSTOM_AI_ENDPOINT).pathname.replace(/\/+$/, '')}${p.replace(/^\/api\/ai\/custom/, '')}`,
            configure: (proxy) => {
              proxy.on('proxyReq', (proxyReq) => {
                if (env.CUSTOM_AI_API_KEY) proxyReq.setHeader('authorization', `Bearer ${env.CUSTOM_AI_API_KEY}`);
                proxyReq.removeHeader('origin');
              });
            },
          },
        } : {}),

        // ── UMLS / NLM (SNOMED CT, terminology) ───────────────────────────
        // Client calls: GET /api/terminology/umls/search/current?string=...
        // Forwards to:  https://uts-ws.nlm.nih.gov/rest/search/current?string=...&apiKey=...
        '/api/terminology/umls': {
          target:       'https://uts-ws.nlm.nih.gov',
          changeOrigin: true,
          secure:       true,
          rewrite:      (p: string) => p.replace(/^\/api\/terminology\/umls/, '/rest'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              const sep = req.url?.includes('?') ? '&' : '?';
              // Batch 444: UMLS_API_KEY, or UMLS_KEY (the name .env files have used).
              proxyReq.path += `${sep}apiKey=${env.UMLS_API_KEY ?? env.UMLS_KEY ?? ''}`;
              proxyReq.removeHeader('origin');
            });
          },
        },

      },
    },
    // Batch 444: both workers are module workers ({ type: 'module' }), and
    // the PDF worker code-splits, so they must build as ES modules. Vite's
    // default worker format (iife) made `npm run build` fail outright.
    worker: {
      format: 'es',
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
                return 'vendor-react';
              }
              if (id.includes('@tiptap')) {
                return 'vendor-tiptap';
              }
              if (id.includes('xlsx')) {
                return 'vendor-xlsx';
              }
            }
            return undefined;
          },
        },
      },
    },
  };
});
