// src/utils/touch/tapTitle.ts
// Touch spec §2: a tooltip (an element's `title`) needs a tap alternative, since a finger cannot hover. On a station
// screen in the touch layout, tapping an information element that carries a title shows the title in a bubble.
// A button, link or field does its own job when tapped, so its title is not shown. Pure apart from reading the DOM
// it is handed.

const INTERACTIVE = 'button, a[href], input, select, textarea, summary, label, [role="button"], [role="tab"], [role="link"], [role="checkbox"], [contenteditable="true"]';

/** The title to show for a tap on `target`, or null. Stops at `root` (the station screen). */
export function tapTitleFor(target: Element | null, root: Element | null): string | null {
  let el: Element | null = target;
  while (el && el !== root) {
    if (el.matches(INTERACTIVE)) return null;
    const title = el.getAttribute('title');
    if (title && title.trim()) return title.trim();
    el = el.parentElement;
  }
  return null;
}
