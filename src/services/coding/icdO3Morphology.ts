// src/services/coding/icdO3Morphology.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 607 (#140): a bundled ICD-O-3 morphology table (four-digit code, name, behaviours) searched in the ICD-O tab.
// A common-terms subset, not the full edition: check against the licensed ICD-O-3.2 for anything unusual.
// Behaviour digits: 0 benign, 1 uncertain, 2 in situ, 3 malignant (primary), 6 metastatic.
// ─────────────────────────────────────────────────────────────────────────────

export interface Icdo3Morphology { code: string; name: string; behaviours: readonly number[] }

export const ICDO3_BEHAVIOUR_LABEL: Readonly<Record<number, string>> = {
  0: 'Benign', 1: 'Uncertain whether benign or malignant', 2: 'Carcinoma in situ', 3: 'Malignant, primary site', 6: 'Malignant, metastatic site',
};

export const ICDO3_MORPHOLOGY: readonly Icdo3Morphology[] = [
  { code: '8000', name: 'Neoplasm, NOS', behaviours: [0, 1, 3, 6] },
  { code: '8010', name: 'Carcinoma, NOS', behaviours: [2, 3, 6] },
  { code: '8046', name: 'Non-small cell carcinoma', behaviours: [3] },
  { code: '8041', name: 'Small cell carcinoma, NOS', behaviours: [3] },
  { code: '8050', name: 'Papillary carcinoma, NOS', behaviours: [2, 3] },
  { code: '8070', name: 'Squamous cell carcinoma, NOS', behaviours: [3, 6] },
  { code: '8071', name: 'Squamous cell carcinoma, keratinizing, NOS', behaviours: [3] },
  { code: '8072', name: 'Squamous cell carcinoma, large cell, nonkeratinizing, NOS', behaviours: [3] },
  { code: '8077', name: 'Squamous intraepithelial neoplasia, grade III', behaviours: [2] },
  { code: '8090', name: 'Basal cell carcinoma, NOS', behaviours: [3] },
  { code: '8120', name: 'Transitional cell carcinoma, NOS', behaviours: [2, 3] },
  { code: '8130', name: 'Papillary transitional cell carcinoma', behaviours: [1, 2, 3] },
  { code: '8140', name: 'Adenocarcinoma, NOS (adenoma, NOS when benign)', behaviours: [0, 1, 2, 3, 6] },
  { code: '8160', name: 'Cholangiocarcinoma', behaviours: [3] },
  { code: '8170', name: 'Hepatocellular carcinoma, NOS', behaviours: [3] },
  { code: '8210', name: 'Adenocarcinoma in adenomatous polyp', behaviours: [3] },
  { code: '8211', name: 'Tubular adenocarcinoma', behaviours: [3] },
  { code: '8230', name: 'Solid carcinoma, NOS', behaviours: [3] },
  { code: '8240', name: 'Carcinoid tumour, NOS (neuroendocrine tumour, grade 1)', behaviours: [3] },
  { code: '8246', name: 'Neuroendocrine carcinoma, NOS', behaviours: [3] },
  { code: '8260', name: 'Papillary adenocarcinoma, NOS', behaviours: [3] },
  { code: '8310', name: 'Clear cell adenocarcinoma, NOS', behaviours: [3] },
  { code: '8312', name: 'Renal cell carcinoma, NOS', behaviours: [3] },
  { code: '8330', name: 'Follicular adenocarcinoma, NOS (follicular adenoma when benign)', behaviours: [0, 3] },
  { code: '8380', name: 'Endometrioid adenocarcinoma, NOS', behaviours: [1, 3] },
  { code: '8441', name: 'Serous carcinoma, NOS', behaviours: [2, 3] },
  { code: '8480', name: 'Mucinous adenocarcinoma', behaviours: [3] },
  { code: '8500', name: 'Infiltrating duct carcinoma, NOS (ductal carcinoma in situ at /2)', behaviours: [2, 3] },
  { code: '8510', name: 'Medullary carcinoma, NOS', behaviours: [3] },
  { code: '8520', name: 'Lobular carcinoma, NOS', behaviours: [2, 3] },
  { code: '8550', name: 'Acinar cell carcinoma', behaviours: [3] },
  { code: '8575', name: 'Metaplastic carcinoma, NOS', behaviours: [3] },
  { code: '8720', name: 'Malignant melanoma, NOS (melanoma in situ at /2)', behaviours: [2, 3, 6] },
  { code: '8721', name: 'Nodular melanoma', behaviours: [3] },
  { code: '8743', name: 'Superficial spreading melanoma', behaviours: [3] },
  { code: '8744', name: 'Acral lentiginous melanoma, malignant', behaviours: [3] },
  { code: '8800', name: 'Sarcoma, NOS', behaviours: [3] },
  { code: '8850', name: 'Liposarcoma, NOS', behaviours: [3] },
  { code: '8890', name: 'Leiomyosarcoma, NOS (leiomyoma, NOS when benign)', behaviours: [0, 3] },
  { code: '8900', name: 'Rhabdomyosarcoma, NOS', behaviours: [3] },
  { code: '8940', name: 'Pleomorphic adenoma', behaviours: [0] },
  { code: '9020', name: 'Phyllodes tumour', behaviours: [0, 1, 3] },
  { code: '9180', name: 'Osteosarcoma, NOS', behaviours: [3] },
  { code: '9260', name: 'Ewing sarcoma', behaviours: [3] },
  { code: '9380', name: 'Glioma, NOS', behaviours: [3] },
  { code: '9440', name: 'Glioblastoma, NOS', behaviours: [3] },
  { code: '9500', name: 'Neuroblastoma, NOS', behaviours: [3] },
  { code: '9530', name: 'Meningioma, NOS', behaviours: [0] },
  { code: '9540', name: 'Neurofibroma, NOS', behaviours: [0] },
  { code: '9560', name: 'Schwannoma, NOS', behaviours: [0] },
  { code: '9590', name: 'Malignant lymphoma, NOS', behaviours: [3] },
  { code: '9650', name: 'Hodgkin lymphoma, NOS', behaviours: [3] },
  { code: '9680', name: 'Diffuse large B-cell lymphoma, NOS', behaviours: [3] },
  { code: '9690', name: 'Follicular lymphoma, NOS', behaviours: [3] },
  { code: '9732', name: 'Plasma cell myeloma', behaviours: [3] },
  { code: '9800', name: 'Leukaemia, NOS', behaviours: [3] },
];

export interface Icdo3Hit { code: string; display: string; behaviour: number }

/** Matches a typed code ("8500", "8500/3") or words in the name; one hit per behaviour. */
export function searchIcdo3Morphology(query: string, max = 20): Icdo3Hit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const slash = q.match(/^(\d{4})\/(\d)$/);
  const out: Icdo3Hit[] = [];
  for (const m of ICDO3_MORPHOLOGY) {
    const byCode = slash ? m.code === slash[1] : m.code.startsWith(q);
    const byName = !slash && q.length >= 2 && m.name.toLowerCase().includes(q);
    if (!byCode && !byName) continue;
    for (const b of m.behaviours) {
      if (slash && String(b) !== slash[2]) continue;
      out.push({ code: `${m.code}/${b}`, display: `${m.name} — ${ICDO3_BEHAVIOUR_LABEL[b] ?? ''}`.trim(), behaviour: b });
    }
  }
  return out.slice(0, max);
}
