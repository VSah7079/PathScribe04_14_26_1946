import { VoiceMacro } from '../../types/voiceMacros';

export interface IVoiceMacroService {
  getMacros(): Promise<VoiceMacro[]>;
  addMacro(macro: Omit<VoiceMacro, 'id'>): Promise<string>;
  updateMacro(id: string, updates: Partial<VoiceMacro>): Promise<void>;
  deleteMacro(id: string): Promise<void>;
  bulkImport(macros: Omit<VoiceMacro, 'id'>[]): Promise<void>;
  /** Batch 430: the signed-in person's own macros and the shared ones (not other people's personal macros). */
  getMacrosForCurrentUser(): Promise<VoiceMacro[]>;
  /** Batch 430: adds a macro owned by the signed-in person (needs no capability). */
  addPersonalMacro(macro: Omit<VoiceMacro, 'id'>): Promise<string>;
  /** Batch 430: imports macros owned by the signed-in person. */
  importPersonalMacros(macros: Omit<VoiceMacro, 'id'>[]): Promise<void>;
}
