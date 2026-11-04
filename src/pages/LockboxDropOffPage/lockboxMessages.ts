// src/pages/LockboxDropOffPage/lockboxMessages.ts
// Batch 645: which message shows a refusal code from the lockbox service. Fixed codes only: the screen never shows server text.
export const LOCKBOX_ERROR_CODES = ['NOT_PERMITTED', 'INVALID', 'CONFLICT', 'NOT_FOUND', 'ALREADY_ACCESSIONED', 'PLACEHOLDER_UNRESOLVED', 'NOT_A_PLACEHOLDER'] as const;

export const lockboxErrorKey = (code: string): string =>
  `lockboxDropOff.error.${(LOCKBOX_ERROR_CODES as readonly string[]).includes(code) ? code : 'UNKNOWN'}`;
