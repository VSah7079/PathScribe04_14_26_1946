// @vitest-environment jsdom
//
// Batch 500 (PS-473): a standard XSS payload list against the sanitisers, and
// proof that ordinary report formatting, the report's classes, data-phi and
// real barcode SVGs come through unchanged in substance.
import { describe, it, expect } from 'vitest';
import { cssString, escapeHtml, sanitizeRichHtml, sanitizeSvgMarkup } from './sanitizeHtml';
import { generateBarcodeSvg } from '@/utils/labels/generateBarcodeSvg';

/** Common XSS payloads (OWASP cheat-sheet style). None may leave anything that runs. */
const PAYLOADS = [
  '<script>alert(1)</script>',
  '<img src=x onerror=alert(1)>',
  '<svg onload=alert(1)>',
  '<svg><script>alert(1)</script></svg>',
  '<a href="javascript:alert(1)">click</a>',
  '<a href="JaVaScRiPt:alert(1)">click</a>',
  '<a href="&#106;avascript:alert(1)">click</a>',
  '<iframe src="javascript:alert(1)"></iframe>',
  '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
  '<object data="javascript:alert(1)"></object>',
  '<embed src="javascript:alert(1)">',
  '<body onload=alert(1)>',
  '<div onmouseover="alert(1)">x</div>',
  '<p style="background:url(javascript:alert(1))">x</p>',
  '<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>',
  '<form action="javascript:alert(1)"><button>go</button></form>',
  '<input autofocus onfocus=alert(1)>',
  '<details open ontoggle=alert(1)>',
  '<video><source onerror=alert(1)></video>',
  '<svg><animate onbegin=alert(1) attributeName=x dur=1s>',
  '<svg><a xlink:href="javascript:alert(1)"><text>x</text></a></svg>',
  '<svg><foreignObject><img src=x onerror=alert(1)></foreignObject></svg>',
  '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">',
  '<base href="javascript:alert(1)//">',
  '<style>@import "javascript:alert(1)";</style>',
  '<template><img src=x onerror=alert(1)></template>',
  '"><img src=x onerror=alert(1)>',
  '<noscript><p title="</noscript><img src=x onerror=alert(1)>">',
];

/** Anything in the output that could run script. */
function dangerous(html: string): string[] {
  const found: string[] = [];
  const doc = new DOMParser().parseFromString(`<div id="root">${html}</div>`, 'text/html');
  for (const el of Array.from(doc.querySelectorAll('#root *'))) {
    const tag = el.tagName.toLowerCase();
    if (['script', 'iframe', 'object', 'embed', 'base', 'meta', 'style', 'form', 'input', 'button', 'foreignobject', 'animate', 'set', 'template'].includes(tag)) found.push(`<${tag}>`);
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      // eslint-disable-next-line no-control-regex -- browsers ignore control characters inside a URL scheme, so the check must too
      const value = attr.value.replace(/[\s\u0000-\u001f]/g, '').toLowerCase();
      if (name.startsWith('on')) found.push(`${tag}[${name}]`);
      if (/^(href|src|xlink:href|action|formaction|data|srcdoc)$/.test(name) && /^(javascript|vbscript):/.test(value)) found.push(`${tag}[${name}=${value}]`);
      if (name === 'srcdoc') found.push(`${tag}[srcdoc]`);
      if (name === 'style' && value.includes('javascript:')) found.push(`${tag}[style]`);
    }
  }
  return found;
}

describe('sanitizeRichHtml — XSS payloads', () => {
  for (const payload of PAYLOADS) {
    it(`neutralises ${payload}`, () => {
      expect(dangerous(sanitizeRichHtml(payload))).toEqual([]);
    });
  }
});

describe('sanitizeSvgMarkup — XSS payloads', () => {
  for (const payload of PAYLOADS) {
    it(`neutralises ${payload}`, () => {
      expect(dangerous(sanitizeSvgMarkup(payload))).toEqual([]);
    });
  }
});

describe('what must survive', () => {
  it('report formatting, the report classes and data-phi are kept', () => {
    const html = '<p class="rp-para"><strong>Diagnosis:</strong> <em>invasive</em> carcinoma, <span data-phi="name">Jane Doe</span></p>'
      + '<ul><li>one</li></ul><table><tbody><tr><td>T2</td></tr></tbody></table><p style="text-align: center">c</p>';
    const out = sanitizeRichHtml(html);
    const doc = new DOMParser().parseFromString(`<div>${out}</div>`, 'text/html');
    expect(doc.querySelector('p.rp-para strong')?.textContent).toBe('Diagnosis:');
    expect(doc.querySelector('em')?.textContent).toBe('invasive');
    expect(doc.querySelector('[data-phi="name"]')?.textContent).toBe('Jane Doe');
    expect(doc.querySelectorAll('li')).toHaveLength(1);
    expect(doc.querySelector('td')?.textContent).toBe('T2');
    expect(out).toContain('text-align');
  });

  it('text in other languages is untouched', () => {
    for (const text of ['Carcinome canalaire infiltrant', 'Invasives duktales Karzinom — größer', '침윤성 유관암', 'Invasief ductaal carcinoom']) {
      expect(sanitizeRichHtml(`<p>${text}</p>`)).toBe(`<p>${text}</p>`);
    }
  });

  it('a link opening a new tab cannot reach back into the app', () => {
    const out = sanitizeRichHtml('<a href="https://example.org" target="_blank">ref</a>');
    expect(out).toContain('rel="noopener noreferrer"');
    expect(out).toContain('href="https://example.org"');
  });

  it.each(['code128', 'datamatrix', 'qr'] as const)('a real %s barcode SVG keeps its drawing', symbology => {
    const svg = generateBarcodeSvg('S26-12345', symbology);
    const out = sanitizeSvgMarkup(svg);
    const doc = new DOMParser().parseFromString(`<div>${out}</div>`, 'text/html');
    const original = new DOMParser().parseFromString(`<div>${svg}</div>`, 'text/html');
    expect(doc.querySelector('svg')).not.toBeNull();
    expect(doc.querySelectorAll('svg *').length).toBe(original.querySelectorAll('svg *').length);
  });

  it('the designer canvas error box survives', () => {
    expect(sanitizeSvgMarkup('<div class="ps-designer-barcode-error">Cannot draw</div>')).toBe('<div class="ps-designer-barcode-error">Cannot draw</div>');
  });

  it('empty input gives empty output', () => {
    expect(sanitizeRichHtml(undefined)).toBe('');
    expect(sanitizeSvgMarkup(null)).toBe('');
  });
});

describe('escaping for HTML and CSS built as strings', () => {
  it('escapeHtml', () => {
    expect(escapeHtml('<b>"A&B\'</b>')).toBe('&lt;b&gt;&quot;A&amp;B&#39;&lt;/b&gt;');
    expect(escapeHtml(undefined)).toBe('');
  });
  it('cssString cannot close the string or the style block', () => {
    const out = cssString('S26-1"; } body { display:none } </style><script>');
    expect(out).not.toMatch(/["<>]/);
  });
});
