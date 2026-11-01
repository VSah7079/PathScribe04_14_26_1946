// src/pages/AccessionPage/AccessionColumnSlot.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 721. In the two-column Accession layout the Cytology card (written in the
// Case & Patient form) is shown under the specimens in the right column, where
// the specimen that makes it relevant is. This draws a piece of the page into
// another place in the window without moving its code or its state: events and
// context behave exactly as if it had stayed where it is written.
// With no host (the tabs layout, or the right column not on screen), it simply
// draws its children where they are.
// ─────────────────────────────────────────────────────────────────────────────

import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

export function AccessionColumnSlot({ host, children }: { host: HTMLElement | null; children: ReactNode }) {
  return host ? createPortal(children, host) : <>{children}</>;
}
