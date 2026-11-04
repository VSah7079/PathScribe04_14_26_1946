// src/services/cosd/buildCosdXml.ts
// Batch 620 (part C, PS-800): a preview of a UK COSD submission, built from the registry payload PathScribe already makes
// (cancerRegistry/buildCancerRegistryReportPayload.ts). Pure. The element names are PathScribe's own SIMPLIFIED model, not the
// official COSD schema (cosdModel.ts); the interface engine makes the real file. Nothing is invented: every value comes from the payload.
import type { CancerRegistryReportPayload } from '../cancerRegistry/buildCancerRegistryReportPayload';
import { COSD_MODEL_STATUS, type CosdBuildOptions } from './cosdModel';

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };
export const escapeXml = (text: string): string => text.replace(/[&<>"']/g, c => ESCAPES[c]);

const attr = (name: string, value: string | undefined): string => (value === undefined || value === '' ? '' : ` ${name}="${escapeXml(value)}"`);
const leaf = (indent: string, name: string, value: string | undefined): string => (value === undefined || value === '' ? '' : `${indent}<${name}>${escapeXml(value)}</${name}>\n`);

export function buildCosdXml(payload: CancerRegistryReportPayload, options: CosdBuildOptions): string {
  const nhsNumber = payload.patientIdentifier?.value;
  const morphology = payload.icdOCodes.map(c => `      <Morphology${attr('code', c.code)}${attr('behaviour', c.behaviorCode ?? undefined)}${attr('description', c.description)}/>\n`).join('');
  const icd10 = payload.icd10Codes.map(c => `      <Icd10${attr('code', c)}/>\n`).join('');
  return [
    '<?xml version="1.0" encoding="UTF-8"?>\n',
    `<!-- PathScribe preview. Simplified model: element names are PathScribe's own, not the official COSD schema. -->\n`,
    `<CosdPreview model="${COSD_MODEL_STATUS}">\n`,
    `  <Submission${attr('id', options.submissionId)}${attr('type', options.messageType)}${attr('amends', options.amendsSubmissionId)}${attr('created', payload.timestamp)}/>\n`,
    `  <Facility${attr('id', payload.facilityId)}${attr('name', payload.facilityName)}/>\n`,
    '  <Patient>\n',
    leaf('    ', 'NhsNumber', nhsNumber),
    leaf('    ', 'DateOfBirth', payload.patient.dateOfBirth),
    '  </Patient>\n',
    '  <Pathology>\n',
    leaf('    ', 'AccessionNumber', payload.accessionNumber),
    leaf('    ', 'DiagnosisDate', payload.diagnosisDate),
    leaf('    ', 'PrimaryDiagnosis', payload.primaryDiagnosis),
    morphology, icd10,
    '  </Pathology>\n',
    '</CosdPreview>\n',
  ].join('');
}
