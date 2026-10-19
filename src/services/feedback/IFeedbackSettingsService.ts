// src/services/feedback/IFeedbackSettingsService.ts
// Batch 617 (PS-514): the organisation's feedback settings (feedbackSettingsRules.ts). Saving needs
// config:feedback:manage and is audited by the service; the interface was inside the mock until now.
import type { ServiceResult } from '../types';
import type { FeedbackSettings } from './feedbackSettingsRules';

export interface IFeedbackSettingsService {
  get(): Promise<ServiceResult<FeedbackSettings>>;
  /** Refused with feedbackSettingsProblem's reason when the settings can't work. */
  save(settings: FeedbackSettings): Promise<ServiceResult<FeedbackSettings>>;
  /** Whether this instance shows the QA feedback button. */
  qaButtonShown(): Promise<boolean>;
}
