// scripts/vite/preloadAppStart.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 549 (PS-539 phase 2d; carried over from Batch 547). main.tsx reads the
// deployment's config.json before it loads the app (startApp.tsx), so that
// every service sees the site's settings. That cost a round trip: the app's
// code only started downloading once config.json had arrived.
//
// This build plugin adds <link rel="modulepreload"> tags to index.html for
// startApp.tsx's chunk and everything it imports statically. The browser then
// downloads the app's code at the same time as config.json, without running
// it; main.tsx still runs it only after config.json is read, so the order the
// settings depend on is unchanged.
// ─────────────────────────────────────────────────────────────────────────────
import type { Plugin } from 'vite';
import { staticChunkClosure } from '../static-chunk-closure.mjs';

export function preloadAppStart(entrySuffix = '/src/startApp.tsx'): Plugin {
  let base = '/';
  return {
    name: 'pathscribe-preload-app-start',
    apply: 'build',
    configResolved(config) { base = config.base; },
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx.bundle) return html;
        const files = staticChunkClosure(ctx.bundle as never, entrySuffix)
          .filter(file => !html.includes(`${base}${file}"`));
        return {
          html,
          tags: files.map(file => ({ tag: 'link', attrs: { rel: 'modulepreload', crossorigin: true, href: `${base}${file}` }, injectTo: 'head' as const })),
        };
      },
    },
  };
}
