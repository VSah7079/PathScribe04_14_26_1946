// src/utils/selectAutoWidth.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 580 (PS-62, Pete, Oct 15, 2026: "Add the styled panel plus the width
// script ... Include Firefox"). Browsers that draw the styled dropdown list
// (`appearance: base-select`, pathscribe.css) size a dropdown to its *selected*
// value, not its widest option as a native dropdown does, so toolbars and
// table columns would change width as people pick values. This gives each
// such dropdown the width of its widest option again: it measures the option
// labels in the dropdown's own font (with its letter spacing and capitals)
// and sets `--ps-select-auto-width` on it, which a CSS rule uses as its width
// unless the dropdown sets its own (as a native dropdown's width works).
//
//   - Only where the styled list is drawn (`CSS.supports('appearance',
//     'base-select')`): Chrome and Edge (135 and later) today. Firefox and Safari keep the
//     browser's own list and width, and pick both up with no change here once
//     they support it (Firefox: not yet, not even in Nightly, Oct 2026).
//   - Kept up to date as dropdowns appear, their options or classes change,
//     or fonts finish loading (one MutationObserver, batched to the next frame).
//   - Multi-selects and list boxes (`multiple`, `size` > 1) keep the native
//     look, as in the CSS.
//
// The sizing rule is pure (`selectAutoWidthPx`) and tested; the rest only
// reads the page and sets the custom property (no inline style of its own).
// ─────────────────────────────────────────────────────────────────────────────

export const SELECT_AUTO_WIDTH_VAR = '--ps-select-auto-width';
/** Room for the open-list arrow and the gap before it, beside the text. */
export const SELECT_ICON_ALLOWANCE_PX = 20;

export interface SelectBoxMetrics {
  paddingLeft: number; paddingRight: number;
  borderLeft: number; borderRight: number;
}

/** The width a dropdown needs for its widest option: the text, its padding and border, and the arrow. */
export function selectAutoWidthPx(optionTextWidths: readonly number[], box: SelectBoxMetrics, iconAllowance = SELECT_ICON_ALLOWANCE_PX): number | null {
  if (optionTextWidths.length === 0) return null;
  const widest = Math.max(...optionTextWidths);
  return Math.ceil(widest + box.paddingLeft + box.paddingRight + box.borderLeft + box.borderRight + iconAllowance);
}

/** Whether a dropdown gets the styled list (and so needs its width set): single choice, not a list box. */
export function isStyledSelect(el: { multiple: boolean; size: number }): boolean {
  return !el.multiple && !(el.size > 1);
}

/** The text as the dropdown shows it (CSS text-transform). */
export function transformedLabel(text: string, textTransform: string): string {
  if (textTransform === 'uppercase') return text.toUpperCase();
  if (textTransform === 'lowercase') return text.toLowerCase();
  if (textTransform === 'capitalize') return text.replace(/(^|\s)(\S)/g, (_, sp: string, c: string) => sp + c.toUpperCase());
  return text;
}

/** A measured text width plus the letter spacing the canvas leaves out. */
export function withLetterSpacing(width: number, text: string, letterSpacingPx: number): number {
  return width + (letterSpacingPx > 0 ? letterSpacingPx * [...text].length : 0);
}

const px = (v: string) => Number.parseFloat(v) || 0;

/**
 * Starts sizing every styled dropdown in the document, now and as the page changes. Does nothing where the
 * styled list isn't drawn. Returns a function that stops it.
 */
export function installSelectAutoWidth(doc: Document = document): () => void {
  const view = doc.defaultView;
  if (!view || typeof view.CSS?.supports !== 'function' || !view.CSS.supports('appearance', 'base-select')) return () => {};
  const canvas = doc.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  const size = (el: HTMLSelectElement) => {
    if (!isStyledSelect(el)) return;
    const style = view.getComputedStyle(el);
    ctx.font = style.font || `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const spacing = px(style.letterSpacing);
    const widths = Array.from(el.options, o => {
      const text = transformedLabel(o.label || o.text, style.textTransform);
      return withLetterSpacing(ctx.measureText(text).width, text, spacing);
    });
    const w = selectAutoWidthPx(widths, {
      paddingLeft: px(style.paddingLeft), paddingRight: px(style.paddingRight),
      borderLeft: px(style.borderLeftWidth), borderRight: px(style.borderRightWidth),
    });
    if (w === null) el.style.removeProperty(SELECT_AUTO_WIDTH_VAR);
    else if (el.style.getPropertyValue(SELECT_AUTO_WIDTH_VAR) !== `${w}px`) el.style.setProperty(SELECT_AUTO_WIDTH_VAR, `${w}px`);
  };

  const pending = new Set<HTMLSelectElement>();
  let frame = 0;
  const flush = () => { frame = 0; for (const el of pending) if (el.isConnected) size(el); pending.clear(); };
  const queue = (el: HTMLSelectElement) => { pending.add(el); if (!frame) frame = view.requestAnimationFrame(flush); };
  const queueWithin = (node: Node) => {
    if (!(node instanceof view.Element)) {
      const owner = node.parentElement?.closest('select');
      if (owner) queue(owner as HTMLSelectElement);
      return;
    }
    const own = node.closest('select');
    if (own) { queue(own as HTMLSelectElement); return; }
    node.querySelectorAll('select').forEach(s => queue(s as HTMLSelectElement));
  };

  const remeasureAll = () => doc.querySelectorAll('select').forEach(s => queue(s as HTMLSelectElement));
  remeasureAll();
  const observer = new view.MutationObserver(records => {
    for (const r of records) {
      if (r.type === 'characterData') { queueWithin(r.target); continue; }
      if (r.type === 'attributes') {
        // A dropdown's or option's own class or label; or the page's (a display profile or compact mode).
        const el = r.target as Element;
        if (el === doc.documentElement || el === doc.body) remeasureAll();
        else if (el.closest('select')) queueWithin(el);
        continue;
      }
      const target = r.target as Element;
      const owner = target.closest?.('select');
      if (owner) { queue(owner as HTMLSelectElement); continue; }
      r.addedNodes.forEach(queueWithin);
    }
  });
  // A class change can change a dropdown's font; an option's label is its text. Never `style` (set here).
  observer.observe(doc.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'label'] });
  // Fonts load after first paint, and further glyph sets (Korean, say) later still: measure again each time.
  void doc.fonts?.ready.then(remeasureAll);
  doc.fonts?.addEventListener?.('loadingdone', remeasureAll);
  return () => {
    observer.disconnect();
    doc.fonts?.removeEventListener?.('loadingdone', remeasureAll);
    if (frame) view.cancelAnimationFrame(frame);
    pending.clear();
  };
}
