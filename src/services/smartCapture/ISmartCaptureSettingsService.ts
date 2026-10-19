// src/services/smartCapture/ISmartCaptureSettingsService.ts
// Batch 617 (PS-514): the interface of the smartCaptureSettingsService, written out so the mock and the server version share it.
import type { ServiceResult } from '../types';
import type { SmartCaptureSettings } from './smartCaptureSettings';

export interface ISmartCaptureSettingsService {
  getSettings(): Promise<ServiceResult<SmartCaptureSettings>>;
  setPrototypeEnabled(enabled: boolean): Promise<ServiceResult<SmartCaptureSettings>>;
  setChecklistItem(id: string, ticked: boolean): Promise<ServiceResult<SmartCaptureSettings>>;
  setProductionActivated(on: boolean): Promise<ServiceResult<SmartCaptureSettings>>;
}
