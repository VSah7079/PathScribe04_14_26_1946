// src/services/marginExtraction/mockMarginExtractionService.ts
import type { ServiceResult, ID } from '../types';
import { storageGet, storageSet } from '../mockStorage';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { extractMarginDistanceMm, isMarginDistanceTextField, unitForMarginDistanceField } from './marginDistanceExtraction';
import type {
  IMarginExtractionService,
  MarginShadowAttribute,
  MarginExtractionException,
  MarginExtractionExceptionFilter,
  ExtractAndStoreInput,
  ExtractionRunResult,
} from './IMarginExtractionService';

const ATTRS_KEY = 'margin_shadow_attributes';
const EXCEPTIONS_KEY = 'margin_extraction_exceptions';

const loadAttrs = () => storageGet<MarginShadowAttribute[]>(ATTRS_KEY, []);
const persistAttrs = (data: MarginShadowAttribute[]) => storageSet(ATTRS_KEY, data);
const loadExceptions = () => storageGet<MarginExtractionException[]>(EXCEPTIONS_KEY, []);
const persistExceptions = (data: MarginExtractionException[]) => storageSet(EXCEPTIONS_KEY, data);

let ATTRS: MarginShadowAttribute[] = loadAttrs();
let EXCEPTIONS: MarginExtractionException[] = loadExceptions();

const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const err = <T>(error: string): ServiceResult<T> => ({ ok: false, error });
const delay = () => new Promise(r => setTimeout(r, 80));
const newId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

const answerText = (raw: string | string[] | undefined): string => (Array.isArray(raw) ? raw.join(', ') : raw ?? '');

export const mockMarginExtractionService: IMarginExtractionService = {
  async extractAndStore(input: ExtractAndStoreInput) {
    await delay();
    const { caseId, instanceId, fields, answers } = input;
    const stored: MarginShadowAttribute[] = [];
    const exceptions: MarginExtractionException[] = [];
    const now = new Date().toISOString();

    for (const field of fields) {
      if (!isMarginDistanceTextField(field)) continue;
      const rawText = answerText(answers[field.id]);
      if (!rawText.trim()) continue; // nothing answered yet — nothing to extract or flag

      const result = extractMarginDistanceMm(rawText, { fieldUnit: unitForMarginDistanceField(field.id) });

      // Upsert: clear any prior attribute/exception for this exact field before writing the new outcome.
      ATTRS = ATTRS.filter(a => !(a.caseId === caseId && a.instanceId === instanceId && a.fieldId === field.id));
      EXCEPTIONS = EXCEPTIONS.filter(e => !(e.caseId === caseId && e.instanceId === instanceId && e.fieldId === field.id && e.status === 'Pending'));

      if (result.confident && result.valueMm !== null) {
        const attr: MarginShadowAttribute = {
          id: newId('msa'), caseId, instanceId, fieldId: field.id, fieldLabel: field.label,
          valueMm: result.valueMm, approx: result.approx ?? 'exact', rawText, extractedAt: now,
        };
        ATTRS = [...ATTRS, attr];
        stored.push(attr);
      } else {
        const exception: MarginExtractionException = {
          id: newId('mex'), caseId, instanceId, fieldId: field.id, fieldLabel: field.label,
          rawText, reason: result.reason ?? 'noNumericToken', status: 'Pending', createdAt: now,
        };
        EXCEPTIONS = [...EXCEPTIONS, exception];
        exceptions.push(exception);
      }
    }

    persistAttrs(ATTRS);
    persistExceptions(EXCEPTIONS);
    return ok<ExtractionRunResult>({ stored, exceptions });
  },

  async getShadowAttributesForCase(caseId: string) {
    await delay();
    return ok(ATTRS.filter(a => a.caseId === caseId));
  },

  async getShadowAttribute(caseId: string, instanceId: string, fieldId: string) {
    await delay();
    return ok(ATTRS.find(a => a.caseId === caseId && a.instanceId === instanceId && a.fieldId === fieldId) ?? null);
  },

  async listExceptions(filter?: MarginExtractionExceptionFilter) {
    await delay();
    return ok(EXCEPTIONS.filter(e => (!filter?.caseId || e.caseId === filter.caseId) && (!filter?.status || e.status === filter.status)));
  },

  async resolveException(id: ID, valueMm: number, byUserId: string, byUserName: string) {
    await delay();
    const idx = EXCEPTIONS.findIndex(e => e.id === id);
    if (idx === -1) return err<MarginExtractionException>(`Margin extraction exception ${id} not found`);
    const decision = await authorizationService.enforce('case:margin-exception:resolve', { caseId: EXCEPTIONS[idx].caseId });
    if (!decision.allowed) return err<MarginExtractionException>('notPermitted');
    const now = new Date().toISOString();
    const current = EXCEPTIONS[idx];
    const updated: MarginExtractionException = {
      ...current, status: 'Resolved', resolvedValueMm: valueMm, resolvedByUserId: byUserId, resolvedByUserName: byUserName, resolvedAt: now,
    };
    EXCEPTIONS = EXCEPTIONS.map(e => (e.id === id ? updated : e));
    // The human-tagged value becomes the shadow attribute a rule evaluator reads, same as a confident parse would have.
    ATTRS = ATTRS.filter(a => !(a.caseId === current.caseId && a.instanceId === current.instanceId && a.fieldId === current.fieldId));
    ATTRS = [...ATTRS, {
      id: newId('msa'), caseId: current.caseId, instanceId: current.instanceId, fieldId: current.fieldId, fieldLabel: current.fieldLabel,
      valueMm, approx: 'exact', rawText: current.rawText, extractedAt: now,
    }];
    persistExceptions(EXCEPTIONS);
    persistAttrs(ATTRS);
    return ok({ ...updated });
  },

  async dismissException(id: ID, reason: string, byUserId: string, byUserName: string) {
    await delay();
    const idx = EXCEPTIONS.findIndex(e => e.id === id);
    if (idx === -1) return err<MarginExtractionException>(`Margin extraction exception ${id} not found`);
    const decision = await authorizationService.enforce('case:margin-exception:resolve', { caseId: EXCEPTIONS[idx].caseId });
    if (!decision.allowed) return err<MarginExtractionException>('notPermitted');
    const now = new Date().toISOString();
    const updated: MarginExtractionException = {
      ...EXCEPTIONS[idx], status: 'Dismissed', dismissReason: reason, resolvedByUserId: byUserId, resolvedByUserName: byUserName, resolvedAt: now,
    };
    EXCEPTIONS = EXCEPTIONS.map(e => (e.id === id ? updated : e));
    persistExceptions(EXCEPTIONS);
    return ok({ ...updated });
  },
};
