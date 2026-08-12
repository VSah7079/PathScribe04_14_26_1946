// src/orchestrator/orchestratorEngine.ts
// ─────────────────────────────────────────────────────────────
// Orchestrator Engine — Layer 3 of the Orchestrator stack.
<<<<<<< HEAD
//
// Responsibilities:
//   1. Load narrativeTemplateConfig and determine enabled sections
//   2. For each enabled section (in order):
//        a. Build a section-specific prompt from StructuredContext
//        b. Call the AI model with streaming enabled
//        c. Forward tokens to StreamingWriter → PathScribeEditor
//        d. Handle errors, cancellation, and section isolation
//   3. Expose regenerate(sectionId) for individual section refresh
=======
// Refactored to use IAIProvider for full provider agnosticism.
//
// Responsibilities:
//   1. Load generation steps from narrativeTemplateConfig
//   2. For each enabled step (in order):
//        a. Build a step-specific prompt from StructuredContext
//        b. Call the active IAIProvider with streaming
//        c. Forward tokens to StreamingWriter → PathScribeEditor
//        d. Record to AIAuditLog for CAP/CLIA compliance
//        e. Handle errors, cancellation, and step isolation
//   3. Expose regenerateSection() for individual step refresh
>>>>>>> upstream/main
//   4. Expose cancel() to abort in-flight generation
//
// The engine is stateless between runs — each call to run() or
// regenerateSection() creates a fresh execution context.
// ─────────────────────────────────────────────────────────────

<<<<<<< HEAD
import type { Editor } from '@tiptap/react';
import type { StructuredContext } from './contextBuilder';
import { narrativeTemplateConfig } from '../components/Config/NarrativeTemplates/narrativeTemplateConfig';
import { StreamingWriter } from '../components/Editor/integration/streamingWriter';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const AI_MODEL   = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 1024;
const API_URL    = 'https://api.anthropic.com/v1/messages';
=======
import type { Editor }           from '@tiptap/react';
// StructuredContext now imported directly from contextBuilder.ts rather
// than hand-duplicated here. The previous inlined copy (this file's own
// comment called it "a future extraction") had already drifted out of
// sync with the real shape — it was missing narrativeTemplate entirely
// despite this file using context.narrativeTemplate?.sections directly,
// and it pre-dates the synoptic → synoptics (per-specimen array) change.
// Importing the real type closes that drift permanently rather than
// patching this one instance of it.
import type { StructuredContext } from './contextBuilder';
import type { IAIProvider }       from '../services/ai/IAIProvider';
import { AIProviderRegistry }     from '../services/ai/AIProviderRegistry';
import { AIAuditLog }             from '../services/ai/AIAuditLog';
import { StreamingWriter }         from '../components/Editor/tiptapBridge/streamingWriter';

const SYSTEM_PROMPT =
  'You are a board-certified pathologist assistant generating structured ' +
  'pathology report sections. Never invent clinical findings. Use formal ' +
  'medical prose. Generate only the requested section — no headers, no preamble.';
>>>>>>> upstream/main

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type OrchestratorStatus =
  | 'idle'
  | 'running'
  | 'completed'
  | 'cancelled'
  | 'error';

export interface SectionResult {
<<<<<<< HEAD
  sectionId: string;
  sectionTitle: string;
  status: 'completed' | 'skipped' | 'error' | 'cancelled';
  error?: string;
  tokensGenerated?: number;
}

export interface OrchestratorResult {
  status: OrchestratorStatus;
  sections: SectionResult[];
  startedAt: string;
  completedAt?: string;
  error?: string;
=======
  sectionId:        string;
  sectionTitle:     string;
  status:           'completed' | 'skipped' | 'error' | 'cancelled';
  error?:           string;
  /** Full generated text for this section (populated in headless mode) */
  text?:            string;
  tokensGenerated?: number;
  /** Which provider + model generated this section */
  providerId?:      string;
  modelId?:         string;
  latencyMs?:       number;
}

export interface OrchestratorResult {
  status:       OrchestratorStatus;
  sections:     SectionResult[];
  startedAt:    string;
  completedAt?: string;
  error?:       string;
  /** Provider used for this run — recorded for audit/display */
  providerId:   string;
  modelId:      string;
>>>>>>> upstream/main
}

export interface OrchestratorCallbacks {
  /** Called when a section begins generating */
<<<<<<< HEAD
  onSectionStart?: (sectionId: string, title: string) => void;
=======
  onSectionStart?: (sectionId: string, title: string, sourcePartId?: string) => void;
  /** Called per streaming token — use for headless/React-state streaming */
  onToken?: (sectionId: string, token: string) => void;
>>>>>>> upstream/main
  /** Called when a section finishes */
  onSectionComplete?: (sectionId: string, result: SectionResult) => void;
  /** Called when the entire run completes */
  onComplete?: (result: OrchestratorResult) => void;
  /** Called on any error */
  onError?: (sectionId: string | null, error: string) => void;
  /** Called with status updates */
  onStatusChange?: (status: OrchestratorStatus) => void;
}

// ─────────────────────────────────────────────────────────────
// Prompt builder
// Constructs a section-specific AI prompt using the
// StructuredContext and the section's AI instructions.
// ─────────────────────────────────────────────────────────────

function buildSectionPrompt(
<<<<<<< HEAD
  sectionId: string,
=======
  _sectionId: string,
>>>>>>> upstream/main
  sectionTitle: string,
  sectionInstruction: string,
  context: StructuredContext
): string {
<<<<<<< HEAD
  // Resolve synoptic answers into a readable list
  const synopticLines = context.synoptic.answers
    .map(a => `  • ${a.fieldLabel}: ${a.displayValue}`)
    .join('\n') || '  (no synoptic data recorded)';
=======
  // Resolve synoptic answers into a readable list. Synoptics are a
  // specimen-level association, not case-level — a case can have several
  // (one per specimen per assigned template) — so each is broken out and
  // labeled by specimen rather than merged into one undifferentiated list.
  // (Previously read context.synoptic.answers — a single case-level object
  // that every real call site left empty; context.synoptics is the fixed,
  // per-specimen array. See contextBuilder.ts.)
  const synopticLines = context.synoptics.length
    ? context.synoptics.map(s => {
        const lines = s.answers
          .map(a => `    • ${a.fieldLabel}: ${a.displayValue}`)
          .join('\n') || '    (no answers recorded for this specimen)';
        return `  Specimen ${s.specimenId} — ${s.templateName}:\n${lines}`;
      }).join('\n\n')
    : '  (no synoptic data recorded)';
>>>>>>> upstream/main

  // Build specimen summary
  const specimenLines = context.specimens
    .map((s, i) =>
      `  Specimen ${i + 1}: ${s.label} | Type: ${s.type} | Site: ${s.site}`
    )
    .join('\n') || '  (no specimens recorded)';

  return [
    `You are generating the "${sectionTitle}" section of a pathology report.`,
    '',
    `Section instruction: ${sectionInstruction}`,
    '',
    '─── CASE CONTEXT ───',
    `Patient:         ${context.patient.fullName}`,
    `DOB:             ${context.patient.dateOfBirth}`,
    `Sex:             ${context.patient.sex}`,
    `Accession:       ${context.accession.fullAccession}`,
    `Priority:        ${context.order.priority}`,
    `Requesting MD:   ${context.order.requestingProvider}`,
    `Clinical Ind:    ${context.order.clinicalIndication}`,
    '',
    '─── SPECIMENS ───',
    specimenLines,
    '',
    '─── GROSS DESCRIPTION ───',
    context.diagnostic.grossDescription,
    '',
    '─── MICROSCOPIC DESCRIPTION ───',
    context.diagnostic.microscopicDescription,
    '',
    '─── ANCILLARY STUDIES ───',
    context.diagnostic.ancillaryStudies,
    '',
    '─── SYNOPTIC DATA ───',
    synopticLines,
    '',
    '─── CODING ───',
    context.coding.icd10.length  ? `ICD-10:  ${context.coding.icd10.join(', ')}`  : '',
    context.coding.snomed.length ? `SNOMED:  ${context.coding.snomed.join(', ')}` : '',
    '',
    '─── RULES ───',
    '• Write only this section. Do not include other section headings.',
    '• Do not invent measurements, findings, or diagnoses.',
    '• Do not restate the section title.',
    '• Use formal clinical prose. Be concise.',
    '• If data is marked "(not recorded)", do not fabricate a value.',
    '',
    `Generate the ${sectionTitle} section now:`,
  ]
    .filter(line => line !== undefined)
    .join('\n');
}

// ─────────────────────────────────────────────────────────────
<<<<<<< HEAD
// streamSection
// Makes a streaming API call for one section and pipes
// tokens into the StreamingWriter.
// ─────────────────────────────────────────────────────────────

async function streamSection(
  sectionId: string,
  sectionTitle: string,
  prompt: string,
  writer: StreamingWriter,
  abortSignal: AbortSignal
): Promise<{ tokensGenerated: number }> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: abortSignal,
    body: JSON.stringify({
      model:      AI_MODEL,
      max_tokens: MAX_TOKENS,
      stream:     true,
      system:
        'You are a board-certified pathologist assistant generating structured ' +
        'pathology report sections. Never invent clinical findings. Use formal ' +
        'medical prose. Generate only the requested section — no headers, no preamble.',
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(
      (errBody as any)?.error?.message ?? `AI API error ${response.status}`
    );
  }

  if (!response.body) throw new Error('No response body from AI API');

  const reader  = response.body.getReader();
  const decoder = new TextDecoder();
  let tokensGenerated = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n').filter(l => l.trim());

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') break;

      try {
        const parsed = JSON.parse(data);

        // Anthropic SSE event types
        if (parsed.type === 'content_block_delta') {
          const token: string = parsed.delta?.text ?? '';
          if (token) {
            writer.appendToken(sectionId, token);
            tokensGenerated += token.length;
          }
        }

        if (parsed.type === 'message_stop') break;
      } catch {
        // Malformed SSE line — skip
      }
    }
  }

  return { tokensGenerated };
}

// ─────────────────────────────────────────────────────────────
=======
>>>>>>> upstream/main
// OrchestratorEngine class
// ─────────────────────────────────────────────────────────────

export class OrchestratorEngine {
<<<<<<< HEAD
  private editor: Editor;
  private context: StructuredContext;
  private callbacks: OrchestratorCallbacks;
  private abortController: AbortController | null = null;
  private status: OrchestratorStatus = 'idle';

  constructor(
    editor: Editor,
    context: StructuredContext,
    callbacks: OrchestratorCallbacks = {}
=======
  private editor:    Editor | null | undefined;
  private context:   StructuredContext;
  private callbacks: OrchestratorCallbacks;
  private provider:  IAIProvider;
  private abortController: AbortController | null = null;
  private status: OrchestratorStatus = 'idle';

  /**
   * @param editor     TipTap editor instance — pass null/undefined for headless
   *                   (React-state) mode; tokens are then delivered via onToken callback.
   * @param context    Validated StructuredContext from contextBuilder
   * @param callbacks  Optional progress callbacks
   * @param provider   IAIProvider to use — defaults to AIProviderRegistry.getActive()
   *                   Pass a MockProvider explicitly for unit tests.
   */
  constructor(
    editor:    Editor | null | undefined,
    context:   StructuredContext,
    callbacks: OrchestratorCallbacks = {},
    provider?: IAIProvider,
>>>>>>> upstream/main
  ) {
    this.editor    = editor;
    this.context   = context;
    this.callbacks = callbacks;
<<<<<<< HEAD
=======
    this.provider  = provider ?? AIProviderRegistry.getActive();
>>>>>>> upstream/main
  }

  // ── run ────────────────────────────────────────────────────
  // Full orchestration run. Processes all enabled sections
  // in order. Returns a result summary.

  async run(): Promise<OrchestratorResult> {
    const startedAt = new Date().toISOString();
    this.setStatus('running');

    this.abortController = new AbortController();
<<<<<<< HEAD
    const writer = new StreamingWriter(this.editor, {
      clearExisting:    true,
      respectUserEdits: true,
    });

    const enabledSections = narrativeTemplateConfig.sections
      .filter(s => s.enabled)
      .sort((a, b) => a.order - b.order);
=======
    const writer = this.editor
      ? new StreamingWriter(this.editor, { clearExisting: true, respectUserEdits: true })
      : null;

    // Use narrative template sections from context — driven by the resolved
    // report template for this case (via TemplateRoutingService → buildContext)
    const enabledSections = (this.context.narrativeTemplate?.sections ?? [])
      .filter((s: any) => s.enabled)
      .sort((a: any, b: any) => a.order - b.order);
>>>>>>> upstream/main

    const results: SectionResult[] = [];

    for (const section of enabledSections) {
      if (this.abortController.signal.aborted) {
        results.push({
          sectionId:    section.id,
          sectionTitle: section.title,
          status:       'cancelled',
        });
        continue;
      }

<<<<<<< HEAD
      this.callbacks.onSectionStart?.(section.id, section.title);

      const started = writer.beginSection(section.id, section.title);
=======
      this.callbacks.onSectionStart?.(section.id, section.title, section.sourcePartId);

      const started = writer ? writer.beginSection(section.id, section.title) : true;
>>>>>>> upstream/main

      if (!started) {
        const result: SectionResult = {
          sectionId:    section.id,
          sectionTitle: section.title,
          status:       'skipped',
          error:        'Section has user edits — skipped',
        };
        results.push(result);
        this.callbacks.onSectionComplete?.(section.id, result);
        continue;
      }

<<<<<<< HEAD
=======
      let sectionText = '';

>>>>>>> upstream/main
      try {
        const prompt = buildSectionPrompt(
          section.id,
          section.title,
          section.aiInstruction,
          this.context
        );

<<<<<<< HEAD
        const { tokensGenerated } = await streamSection(
          section.id,
          section.title,
          prompt,
          writer,
          this.abortController.signal
        );

        writer.completeSection(section.id);

        const result: SectionResult = {
          sectionId:    section.id,
          sectionTitle: section.title,
          status:       'completed',
          tokensGenerated,
=======
        const genResult = await this.provider.generateStream(
          {
            system:      SYSTEM_PROMPT,
            prompt,
            maxTokens:   1024,
            abortSignal: this.abortController.signal,
            sectionId:   section.id,
          },
          token => {
            sectionText += token;
            writer?.appendToken(section.id, token);
            this.callbacks.onToken?.(section.id, token);
          },
        );

        writer?.completeSection(section.id);

        const result: SectionResult = {
          sectionId:       section.id,
          sectionTitle:    section.title,
          status:          'completed',
          text:            sectionText,
          tokensGenerated: genResult.tokensGenerated,
          providerId:      genResult.providerId,
          modelId:         genResult.modelId,
          latencyMs:       genResult.latencyMs,
>>>>>>> upstream/main
        };
        results.push(result);
        this.callbacks.onSectionComplete?.(section.id, result);

<<<<<<< HEAD
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          writer.cancelSection(section.id);
=======
        // ── Audit trail ────────────────────────────────────
        AIAuditLog.record({
          caseId:          this.context.caseId,
          sectionId:       section.id,
          sectionTitle:    section.title,
          providerId:      genResult.providerId,
          modelId:         genResult.modelId,
          status:          'completed',
          tokensGenerated: genResult.tokensGenerated,
          latencyMs:       genResult.latencyMs,
        });

      } catch (err: any) {
        if (err?.name === 'AbortError') {
          writer?.cancelSection(section.id);
>>>>>>> upstream/main
          const result: SectionResult = {
            sectionId:    section.id,
            sectionTitle: section.title,
            status:       'cancelled',
          };
          results.push(result);
          this.callbacks.onSectionComplete?.(section.id, result);
          break;
        }

<<<<<<< HEAD
        writer.cancelSection(section.id);
=======
        writer?.cancelSection(section.id);
>>>>>>> upstream/main
        const errorMsg = err?.message ?? 'Unknown error';
        const result: SectionResult = {
          sectionId:    section.id,
          sectionTitle: section.title,
          status:       'error',
          error:        errorMsg,
        };
        results.push(result);
        this.callbacks.onError?.(section.id, errorMsg);
        this.callbacks.onSectionComplete?.(section.id, result);
<<<<<<< HEAD
=======

        AIAuditLog.record({
          caseId:          this.context.caseId,
          sectionId:       section.id,
          sectionTitle:    section.title,
          providerId:      this.provider.providerId,
          modelId:         this.provider.modelId,
          status:          'error',
          tokensGenerated: 0,
          latencyMs:       0,
          error:           errorMsg,
        });
>>>>>>> upstream/main
        // Continue to next section — section-level isolation
      }
    }

    const finalStatus: OrchestratorStatus =
      this.abortController.signal.aborted ? 'cancelled' : 'completed';

    this.setStatus(finalStatus);

    const result: OrchestratorResult = {
      status:      finalStatus,
      sections:    results,
      startedAt,
      completedAt: new Date().toISOString(),
<<<<<<< HEAD
=======
      providerId:  this.provider.providerId,
      modelId:     this.provider.modelId,
>>>>>>> upstream/main
    };

    this.callbacks.onComplete?.(result);
    return result;
  }

  // ── regenerateSection ──────────────────────────────────────
  // Regenerates a single section regardless of user-edit status.
  // Used when the pathologist clicks "Regenerate" on a section.

  async regenerateSection(sectionId: string): Promise<SectionResult> {
<<<<<<< HEAD
    const section = narrativeTemplateConfig.sections.find(s => s.id === sectionId);
=======
    const section = (this.context.narrativeTemplate?.sections ?? []).find((s: any) => s.id === sectionId);
>>>>>>> upstream/main
    if (!section) {
      return { sectionId, sectionTitle: '(unknown)', status: 'error', error: 'Section not found in template' };
    }

    this.abortController = new AbortController();

<<<<<<< HEAD
    const writer = new StreamingWriter(this.editor, {
      clearExisting:    true,
      respectUserEdits: false, // override user edits for explicit regen
    });

    this.callbacks.onSectionStart?.(section.id, section.title);
    writer.beginSection(section.id, section.title);
=======
    const writer = this.editor
      ? new StreamingWriter(this.editor, { clearExisting: true, respectUserEdits: false })
      : null;

    this.callbacks.onSectionStart?.(section.id, section.title, section.sourcePartId);
    writer?.beginSection(section.id, section.title);

    let sectionText = '';
>>>>>>> upstream/main

    try {
      const prompt = buildSectionPrompt(
        section.id,
        section.title,
        section.aiInstruction,
        this.context
      );

<<<<<<< HEAD
      const { tokensGenerated } = await streamSection(
        section.id,
        section.title,
        prompt,
        writer,
        this.abortController.signal
      );

      writer.completeSection(section.id);

      const result: SectionResult = {
        sectionId:    section.id,
        sectionTitle: section.title,
        status:       'completed',
        tokensGenerated,
      };
=======
      const genResult = await this.provider.generateStream(
        {
          system:      SYSTEM_PROMPT,
          prompt,
          maxTokens:   1024,
          abortSignal: this.abortController.signal,
          sectionId:   section.id,
        },
        token => {
          sectionText += token;
          writer?.appendToken(section.id, token);
          this.callbacks.onToken?.(section.id, token);
        },
      );

      writer?.completeSection(section.id);

      const result: SectionResult = {
        sectionId:       section.id,
        sectionTitle:    section.title,
        status:          'completed',
        text:            sectionText,
        tokensGenerated: genResult.tokensGenerated,
        providerId:      genResult.providerId,
        modelId:         genResult.modelId,
        latencyMs:       genResult.latencyMs,
      };

      AIAuditLog.record({
        caseId:          this.context.caseId,
        sectionId:       section.id,
        sectionTitle:    section.title,
        providerId:      genResult.providerId,
        modelId:         genResult.modelId,
        status:          'completed',
        tokensGenerated: genResult.tokensGenerated,
        latencyMs:       genResult.latencyMs,
      });

>>>>>>> upstream/main
      this.callbacks.onSectionComplete?.(section.id, result);
      return result;

    } catch (err: any) {
<<<<<<< HEAD
      writer.cancelSection(section.id);
=======
      writer?.cancelSection(section.id);
>>>>>>> upstream/main
      const errorMsg = err?.message ?? 'Unknown error';
      const result: SectionResult = {
        sectionId:    section.id,
        sectionTitle: section.title,
        status:       'error',
        error:        errorMsg,
      };
<<<<<<< HEAD
=======

      AIAuditLog.record({
        caseId:          this.context.caseId,
        sectionId:       section.id,
        sectionTitle:    section.title,
        providerId:      this.provider.providerId,
        modelId:         this.provider.modelId,
        status:          'error',
        tokensGenerated: 0,
        latencyMs:       0,
        error:           errorMsg,
      });

>>>>>>> upstream/main
      this.callbacks.onError?.(section.id, errorMsg);
      return result;
    }
  }

  // ── cancel ─────────────────────────────────────────────────
  // Aborts the current in-flight run or section generation.

  cancel(): void {
    this.abortController?.abort();
    this.setStatus('cancelled');
  }

<<<<<<< HEAD
  // ── getStatus ──────────────────────────────────────────────
  getStatus(): OrchestratorStatus {
    return this.status;
  }
=======
  getStatus(): OrchestratorStatus { return this.status; }

  /** Returns the active provider — useful for displaying engine info in the UI */
  getProvider(): IAIProvider { return this.provider; }
>>>>>>> upstream/main

  private setStatus(status: OrchestratorStatus): void {
    this.status = status;
    this.callbacks.onStatusChange?.(status);
  }
}
