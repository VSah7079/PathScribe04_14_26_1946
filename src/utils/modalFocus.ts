// src/utils/modalFocus.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 650: is a window that owns focus open? A voice or keyboard command meant for the screen behind it (Sign Out
// Case, History, Codes) must not act while a window is up: the window's own buttons answer then. The screens render
// their windows as a full-screen wrapper (`ps-overlay`, `ps-ms-overlay`, `ps-conf-backdrop`, `fm-overlay`, ...), or mark
// them `aria-modal`, so the check reads the page: any element whose class ends in `-overlay` / `-backdrop` (or is
// exactly that), or that has aria-modal="true".
//
// Conservative on purpose: a false "open" only means the command is ignored (the person uses the button); a false
// "closed" could not sign anything either, because Sign Out Case only opens the confirmation window.
// Pure over a Document, so it is tested with a plain DOM (modalFocus.test.ts).
// ─────────────────────────────────────────────────────────────────────────────

const WRAPPER_CLASS = /(?:^|-)(?:overlay|backdrop)$/;

/** True when a modal wrapper (class ending in overlay or backdrop, or aria-modal="true") is in the document. */
export function isModalOpen(doc: Document = document): boolean {
  const candidates = doc.querySelectorAll<HTMLElement>('[class*="overlay"], [class*="backdrop"], [aria-modal="true"]');
  for (const el of Array.from(candidates)) {
    if (el.getAttribute('aria-modal') === 'true') return true;
    if (Array.from(el.classList).some(c => WRAPPER_CLASS.test(c))) return true;
  }
  return false;
}
