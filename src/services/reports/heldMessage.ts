// src/services/reports/heldMessage.ts
// Batch 392: the text a result held for its PDF carries. Batch 426: its own module, so the Assist dispatch
// (dispatchAssistSynopticResult.ts) uses it without loading the ORU builder.
export function heldMessage(error: string): string {
  return `Held: the report PDF is not available. ${error} The result is sent with its PDF when retried.`;
}
