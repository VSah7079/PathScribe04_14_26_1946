/**
 * PS-55: tells the screen when a label meant for a hardware printer (QZ Tray)
 * could not be sent and fell back to the browser print window. Before this the
 * failure was silent, so a technician saw a print dialog and did not know the
 * thermal printer had been skipped.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

export function subscribeLabelBridgeFailure(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function reportLabelBridgeFailure(): void {
  listeners.forEach(listener => listener());
}
