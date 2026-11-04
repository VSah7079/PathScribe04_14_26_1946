// src/components/Config/help/ConfigHelpContext.ts
// Batch 646: how a Configuration tab tells the page's Help button which of its sections is open.
// Tabs that keep their open section in their own state (System, Cytology, Staff, Report Templates,
// Validation Studies) call useRegisterConfigHelpSection(section); the Help button reads it.
import { createContext, useContext, useEffect } from 'react';

export interface ConfigHelpContextValue {
  setSection: (section: string | undefined) => void;
}

export const ConfigHelpContext = createContext<ConfigHelpContextValue | null>(null);

/** Registers the open section for the Help button while the calling tab is mounted. */
export function useRegisterConfigHelpSection(section: string | undefined): void {
  const ctx = useContext(ConfigHelpContext);
  useEffect(() => {
    ctx?.setSection(section);
    return () => ctx?.setSection(undefined);
  }, [ctx, section]);
}
