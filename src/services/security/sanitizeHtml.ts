// src/services/security/sanitizeHtml.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 500 (PS-473): the one place HTML from data is made safe to render.
//
// Every `dangerouslySetInnerHTML` in the app goes through one of these
// (enforced by htmlSanitising.guard.test.ts):
//   • sanitizeRichHtml — report sections, report paragraphs, comments: the
//     HTML the editor (TipTap) and the AI writer produce. Keeps ordinary
//     formatting, `class` (the report's own classes) and `data-*`
//     (including `data-phi`, so screenshot redaction still works).
//   • sanitizeSvgMarkup — barcode SVGs (and the designer's error box).
//
// Sanitising happens when content is DISPLAYED. That is the real protection
// in the browser: a modified client can skip any sanitising before save. The
// API server must also sanitise on save (noted for the India team in
// docs/architecture/CASE_API.md, "Sanitise on save").
//
// escapeHtml is for text placed inside HTML the app builds as a string
// (print windows' <title>, values in a printed table).
//
// Without a DOM (a test in plain node) DOMPurify can't run; the sanitisers
// then escape everything, so the failure is safe (shown as text), never
// unsafe.
// ─────────────────────────────────────────────────────────────────────────────

import DOMPurify from 'dompurify';

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Text made safe to place inside HTML (element content or a quoted attribute). */
export function escapeHtml(text: unknown): string {
  return String(text ?? '').replace(/[&<>"']/g, ch => ESCAPES[ch]);
}

/** Text placed inside a double-quoted CSS string (a print window's `@page` header). */
export function cssString(text: unknown): string {
  return String(text ?? '').replace(/[\\"\n\r<>]/g, ch => `\\${ch.charCodeAt(0).toString(16)} `);
}

/** Tags never allowed even though DOMPurify's HTML profile would keep them. */
const FORBID_TAGS = ['style', 'form', 'input', 'button', 'textarea', 'select', 'option', 'dialog', 'template', 'slot'];
/** Attributes never allowed: anything that could submit, navigate a form, or restyle the page around it. */
const FORBID_ATTR = ['formaction', 'action', 'srcset', 'ping'];

/** The only inline-style properties kept (what the report editor writes). */
const SAFE_STYLE_PROPS = new Set(['text-align', 'font-weight', 'font-style', 'text-decoration', 'text-decoration-line']);

let hooked = false;
function purifier(): typeof DOMPurify | null {
  if (!DOMPurify.isSupported) return null;
  if (!hooked) {
    // Links in report text open safely: a new tab can't reach back into PathScribe.
    DOMPurify.addHook('afterSanitizeAttributes', node => {
      if (node.tagName === 'A' && node.hasAttribute('target')) {
        if (node.getAttribute('target') !== '_blank') node.removeAttribute('target');
        else node.setAttribute('rel', 'noopener noreferrer');
      }
      // Inline style keeps only the text formatting the editor writes (alignment,
      // weight, emphasis, decoration); nothing that can load a URL or reposition.
      const style = node.getAttribute?.('style');
      if (style != null) {
        const kept = style.split(';').map(d => d.trim()).filter(d => {
          const [prop, ...rest] = d.split(':');
          const value = rest.join(':').trim().toLowerCase();
          return !!prop && SAFE_STYLE_PROPS.has(prop.trim().toLowerCase()) && /^[a-z0-9 #%.,-]+$/.test(value);
        });
        if (kept.length) node.setAttribute('style', kept.join('; ')); else node.removeAttribute('style');
      }
    });
    hooked = true;
  }
  return DOMPurify;
}

/** Report sections, paragraphs and comments: formatting kept, anything active removed. */
export function sanitizeRichHtml(html: string | null | undefined): string {
  const input = html ?? '';
  if (!input) return '';
  const p = purifier();
  if (!p) return escapeHtml(input);
  return p.sanitize(input, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target'],
    FORBID_TAGS,
    FORBID_ATTR,
    ALLOW_DATA_ATTR: true,
  }) as string;
}

/** Barcode SVG markup (plus the HTML error box a designer canvas may show instead). */
export function sanitizeSvgMarkup(markup: string | null | undefined): string {
  const input = markup ?? '';
  if (!input) return '';
  const p = purifier();
  if (!p) return escapeHtml(input);
  return p.sanitize(input, {
    USE_PROFILES: { svg: true, svgFilters: true, html: true },
    FORBID_TAGS: [...FORBID_TAGS, 'foreignObject', 'use', 'image', 'animate', 'set', 'animateTransform', 'animateMotion'],
    FORBID_ATTR,
    ALLOW_DATA_ATTR: true,
  }) as string;
}
