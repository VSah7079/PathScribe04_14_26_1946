import React, {
  createContext, useContext, useState, useRef, useEffect, useCallback,
} from 'react';
import { useTranslation } from 'react-i18next';

import { useSystemConfig } from './SystemConfigContext';
import { callAi } from '../services/aiIntegration/aiProviderService';
import { resolveVoiceAiConfig } from '../components/Config/AI/resolveVoiceAiModel';
import { getSessionUser } from '../services/auth/caseAccessControl';
import { useAuthOptional } from './AuthContext';
import { getPersonalSetting, setPersonalSetting } from '../services/userSettings/personalSettings';
import { isVoiceMacroVisibleTo, applyVoiceMacroSubstitutions, type VoiceMacro } from '../types/voiceMacros';
import { getVoiceProfileRecognitionLang, getVoiceProfileLanguage } from '../constants/voiceProfiles';
import { getPunctuationMapForLanguage } from './punctuationMaps';
import { buildDictationRefinementSystem, spellLocaleForDictation } from '@/services/voice/dictationRefinementPrompt';
import { spellLangForJurisdiction } from '@/utils/formatDate';
import { getSessionFlag, setSessionFlag } from '@/utils/uiPreferences';
import { offerVoiceCommandToScreen, screenVoiceStatusKey } from '@/services/voice/voiceCommandEvents';
import { actionRegistryService, voiceMacroService, auditService } from '@/services';
import {
  applyDictationLearning, dictationCorrectionsForCurrentUser, normaliseDictation, recordDictationCorrection,
} from '@/services/voice/dictationCorrections';
import { insertDictationSegment, REFINEMENT_BUDGET_MS, type DictationSegmentMeta } from '@/services/voice/dictationSegmentFlow';
import { createVoiceCommandRunner, REPEAT_CONFIRMATION_WINDOW_MS } from '@/services/voice/voiceCommandRunner';
import { effectiveKey, isFunctionKeyPress, matchesShortcut, pickShortcutMatch } from '@/services/actionRegistry/shortcutResolution';
import { decideCancel, CANCEL_CONFIRM_WINDOW_MS } from '@/services/voice/voiceCancel';
import { GoToPrefix } from '@/components/Common/GoToPrefix';

export type VoicePhase = 'standby' | 'ai' | 'local' | 'dictate';

export interface DictationTarget {
  fieldId: string;
  label: string;
  /** `isInterim` text is provisional: the final call for the same segment REPLACES it (services/voice/dictationEditorWriter.ts),
   *  or the target ignores it. `meta.raw` is the words as heard, for correction learning. */
  onText: (text: string, isInterim?: boolean, meta?: DictationSegmentMeta) => void;
  onDone?: () => void;
  /** Batch 664 (Cancel): how many dictated passages of this session are still in the field, and a way to remove them. */
  uncommitted?: () => number;
  discard?: () => { removed: number; kept: number };
  /** Called when user edits dictated text — enables AI learning from corrections */
  onCorrection?: (original: string, corrected: string) => void;
  /** Context hint for the AI refinement prompt (e.g. 'gross', 'micro', 'diagnosis') */
  context?: string;
  /**
   * Real, per direct guidance (voice-trigger recognition wiring —
   * "Personal Quick Text"): the real performing lab of whatever this
   * dictation target actually belongs to, if any — e.g.
   * OrchestratorSectionEditor.tsx passes the current case's own
   * already-resolved performing lab. Used to filter which real voice
   * macros (Enterprise/Facility/Personal — see
   * types/voiceMacros.ts's own isVoiceMacroVisibleTo()) apply to this
   * dictation session. Undefined means only Enterprise-wide macros
   * apply — never guessed or defaulted to "any facility."
   */
  performingLabFacilityId?: string;
}

export interface VoiceContextType {
  phase: VoicePhase;
  commandPhase: 'ai' | 'local';
  transcript: string;
  isFinal: boolean;
  isListening: boolean;
  isAiEnabled: boolean;
  isRefining: boolean;
  aiAvailable: boolean;
  voiceEnabled: boolean;
  accent: string;
  dictationTarget: DictationTarget | null;
  setAccent: (accent: string) => void;
  startListening: () => void;
  stopListening: () => void;
  toggleVoice: () => void;
  startDictation: (target: DictationTarget) => void;
  stopDictation: () => void;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

// __psRecordDictationCorrection is a genuine global side-channel (not a
// standard browser API like SpeechRecognition below, which really has no
// TS lib type) — declared properly here so the 3 use sites don't each need
// their own `as any`/`(window as any)` cast.
declare global {
  interface Window {
    __psRecordDictationCorrection?: (corrected: string) => void;
  }
}

const STOP_PHRASES = ['stop dictation', 'done', 'finish'];
/** Batch 664: this ends dictation through Cancel (asks first when dictated text would be removed), not like a stop phrase. */
const CANCEL_PHRASE = 'cancel dictation';
const MISS_CONFIRMATION_WINDOW_MS = 8000;
const getUserName = () => { const u = getSessionUser(); return u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.id : 'unknown'; };

// ── AI-refinement availability ────────────────────────────────────────────────
// Cached as a session flag so the probe only fires once per browser session,
// not on every HMR reload or component mount.
// Real fix: previously hardcoded to the Gemini proxy path specifically —
// now resolves whichever model is actually configured as the active
// Voice Dictation model (see resolveVoiceAiModel.ts) and probes THAT,
// through the same multi-vendor callAi() the real refinement call uses
// below. Stays accurate if the active voice model is ever changed to a
// different vendor, rather than silently probing the wrong endpoint.
const STRUCTURED_CONTENT_SESSION_KEY = 'ps_voice_ai_available';

async function checkStructuredContentAvailable(): Promise<boolean> {
  // Return cached result if already probed this session
  const cached = getSessionFlag(STRUCTURED_CONTENT_SESSION_KEY);
  if (cached !== null) return cached === 'true';

  let available = false;
  try {
    const configOverride = await resolveVoiceAiConfig();
    if (!configOverride) {
      // No validated voice model configured at all — genuinely
      // unavailable, not a network/proxy problem.
      setSessionFlag(STRUCTURED_CONTENT_SESSION_KEY, 'false');
      return false;
    }
    await callAi({ system: 'Reply with: OK', prompt: 'ping', maxTokens: 10, configOverride, context: { feature: 'connection-test' } });
    available = true;
  } catch (e: any) {
    // Distinguish "proxy/key genuinely missing" from "rate limited but
    // configured" the same way the original Gemini-specific check did —
    // a 429 means the model IS reachable, just busy right now.
    available = typeof e?.message === 'string' && e.message.includes('429');
  }

  setSessionFlag(STRUCTURED_CONTENT_SESSION_KEY, String(available));
  return available;
}

const norm = normaliseDictation;

// ── Punctuation substitution map (real, per-language — see
//    ./punctuationMaps.ts's own header for the full account of the
//    real, deliberate French/German/Dutch/Korean additions) ─────────

/**
 * Apply punctuation substitution + smart capitalization.
 * - Capitalizes the first character of the segment
 * - Capitalizes the character after sentence-ending punctuation (. ? !)
 */
function applyPunctuation(text: string, language: import('../constants/voiceProfiles').VoiceProfileLanguage = 'en'): string {
  const punctMap = getPunctuationMapForLanguage(language);
  const tokens = text.split(/\s+/);
  const out: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    const twoWord = tokens.slice(i, i + 2).join(' ').toLowerCase();
    if (punctMap[twoWord] !== undefined) {
      out.push(punctMap[twoWord]);
      i += 2;
      continue;
    }
    const oneWord = tokens[i].toLowerCase();
    if (punctMap[oneWord] !== undefined) {
      out.push(punctMap[oneWord]);
      i++;
      continue;
    }
    out.push(tokens[i]);
    i++;
  }

  let result = out.join(' ').replace(/ {2,}/g, ' ').replace(/ (\n)/g, '$1').replace(/(\n) /g, '$1');
  result = result.charAt(0).toUpperCase() + result.slice(1);
  result = result.replace(/([.?!])\s+([a-z])/g, (_, punct, letter) => `${punct} ${letter.toUpperCase()}`);
  return result;
}

// ── Dictation learning store ───────────────────────────────────────────────────
// Batch 650: the per-person correction table lives in services/voice/dictationCorrections.ts (Batch 430 made it
// per signed-in person); the report editors write to it through the same service.
const VOICE_ACCENT_KEY = 'pathscribe_voice_accent';

// ── Voice-dictation AI refinement ─────────────────────────────────────────────
// Real fix: previously called Gemini directly via a hardcoded model
// string and its own raw fetch, completely bypassing the same
// multi-vendor callAi() the rest of the app's AI calls already go
// through. Now resolves whichever model is actually configured as the
// active Voice Dictation model (see resolveVoiceAiModel.ts — org-wide
// default, hard-blocked to only ever be a model with a passing,
// reported validation study behind it) and calls it through that same
// shared path, so voice genuinely isn't locked to any one vendor.

// Batch 609 (#177, #179): the system prompt is built per dictation language and English
// spelling convention (services/voice/dictationRefinementPrompt.ts); it used to be one
// English-only constant that left Australian and Canadian dictation on American spelling.

async function refineWithStructuredContent(
  text: string,
  context: string,
  learnedCorrections: Record<string, string>,
  system: string
): Promise<string | null> {
  const examples = Object.entries(learnedCorrections)
    .slice(0, 5)
    .map(([raw, corrected]) => `  Raw: "${raw}"\n  Corrected: "${corrected}"`)
    .join('\n');

  const fewShot = examples
    ? `Learned corrections from this user (apply similar patterns):\n${examples}\n\n`
    : '';

  const prompt = `${fewShot}Context: ${context}\nRaw: "${text}"`;

  try {
    const configOverride = await resolveVoiceAiConfig();
    if (!configOverride) {
      console.warn('[VoiceProvider] No validated voice AI model configured');
      return null;
    }
    const result = await callAi({ system, prompt, configOverride, context: { feature: 'voice' } });
    return result.text?.trim() || null;
  } catch (e) {
    console.warn('[VoiceProvider] AI refinement failed:', e);
    return null;
  }
}

// ── Component ──────────────────────────────────────────────────────────────────

export const VoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const { config } = useSystemConfig();
  const voiceEnabled = config.voiceEnabled ?? true;
  // Batch 609: read through refs so the long-lived recognition handlers see the current settings.
  const jurisdictionRef = useRef(config.jurisdiction);
  jurisdictionRef.current = config.jurisdiction;
  const englishFuzzyFallbackRef = useRef(config.voiceEnglishFuzzyFallback ?? true);
  englishFuzzyFallbackRef.current = config.voiceEnglishFuzzyFallback ?? true;

  // Probe voice AI refinement availability once on mount
  const [aiAvailable, setAiAvailable] = useState(false);
  useEffect(() => {
    checkStructuredContentAvailable().then(setAiAvailable);
  }, []);

  const [phase, setPhase]                       = useState<VoicePhase>('standby');
  const [commandPhase, setCommandPhase]         = useState<'ai' | 'local'>('ai');
  const [transcript, setTranscript]             = useState('');
  const [isFinal, setIsFinal]                   = useState(false);
  // Real fix, per direct follow-up: persist the user's chosen voice
  // accent/locale across reloads. Confirmed directly: this genuinely
  // drives the real SpeechRecognition engine (recognition.lang =
  // accent, below) — not a cosmetic setting — but had zero
  // persistence, resetting to 'en-US' on every reload regardless of
  // what the user had actually picked. Client-side only (no real
  // server-side user-profile store exists in this mock app to persist
  // to instead).
  // Batch 430: the accent is the person's, kept per signed-in person
  // (services/userSettings/personalSettings.ts), and reloaded when someone
  // else signs in on the same browser.
  const readAccent = () => getPersonalSetting<string>(VOICE_ACCENT_KEY, 'en-US', raw => raw) || 'en-US';
  const [accent, setAccentState] = useState(readAccent);
  const signedInId = useAuthOptional()?.user?.id ?? getSessionUser()?.id;
  useEffect(() => { setAccentState(readAccent()); }, [signedInId]);
  const setAccent = useCallback((next: string) => {
    setAccentState(next);
    setPersonalSetting(VOICE_ACCENT_KEY, next);
  }, []);
  const [dictationTarget, setDictationTarget]   = useState<DictationTarget | null>(null);
  const [isRefining, setIsRefining]             = useState(false);
  const [justHeardLiteral, setJustHeardLiteral] = useState(false);
  const justHeardLiteralRef = useRef(false);

  const recognitionRef     = useRef<any>(null);
  const streamRef          = useRef<MediaStream | null>(null);
  const dictationTargetRef = useRef<DictationTarget | null>(null);
  // Real, per direct guidance (voice-trigger recognition wiring —
  // "Personal Quick Text"): a real, cached list of active voice
  // macros, refreshed once per dictation session (see startDictation
  // below) — never re-fetched per spoken segment, since the LOCAL PATH
  // substitution needs to be near-instant.
  const voiceMacroServiceRef = useRef(voiceMacroService);
  const voiceMacrosRef = useRef<VoiceMacro[]>([]);
  const phaseRef           = useRef<VoicePhase>('standby');
  const commandPhaseRef    = useRef<'ai' | 'local'>('ai');
  const pendingMissRef     = useRef<{ id: string; expiresAt: number } | null>(null);
  const lastRawRef         = useRef<string>('');
  const lastLocalTextRef   = useRef<string>('');
  const aiAvailableRef     = useRef(false);
  const commandRunnerRef   = useRef(createVoiceCommandRunner({ registry: actionRegistryService, audit: auditService, getUserName }));
  const cancelAskedAtRef    = useRef<number | null>(null);

  useEffect(() => { dictationTargetRef.current  = dictationTarget; }, [dictationTarget]);
  useEffect(() => { justHeardLiteralRef.current = justHeardLiteral; }, [justHeardLiteral]);
  useEffect(() => { phaseRef.current            = phase; },           [phase]);
  useEffect(() => { commandPhaseRef.current     = commandPhase; },    [commandPhase]);
  useEffect(() => { aiAvailableRef.current      = aiAvailable; },     [aiAvailable]);

  const killMic = useCallback(() => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) { try { recognition.stop(); } catch {} }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  // If admin disables voice mid-session, stop immediately
  useEffect(() => {
    if (!voiceEnabled) {
      killMic();
      setPhase('standby');
      setDictationTarget(null);
      setTranscript('');
    }
  }, [voiceEnabled, killMic]);

  // ── Real, missing keyboard shortcut dispatcher ──────────────────────────────
  // Per direct follow-up: "are we not mapping keyboard commands in the
  // Action Registry?" Confirmed directly, after a genuinely thorough
  // trace (every real keydown listener in the app, every use of
  // parseShortcut, every caller of executeAction): the shortcut field
  // was real, stored, admin-editable data that never actually fired
  // anything on a real, physical key press — only voice commands ever
  // called executeAction. This is the real, missing receiving half.
  // Shares actionRegistryService's own getEligibleActions() — the
  // exact same isActive + GLOBAL_CATEGORIES-or-current-context rule
  // voice matching already uses — so keyboard and voice can never
  // silently drift apart on which actions are eligible right now.
  useEffect(() => {
    const handleGlobalShortcut = (e: KeyboardEvent) => {
      // Real, deliberate rule: ignore while genuinely typing into a
      // real field — a bare-key shortcut (e.g. 'S', 'Escape') that
      // happens to collide with normal typing must never fire
      // mid-keystroke. Modifier-bearing combos (Alt/Ctrl/Meta) are
      // exempt — normal typing never holds those down.
      const hasModifier = e.altKey || e.ctrlKey || e.metaKey;
      const target = e.target as HTMLElement | null;
      const isTyping = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (isTyping && !hasModifier && !isFunctionKeyPress(e)) return;
      // Batch 614: on a Mac, Option+letter types a character (é, ß); on a European keyboard AltGr does. In a text
      // field that is typing, so it never runs a hotkey there.
      if (isTyping && effectiveKey(e).producedText) return;

      const eligible = actionRegistryService.getEligibleActions();
      // Batch 602: when the key matches the screen's own command and an always-on one, the screen's runs.
      // The always-on one stays reachable through the "Go to" prefix (Alt+J, then its key).
      const matched = pickShortcutMatch(eligible.filter(a => {
        return matchesShortcut(e, a.shortcut);
      }));
      if (matched) {
        e.preventDefault();
        actionRegistryService.executeAction(matched);
      }
    };
    window.addEventListener('keydown', handleGlobalShortcut);
    return () => window.removeEventListener('keydown', handleGlobalShortcut);
  }, []);

  // ── Shortcut confirmation for missed voice commands ────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const miss = pendingMissRef.current;
      if (!miss || Date.now() > miss.expiresAt) return;
      if (phaseRef.current === 'standby') return;
      const matched = actionRegistryService.getActions().find(a => {
        return matchesShortcut(e, a.shortcut);
      });
      if (matched) {
        actionRegistryService.confirmMiss(miss.id, matched.id, 'shortcut');
        pendingMissRef.current = null;
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, []);

  // A missed phrase the person confirmed with a key runs its command inside the registry; audit that too.
  useEffect(() => {
    const onLearned = (e: Event) => {
      const action = (e as CustomEvent).detail?.action;
      if (action) commandRunnerRef.current.auditMissConfirmed(action);
    };
    window.addEventListener('VOICE_MAPPING_LEARNED', onLearned);
    return () => window.removeEventListener('VOICE_MAPPING_LEARNED', onLearned);
  }, []);

  // ── Cancel (Ctrl+Alt+J, or "cancel dictation" while dictating): services/voice/voiceCancel.ts decides ──
  const runCancel = useCallback(() => {
    const target = dictationTargetRef.current;
    const say = (key: string, ms: number) => { setTranscript(t(key)); setTimeout(() => setTranscript(''), ms); };
    const endDictation = () => {
      cancelAskedAtRef.current = null;
      target?.onDone?.();
      setDictationTarget(null);
      setJustHeardLiteral(false);
      setIsRefining(false);
      setPhase(commandPhaseRef.current);
    };
    const decision = decideCancel({
      dictating: !!target, uncommitted: target?.uncommitted?.() ?? 0,
      commandPending: !!commandRunnerRef.current.pending(), askedAt: cancelAskedAtRef.current, now: Date.now(),
    });
    if (decision === 'askConfirm') { cancelAskedAtRef.current = Date.now(); say('voiceProvider.status.cancelConfirm', CANCEL_CONFIRM_WINDOW_MS); }
    else if (decision === 'discardDictation') { const r = target?.discard?.(); endDictation(); say(r && r.kept > 0 ? 'voiceProvider.status.cancelDiscardedKept' : 'voiceProvider.status.cancelDiscarded', 3000); }
    else if (decision === 'stopDictation') { endDictation(); say('voiceProvider.status.cancelStopped', 2000); }
    else if (decision === 'dropPendingCommand') { commandRunnerRef.current.cancelPending(); say('voiceProvider.status.cancelCommand', 2000); }
  }, [t]);
  useEffect(() => {
    window.addEventListener('PATHSCRIBE_VOICE_CANCEL', runCancel);
    return () => window.removeEventListener('PATHSCRIBE_VOICE_CANCEL', runCancel);
  }, [runCancel]);

  // ── Core dictation handler ─────────────────────────────────────────────────
  const handleDictationSegment = useCallback(async (text: string) => {
    const normed = norm(text);

    if (normed.includes(CANCEL_PHRASE)) { runCancel(); return; }
    cancelAskedAtRef.current = null;   // more speech since the question: Cancel asks again

    // Stop phrases exit dictation mode
    if (STOP_PHRASES.some(p => normed.includes(p))) {
      dictationTargetRef.current?.onDone?.();
      setDictationTarget(null);
      setJustHeardLiteral(false);
      setPhase(commandPhaseRef.current);
      setTranscript('');
      return;
    }

    // "literal" one-shot flag
    if (normed === 'literal') {
      setJustHeardLiteral(true);
      setTranscript(t('voiceProvider.status.literal'));
      setTimeout(() => setTranscript(''), 1500);
      return;
    }

    // One-shot literal: pass through raw
    if (justHeardLiteralRef.current) {
      setJustHeardLiteral(false);
      dictationTargetRef.current?.onText(text + ' ');
      lastRawRef.current       = text;
      lastLocalTextRef.current = text + ' ';
      setTranscript('');
      return;
    }

    // Apply local punctuation + capitalization + learned corrections.
    // Real, per this file's own new language-aware punctuation-map
    // wiring — resolves the real, current voice profile's own real
    // language (not always English) so a French/German/Dutch/Korean
    // dictation session's own real punctuation vocabulary is actually
    // recognized, not silently defaulted to the English map.
    const localExpanded     = applyPunctuation(text, getVoiceProfileLanguage(accent));
    const localWithLearning0 = applyDictationLearning(text, localExpanded);

    // Real, per direct guidance (voice-trigger recognition wiring —
    // "Personal Quick Text"): applies real, active voice-macro
    // substitution (spoken → written) as the final real local step,
    // after punctuation/learned-corrections and before the AI-
    // refinement/direct-insertion branch below — a spoken trigger
    // expands the same way whether or not AI refinement also runs
    // afterward. Filtered to exactly the real macros this session user
    // can actually see right now (Enterprise + this dictation target's
    // own real facility + their own personal ones) — never applies a
    // macro scoped to a different facility or a different person's
    // own personal one.
    const sessionUserId = getSessionUser()?.id ?? '';
    const visibleVoiceMacros = voiceMacrosRef.current.filter(m =>
      isVoiceMacroVisibleTo(m, sessionUserId, dictationTargetRef.current?.performingLabFacilityId)
    );
    const localWithLearning = applyVoiceMacroSubstitutions(localWithLearning0, visibleVoiceMacros);

    lastRawRef.current       = text;
    lastLocalTextRef.current = localWithLearning;

    // Batch 650: one final insert per segment (services/voice/dictationSegmentFlow.ts). The target is taken now, so
    // a segment still refining when dictation ends is delivered to the field it was spoken into, not dropped.
    const target = dictationTargetRef.current;
    const sink = (txt: string, isInterim?: boolean, meta?: DictationSegmentMeta) => target?.onText(txt, isInterim, meta);
    const useAi = commandPhaseRef.current === 'ai' && aiAvailableRef.current;
    const context = target?.context ?? 'Pathology Report';
    const system = buildDictationRefinementSystem({
      language: getVoiceProfileLanguage(accent),
      spellLocale: spellLocaleForDictation(spellLangForJurisdiction(jurisdictionRef.current), getVoiceProfileRecognitionLang(accent)),
    });
    const result = await insertDictationSegment({
      raw: text,
      localText: localWithLearning,
      sink,
      budgetMs: REFINEMENT_BUDGET_MS,
      refine: useAi ? () => refineWithStructuredContent(text, context, dictationCorrectionsForCurrentUser(), system) : undefined,
      onRefining: refining => {
        setIsRefining(refining);
        setTranscript(refining ? t('voiceProvider.status.refining') : '');
      },
    });
    if (result.outcome === 'ai') lastLocalTextRef.current = result.text;
    if (!useAi) setTranscript('');
  }, [t, accent, runCancel]);

  // ── Speech recognition lifecycle ───────────────────────────────────────────
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (phase === 'standby') { killMic(); return; }

    const recognition           = new SpeechRecognition();
    recognition.continuous      = true;
    recognition.interimResults  = true;
    recognition.lang            = getVoiceProfileRecognitionLang(accent);

    recognition.onend = () => {
      if (recognitionRef.current === recognition && phaseRef.current !== 'standby') {
        try { recognition.start(); } catch {}
      }
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      setIsFinal(false);

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text  = event.results[i][0].transcript.trim();
        const final = event.results[i].isFinal;

        if (!final) {
          interim += text + ' ';
          setTranscript(interim.trim());
          continue;
        }

        setIsFinal(true);
        setTranscript(text);
        const currentPhase = phaseRef.current;

        if (currentPhase === 'dictate') {
          void handleDictationSegment(text);
          continue;
        }

        // ── COMMAND ──────────────────────────────────────────────────────────
        // Real, per src/MULTILANG_VOICE_COMMANDS_PLAN.md's own scoped
        // pieces 1-2 — the current voice profile's own real language,
        // so a genuine, real French/German/Dutch/Korean command
        // trigger (once translated content exists) is actually
        // matched, not silently only ever checked against English.
        // Batch 463: a command for what is on screen first (the Mohs stage question).
        const screenOutcome = offerVoiceCommandToScreen(text, getVoiceProfileLanguage(accent));
        if (screenOutcome) {
          pendingMissRef.current = null;
          setTranscript(t(screenVoiceStatusKey(screenOutcome), { text }));
          setTimeout(() => setTranscript(''), 1200);
          continue;
        }
        // Batch 650: eligibility, confirm-by-repeating and the audit entry are the runner's (services/voice/voiceCommandRunner.ts).
        const outcome = commandRunnerRef.current.handle(text, getVoiceProfileLanguage(accent), { englishFuzzyFallback: englishFuzzyFallbackRef.current });
        if (outcome.kind === 'confirmationNeeded') {
          pendingMissRef.current = null;
          setTranscript(t('voiceProvider.status.confirmRepeat', { text, label: outcome.action.label }));
          window.setTimeout(() => {
            const expired = commandRunnerRef.current.expirePending();
            if (expired?.kind === 'refused') setTranscript(t('voiceProvider.status.confirmTimedOut', { label: expired.action.label }));
            window.setTimeout(() => setTranscript(''), 1500);
          }, REPEAT_CONFIRMATION_WINDOW_MS + 100);
        } else if (outcome.kind === 'refused') {
          pendingMissRef.current = null;
          setTranscript(t(outcome.reason === 'notEligible' ? 'voiceProvider.status.notAvailableHere' : 'voiceProvider.status.confirmDeclined', { label: outcome.action.label }));
          setTimeout(() => setTranscript(''), 1800);
        } else if (outcome.kind === 'executed') {
          pendingMissRef.current = null;
          setTranscript(t('voiceProvider.status.actionExecuted', { label: outcome.action.label }));
          setTimeout(() => setTranscript(''), 1200);
        } else {
          const miss = actionRegistryService.recordMiss(text);
          pendingMissRef.current = { id: miss.id, expiresAt: Date.now() + MISS_CONFIRMATION_WINDOW_MS };
          setTimeout(() => {
            if (pendingMissRef.current?.id === miss.id) {
              actionRegistryService.dismissMiss(miss.id);
              pendingMissRef.current = null;
            }
          }, MISS_CONFIRMATION_WINDOW_MS);
          setTimeout(() => setTranscript(''), 2000);
        }
      }
    };

    recognition.onerror = (e: any) => {
      if (e.error !== 'aborted') console.warn('[VoiceProvider] error:', e.error);
    };

    recognitionRef.current = recognition;

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(s => {
        streamRef.current = s;
        setTimeout(() => {
          if (recognitionRef.current === recognition) recognition.start();
        }, 400);
      })
      .catch(() => { recognitionRef.current = null; setPhase('standby'); });

    return () => killMic();
  }, [phase, accent, killMic, handleDictationSegment, t]);

  // ── Public API ─────────────────────────────────────────────────────────────

  const toggleVoice = useCallback(() => {
    if (!voiceEnabled) return;
    setPhase(current => {
      if (current === 'standby') {
        // If AI refinement is available, prefer AI phase
        if (aiAvailableRef.current) { setCommandPhase('ai'); return 'ai'; }
        else                        { setCommandPhase('local'); return 'local'; }
      }
      if (current === 'ai')    { setCommandPhase('local'); return 'local';   }
      if (current === 'local') {                            return 'standby'; }
      // dictate bail-out
      dictationTargetRef.current?.onDone?.();
      setDictationTarget(null);
      setTranscript('');
      return commandPhaseRef.current;
    });
  }, [voiceEnabled]);

  const startDictation = useCallback((target: DictationTarget) => {
    cancelAskedAtRef.current = null;
    setDictationTarget(target);
    setTranscript('');
    setPhase('dictate');
    // Real, per direct guidance (voice-trigger recognition wiring):
    // refreshes the real, cached voice-macro list once per real
    // dictation session, not on every single spoken segment — a
    // dictation segment needs this substitution to be near-instant
    // (see handleDictationSegment's own LOCAL PATH), and macro edits
    // mid-dictation are a genuinely rare real case this session-level
    // refresh already covers well enough.
    voiceMacroServiceRef.current.getMacros().then(macros => { voiceMacrosRef.current = macros; });
  }, []);

  const stopDictation = useCallback(() => {
    dictationTargetRef.current?.onDone?.();
    setDictationTarget(null);
    setTranscript('');
    setIsRefining(false);
    setPhase(commandPhaseRef.current);
  }, []);

  // ── Correction learning ────────────────────────────────────────────────────
  useEffect(() => {
    window.__psRecordDictationCorrection = (corrected: string) => {
      if (!lastRawRef.current || !corrected) return;
      if (norm(corrected) === norm(lastLocalTextRef.current)) return;
      recordDictationCorrection(lastRawRef.current, corrected);
      dictationTargetRef.current?.onCorrection?.(lastRawRef.current, corrected);
    };
    return () => { delete window.__psRecordDictationCorrection; };
  }, []);

  const value: VoiceContextType = {
    phase, commandPhase, transcript, isFinal,
    isListening:  phase !== 'standby',
    isAiEnabled:  phase === 'ai' || (phase === 'dictate' && commandPhase === 'ai'),
    isRefining,
    aiAvailable,
    voiceEnabled,
    accent, dictationTarget,
    setAccent,
    startListening:  () => { setCommandPhase('ai'); setPhase('ai'); },
    stopListening:   () => { setDictationTarget(null); setPhase('standby'); },
    toggleVoice, startDictation, stopDictation,
  };

  return <VoiceContext.Provider value={value}>{children}<GoToPrefix /></VoiceContext.Provider>;
};

export const useVoice = () => useContext(VoiceContext)!;

// ── Utility: call from any field's onBlur to teach the system ─────────────────
export function reportDictationCorrection(correctedText: string) {
  window.__psRecordDictationCorrection?.(correctedText);
}
