// src/services/clinical/aiInstructionSamples.ts
// Batch 536 (PS-554): the sample case the AI Instructions Test panel starts
// with, per discipline: invented, no patient identifiers, and in English
// because the check's prompt is English. Data, not UI text: the administrator
// edits it freely before testing.
import type { ClinicalMismatchInput } from './detectClinicalPathologicMismatch';
import type { AiInstructionDiscipline } from './aiInstructions';

export const AI_INSTRUCTION_SAMPLES: Readonly<Record<AiInstructionDiscipline, ClinicalMismatchInput>> = {
  surgical: {
    clinicalIndication: 'Routine screening colonoscopy; small sessile polyp, sigmoid colon.',
    clinicalHistory: 'No prior history of malignancy.',
    microscopic: 'Tubular adenoma with a focus of invasive adenocarcinoma extending into the submucosa.',
    diagnosis: 'Sigmoid colon polyp: invasive adenocarcinoma arising in a tubular adenoma.',
    malignantNow: true,
  },
  cytology: {
    clinicalIndication: 'Thyroid nodule, 1.2 cm, benign-appearing on ultrasound.',
    clinicalHistory: 'Follow-up of a stable nodule.',
    microscopic: 'Cellular aspirate with papillary architecture, nuclear grooves and pseudoinclusions.',
    diagnosis: 'Malignant: papillary thyroid carcinoma (Bethesda VI).',
    malignantNow: true,
  },
  autopsy: {
    clinicalIndication: 'Clinical cause of death: acute myocardial infarction.',
    clinicalHistory: 'Hypertension; chest pain on admission.',
    microscopic: 'Saddle pulmonary embolus; coronary arteries with mild atherosclerosis and no acute occlusion; no infarct.',
    diagnosis: 'Cause of death: pulmonary thromboembolism.',
    malignantNow: false,
  },
};
