// src/hooks/usePersonalLanguage.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 431: applies the signed-in person's language when they sign in, and
// saves their choice when they change it (services/userSettings/
// personalLanguage.ts). Used once, by AppShell, which is on every signed-in
// screen.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '@/i18n/config';
import { personalLanguageFor, savePersonalLanguage } from '@/services/userSettings/personalLanguage';

export function usePersonalLanguage(userId: string | undefined): void {
  const { i18n } = useTranslation();

  useEffect(() => {
    if (!userId) return;
    const saved = personalLanguageFor(userId, SUPPORTED_LANGUAGES);
    if (saved && saved !== i18n.language) void i18n.changeLanguage(saved);
    else if (!saved && i18n.language) savePersonalLanguage(userId, i18n.language);

    const onChange = (language: string) => savePersonalLanguage(userId, language);
    i18n.on('languageChanged', onChange);
    return () => { i18n.off('languageChanged', onChange); };
  }, [userId, i18n]);
}
