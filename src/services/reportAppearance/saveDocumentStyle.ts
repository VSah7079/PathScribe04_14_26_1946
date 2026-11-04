// src/services/reportAppearance/saveDocumentStyle.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 428: the default text styles of report headers, bodies and footers
// (Configuration → System → Document style) need config:report-appearance:manage,
// checked here. The screen saves as you change a field; a refused change
// saves nothing.
// ─────────────────────────────────────────────────────────────────────────────

import type { LabelConfig } from '../../types/template';
import {
  setOrgDocumentStyleDefault, setOrgHeaderStyleDefault, setOrgFooterStyleDefault,
} from '../../components/Config/System/documentStyleConfig';
import { permitConfigChange } from '../authorization/guardConfigWrites';

export type DocumentStyleCategory = 'header' | 'body' | 'footer';

const SETTERS: Record<DocumentStyleCategory, (s: LabelConfig) => void> = {
  header: setOrgHeaderStyleDefault, body: setOrgDocumentStyleDefault, footer: setOrgFooterStyleDefault,
};

/** Saves one category's default style. False when refused (nothing saved). */
export async function saveDocumentStyleDefault(category: DocumentStyleCategory, style: LabelConfig): Promise<boolean> {
  const { authorizationService } = await import('../authorization/defaultAuthorizationService');
  if (!(await permitConfigChange(authorizationService.enforce('config:report-appearance:manage'), 'config:report-appearance:manage'))) return false;
  SETTERS[category](style);
  return true;
}
