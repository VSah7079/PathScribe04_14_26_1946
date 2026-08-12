// useSpecimenDictionary.tsx
<<<<<<< HEAD

import React, { createContext, useContext, useEffect, useState } from 'react';
import { SpecimenEntry } from './specimenTypes';
import starterData from '../../../../scripts/terminology-sources/specimens-starter.json';

// ─── Starter data seed ────────────────────────────────────────────────────────
// Cast the imported JSON to SpecimenEntry[] — the shape matches exactly.
// This seeds the dictionary on first run (empty localStorage) so new
// installations have 60 common specimens ready to use out of the box.
// Institutions can customise via Configuration > Specimen Dictionary.
const STARTER_SPECIMENS = starterData.specimens as unknown as SpecimenEntry[];

// localStorage key used to track whether starter data has been seeded.
// Separate from specimenDictionary so a user clearing their dictionary
// doesn't trigger a re-seed on next load.
const SEED_KEY = 'specimenDictionarySeeded_v1';
=======
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
import { SpecimenEntry } from '../../../services/specimenDictionary/specimenTypes';
import { specimenDictionaryService } from '../../../services';
>>>>>>> upstream/main

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
<<<<<<< HEAD
  const [version,    setVersion]    = useState<number>(1);

  // Load from localStorage on mount — seed from starter data if first run
  useEffect(() => {
    const raw        = localStorage.getItem('specimenDictionary');
    const rawVersion = localStorage.getItem('specimenDictionaryVersion');
    const seeded     = localStorage.getItem(SEED_KEY);

    if (raw) {
      // Existing dictionary — load as normal
      setDictionary(JSON.parse(raw));
      if (rawVersion) setVersion(Number(rawVersion));
    } else if (!seeded) {
      // First run — seed from starter data and mark as seeded
      setDictionary(STARTER_SPECIMENS);
      setVersion(1);
      localStorage.setItem('specimenDictionary',        JSON.stringify(STARTER_SPECIMENS));
      localStorage.setItem('specimenDictionaryVersion', '1');
      localStorage.setItem(SEED_KEY,                    'true');
    }
    // If seeded=true but raw is empty, the user deliberately cleared their
    // dictionary — respect that and leave it empty.
  }, []);

  // Persist to localStorage
  const persist = (entries: SpecimenEntry[], newVersion: number) => {
    setDictionary(entries);
    setVersion(newVersion);
    localStorage.setItem('specimenDictionary',        JSON.stringify(entries));
    localStorage.setItem('specimenDictionaryVersion', String(newVersion));
  };

  const addEntries = (entries: SpecimenEntry[]) => {
    persist([...dictionary, ...entries], version + 1);
  };

  const updateEntries = (entries: SpecimenEntry[]) => {
    const updated = dictionary.map(d => {
      const match = entries.find(e => e.id === d.id);
      return match ? match : d;
    });
    persist(updated, version + 1);
  };

  const deprecateEntries = (ids: string[]) => {
    const updated = dictionary.map(d =>
      ids.includes(d.id) ? { ...d, active: false, version: d.version + 1 } : d
    );
    persist(updated, version + 1);
  };

  const replaceDictionary = (entries: SpecimenEntry[]) => {
    persist(entries, version + 1);
  };

  const exportDictionary = () => dictionary;
=======
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
>>>>>>> upstream/main

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
