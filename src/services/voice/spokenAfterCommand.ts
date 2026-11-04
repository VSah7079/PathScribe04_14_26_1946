// src/services/voice/spokenAfterCommand.ts
// Batch 664: what was said after a command's own words ("add collaborator Nguyen" → "nguyen"; "edit field microscopic" →
// "microscopic"). Pure. Accents and punctuation are folded so a spoken name matches a written one.

/** Lower case, accents removed, punctuation to spaces. */
export function fold(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

/** The transcript, folded, with the longest of `phrases` found in it taken out. */
export function textAfterCommand(transcript: string, phrases: readonly string[]): string {
  const said = fold(transcript);
  const hit = [...phrases].map(fold).filter(p => p && said.includes(p)).sort((a, b) => b.length - a.length)[0];
  return (hit ? said.replace(hit, ' ') : said).replace(/\s+/g, ' ').trim();
}

/** Every phrase that can start a command, in every language (fixed, learned and per-language), so the command words can be told from the rest. */
export function phrasesOf(action: { voiceTriggers: readonly string[]; learnedTriggers?: readonly string[]; voiceTriggersByLanguage?: Readonly<Record<string, readonly string[] | undefined>> } | undefined): string[] {
  if (!action) return [];
  return [...action.voiceTriggers, ...(action.learnedTriggers ?? []), ...Object.values(action.voiceTriggersByLanguage ?? {}).flatMap(v => v ?? [])];
}
