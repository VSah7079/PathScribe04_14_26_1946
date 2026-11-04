// src/services/smartCapture/ISmartCaptureService.ts
// Batch 617 (PS-514): the interface of the smartCaptureService, written out so the mock and the server version share it.
import type { ServiceResult } from '../types';
import type { SmartCaptureView } from './smartCaptureService';
import type { SmartCapturePayload } from './smartCapturePayload';
import type { SmartCaptureDecision } from './smartCaptureStates';

export interface ISmartCaptureService {
  get(caseId: string): Promise<ServiceResult<SmartCaptureView>>;
  suggest(caseId: string): Promise<ServiceResult<SmartCaptureView>>;
  restart(caseId: string): Promise<ServiceResult<SmartCaptureView>>;
  review(caseId: string, lineKey: string, decision: SmartCaptureDecision): Promise<ServiceResult<SmartCaptureView>>;
  approve(caseId: string, input: { confirmed: boolean; }): Promise<ServiceResult<SmartCaptureView>>;
  preview(caseId: string): Promise<ServiceResult<SmartCapturePayload>>;
  exportLines(caseId: string): Promise<ServiceResult<SmartCaptureView>>;
}
