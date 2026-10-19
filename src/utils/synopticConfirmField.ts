/**
 * Which field the Confirm Field shortcut confirms (PS-66).
 *
 * The shortcut (Ctrl+Alt+Shift+A) sent an event that nothing listened for, so
 * it did nothing. It also has to work while the person is typing in a field, so
 * the field with the cursor is preferred; otherwise the field last clicked.
 * Only a field that still has an unconfirmed AI suggestion can be confirmed.
 */

export interface ConfirmableSuggestion {
  verification?: 'verified' | 'disputed' | 'unverified' | null;
}

export function resolveFieldToConfirm(
  focusedFieldId: string | null | undefined,
  activeFieldId: string | null | undefined,
  suggestions: Record<string, ConfirmableSuggestion | undefined>,
): string | null {
  const canConfirm = (id: string | null | undefined): id is string => {
    if (!id) return false;
    const sug = suggestions[id];
    if (!sug) return false;
    return sug.verification !== 'verified' && sug.verification !== 'disputed';
  };
  if (canConfirm(focusedFieldId)) return focusedFieldId;
  if (canConfirm(activeFieldId)) return activeFieldId;
  return null;
}
