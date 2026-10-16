// src/services/molecularOrders/molecularQueueSelection.ts
// Batch 562: the Order Queue re-reads when an order changes elsewhere (the live-update hub). Orders that have left
// the queue meanwhile (another technologist plated them, say) drop out of the selection, so an action never names
// an order the user can no longer see.
export function keepSelectedInView(selected: readonly string[], rows: readonly { orderId: string }[]): string[] {
  const shown = new Set(rows.map(r => r.orderId));
  const kept = selected.filter(id => shown.has(id));
  return kept.length === selected.length ? (selected as string[]) : kept;
}
