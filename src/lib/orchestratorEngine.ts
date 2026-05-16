// src/lib/orchestratorEngine.ts
// ─────────────────────────────────────────────────────────────
// Orchestrator Engine for PathScribe.
// Resolves a ReportTemplate's assembly slots into TemplateNodes,
// iterates over AI-enabled sections, calls the AI model with
// per-section prompts + structured context, and streams output
// to the editor via callbacks.
// ─────────────────────────────────────────────────────────────

import type { SectionNode, TemplateNode } from '../types/template';
import type { ReportTemplate } from '../types/reportPart';
import { ROLE_DISPLAY_ORDER } from '../types/reportPart';
import type { IReportPartService } from '../services/reportParts/IReportPartService';
import type { StructuredContext } from './contextBuilder';
import { callAi } from '../services/aiIntegration/aiProviderService';

// ── Engine events ──────────────────────────────────────────────

export type OrchestratorEventType =
  | 'start'
  | 'section-start'
  | 'token'
  | 'section-complete'
  | 'complete'
  | 'error';

export interface OrchestratorEvent {
  type: OrchestratorEventType;
  /** The section being processed (null for start/complete/error) */
  sectionId?: string;
  sectionLabel?: string;
  /** 'narrative' = AI-generated prose; 'synoptic' = locked data block */
  sectionType?: 'narrative' | 'synoptic';
  /** Streaming token (type === 'token') */
  token?: string;
  /** Full section text (type === 'section-complete') */
  sectionText?: string;
  /** Error details (type === 'error') */
  error?: Error;
  /** Progress: 0–1 */
  progress?: number;
}

export type OrchestratorEventHandler = (event: OrchestratorEvent) => void;

// ── Run options ────────────────────────────────────────────────

export interface OrchestratorRunOptions {
  /**
   * Specific section IDs to regenerate.
   * If omitted, all enabled AI sections are generated.
   */
  sectionIds?: string[];
  /**
   * Abort controller — call abort() to cancel mid-run.
   */
  signal?: AbortSignal;
  /**
   * Model override (defaults to claude-sonnet-4-20250514)
   */
  model?: string;
  /**
   * API base URL (defaults to /api/orchestrate to avoid CORS via proxy)
   */
  apiBase?: string;
}

// ── Section prompt builder ─────────────────────────────────────

function buildSectionPrompt(
  section: SectionNode,
  context: StructuredContext
): string {
  const { patient, accession, order, specimens, diagnostic, synoptic } = context;

  // Format resolved synoptic answers as a readable list
  const answersText = synoptic.answers.length > 0
    ? synoptic.answers
        .map(a => `  ${a.fieldLabel}: ${a.displayValue}`)
        .join('\n')
    : 'No synoptic answers available.';

  const specimenSummary = specimens
    .map((s, i) =>
      [
        `Specimen ${i + 1}: ${s.label} (${s.type})`,
        s.site !== '(not recorded)' ? `  Site: ${s.site}` : null,
        s.collectionDate !== '(not recorded)' ? `  Collected: ${s.collectionDate}` : null,
      ]
        .filter(Boolean)
        .join('\n')
    )
    .join('\n\n');

  const baseContext = `
CASE CONTEXT
============
Patient: ${patient.fullName}, ${patient.sex}${patient.dateOfBirth !== '(not recorded)' ? `, DOB ${patient.dateOfBirth}` : ''}
Accession: ${accession.fullAccession}
Priority: ${order.priority}
${order.clinicalIndication !== '(not recorded)' ? `Clinical indication: ${order.clinicalIndication}` : ''}
${order.requestingProvider !== '(not recorded)' ? `Requesting provider: ${order.requestingProvider}` : ''}

SPECIMENS
=========
${specimenSummary || 'No specimen detail available.'}

GROSS DESCRIPTION
=================
${diagnostic.grossDescription}

MICROSCOPIC FINDINGS
====================
${diagnostic.microscopicDescription}

ANCILLARY STUDIES
=================
${diagnostic.ancillaryStudies}

SYNOPTIC FINDINGS
=================
Template: ${synoptic.templateName}
${answersText}
`.trim();

  const sectionInstruction = section.ai?.systemInstruction
    ? `\n\nSECTION INSTRUCTION\n===================\n${section.ai.systemInstruction}`
    : '';

  return [
    baseContext,
    sectionInstruction,
    `\nGenerate the "${section.label}" section of a surgical pathology report based on the case context and synoptic findings above. Write in professional clinical prose. Be concise and accurate. Do not include a section heading in your output — the template will add it.`,
  ]
    .filter(Boolean)
    .join('');
}

// ── Render synoptic answers as locked HTML block ───────────────

function renderSynopticAnswers(context: StructuredContext): string {
  const answered = (context.synoptic?.answers ?? []).filter(
    a => a.displayValue && a.displayValue !== '—' && a.displayValue !== ''
  );
  if (answered.length === 0) {
    return '<p><em style="color:#64748b">No synoptic data available — complete fields in the synoptic panel.</em></p>';
  }
  const rows = answered.map(a =>
    `<tr>
      <td style="padding:4px 8px 4px 0;font-weight:600;color:#64748b;white-space:nowrap;vertical-align:top;font-size:12px">${a.fieldLabel}</td>
      <td style="padding:4px 0 4px 12px;vertical-align:top">${a.displayValue}</td>
    </tr>`
  ).join('');
  return `<table style="width:100%;border-collapse:collapse;font-size:13px;line-height:1.6">${rows}</table>`;
}

// ── Processable item — AI section or synoptic block ────────────

type ProcessableItem =
  | { kind: 'ai';       node: SectionNode }
  | { kind: 'synoptic'; id: string; label: string };

function collectProcessableItems(nodes: TemplateNode[]): ProcessableItem[] {
  const result: ProcessableItem[] = [];
  for (const node of nodes) {
    // Synoptic block marker
    if ((node as any).type === 'synoptic-block') {
      result.push({ kind: 'synoptic', id: node.id, label: node.label ?? 'Synoptic Summary' });
      continue;
    }
    // AI-enabled section
    if (node.type === 'section' && (node as SectionNode).ai?.enabled) {
      result.push({ kind: 'ai', node: node as SectionNode });
    }
    // Recurse into containers
    if ('children' in node && Array.isArray((node as any).children)) {
      result.push(...collectProcessableItems((node as any).children));
    }
  }
  return result;
}

// ── Collect AI-enabled sections from the template tree ────────

function collectAiSections(nodes: TemplateNode[]): SectionNode[] {
  const result: SectionNode[] = [];
  for (const node of nodes) {
    if (node.type === 'section' && node.ai?.enabled) {
      result.push(node);
    }
    // Recurse into containers
    if (
      node.type === 'section' ||
      node.type === 'repeat-group' ||
      node.type === 'if-block' ||
      node.type === 'switch-block' ||
      node.type === 'header' ||
      node.type === 'footer'
    ) {
      const children = 'children' in node ? node.children : [];
      result.push(...collectAiSections(children));
    }
  }
  return result;
}

// ── Section generation via callAi ──────────────────────────────
// Uses the same AI provider path as the rest of PathScribe (Vite proxy).
// Simulates streaming by firing token events word-by-word after the
// full response is received — gives live visual feedback without
// needing a real streaming endpoint.

async function generateSection(
  section: SectionNode,
  context: StructuredContext,
  options: OrchestratorRunOptions,
  onEvent: OrchestratorEventHandler
): Promise<string> {
  const result = await callAi({
    system:
      'You are a specialist pathology report assistant. Generate accurate, concise, professional clinical prose for surgical pathology reports. Never add disclaimers, never break character, never produce placeholder text.',
    prompt: buildSectionPrompt(section, context),
    maxTokens: section.ai?.maxTokens ?? 1024,
  });

  const text = result.text;

  // Simulate streaming — fire tokens word-by-word at ~60 words/sec
  const words = text.split(' ');
  for (const word of words) {
    if (options.signal?.aborted) break;
    onEvent({
      type: 'token',
      sectionId: section.id,
      sectionLabel: section.label,
      token: word + ' ',
    });
    await new Promise(r => setTimeout(r, 16));
  }

  return text;
}

// ── Assembly resolver ──────────────────────────────────────────
// Fetches each enabled part from the template's assembly manifest,
// sorts them in canonical page-layout order (ROLE_DISPLAY_ORDER,
// then slot.order within the same role), and flattens their nodes
// into a single sequence ready for collectAiSections.

async function resolveAssemblyNodes(
  template: ReportTemplate,
  partService: IReportPartService,
): Promise<TemplateNode[]> {
  const enabled = template.assembly.filter(s => s.enabled);

  const sorted = [...enabled].sort((a, b) => {
    const roleDiff =
      ROLE_DISPLAY_ORDER.indexOf(a.role) - ROLE_DISPLAY_ORDER.indexOf(b.role);
    return roleDiff !== 0 ? roleDiff : a.order - b.order;
  });

  const uniqueIds = [...new Set(sorted.map(s => s.partId))];
  const result = await partService.getByIds(uniqueIds);

  if (!result.ok) {
    throw new Error('Failed to resolve assembly parts');
  }

  const partsById = new Map(
    (result as any).data.map((p: any) => [p.id, p])
  );

  return sorted.flatMap(
    slot => (partsById.get(slot.partId) as any)?.nodes ?? []
  );
}

// ── Main orchestrator run ──────────────────────────────────────

export async function runOrchestrator(
  template: ReportTemplate,
  context: StructuredContext,
  onEvent: OrchestratorEventHandler,
  partService: IReportPartService,
  options: OrchestratorRunOptions = {}
): Promise<Record<string, string>> {
  if (!template.orchestrationEnabled) {
    throw new Error('Orchestration is not enabled on this template.');
  }

  // Resolve the assembly manifest into a flat node list
  const allNodes = await resolveAssemblyNodes(template, partService);

  // Collect AI sections AND synoptic blocks in document order
  let items = collectProcessableItems(allNodes);

  // Filter to specific sections if requested (e.g. regenerate one)
  if (options.sectionIds && options.sectionIds.length > 0) {
    items = items.filter(item => {
      const id = item.kind === 'ai' ? item.node.id : item.id;
      return options.sectionIds!.includes(id);
    });
  }

  if (items.length === 0) {
    onEvent({ type: 'complete', progress: 1 });
    return {};
  }

  const results: Record<string, string> = {};
  onEvent({ type: 'start', progress: 0 });

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (options.signal?.aborted) break;

    if (item.kind === 'synoptic') {
      // ── Synoptic block — render from context, no AI ────────
      onEvent({
        type: 'section-start',
        sectionId: item.id,
        sectionLabel: item.label,
        sectionType: 'synoptic',
        progress: i / items.length,
      });
      const html = renderSynopticAnswers(context);
      results[item.id] = html;
      onEvent({
        type: 'section-complete',
        sectionId: item.id,
        sectionLabel: item.label,
        sectionType: 'synoptic',
        sectionText: html,
        progress: (i + 1) / items.length,
      });

    } else {
      // ── AI narrative section ───────────────────────────────
      const section = item.node;
      onEvent({
        type: 'section-start',
        sectionId: section.id,
        sectionLabel: section.label,
        sectionType: 'narrative',
        progress: i / items.length,
      });
      try {
        const text = await generateSection(section, context, options, onEvent);
        results[section.id] = text;
        onEvent({
          type: 'section-complete',
          sectionId: section.id,
          sectionLabel: section.label,
          sectionType: 'narrative',
          sectionText: text,
          progress: (i + 1) / items.length,
        });
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        if (error.name === 'AbortError') break;
        onEvent({
          type: 'error',
          sectionId: section.id,
          sectionLabel: section.label,
          error,
        });
      }
    }
  }

  onEvent({ type: 'complete', progress: 1 });
  return results;
}

// ── Single-section regeneration shortcut ──────────────────────

export async function regenerateSection(
  sectionId: string,
  template: ReportTemplate,
  context: StructuredContext,
  onEvent: OrchestratorEventHandler,
  partService: IReportPartService,
  options: Omit<OrchestratorRunOptions, 'sectionIds'> = {}
): Promise<string | undefined> {
  const results = await runOrchestrator(
    template, context, onEvent, partService,
    { ...options, sectionIds: [sectionId] }
  );
  return results[sectionId];
}
