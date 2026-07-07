// useSpecimenDictionary.tsx
// ─────────────────────────────────────────────────────────────
// Thin React hook wrapper around specimenDictionaryService — the real
// backend service (src/services/specimenDictionary/). Rewritten June
// 2026: this file used to call localStorage.getItem/setItem directly,
// inline, with no interface and no Firestore path — the one domain in
// the app not following the IXxxService/mockXxxService/
// firestoreXxxService pattern everything else uses. See
// ISpecimenDictionaryService.ts's own header for the full reasoning.
//
// Public API (dictionary, addEntries, updateEntries, deprecateEntries,
// replaceDictionary, exportDictionary) is deliberately UNCHANGED from
// before — every existing consumer (AccessionPage, SpecimenEditModal,
// SearchPage, SpecimenDictionarySection, TATConfigSection,
// SubspecialtiesSection) keeps working without modification. Only what's
// behind the hook changed, not what it looks like from the outside.
// ─────────────────────────────────────────────────────────────

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { SpecimenEntry } from './specimenTypes';
import { specimenDictionaryService } from '../../../services';

interface SpecimenDictionaryContextValue {
  dictionary:         SpecimenEntry[];
  version:            number;
  addEntries:         (entries: SpecimenEntry[]) => void;
  updateEntries:      (entries: SpecimenEntry[]) => void;
  deprecateEntries:   (ids: string[]) => void;
  replaceDictionary:  (entries: SpecimenEntry[]) => void;
  exportDictionary:   () => SpecimenEntry[];
}

const SpecimenDictionaryContext = createContext<SpecimenDictionaryContextValue | null>(null);

export const useSpecimenDictionary = () => {
  const ctx = useContext(SpecimenDictionaryContext);
  if (!ctx) throw new Error('useSpecimenDictionary must be used inside provider');
  return ctx;
};

export const SpecimenDictionaryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dictionary, setDictionary] = useState<SpecimenEntry[]>([]);
  // Kept for API-shape compatibility — no existing consumer destructures
  // this (confirmed by checking every useSpecimenDictionary() call site),
  // but removing it would be a breaking change to the hook's contract
  // for no real benefit. Simple local-mutation counter now, rather than
  // anything persisted — the service itself is the source of truth for
  // the actual data.
  const [version, setVersion] = useState(1);

  useEffect(() => {
    specimenDictionaryService.getAll().then(res => {
      if (res.ok) setDictionary(res.data);
    });
  }, []);

  // Every mutation re-fetches from the service's response rather than
  // computing the new array locally — the service is the source of
  // truth, not a local reducer that the service happens to mirror.
  const addEntries = useCallback((entries: SpecimenEntry[]) => {
    specimenDictionaryService.addEntries(entries).then(res => {
      if (res.ok) { setDictionary(res.data); setVersion(v => v + 1); }
    });
  }, []);

  const updateEntries = useCallback((entries: SpecimenEntry[]) => {
    specimenDictionaryService.updateEntries(entries).then(res => {
      if (res.ok) { setDictionary(res.data); setVersion(v => v + 1); }
    });
  }, []);

  const deprecateEntries = useCallback((ids: string[]) => {
    specimenDictionaryService.deprecateEntries(ids).then(res => {
      if (res.ok) { setDictionary(res.data); setVersion(v => v + 1); }
    });
  }, []);

  const replaceDictionary = useCallback((entries: SpecimenEntry[]) => {
    specimenDictionaryService.replaceDictionary(entries).then(res => {
      if (res.ok) { setDictionary(res.data); setVersion(v => v + 1); }
    });
  }, []);

  const exportDictionary = useCallback(() => dictionary, [dictionary]);

  return (
    <SpecimenDictionaryContext.Provider
      value={{
        dictionary,
        version,
        addEntries,
        updateEntries,
        deprecateEntries,
        replaceDictionary,
        exportDictionary,
      }}
    >
      {children}
    </SpecimenDictionaryContext.Provider>
  );
};
