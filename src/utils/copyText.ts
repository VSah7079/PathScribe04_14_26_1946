// src/utils/copyText.ts
// Batch 552: copies text to the clipboard (an enrolment code). False when the
// browser refuses (no permission, not a secure page); the text is still shown
// and selectable, so it can be copied by hand.
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
