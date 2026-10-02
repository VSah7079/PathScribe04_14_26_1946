import { IVoiceMacroService } from './IVoiceMacroService';
import { VoiceMacro, applyVoiceMacroSubstitutions } from '../../types/voiceMacros';
import { PATHOLOGY_DEFAULTS } from '../../constants/defaultMacros';
import type { ServiceResult } from '../types';
import { getSessionUser } from '../auth/caseAccessControl';
import { CONFIG_NOT_PERMITTED, permitConfigChange } from '../authorization/guardConfigWrites';
import { macroChangeNeedsCapability } from '../macros/macroAccess';

/** Batch 430: a person's own voice macro (Personal Quick Text) is theirs; a shared
 *  one (enterprise or facility), or someone else's, needs config:macros:manage,
 *  the same rule as report macros. A refusal throws CONFIG_NOT_PERMITTED and
 *  changes nothing. */
async function permitVoiceMacroChange(before: VoiceMacro | undefined, after: Pick<VoiceMacro, 'ownerUserId' | 'performingLabFacilityId'>): Promise<void> {
  if (!macroChangeNeedsCapability(before, after, getSessionUser()?.id)) return;
  const { authorizationService } = await import('../authorization/defaultAuthorizationService');
  if (!(await permitConfigChange(authorizationService.enforce('config:macros:manage'), 'config:macros:manage'))) throw new Error(CONFIG_NOT_PERMITTED);
}

export class MockVoiceMacroService implements IVoiceMacroService {
  private STORAGE_KEY = 'pathscribe_voice_macros';

  private getStoredMacros(): VoiceMacro[] {
    const data = localStorage.getItem(this.STORAGE_KEY);
    
    if (!data) {
      // Seed defaults using the correct 'spoken' and 'written' keys
      const seededMacros: VoiceMacro[] = PATHOLOGY_DEFAULTS.map((m: any) => ({
        id: Math.random().toString(36).substring(2, 11),
        spoken: m.spoken || m.name || '',
        written: m.written || m.replacement || '',
        isActive: m.isActive ?? true
      }));
      this.saveToStorage(seededMacros);
      return seededMacros;
    }
    
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error("Failed to parse stored macros, resetting to defaults.");
      return [];
    }
  }

  private saveToStorage(macros: VoiceMacro[]) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(macros));
  }

  // --- Public API Methods ---

  async getMacros(): Promise<VoiceMacro[]> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(this.getStoredMacros()), 300);
    });
  }

  async addMacro(macro: Omit<VoiceMacro, 'id'>): Promise<string> {
    await permitVoiceMacroChange(undefined, macro);
    const macros = this.getStoredMacros();
    const newId = Math.random().toString(36).substring(2, 11);
    const newMacro: VoiceMacro = { ...macro, id: newId };
    this.saveToStorage([newMacro, ...macros]);
    return newId;
  }

  async updateMacro(id: string, updates: Partial<VoiceMacro>): Promise<void> {
    const macros = this.getStoredMacros();
    const before = macros.find(m => m.id === id);
    if (before) await permitVoiceMacroChange(before, { ...before, ...updates });
    const updated = macros.map(m => (m.id === id ? { ...m, ...updates } : m));
    this.saveToStorage(updated);
  }

  async deleteMacro(id: string): Promise<void> {
    const macros = this.getStoredMacros();
    const before = macros.find(m => m.id === id);
    if (before) await permitVoiceMacroChange(before, before);
    const filtered = macros.filter(m => m.id !== id);
    this.saveToStorage(filtered);
  }

  async bulkImport(macros: Omit<VoiceMacro, 'id'>[]): Promise<void> {
    for (const m of macros) await permitVoiceMacroChange(undefined, m);
    const existing = this.getStoredMacros();
    const newEntries = macros.map(m => ({
      ...m,
      id: Math.random().toString(36).substring(2, 11)
    }));
    this.saveToStorage([...newEntries, ...existing]);
  }

  // ── Batch 430: a person's own voice macros (Configuration → Voice → Speech Processing Rules) ──
  private personal(m: Omit<VoiceMacro, 'id'>): Omit<VoiceMacro, 'id'> {
    const userId = getSessionUser()?.id;
    return { ...m, ownerUserId: userId, createdBy: userId, createdAt: new Date().toISOString() };
  }

  async getMacrosForCurrentUser(): Promise<VoiceMacro[]> {
    const userId = getSessionUser()?.id;
    return (await this.getMacros()).filter(m => !m.ownerUserId || m.ownerUserId === userId);
  }

  async addPersonalMacro(macro: Omit<VoiceMacro, 'id'>): Promise<string> {
    return this.addMacro(this.personal(macro));
  }

  async importPersonalMacros(macros: Omit<VoiceMacro, 'id'>[]): Promise<void> {
    return this.bulkImport(macros.map(m => this.personal(m)));
  }

  /**
   * Real, per direct guidance: delegates to applyVoiceMacroSubstitutions
   * (types/voiceMacros.ts) — the same pure algorithm the real, live
   * dictation pipeline (contexts/VoiceProvider.tsx) now calls directly,
   * kept as a single implementation so this async wrapper and that
   * real-time path can never disagree on what counts as a match.
   */
  async refineTranscript(
    transcript: string, 
    _options?: { context?: string }
  ): Promise<ServiceResult<string>> {
    // PS-67 (Batch 348): the app's one result shape (was { success, data }).
    return new Promise((resolve) => {
      setTimeout(() => {
        const macros = this.getStoredMacros();
        resolve({
          ok: true,
          data: applyVoiceMacroSubstitutions(transcript, macros),
        });
      }, 200);
    });
  }
}

/** Shared instance for the services barrel (UI code imports `voiceMacroService` from '@/services'). */
export const mockVoiceMacroService = new MockVoiceMacroService();
