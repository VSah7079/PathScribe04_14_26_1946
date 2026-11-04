// src/services/staff/roleDisplayName.ts
// Batch 658: how a stored role name reads on screen ("pathology-assistant" is "Pathology Assistant"). Role names are
// data a laboratory chooses, so they are shown as stored, only tidied; empty gives an empty string.
export function roleDisplayName(role: string | null | undefined): string {
  const words = (role ?? '').trim().split(/[\s_-]+/).filter(Boolean);
  return words.map(w => (w === w.toLowerCase() ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join(' ');
}
