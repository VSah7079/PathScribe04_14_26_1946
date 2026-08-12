<<<<<<< HEAD
﻿type CodeModalSystem = 'snomed' | 'icd' | 'SNOMED' | 'ICD-10' | 'ICD-11' | 'ICD-O-topography' | 'ICD-O-morphology';
=======
type CodeModalSystem = 'snomed' | 'icd' | 'SNOMED' | 'ICD-10' | 'ICD-11' | 'ICD-O-topography' | 'ICD-O-morphology';
>>>>>>> upstream/main

import React, { useState, useEffect, useRef } from 'react';
import '../pathscribe.css';
import { useNavigate } from 'react-router-dom';
<<<<<<< HEAD
import { useLogout } from '@hooks/useLogout';
import WorklistTable from '../components/Worklist/WorklistTable';
import { caseService, codeService } from '../services';
import type { PathologyCase, CaseFilterParams, ClinicalCode } from '../services';
import { LookupModal, LookupSearch, LookupItem, LookupSection, LookupEmpty } from '../components/Common/LookupModal';
import { useSpecimenDictionary } from '../components/Config/System/useSpecimenDictionary';
import type { SpecimenEntry } from '../components/Config/System/specimenTypes';
import { useSystemConfig } from '../contexts/SystemConfigContext';
import { mockActionRegistryService } from '../services/actionRegistry/mockActionRegistryService';
import { normalizeAccession } from '../utils/normalizeAccession';
=======
import { useAuth } from '@/contexts/AuthContext';
import { caseRouter } from '../services/cases/CaseRouter';
import { useLogout } from '@hooks/useLogout';
import WorklistTable from '../components/Worklist/WorklistTable';
import { codeService, flagService, userService, physicianService, facilityService, subspecialtyService } from '../services';
import { getStaffSubspecialtyDisplay } from '../utils/staffSubspecialties';
import type { PathologyCase, CaseFilterParams, ClinicalCode, Flag } from '../services';
import { LookupModal, LookupSearch, LookupItem, LookupSection, LookupEmpty } from '../components/Common/LookupModal';
// Extended component — adds onClear prop until LookupModal.tsx is updated
const LookupModalX = LookupModal as React.ComponentType<React.ComponentProps<typeof LookupModal> & { onClear?: () => void; onDone?: () => void }>;
import { useSpecimenDictionary } from '../components/Config/System/useSpecimenDictionary';
import type { SpecimenEntry } from '../services/specimenDictionary/specimenTypes';
import { useSystemConfig } from '../contexts/SystemConfigContext';
import { getFacilityDateParts } from '@/utils/facilityTime';
import { useBreadcrumb }   from '../contexts/BreadcrumbContext';
import { mockActionRegistryService } from '../services/actionRegistry/mockActionRegistryService';
import { normalizeAccession, isAccession } from '../utils/normalizeAccession';
import { IDENTIFIER_FORMAT_LIBRARY } from '../types/systemConfig';
>>>>>>> upstream/main
import { VOICE_CONTEXT } from '../constants/systemActions';

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

<<<<<<< HEAD
const toDateString = (d: Date): string => d.toISOString().split('T')[0];
const today   = (): string => toDateString(new Date());
const daysAgo = (n: number): string => { const d = new Date(); d.setDate(d.getDate() - n); return toDateString(d); };
=======
// Real fix: was d.toISOString().split('T')[0] - extracts the UTC date,
// not the real, facility-local one. Not caught by the project's
// no-restricted-properties lint rule at all (toISOString/split isn't
// one of the restricted methods) despite being the same real bug -
// worth a real, separate note for whoever next extends that rule.
const toFacilityDateString = (d: Date, timezone: string): string => {
  const { year, month, day } = getFacilityDateParts(d, timezone);
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};
const today   = (timezone: string): string => toFacilityDateString(new Date(), timezone);
// eslint-disable-next-line no-restricted-properties -- Real, honest justification: computes the absolute "N days ago" instant (real milliseconds subtraction) - the real, facility-timezone-aware conversion to a displayed calendar date already happens downstream via toFacilityDateString(d, timezone) above.
const daysAgo = (n: number, timezone: string): string => { const d = new Date(); d.setDate(d.getDate() - n); return toFacilityDateString(d, timezone); };

const DATE_RANGE_SHORTCUTS: [string, number][] = [['7d',7],['30d',30],['90d',90],['1yr',365]];
// Real, live page size for Load More - both mock and Firestore backends
// now honor pageSize/cursor identically (caseFilterUtils.ts's
// applyCasePagination, FirestoreCaseService.ts's limit()/startAfter()).
const SEARCH_PAGE_SIZE = 25;
// Shared by applyFilters and the breadcrumb-return session-snapshot
// restore — both set dateFrom/dateTo from a previously-saved/captured
// value and need to re-derive whether that value happens to match one of
// the four shortcut buttons, so the button's active-state highlight stays
// correct after a restore, not just after a direct click.
const matchDateRangeShortcut = (from: string, to: string, timezone: string): string | null => {
  if (!from && !to) return 'all';
  const match = DATE_RANGE_SHORTCUTS.find(([, days]) => from === daysAgo(days, timezone) && to === today(timezone));
  return match ? match[0] : null;
};
>>>>>>> upstream/main
const fmtDate = (iso: string): string => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m,10)-1]} ${parseInt(d,10)}, ${y}`;
};

// â”€â”€â”€ localStorage / sessionStorage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const LS_KEY = 'pathscribe:savedSearches';
const lsLoad = (): SavedSearch[] => { try { const r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : []; } catch { return []; } };
const lsSave = (s: SavedSearch[]) => { try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {} };

const SS_KEY = 'pathscribe:lastSearch';
interface LastSearchSnapshot { filters: FilterState; results: PathologyCase[]; hasSearched: boolean; }
const ssLoad  = (): LastSearchSnapshot | null => { try { const r = sessionStorage.getItem(SS_KEY); return r ? JSON.parse(r) : null; } catch { return null; } };
const ssSave  = (s: LastSearchSnapshot) => { try { sessionStorage.setItem(SS_KEY, JSON.stringify(s)); } catch {} };
const ssClear = () => { try { sessionStorage.removeItem(SS_KEY); } catch {} };

// â”€â”€â”€ Specimen dictionary (used for inline typeahead only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
<<<<<<< HEAD
// Full specimen list lives in mockSpecimenService â€” this is just for the
=======
// Full specimen list lives in mockSpecimenService ”” this is just for the
>>>>>>> upstream/main
// search field suggestions until that service is wired to this page.
const SPECIMEN_DICTIONARY = [
  'Left Breast Mastectomy','Right Breast Mastectomy','Right Breast Lumpectomy','Left Breast Lumpectomy',
  'Right Hemicolectomy','Left Hemicolectomy','Radical Prostatectomy','Left Lower Lobe Lobectomy',
  'Right Upper Lobe Lobectomy','Total Thyroidectomy','Partial Thyroidectomy',
  'Cholecystectomy','Appendectomy','Partial Nephrectomy','Radical Nephrectomy',
  'Total Hysterectomy','Wide Local Excision','Axillary Node Dissection',
  'TURBT Specimen','Endocervical Curettage','Cervical Cone Biopsy',
  'Sentinel Lymph Node Biopsy','Core Needle Biopsy Breast','Prostate Biopsy Cores',
];

<<<<<<< HEAD
// â”€â”€â”€ SNOMED/ICD inline data removed â€” now served by codeService â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
=======
// â”€â”€â”€ SNOMED/ICD inline data removed ”” now served by codeService â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
>>>>>>> upstream/main
// See src/services/codes/mockCodeService.ts

// â”€â”€â”€ Synoptics â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

<<<<<<< HEAD
interface SynopticTemplate { id: string; name: string; organ: string; category: string; }
const ALL_SYNOPTICS: SynopticTemplate[] = [
  { id:'p01', name:'CAP Breast Invasive Carcinoma', organ:'Breast',     category:'Breast'      },
  { id:'p02', name:'CAP Breast DCIS',               organ:'Breast DCIS',category:'Breast'      },
  { id:'p03', name:'CAP Colon Resection',           organ:'Colon',      category:'GI'          },
  { id:'p04', name:'CAP Rectum Resection',          organ:'Rectum',     category:'GI'          },
  { id:'p05', name:'CAP Appendix',                  organ:'Appendix',   category:'GI'          },
  { id:'p06', name:'CAP Prostatectomy',             organ:'Prostate',   category:'GU'          },
  { id:'p07', name:'CAP Prostate Biopsy',           organ:'Prostate Bx',category:'GU'          },
  { id:'p08', name:'CAP Kidney Resection',          organ:'Kidney',     category:'GU'          },
  { id:'p09', name:'CAP Bladder Resection',         organ:'Bladder',    category:'GU'          },
  { id:'p10', name:'CAP Lung Resection',            organ:'Lung',       category:'Thoracic'    },
  { id:'p11', name:'CAP Mesothelioma',              organ:'Pleura',     category:'Thoracic'    },
  { id:'p12', name:'CAP Thyroid',                   organ:'Thyroid',    category:'Endocrine'   },
  { id:'p13', name:'CAP Adrenal',                   organ:'Adrenal',    category:'Endocrine'   },
  { id:'p14', name:'CAP Endometrium',               organ:'Uterus',     category:'Gynaecology' },
  { id:'p15', name:'CAP Cervix Resection',          organ:'Cervix',     category:'Gynaecology' },
  { id:'p16', name:'CAP Ovary',                     organ:'Ovary',      category:'Gynaecology' },
  { id:'p17', name:'CAP Melanoma',                  organ:'Skin',       category:'Skin'        },
  { id:'p18', name:'CAP Squamous Cell Carcinoma',   organ:'Skin SCC',   category:'Skin'        },
  { id:'p19', name:'CAP Soft Tissue',               organ:'Soft Tissue',category:'Bone/Soft'   },
  { id:'p20', name:'CAP Bone',                      organ:'Bone',       category:'Bone/Soft'   },
  { id:'p21', name:'CAP Lymph Node',                organ:'Lymph Node', category:'Haem'        },
  { id:'p22', name:'CAP Hodgkin Lymphoma',          organ:'Lymphoma',   category:'Haem'        },
=======
interface SynopticTemplate { id: string; name: string; organ: string; category: string; templateId: string; }
const ALL_SYNOPTICS: SynopticTemplate[] = [
  // Breast
  { id:'p01', templateId:'generic_test_complex',       name:'Breast Invasive Carcinoma',      organ:'Breast',      category:'Breast'      },
  { id:'p02', templateId:'generic_test_basic',         name:'Breast DCIS',                    organ:'Breast DCIS', category:'Breast'      },
  // GI — alphabetical by organ
  { id:'p05', templateId:'appendix',                   name:'Appendix',                       organ:'Appendix',    category:'GI'          },
  { id:'p03', templateId:'generic_test_complex',       name:'Colon Resection',                organ:'Colon',       category:'GI'          },
  { id:'p04', templateId:'generic_test_complex',       name:'Rectum Resection',               organ:'Rectum',      category:'GI'          },
  // GU — alphabetical by organ
  { id:'p09', templateId:'bladder_resection',          name:'Bladder Resection',              organ:'Bladder',     category:'GU'          },
  { id:'p08', templateId:'generic_test_complex',       name:'Kidney Resection',               organ:'Kidney',      category:'GU'          },
  { id:'p06', templateId:'generic_test_complex',       name:'Prostatectomy',                  organ:'Prostate',    category:'GU'          },
  { id:'p07', templateId:'generic_test_complex',       name:'Prostate Biopsy',                organ:'Prostate Bx', category:'GU'          },
  // Thoracic
  { id:'p10', templateId:'generic_test_complex',       name:'Lung Resection',                 organ:'Lung',        category:'Thoracic'    },
  { id:'p11', templateId:'mesothelioma',               name:'Mesothelioma',                   organ:'Pleura',      category:'Thoracic'    },
  // Endocrine — alphabetical
  { id:'p13', templateId:'adrenal',                    name:'Adrenal',                        organ:'Adrenal',     category:'Endocrine'   },
  { id:'p12', templateId:'thyroid_malignant',          name:'Thyroid',                        organ:'Thyroid',     category:'Endocrine'   },
  // Gynaecology — alphabetical
  { id:'p15', templateId:'cervix_resection',           name:'Cervix Resection',               organ:'Cervix',      category:'Gynaecology' },
  { id:'p14', templateId:'endometrium_biopsy',         name:'Endometrium',                    organ:'Uterus',      category:'Gynaecology' },
  { id:'p16', templateId:'ovary',                      name:'Ovary',                          organ:'Ovary',       category:'Gynaecology' },
  // Skin — alphabetical
  { id:'p17', templateId:'generic_test_basic',         name:'Melanoma',                       organ:'Skin',        category:'Skin'        },
  { id:'p18', templateId:'skin_scc',                   name:'Squamous Cell Carcinoma',        organ:'Skin SCC',    category:'Skin'        },
  // Bone/Soft — alphabetical
  { id:'p20', templateId:'bone',                       name:'Bone',                           organ:'Bone',        category:'Bone/Soft'   },
  { id:'p19', templateId:'soft_tissue',                name:'Soft Tissue',                    organ:'Soft Tissue', category:'Bone/Soft'   },
  // Haem
  { id:'p22', templateId:'hodgkin_lymphoma',           name:'Hodgkin Lymphoma',               organ:'Lymphoma',    category:'Haem'        },
  { id:'p21', templateId:'lymph_node',                 name:'Lymph Node',                     organ:'Lymph Node',  category:'Haem'        },
>>>>>>> upstream/main
];

// â”€â”€â”€ Users â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface UserStub { id: string; name: string; client: string; }
<<<<<<< HEAD
const ALL_PATHOLOGISTS: UserStub[] = [
  { id:'path-1', name:'Dr. Sarah Johnson',   client:'St. Vincent\'s University Hospital'  },
  { id:'path-2', name:'Dr. Michael Chen',    client:'Mater Misericordiae University Hospital' },
  { id:'path-3', name:'Dr. Emily Rodriguez', client:'Beaumont Hospital'                   },
  { id:'path-4', name:'Dr. James Okafor',    client:'St. James\'s Hospital'               },
  { id:'path-5', name:'Dr. Priya Nair',      client:'Cork University Hospital'            },
  { id:'path-6', name:'Dr. David Lee',       client:'Mater Misericordiae University Hospital' },
  { id:'path-7', name:'Dr. Anna Fischer',    client:'Tallaght University Hospital'        },
  { id:'path-8', name:'Dr. Raj Patel'  ,     client:'St. Vincent\'s University Hospital'  },
];
const ALL_ATTENDINGS: UserStub[] = [
  { id:'att-1',  name:'Dr. Robert Williams',  client:'Blackrock Clinic'                    },
  { id:'att-2',  name:'Dr. Linda Martinez',   client:'Beacon Hospital'                     },
  { id:'att-3',  name:'Dr. Kevin Thompson',   client:'St. James\'s Hospital'               },
  { id:'att-4',  name:'Dr. Susan Clark',      client:'Mater Private Network'               },
  { id:'att-5',  name:'Dr. Brian Park',       client:'Galway University Hospital'          },
  { id:'att-6',  name:'Dr. Catherine Moore',  client:'Beacon Hospital'                     },
  { id:'att-7',  name:'Dr. Thomas Harris',    client:'Blackrock Clinic'                    },
  { id:'att-8',  name:'Dr. Patricia Allen',   client:'Cork University Hospital'            },
  { id:'att-9',  name:'Dr. Mark Davis',       client:'St. Vincent\'s University Hospital'  },
  { id:'att-10', name:'Dr. Nicole Wilson',    client:'Galway University Hospital'          },
];

// â”€â”€â”€ Flags â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ALL_FLAGS = [
  'RUSH','Frozen Section','QI Review','Clinician Query','Recut Requested',
  'Additional Levels','Special Stains Pending','IHC Pending','Molecular Pending',
  'Correlation Required','Second Opinion','Amended Report','Addendum Added',
  'Tumour Board','MDT Discussion','Conference Case','Teaching Case',
  'Research Consent','Clinical Trial','Rare Diagnosis',
];

const CASE_STATUS_OPTIONS = ['Grossed','Awaiting Micro','Finalizing','Completed'] as const;
const PRIORITY_OPTIONS    = ['Routine','STAT'] as const;
=======
// Real fix: ALL_PATHOLOGISTS/ALL_ATTENDINGS used to be hardcoded, static
// snapshots here - pathologists with fake ids never matching a real
// services/users/ StaffUser record, and an attending list honestly
// "sourced from requestingProvider values in mock case data" but then
// frozen as a static array, meaning a real, new attending on a newly
// accessioned case would never appear in this search filter. Both are
// now real, live state fetched inside the component (see
// pathologists/attendings state + effect below) from userService
// (filtered to real StaffUser.roles.includes('Pathologist') - real,
// capitalized casing, verified directly against the real seed data
// after an initial, lowercase version of this filter was caught
// silently matching zero real users) and physicianService respectively
// - the same real services RoleDictionary.tsx/AccessionPage.tsx already use.

// â”€â”€â”€ Flags â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// Sorted alphabetically. 'STAT' (shorthand) catches all STAT-prefixed flags via name-contains
// matching in the service. The PRIORITY → STAT chip in the sidebar filters by case priority;
// these flag entries target case-level flag badges on the case card.
// Real fix: same bug class as ALL_PATHOLOGISTS/ALL_ATTENDINGS above - a
// completely separate, fake id scheme (c1-c8) unrelated to the real
// services/clients/ roster. Now real, live state (see clients state +
// effect below) from facilityService.getAll().

// Real CaseStatus values only (see src/types/case/CaseStatus.ts) — this array
// previously included 'pending' and 'pending-countersign', neither of which
// is a valid CaseStatus (the latter is a SynopticReportInstance status, not a
// Case status), so those two pills never matched any real case. Replaced with
// 'pathologist-review' (the real "ready for sign-out" status) and dropped the
// non-existent 'pending' value — folded into 'pending-review', which already
// covers it. Also adds the three new Orchestration statuses: 'accessioned',
// 'gross-complete', 'intraoperative-complete'.
const CASE_STATUS_OPTIONS = [
  'draft','accessioned','gross-complete','in-progress','intraoperative-complete',
  'pending-review','pathologist-review','finalizing','finalized','pool','pending-countersign',
] as const;

// Label + accent color per status — kept in one place instead of inline so the
// mapping stays legible as statuses are added. Colors match getStatusStyle in
// WorklistTable.tsx where the same status appears, for visual consistency
// between Worklist and Search.
const STATUS_PILL_META: Record<typeof CASE_STATUS_OPTIONS[number], { label: string; color: string }> = {
  'draft':                    { label: 'Draft',             color: '#94a3b8' },
  'accessioned':              { label: 'Awaiting Grossing', color: '#38BDF8' },
  'gross-complete':           { label: 'Gross Complete',    color: '#14B8A6' },
  'in-progress':              { label: 'In Progress',       color: '#0891B2' },
  'intraoperative-complete':  { label: 'Intraop Complete',  color: '#A855F7' },
  'pending-review':           { label: 'Needs Review',      color: '#F59E0B' },
  'pathologist-review':       { label: 'Awaiting Sign-off',  color: '#FB7185' },
  'finalizing':                { label: 'Finalizing',        color: '#EC4899' },
  'finalized':                 { label: 'Completed',         color: '#10B981' },
  'pool':                      { label: 'Pool',              color: '#F97316' },
  // Real fix: was missing entirely - confirmed a real, live, currently-
  // reachable CaseStatus (WorklistPage.tsx's own "Awaiting My
  // Countersign" filter tile checks this exact status, fixed earlier
  // in this same audit). Color matches that tile's own existing violet.
  'pending-countersign':       { label: 'Awaiting Countersign', color: '#a78bfa' },
};
const PRIORITY_OPTIONS    = ['Routine','Rush','STAT'] as const;
>>>>>>> upstream/main

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface FilterState {
<<<<<<< HEAD
  patientName: string; hospitalId: string; accessionNo: string;
=======
  patientName: string; hospitalId: string; patientId: string; accessionNo: string;
>>>>>>> upstream/main
  diagnosisList: string[]; specimenList: string[];
  snomedList: ClinicalCode[]; icdCodes: ClinicalCode[];
  synopticIds: string[]; flagsList: string[];
  pathologistIds: string[]; attendingIds: string[];
  submittingNames: string[]; statusList: string[]; priorityList: string[];
  dateFrom: string; dateTo: string;
  genderList: string[];
  dobFrom: string; dobTo: string;
  ageMin: number | undefined; ageMax: number | undefined;
}
interface SavedSearch { id: string; name: string; filters: FilterState; createdAt: string; }

// â”€â”€â”€ English summary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

<<<<<<< HEAD
const buildSummary = (f: FilterState): string => {
  const parts: string[] = [];
  if (f.dateFrom || f.dateTo) parts.push(`accession ${fmtDate(f.dateFrom)||'â€¦'} â€“ ${fmtDate(f.dateTo)||'today'}`);
  if (f.patientName)           parts.push(`patient "${f.patientName}"`);
  if (f.accessionNo)           parts.push(`accession "${f.accessionNo}"`);
  if (f.hospitalId)            parts.push(`MRN "${f.hospitalId}"`);
=======
const buildSummary = (f: FilterState, pathologists: UserStub[], attendings: UserStub[]): string => {
  const parts: string[] = [];
  if (f.dateFrom || f.dateTo) parts.push(`accession ${fmtDate(f.dateFrom)||'…'} — ${fmtDate(f.dateTo)||'today'}`);
  if (f.patientName)           parts.push(`patient "${f.patientName}"`);
  if (f.accessionNo)           parts.push(`accession "${f.accessionNo}"`);
  if (f.hospitalId)            parts.push(`MRN "${f.hospitalId}"`);
  if (f.patientId)             parts.push(`MPI "${f.patientId}"`);
>>>>>>> upstream/main
  if (f.specimenList.length)   parts.push(`specimen: ${f.specimenList.join(', ')}`);
  if (f.diagnosisList.length)  parts.push(`diagnosis: ${f.diagnosisList.join(', ')}`);
  if (f.snomedList.length)   parts.push(`SNOMED: ${f.snomedList.map(s=>s.code).join(', ')}`);
  if (f.icdCodes.length)     parts.push(`ICD: ${f.icdCodes.map(s=>`${s.system}:${s.code}`).join(', ')}`);
  if (f.statusList.length)     parts.push(`status: ${f.statusList.join(', ')}`);
  if (f.genderList?.length)    parts.push(`gender: ${f.genderList.join(', ')}`);
<<<<<<< HEAD
  if (f.dobFrom || f.dobTo)    parts.push(`DOB: ${f.dobFrom||'â€¦'} â†’ ${f.dobTo||'â€¦'}`);
  if (f.ageMin !== undefined || f.ageMax !== undefined) parts.push(`age: ${f.ageMin??'0'}â€“${f.ageMax??'âˆž'}yrs`);
  if (f.priorityList.length)   parts.push(`priority: ${f.priorityList.join(', ')}`);
  if (f.flagsList.length)      parts.push(`flags: ${f.flagsList.join(', ')}`);
  if (f.synopticIds.length)    parts.push(`synoptic: ${f.synopticIds.map(id=>ALL_SYNOPTICS.find(t=>t.id===id)?.organ??id).join(', ')}`);
  if (f.pathologistIds.length) parts.push(`pathologist: ${f.pathologistIds.map(id=>ALL_PATHOLOGISTS.find(u=>u.id===id)?.name??id).join(', ')}`);
  if (f.attendingIds.length)   parts.push(`attending: ${f.attendingIds.map(id=>ALL_ATTENDINGS.find(u=>u.id===id)?.name??id).join(', ')}`);
  return parts.length===0 ? 'Showing all cases' : 'Showing cases with '+parts.join(' Â· ');
=======
  if (f.dobFrom || f.dobTo)    parts.push(`DOB: ${f.dobFrom||'…'} → ${f.dobTo||'…'}`);
  if (f.ageMin !== undefined || f.ageMax !== undefined) parts.push(`age: ${f.ageMin??'0'}—${f.ageMax??'∞'}yrs`);
  if (f.priorityList.length)   parts.push(`priority: ${f.priorityList.join(', ')}`);
  if (f.flagsList.length)      parts.push(`flags: ${f.flagsList.join(', ')}`);
  if (f.synopticIds.length)    parts.push(`synoptic: ${f.synopticIds.map(id=>ALL_SYNOPTICS.find(t=>t.id===id)?.organ??id).join(', ')}`);
  if (f.pathologistIds.length) parts.push(`pathologist: ${f.pathologistIds.map(id=>pathologists.find(u=>u.id===id)?.name??id).join(', ')}`);
  if (f.attendingIds.length)   parts.push(`attending: ${f.attendingIds.map(id=>attendings.find(u=>u.id===id)?.name??id).join(', ')}`);
  return parts.length===0 ? 'Showing all cases' : 'Showing cases with '+parts.join(' · ');
>>>>>>> upstream/main
};

// â”€â”€â”€ Virtual scroll wrapper removed â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// WorklistTable manages its own internal scroll and incremental row loading.
// Passing cases directly is sufficient.

// â”€â”€â”€ Sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const Chip: React.FC<{ label: string; onRemove: () => void; title?: string; accent?: string }> = ({ label, onRemove, title, accent='#0891B2' }) => (
<<<<<<< HEAD
  <span title={title} style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:999,
    background:`${accent}33`, border:`1px solid ${accent}80`, fontSize:11, color:'#e2e8f0', cursor:'default' }}>
    {label}
    <button type="button" onClick={e=>{ e.preventDefault(); e.stopPropagation(); onRemove(); }} style={{ border:'none', background:'transparent', color:'#94a3b8', cursor:'pointer', fontSize:14, lineHeight:1, padding:0, display:'flex', alignItems:'center' }}
      onMouseEnter={e=>e.currentTarget.style.color='#f1f5f9'} onMouseLeave={e=>e.currentTarget.style.color='#94a3b8'}>Ã—</button>
=======
  <span title={title} className="ps-searchpage-chip" style={{ '--accent': accent } as React.CSSProperties}>
    {label}
    <button type="button" onClick={e=>{ e.preventDefault(); e.stopPropagation(); onRemove(); }} className="ps-searchpage-chip-remove">×</button>
>>>>>>> upstream/main
  </span>
);

const CheckPill: React.FC<{ label: string; checked: boolean; onChange: () => void; accent?: string }> = ({ label, checked, onChange, accent='#0891B2' }) => (
<<<<<<< HEAD
  <button type="button" onClick={onChange} style={{
    display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:999,
    cursor:'pointer', fontSize:11, fontWeight:500, transition:'all 0.15s', whiteSpace:'nowrap' as const,
    background: checked ? `${accent}22` : 'rgba(15,23,42,0.5)',
    border:`1px solid ${checked ? accent : 'rgba(148,163,184,0.2)'}`,
    color: checked ? '#f1f5f9' : '#cbd5e1',
  }}>
    <span style={{ width:7, height:7, borderRadius:'50%', flexShrink:0, background:checked?accent:'transparent', border:`1.5px solid ${checked?accent:'#64748b'}` }} />
=======
  <button type="button" onClick={onChange}
    className={`ps-searchpage-checkpill${checked ? ' ps-searchpage-checkpill--checked' : ''}`}
    style={{ '--accent': accent } as React.CSSProperties}
  >
    <span className={`ps-searchpage-checkpill-dot${checked ? ' ps-searchpage-checkpill-dot--checked' : ''}`} />
>>>>>>> upstream/main
    {label}
  </button>
);

// SectionLabel: clear by default, vivid cyan when active
const SectionLabel: React.FC<{ title: string; active?: boolean }> = ({ title, active=false }) => (
<<<<<<< HEAD
  <div style={{
    fontSize:10, fontWeight:700, textTransform:'uppercase' as const, letterSpacing:'0.7px',
    color: active ? '#7dd3fc' : '#94a3b8',
    transition:'color 0.15s',
  }}>{title}</div>
);

// Browse button â€” opens lookup modal, sits inline with input
const BrowseBtn: React.FC<{ onClick: () => void; count?: number }> = ({ onClick, count }) => (
  <button type="button" onClick={onClick} style={{
    display:'inline-flex', alignItems:'center', gap:3, padding:'5px 10px', borderRadius:7,
    border:'1px solid rgba(8,145,178,0.45)', background:'rgba(8,145,178,0.08)',
    color:'#7dd3fc', fontSize:11, fontWeight:600, cursor:'pointer', transition:'all 0.15s',
    whiteSpace:'nowrap' as const, flexShrink:0,
  }}
    onMouseEnter={e=>{e.currentTarget.style.background='rgba(8,145,178,0.18)'; e.currentTarget.style.borderColor='rgba(8,145,178,0.7)';}}
    onMouseLeave={e=>{e.currentTarget.style.background='rgba(8,145,178,0.08)'; e.currentTarget.style.borderColor='rgba(8,145,178,0.45)';}}>
=======
  <div className={`ps-searchpage-section-label${active ? ' ps-searchpage-section-label--active' : ''}`}>{title}</div>
);

// Browse button ”” opens lookup modal, sits inline with input
const BrowseBtn: React.FC<{ onClick: () => void; count?: number }> = ({ onClick, count }) => (
  <button type="button" onClick={onClick} className="ps-searchpage-browse-btn">
>>>>>>> upstream/main
    {count ? `Browse (${count})` : 'Browse'}
  </button>
);

<<<<<<< HEAD
const DROPDOWN_STYLE: React.CSSProperties = {
  position:'absolute', top:'100%', left:0, right:0, marginTop:3,
  background:'#020617', borderRadius:8, border:'1px solid rgba(148,163,184,0.35)',
  maxHeight:180, overflowY:'auto', zIndex:60, boxShadow:'0 8px 24px rgba(0,0,0,0.7)',
};
const DROP_BTN: React.CSSProperties = {
  width:'100%', textAlign:'left', padding:'6px 10px',
  border:'none', background:'transparent', color:'#e5e7eb', fontSize:12, cursor:'pointer',
};
=======
const DROPDOWN_CLASS = 'ps-searchpage-dropdown';
const DROP_BTN_CLASS = 'ps-searchpage-dropdown-btn';
>>>>>>> upstream/main

// â”€â”€â”€ LookupModal and content components imported from Common/LookupModal â”€â”€â”€â”€â”€â”€
// LookupModal, LookupSearch, LookupItem, LookupSection, LookupEmpty

<<<<<<< HEAD
// â”€â”€â”€ Synoptic lookup content (local â€” synoptics are search-page-specific) â”€â”€â”€â”€â”€
=======
// â”€â”€â”€ Synoptic lookup content (local ”” synoptics are search-page-specific) â”€â”€â”€â”€â”€
>>>>>>> upstream/main

const SynopticLookupContent: React.FC<{ selected: string[]; onToggle: (id: string) => void }> = ({ selected, onToggle }) => {
  const [q, setQ] = useState('');
  const categories = Array.from(new Set(ALL_SYNOPTICS.map(s => s.category)));
  const filtered = q.length < 1 ? ALL_SYNOPTICS : ALL_SYNOPTICS.filter(s =>
    s.name.toLowerCase().includes(q.toLowerCase()) || s.organ.toLowerCase().includes(q.toLowerCase())
  );
  return (
    <>
<<<<<<< HEAD
      <LookupSearch value={q} onChange={setQ} placeholder="Search protocolsâ€¦" />
=======
      <LookupSearch value={q} onChange={setQ} placeholder="Search protocols…" />
>>>>>>> upstream/main
      {q.length < 1
        ? categories.map(cat => {
            const items = ALL_SYNOPTICS.filter(s => s.category === cat);
            return (
              <div key={cat}>
                <LookupSection label={cat} count={items.length} />
<<<<<<< HEAD
                <div style={{ display:'flex', flexWrap:'wrap', gap:5, padding:'8px 24px' }}>
                  {items.map(s => {
                    const sel = selected.includes(s.id);
                    return (
                      <button key={s.id} type="button" onClick={() => onToggle(s.id)} style={{
                        padding:'5px 12px', borderRadius:999, cursor:'pointer', fontSize:12, fontWeight:500,
                        background: sel ? 'rgba(8,145,178,0.2)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${sel ? '#0891B2' : 'rgba(255,255,255,0.1)'}`,
                        color: sel ? '#7dd3fc' : '#94a3b8', transition:'all 0.12s',
                      }}>{s.organ}</button>
=======
                <div className="ps-searchpage-organ-grid">
                  {items.map(s => {
                    const sel = selected.includes(s.id);
                    return (
                      <button key={s.id} type="button" onClick={() => onToggle(s.id)}
                        className={`ps-searchpage-organ-pill${sel ? ' ps-searchpage-organ-pill--selected' : ''}`}
                      >{s.organ}</button>
>>>>>>> upstream/main
                    );
                  })}
                </div>
              </div>
            );
          })
        : <>
            {filtered.length === 0
              ? <LookupEmpty query={q} />
              : filtered.map(s => (
                  <LookupItem key={s.id} selected={selected.includes(s.id)} onToggle={() => onToggle(s.id)}
                    primary={s.name} secondary={s.category} />
                ))
            }
          </>
      }
    </>
  );
};

// â”€â”€â”€ User lookup content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const UserLookupContent: React.FC<{ users: UserStub[]; selected: string[]; onToggle: (id: string) => void; accent?: string }> = ({ users, selected, onToggle, accent='#0891B2' }) => {
  const [nameQ,   setNameQ]   = useState('');
  const [clientQ, setClientQ] = useState('');

  const filtered = users.filter(u => {
    const matchName   = nameQ.length   < 1 || u.name.toLowerCase().includes(nameQ.toLowerCase());
    const matchClient = clientQ.length < 1 || u.client.toLowerCase().includes(clientQ.toLowerCase());
    return matchName && matchClient;
  });

<<<<<<< HEAD
  const initials = (name: string) => name.replace('Dr. ','').split(' ').map(w => w[0]).join('').slice(0,2);

  return (
    <>
      <div style={{ display:'flex', gap:8, padding:'12px 24px 4px' }}>
        <input
          value={nameQ} onChange={e => setNameQ(e.target.value)}
          placeholder="Search by nameâ€¦"
          style={{ flex:1, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:8, padding:'7px 12px', fontSize:13, color:'#f1f5f9', outline:'none' }}
        />
        <input
          value={clientQ} onChange={e => setClientQ(e.target.value)}
          placeholder="Search by hospitalâ€¦"
          style={{ flex:1, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:8, padding:'7px 12px', fontSize:13, color:'#f1f5f9', outline:'none' }}
=======
  const initials = (name: string) => { const p = name.replace(/^(Dr|Mr|Ms|Mrs|Prof|Mx)\.\s*/i,'').split(' ').filter(Boolean); return p.length>=2?(p[0][0]+p[p.length-1][0]).toUpperCase():p[0]?.[0]?.toUpperCase()??'?'; };

  return (
    <>
      <div className="ps-searchpage-user-search-row">
        <input
          value={nameQ} onChange={e => setNameQ(e.target.value)}
          placeholder="Search by name…"
          className="ps-searchpage-user-search-input"
        />
        <input
          value={clientQ} onChange={e => setClientQ(e.target.value)}
          placeholder="Search by hospital…"
          className="ps-searchpage-user-search-input"
>>>>>>> upstream/main
        />
      </div>
      {filtered.length === 0
        ? <LookupEmpty query={nameQ || clientQ} />
        : filtered.map(u => {
            const sel = selected.includes(u.id);
            return (
              <LookupItem key={u.id} selected={sel} onToggle={() => onToggle(u.id)}
                primary={u.name}
                secondary={u.client}
                badge={initials(u.name)}
                badgeColor={accent}
              />
            );
          })
      }
    </>
  );
};

// â”€â”€â”€ Flags lookup content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

<<<<<<< HEAD
const FlagsLookupContent: React.FC<{ selected: string[]; onToggle: (f: string) => void }> = ({ selected, onToggle }) => {
  const [q, setQ] = useState('');
  const filtered = q.length < 1 ? ALL_FLAGS : ALL_FLAGS.filter(f => f.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <LookupSearch value={q} onChange={setQ} placeholder="Search flagsâ€¦" />
      <div style={{ display:'flex', flexWrap:'wrap', gap:6, padding:'4px 24px 20px' }}>
=======
const FlagsLookupContent: React.FC<{ flags: string[]; selected: string[]; onToggle: (f: string) => void }> = ({ flags, selected, onToggle }) => {
  const [q, setQ] = useState('');
  const filtered = q.length < 1 ? flags : flags.filter(f => f.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <LookupSearch value={q} onChange={setQ} placeholder="Search flags…" />
      <div className="ps-searchpage-flag-grid">
>>>>>>> upstream/main
        {filtered.length === 0
          ? <LookupEmpty query={q} />
          : filtered.map(f => {
              const sel = selected.includes(f);
              return (
<<<<<<< HEAD
                <button key={f} type="button" onClick={() => onToggle(f)} style={{
                  padding:'6px 14px', borderRadius:999, cursor:'pointer', fontSize:12, fontWeight:500,
                  background: sel ? 'rgba(245,158,11,0.18)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${sel ? '#f59e0b' : 'rgba(255,255,255,0.1)'}`,
                  color: sel ? '#fbbf24' : '#94a3b8', transition:'all 0.12s',
                }}>{f}</button>
=======
                <button key={f} type="button" onClick={() => onToggle(f)}
                  className={`ps-searchpage-flag-pill${sel ? ' ps-searchpage-flag-pill--selected' : ''}`}
                >{f}</button>
>>>>>>> upstream/main
              );
            })
        }
      </div>
    </>
  );
};

// â”€â”€â”€ Specimen lookup content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const SPECIMEN_TYPES = [
  'Biopsy','Resection','Excision','Cytology','FNA',
  'Molecular','Gross Only','Consult','Autopsy','Other',
] as const;

const SPECIMEN_TYPE_COLOURS: Record<string, string> = {
  'Biopsy':     '#0891B2',
  'Resection':  '#6366F1',
  'Excision':   '#8B5CF6',
  'Cytology':   '#10B981',
  'FNA':        '#F59E0B',
  'Molecular':  '#EC4899',
  'Gross Only': '#64748b',
  'Consult':    '#F97316',
  'Autopsy':    '#EF4444',
  'Other':      '#94a3b8',
};

<<<<<<< HEAD
=======
const CompFlagsLookupContent: React.FC<{ flags: string[]; selected: string[]; onToggle: (f: string) => void }> = ({ flags, selected, onToggle }) => {
  const [q, setQ] = useState('');
  const filtered = flags.filter(f => q.length < 1 || f.toLowerCase().includes(q.toLowerCase()));
  const abbr = (name: string) => name.replace(/[^A-Z0-9]/g,'').slice(0,3) || name.slice(0,2).toUpperCase();
  return (
    <>
      <div className="ps-searchpage-client-search-wrap">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by test name…"
          className="ps-searchpage-client-search-input" />
      </div>
      {filtered.length === 0
        ? <LookupEmpty query={q} />
        : filtered.map(f => {
            const sel = selected.includes(f);
            return (
              <LookupItem key={f} selected={sel} onToggle={() => onToggle(f)}
                primary={f}
                secondary="Computational / LIS flag"
                badge={abbr(f)}
                badgeColor="#0891b2"
              />
            );
          })
      }
    </>
  );
};

const ClientLookupContent: React.FC<{ clients: UserStub[]; selected: string[]; onToggle: (id: string) => void }> = ({ clients, selected, onToggle }) => {
  const [nameQ, setNameQ] = useState('');
  const filtered = clients.filter(c =>
    nameQ.length < 1 || c.name.toLowerCase().includes(nameQ.toLowerCase())
  );
  const abbr = (name: string) => name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0,2).toUpperCase();
  return (
    <>
      <div className="ps-searchpage-client-search-wrap">
        <input value={nameQ} onChange={e => setNameQ(e.target.value)} placeholder="Search by facility name…"
          className="ps-searchpage-client-search-input" />
      </div>
      {filtered.length === 0
        ? <LookupEmpty query={nameQ} />
        : filtered.map(c => {
            const sel = selected.includes(c.id);
            return (
              <LookupItem key={c.id} selected={sel} onToggle={() => onToggle(c.id)}
                primary={c.name}
                secondary={c.id.toUpperCase()}
                badge={abbr(c.name)}
                badgeColor="#8b5cf6"
              />
            );
          })
      }
    </>
  );
};

>>>>>>> upstream/main
const SpecimenLookupContent: React.FC<{
  specimens: SpecimenEntry[];
  selected:  string[];
  onToggle:  (name: string) => void;
}> = ({ specimens, selected, onToggle }) => {
  const [q,          setQ]          = useState('');
  const [pinnedType, setPinnedType] = useState<string | null>(null);

  const active = specimens.filter(s => s.active);
  const typesInUse = SPECIMEN_TYPES.filter(t => active.some(s => s.type === t));

  // Results driven by search query (no pill filter applied yet)
  const searched = (() => {
    if (q.trim().length < 1) return active;
    const lq = q.trim().toLowerCase();
    return active.filter(s =>
      s.name?.toLowerCase().includes(lq) ||
      s.normalizedLabel?.toLowerCase().includes(lq) ||
      (s.synonyms ?? []).some(syn => syn?.toLowerCase().includes(lq)) ||
      s.type?.toLowerCase().includes(lq) ||
      s.subspecialty?.toLowerCase().includes(lq)
    );
  })();

<<<<<<< HEAD
  // Which types have results right now â€” drives pill highlight
  const matchedTypes = new Set(searched.map(s => s.type));

  // Final display â€” apply pinned filter on top if set
=======
  // Which types have results right now ”” drives pill highlight
  const matchedTypes = new Set(searched.map(s => s.type));

  // Final display ”” apply pinned filter on top if set
>>>>>>> upstream/main
  const displayed = pinnedType ? searched.filter(s => s.type === pinnedType) : searched;

  return (
    <>
<<<<<<< HEAD
      <LookupSearch value={q} onChange={setQ} placeholder="Search by name, procedure, site, or synonymâ€¦" />

      {/* Pills â€” always single row, horizontal scroll, highlight = has results */}
      <div style={{ display:'flex', flexWrap:'nowrap', overflowX:'auto', gap:5, padding:'4px 24px 12px',
        borderBottom:'1px solid rgba(255,255,255,0.06)',
        scrollbarWidth:'none', msOverflowStyle:'none' } as React.CSSProperties}>
=======
      <LookupSearch value={q} onChange={setQ} placeholder="Search by name, procedure, site, or synonym…" />

      {/* Pills ”” always single row, horizontal scroll, highlight = has results */}
      <div className="ps-searchpage-type-pills">
>>>>>>> upstream/main
        {(['All', ...typesInUse] as const).map(t => {
          const isAll    = t === 'All';
          const colour   = isAll ? '#0891B2' : SPECIMEN_TYPE_COLOURS[t] ?? '#94a3b8';
          const isPinned = isAll ? pinnedType === null : pinnedType === t;
          const hasMatch = isAll ? searched.length > 0 : matchedTypes.has(t);
          const isLit    = hasMatch && (q.trim().length >= 1); // feedback mode when searching
<<<<<<< HEAD
          return (
            <button key={t} type="button"
              onClick={() => setPinnedType(isAll ? null : (pinnedType === t ? null : t))}
              style={{
                flexShrink: 0,
                padding:'4px 12px', borderRadius:999, fontSize:12, fontWeight:600, cursor:'pointer',
                transition:'all 0.15s',
                background: isPinned || isLit ? `${colour}25` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${isPinned || isLit ? colour : 'rgba(255,255,255,0.1)'}`,
                color: isPinned || isLit ? colour : q.trim().length >= 1 && !hasMatch ? 'rgba(148,163,184,0.35)' : '#94a3b8',
                opacity: q.trim().length >= 1 && !hasMatch && !isAll ? 0.4 : 1,
              }}>
=======
          const accentActive = isPinned || isLit;
          const noMatchFade  = !accentActive && q.trim().length >= 1 && !hasMatch;
          const dimmed       = q.trim().length >= 1 && !hasMatch && !isAll;
          return (
            <button key={t} type="button"
              onClick={() => setPinnedType(isAll ? null : (pinnedType === t ? null : t))}
              className={`ps-searchpage-type-pill${accentActive ? ' ps-searchpage-type-pill--lit' : ''}${noMatchFade ? ' ps-searchpage-type-pill--faded' : ''}${dimmed ? ' ps-searchpage-type-pill--dim' : ''}`}
              style={{ '--accent': colour } as React.CSSProperties}
            >
>>>>>>> upstream/main
              {t}
            </button>
          );
        })}
      </div>

      {displayed.length === 0
        ? <LookupEmpty query={q || pinnedType || ''} />
        : displayed.map(s => {
            const colour = SPECIMEN_TYPE_COLOURS[s.type] ?? '#94a3b8';
            return (
              <LookupItem
                key={s.id}
                selected={selected.includes(s.name)}
                onToggle={() => onToggle(s.name)}
                primary={s.name}
                secondary={s.subspecialty}
                badge={s.type}
                badgeColor={colour}
              />
            );
          })
      }
    </>
  );
};

<<<<<<< HEAD
// â”€â”€â”€ Unified ICD modal â€” tabs shown only if active in config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
=======
// â”€â”€â”€ Unified ICD modal ”” tabs shown only if active in config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
>>>>>>> upstream/main

type IcdTab = 'ICD-10' | 'ICD-11' | 'ICD-O-topography' | 'ICD-O-morphology';

const IcdModalContent: React.FC<{
  selected:    ClinicalCode[];
  onToggle:    (c: ClinicalCode) => void;
  icd10Active: boolean;
  icd11Active: boolean;
  icdoActive:  boolean;
}> = ({ selected, onToggle, icd10Active, icd11Active, icdoActive }) => {
  const allTabs: { id: IcdTab; label: string; active: boolean }[] = [
    { id:'ICD-10',           label:'ICD-10',           active: icd10Active },
    { id:'ICD-11',           label:'ICD-11',           active: icd11Active },
    { id:'ICD-O-topography', label:'ICD-O  Site',      active: icdoActive  },
    { id:'ICD-O-morphology', label:'ICD-O  Morphology',active: icdoActive  },
  ];
  const visibleTabs = allTabs.filter(t => t.active);
  const [tab, setTab] = useState<IcdTab>(() => visibleTabs[0]?.id ?? 'ICD-10');

  // If active tabs change and current tab is gone, reset to first visible
  useEffect(() => {
    if (!visibleTabs.some(t => t.id === tab)) {
      const first = visibleTabs[0];
      if (first) setTab(first.id);
    }
<<<<<<< HEAD
  }, [icd10Active, icd11Active, icdoActive]);

  if (visibleTabs.length === 0) {
    return (
      <div style={{ padding:'48px 24px', textAlign:'center', color:'#64748b', fontSize:14 }}>
        No ICD systems are enabled.<br />
        <span style={{ fontSize:12 }}>Enable them in Configuration â†’ System Settings.</span>
=======
  }, [icd10Active, icd11Active, icdoActive, tab, visibleTabs]);

  if (visibleTabs.length === 0) {
    return (
      <div className="ps-searchpage-icd-empty">
        No ICD systems are enabled.<br />
        <span className="ps-searchpage-icd-empty-sub">Enable them in Configuration → System Settings.</span>
>>>>>>> upstream/main
      </div>
    );
  }

  return (
    <>
<<<<<<< HEAD
      {/* Tab bar â€” only shows active systems */}
      <div style={{ display:'flex', gap:2, padding:'12px 24px 0', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
        {visibleTabs.map(t => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)} style={{
            padding:'7px 16px', border:'none', borderRadius:'8px 8px 0 0',
            fontSize:13, fontWeight:600, cursor:'pointer', transition:'all 0.15s',            background: tab === t.id ? 'rgba(8,145,178,0.15)' : 'transparent',
            color: tab === t.id ? '#7dd3fc' : '#94a3b8',
            borderBottom: `2px solid ${tab === t.id ? '#0891B2' : 'transparent'}`,
          }}>
=======
      {/* Tab bar ”” only shows active systems */}
      <div className="ps-searchpage-icd-tabbar">
        {visibleTabs.map(t => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className={`ps-searchpage-icd-tab${tab === t.id ? ' ps-searchpage-icd-tab--active' : ''}`}
          >
>>>>>>> upstream/main
            {t.label}
          </button>
        ))}
      </div>
      <CodeLookupContent system={tab} selected={selected} onToggle={onToggle} />
    </>
  );
};


<<<<<<< HEAD
// â”€â”€â”€ SNOMED CT modal â€” Big Four axes as tabs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
=======
// â”€â”€â”€ SNOMED CT modal ”” Big Four axes as tabs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
>>>>>>> upstream/main

type SnomedAxis = 'Morphology' | 'Body Structure' | 'Procedure' | 'Specimen';

const SNOMED_AXIS_META: { id: SnomedAxis; label: string; accent: string; placeholder: string }[] = [
<<<<<<< HEAD
  { id:'Morphology',     label:'Morphology',     accent:'#8B5CF6', placeholder:'Search pathological changesâ€¦ e.g. adenocarcinoma' },
  { id:'Body Structure', label:'Body Structure',  accent:'#0891B2', placeholder:'Search anatomical sitesâ€¦ e.g. breast, colon'     },
  { id:'Procedure',      label:'Procedure',       accent:'#10B981', placeholder:'Search diagnostic actsâ€¦ e.g. biopsy, resection'  },
  { id:'Specimen',       label:'Specimen',        accent:'#F59E0B', placeholder:'Search specimen typesâ€¦ e.g. core needle, smear'  },
=======
  { id:'Morphology',     label:'Morphology',     accent:'#8B5CF6', placeholder:'Search pathological changes… e.g. adenocarcinoma' },
  { id:'Body Structure', label:'Body Structure',  accent:'#0891B2', placeholder:'Search anatomical sites… e.g. breast, colon'     },
  { id:'Procedure',      label:'Procedure',       accent:'#10B981', placeholder:'Search diagnostic acts… e.g. biopsy, resection'  },
  { id:'Specimen',       label:'Specimen',        accent:'#F59E0B', placeholder:'Search specimen types… e.g. core needle, smear'  },
>>>>>>> upstream/main
];

const SnomedAxisContent: React.FC<{
  axis:     SnomedAxis;
  selected: ClinicalCode[];
  onToggle: (c: ClinicalCode) => void;
}> = ({ axis, selected, onToggle }) => {
  const [q,        setQ]        = useState('');
  const [allCodes, setAllCodes] = useState<ClinicalCode[]>([]);
  const [loading,  setLoading]  = useState(true);

  const meta = SNOMED_AXIS_META.find(m => m.id === axis)!;

  // Reset search when axis tab changes
  useEffect(() => { setQ(''); }, [axis]);

<<<<<<< HEAD
  // Load full axis set once â€” client-side search, no re-fetch on keystroke
=======
  // Load full axis set once ”” client-side search, no re-fetch on keystroke
>>>>>>> upstream/main
  useEffect(() => {
    setLoading(true);
    codeService.search({ system:'SNOMED', category: axis })
      .then(r => { if (r.ok) setAllCodes(r.data); })
      .finally(() => setLoading(false));
  }, [axis]);

  // Stable subgroup list from the full axis set
  const subgroups = Array.from(new Set(
    allCodes.map(c => c.category?.includes('|') ? c.category.split('|')[1] : null).filter(Boolean) as string[]
  ));

<<<<<<< HEAD
  // Displayed results driven purely by search query â€” no pill filter
=======
  // Displayed results driven purely by search query ”” no pill filter
>>>>>>> upstream/main
  const isSearching = q.trim().length >= 1;
  const displayed = isSearching
    ? allCodes.filter(c =>
        c.code.toLowerCase().includes(q.toLowerCase()) ||
        c.display.toLowerCase().includes(q.toLowerCase()) ||
        c.category?.toLowerCase().includes(q.toLowerCase())
      )
    : allCodes;

<<<<<<< HEAD
  // Which subgroups have at least one match â€” drives pill highlight
=======
  // Which subgroups have at least one match ”” drives pill highlight
>>>>>>> upstream/main
  const matchedSubgroups = new Set(
    displayed.map(c => c.category?.includes('|') ? c.category.split('|')[1] : null).filter(Boolean) as string[]
  );

  return (
    <>
      <LookupSearch value={q} onChange={setQ} placeholder={meta.placeholder} />
      {loading
<<<<<<< HEAD
        ? <div style={{ padding:'32px', textAlign:'center', color:'#94a3b8', fontSize:14 }}>Loadingâ€¦</div>
        : <>
            {/* Subgroup filter pills â€” only shown while searching, clickable to narrow results */}
            {isSearching && subgroups.length > 1 && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:5,
                padding:'4px 24px 10px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                {subgroups.map(sg => {
                  const matched = matchedSubgroups.has(sg);
                  return (
                    <button key={sg} type="button" title={`Filter to ${sg}`} style={{
                      flexShrink: 0, cursor: matched ? 'pointer' : 'default',
                      padding:'3px 10px', borderRadius:999, fontSize:11, fontWeight:600,
                      border:'none', transition:'all 0.15s',
                      background: matched ? `${meta.accent}22` : 'rgba(255,255,255,0.03)',
                      outline: `1px solid ${matched ? meta.accent : 'rgba(255,255,255,0.07)'}`,
                      color: matched ? meta.accent : '#334155',
                    }}>
=======
        ? <div className="ps-searchpage-lookup-loading">Loading…</div>
        : <>
            {/* Subgroup filter pills ”” only shown while searching, clickable to narrow results */}
            {isSearching && subgroups.length > 1 && (
              <div className="ps-searchpage-subgroup-pills">
                {subgroups.map(sg => {
                  const matched = matchedSubgroups.has(sg);
                  return (
                    <button key={sg} type="button" title={`Filter to ${sg}`}
                      className={`ps-searchpage-subgroup-pill${matched ? ' ps-searchpage-subgroup-pill--matched' : ''}`}
                      style={{ '--accent': meta.accent } as React.CSSProperties}
                    >
>>>>>>> upstream/main
                      {sg}
                    </button>
                  );
                })}
              </div>
            )}
            {displayed.length === 0
              ? <LookupEmpty query={q} />
              : displayed.map(c => (
                  <LookupItem
                    key={c.code}
                    selected={selected.some(x => x.code === c.code)}
                    onToggle={() => onToggle(c)}
                    primary={c.display}
                    secondary={c.category?.split('|')[1]}
                    badge={c.code}
                    badgeColor={meta.accent}
                  />
                ))
            }
          </>
      }
    </>
  );
};

const SnomedModalContent: React.FC<{
  selected: ClinicalCode[];
  onToggle: (c: ClinicalCode) => void;
}> = ({ selected, onToggle }) => {
  const [axis, setAxis] = useState<SnomedAxis>('Morphology');

  return (
    <>
      {/* Axis tabs */}
<<<<<<< HEAD
      <div style={{ display:'flex', gap:0, padding:'12px 24px 0', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
        {SNOMED_AXIS_META.map(m => (
          <button key={m.id} type="button" onClick={() => setAxis(m.id)} style={{
            padding:'7px 18px', border:'none', borderRadius:'8px 8px 0 0',
            fontSize:13, fontWeight:600, cursor:'pointer', transition:'all 0.15s',
            background: axis === m.id ? `${m.accent}18` : 'transparent',
            color: axis === m.id ? m.accent : '#94a3b8',
            borderBottom: `2px solid ${axis === m.id ? m.accent : 'transparent'}`,
          }}>
=======
      <div className="ps-searchpage-axis-tabbar">
        {SNOMED_AXIS_META.map(m => (
          <button key={m.id} type="button" onClick={() => setAxis(m.id)}
            className={`ps-searchpage-axis-tab${axis === m.id ? ' ps-searchpage-axis-tab--active' : ''}`}
            style={{ '--accent': m.accent } as React.CSSProperties}
          >
>>>>>>> upstream/main
            {m.label}
          </button>
        ))}
      </div>
      <SnomedAxisContent axis={axis} selected={selected} onToggle={onToggle} />
    </>
  );
};



const CodeLookupContent: React.FC<{
  system:   CodeModalSystem;
  selected: ClinicalCode[];
  onToggle: (c: ClinicalCode) => void;
}> = ({ system, selected, onToggle }) => {
  const [q, setQ] = useState('');
  const [codes, setCodes] = useState<ClinicalCode[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [allCodes,    setAllCodes]    = useState<ClinicalCode[]>([]); // stable full set for pill labels

  const svcSystem  = system === 'SNOMED' ? 'SNOMED' : system === 'ICD-11' ? 'ICD-11' : system.startsWith('ICD-O') ? 'ICD-O' : 'ICD-10';
  const svcSubtype = system === 'ICD-O-topography' ? 'topography' : system === 'ICD-O-morphology' ? 'morphology' : undefined;
  const accent     = system === 'SNOMED' ? '#0891B2' : system === 'ICD-11' ? '#F59E0B' : system.startsWith('ICD-O') ? '#10B981' : '#8B5CF6';

  // Load full set once for stable pill labels
  useEffect(() => {
    codeService.search({ system: svcSystem, subtype: svcSubtype })
      .then(r => { if (r.ok) setAllCodes(r.data); });
  }, [svcSystem, svcSubtype]);

  useEffect(() => {
    setLoading(true);
    codeService.search({ system: svcSystem, subtype: svcSubtype, query: q.length >= 2 ? q : undefined })
      .then(r => { if (r.ok) setCodes(r.data); })
      .finally(() => setLoading(false));
  }, [q, svcSystem, svcSubtype]);

  const allCategories  = Array.from(new Set(allCodes.map(c => c.category ?? 'Other')));
  const matchedCats    = new Set(codes.map(c => c.category ?? 'Other'));
  const isSearching    = q.trim().length >= 1;
  const [activeCat, setActiveCat] = useState<string | null>(null);

  // Apply active category filter on top of search results
  const displayed = activeCat ? codes.filter(c => (c.category ?? 'Other') === activeCat) : codes;

  return (
    <>
<<<<<<< HEAD
      <LookupSearch value={q} onChange={setQ} placeholder={`Search ${system} codes or descriptionsâ€¦`} />
      {loading
        ? <div style={{ padding:'32px', textAlign:'center', color:'#94a3b8', fontSize:14 }}>Loadingâ€¦</div>
        : <>
            {/* Category filter pills â€” clickable, wrap, highlight active/matched */}
            {allCategories.length > 1 && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:5,
                padding:'4px 24px 12px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
=======
      <LookupSearch value={q} onChange={setQ} placeholder={`Search ${system} codes or descriptions…`} />
      {loading
        ? <div className="ps-searchpage-lookup-loading">Loading…</div>
        : <>
            {/* Category filter pills ”” clickable, wrap, highlight active/matched */}
            {allCategories.length > 1 && (
              <div className="ps-searchpage-cat-pills">
>>>>>>> upstream/main
                {allCategories.map(cat => {
                  const isActive  = activeCat === cat;
                  const matched   = !isSearching || matchedCats.has(cat);
                  return (
                    <button key={cat} type="button"
                      onClick={() => setActiveCat(isActive ? null : cat)}
<<<<<<< HEAD
                      style={{
                        flexShrink: 0, cursor: 'pointer', border: 'none',
                        padding:'4px 12px', borderRadius:999, fontSize:12, fontWeight:600,
                        transition:'all 0.15s',
                        background: isActive ? accent : matched ? `${accent}22` : 'rgba(255,255,255,0.03)',
                        outline: `1px solid ${isActive ? accent : matched ? accent : 'rgba(255,255,255,0.07)'}`,
                        color: isActive ? '#0f172a' : matched ? accent : '#475569',
                        opacity: isSearching && !matched ? 0.4 : 1,
                      }}>
=======
                      className={`ps-searchpage-cat-pill${isActive ? ' ps-searchpage-cat-pill--active' : matched ? ' ps-searchpage-cat-pill--matched' : ''}${isSearching && !matched ? ' ps-searchpage-cat-pill--dim' : ''}`}
                      style={{ '--accent': accent } as React.CSSProperties}
                    >
>>>>>>> upstream/main
                      {cat}
                    </button>
                  );
                })}
              </div>
            )}
            {displayed.length === 0
              ? <LookupEmpty query={q || activeCat || ''} />
              : displayed.map(c => (
                  <LookupItem
                    key={c.code}
                    selected={selected.some(x => x.code === c.code)}
                    onToggle={() => onToggle(c)}
                    primary={c.display}
                    badge={c.code}
                    badgeColor={accent}
                  />
                ))
            }
          </>
      }
    </>
  );
};


const SearchPage: React.FC = () => {
  const navigate     = useNavigate();
  const handleLogout = useLogout();
<<<<<<< HEAD
  const { dictionary: specimenDictionary } = useSpecimenDictionary();
  const { config } = useSystemConfig();

=======
  const { user }      = useAuth();
  const { pushCrumb } = useBreadcrumb();
  const { dictionary: specimenDictionary } = useSpecimenDictionary();
  const { config } = useSystemConfig();

  // Real fix: pathologists/attendings/clients used to be hardcoded,
  // static module-scope constants (ALL_PATHOLOGISTS/ALL_ATTENDINGS/
  // ALL_CLIENTS) - see this file's own "Users" section comment for the
  // full story. Now real, live state, fetched once from the same real
  // services RoleDictionary.tsx/AccessionPage.tsx already use.
  const [pathologists, setPathologists] = useState<UserStub[]>([]);
  const [attendings, setAttendings] = useState<UserStub[]>([]);
  const [clients, setClients] = useState<UserStub[]>([]);
  useEffect(() => {
    Promise.all([userService.getAll(), physicianService.getAll(), facilityService.getAll(), subspecialtyService.getAll()]).then(
      ([userRes, physicianRes, clientRes, subsRes]) => {
        const realClients = clientRes.ok ? clientRes.data : [];
        setClients(realClients.map(c => ({ id: c.id, name: c.name, client: '' })));

        if (userRes.ok) {
          // Real fix, per direct confirmation: replaces the old
          // free-text department field — genuinely redundant with the
          // real Subspecialty dictionary, which is the actual data
          // this was standing in for.
          const allSubspecialties = subsRes.ok ? subsRes.data : [];
          setPathologists(
            userRes.data
              .filter(u => u.roles.includes('Pathologist'))
              .map(u => ({ id: u.id, name: `Dr. ${u.firstName} ${u.lastName}`, client: getStaffSubspecialtyDisplay(u.id, allSubspecialties) }))
          );
        }

        if (physicianRes.ok) {
          setAttendings(
            physicianRes.data.map(p => ({
              id: p.id,
              name: `${p.namePrefix || 'Dr.'} ${p.firstName} ${p.lastName}`,
              // A real physician can have more than one real client
              // (clientIds is plural) - joins every real, resolved
              // name rather than arbitrarily picking just the first.
              client: p.clientIds.map(cid => realClients.find(c => c.id === cid)?.name).filter(Boolean).join(', '),
            }))
          );
        }
      }
    );
  }, []);


  // Measure available height for the table container — mirrors
  // WorklistPage.tsx's identical hook exactly. That page's own comment is
  // explicit about why: this is "immune to any parent overflow/flex chain
  // issues." SearchPage previously relied purely on the CSS flex cascade
  // for the table's height, which is exactly the thing this technique
  // exists to avoid trusting — that gap, not a missing min-width/min-height
  // somewhere, was the actual cause of the table's bottom (and its
  // horizontal scrollbar, which lives at that bottom edge) rendering past
  // the visible viewport.
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const [tableHeight, setTableHeight] = useState<number>(400);
  useEffect(() => {
    const measure = () => {
      if (!wrapperRef.current) return;
      const top = wrapperRef.current.getBoundingClientRect().top;
      const available = window.innerHeight - top - 16; // 16px bottom breathing room
      setTableHeight(Math.max(200, available));
    };
    const t = setTimeout(measure, 50);
    window.addEventListener('resize', measure);
    return () => { clearTimeout(t); window.removeEventListener('resize', measure); };
  }, []);

  // Mirrors canViewPediatric's pattern (WorklistPage.tsx/WorklistTable.tsx) —
  // a Role-level flag surfaced onto the authenticated user, defaulting to
  // false. Unlike pediatric redaction (same data controller, sensitive
  // fields hidden within an otherwise-visible case), this gates visibility
  // of an entire different controller's cases (Orchestration/PathScribe vs.
  // the NHS Trust LIS) — see IRoleService.ts and CaseRouter.ts for why that
  // distinction matters for compliance, not just UI.
  const canViewOrchestration = user?.canViewOrchestration ?? false;

>>>>>>> upstream/main
  const [isLoaded,        setIsLoaded]        = useState(false);
  const [isProfileOpen,   setIsProfileOpen]   = useState(false);
  const [isResourcesOpen, setIsResourcesOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Lookup modals
  const [snomedModal,    setSnomedModal]    = useState(false);
  const [icdModal,       setIcdModal]       = useState(false);
  const [specimenModal,  setSpecimenModal]  = useState(false);
  const [synopticModal,  setSynopticModal]  = useState(false);
  const [flagsModal,     setFlagsModal]     = useState(false);
  const [pathModal,      setPathModal]      = useState(false);
  const [attendingModal, setAttendingModal] = useState(false);

  // Active section (for label intensity)
  const [activeSection, setActiveSection] = useState('');

  // Filter state
  const [patientName,  setPatientName]  = useState('');
  const [hospitalId,   setHospitalId]   = useState('');
<<<<<<< HEAD
=======
  const [patientId,    setPatientId]    = useState('');
>>>>>>> upstream/main
  const [accessionNo,  setAccessionNo]  = useState('');

  // Smart identifier box
  const [identifierQuery, setIdentifierQuery] = useState('');
<<<<<<< HEAD
  type IdentifierType = 'accession' | 'mrn' | 'name' | 'ambiguous' | null;
  const [detectedType, setDetectedType] = useState<IdentifierType>(null);

=======
  type IdentifierType = 'accession' | 'mrn' | 'mpi' | 'slide' | 'requisition' | 'name' | 'ambiguous' | null;
  const [detectedType, setDetectedType] = useState<IdentifierType>(null);

  // Enabled formats from config, falling back to library defaults
  const enabledFormats = config.identifierFormats?.formats
    ?? IDENTIFIER_FORMAT_LIBRARY.filter(f => f.enabled);

>>>>>>> upstream/main
  const detectIdentifierType = (val: string): IdentifierType => {
    if (!val.trim()) return null;
    const v = val.trim();
    try {
<<<<<<< HEAD
      if (new RegExp(config.identifierFormats.accessionPattern, 'i').test(normalizeAccession(v, config.identifierFormats.accessionPattern))) return 'accession';
      if (new RegExp(config.identifierFormats.mrnPattern).test(v))            return 'mrn';
    } catch { /* invalid regex in config â€” fall through */ }
    // Name heuristic: contains space or comma, OR is a single alphabetic-only word
    const alphaRatio = (v.match(/[a-zA-Z]/g)?.length ?? 0) / v.length;
    if (alphaRatio > 0.6) return 'name'; // pure alphabetic = treat as name
=======
      // Slide barcodes first — trigger direct case navigation
      const slideMatch = enabledFormats.find(
        f => f.kind === 'slide' && f.enabled && f.tier === 1 &&
             new RegExp(f.pattern).test(v)
      );
      if (slideMatch) return 'slide';

      // Master Patient Index id — internally generated by this app
      // (services/patients/mockPatientIndexService.ts), always PID-
      // prefixed, so unlike MRN/accession/requisition this doesn't vary
      // by jurisdiction or external source system and doesn't need to
      // go through the admin-configurable IdentifierFormat system.
      if (/^PID-/i.test(v)) return 'mpi';

      // Accession number — tests every enabled accession format, not just
      // one. Fixed June 2026: this used to test only against the single
      // derived config.identifierFormats.accessionPattern, which silently
      // ignored any additional accession format an admin had enabled on
      // the Identifier Formats config screen (e.g. UK alongside US) —
      // same bug ScannerProvider.tsx had, same fix shape as the
      // slide/requisition detection right above/below this, which was
      // already correctly checking every enabled format.
      const accessionFormats = enabledFormats.filter(f => f.kind === 'accession' && f.enabled);
      const accessionMatch = accessionFormats.find(f => isAccession(v, f.pattern));
      if (accessionMatch) return 'accession';

      // Patient identifier (MRN / NHS / CHI / IHI etc.) — same fix.
      const mrnFormats = enabledFormats.filter(f => f.kind === 'mrn' && f.enabled);
      if (mrnFormats.some(f => new RegExp(f.pattern).test(v))) return 'mrn';

      // Requisition number
      const reqMatch = enabledFormats.find(
        f => f.kind === 'requisition' && f.enabled && new RegExp(f.pattern).test(v)
      );
      if (reqMatch) return 'requisition';

    } catch { /* invalid regex — fall through */ }

    const alphaRatio = (v.match(/[a-zA-Z]/g)?.length ?? 0) / v.length;
    if (alphaRatio > 0.6) return 'name';
>>>>>>> upstream/main
    if ((v.includes(' ') || v.includes(',')) && alphaRatio > 0.5) return 'name';
    return 'ambiguous';
  };

  const applyIdentifier = (val: string, type: IdentifierType) => {
<<<<<<< HEAD
    setPatientName('');  setHospitalId('');  setAccessionNo('');
    if (type === 'accession') setAccessionNo(normalizeAccession(val.trim(), config.identifierFormats.accessionPattern));
    else if (type === 'mrn')  setHospitalId(val.trim());
    else if (type === 'name') setPatientName(val.trim());
    else { // ambiguous â€” populate all three so the search casts wide
=======
    setPatientName(''); setHospitalId(''); setPatientId(''); setAccessionNo('');

    if (type === 'slide') {
      // 2D pipe-delimited payload (Epic Beaker etc.)
      const pipeAcc = val.match(/ACC:([^|]+)/);
      if (pipeAcc) {
        const specMatch = val.match(/SPEC:([^|]+)/);
        navigate(specMatch
          ? `/case/${pipeAcc[1]}/synoptic?specimen=${specMatch[1]}`
          : `/case/${pipeAcc[1]}/synoptic`);
        return;
      }
      // 1D slide — extract accession (e.g. S26-4200 from S26-4200-A1-1)
      const oneD = val.match(/^([A-Za-z]{1,3}\d{2}-\d{4,6})/i);
      if (oneD) { navigate(`/case/${oneD[1]}/synoptic`); return; }
      setAccessionNo(val.trim());
      return;
    }

    if (type === 'accession') {
      // Try each enabled accession format's own pattern for hyphen
      // normalization until one actually matches — a UK-shaped value
      // (SP26-4200, 1-2 letter prefix) won't normalize correctly against
      // the US-shaped default pattern's assumptions.
      const accessionFormats = enabledFormats.filter(f => f.kind === 'accession' && f.enabled);
      const normalized = accessionFormats
        .map(f => normalizeAccession(val.trim(), f.pattern))
        .find(n => accessionFormats.some(f => new RegExp(f.pattern, 'i').test(n)))
        ?? normalizeAccession(val.trim(), config.identifierFormats.accessionPattern);
      setAccessionNo(normalized);
    }
    else if (type === 'mrn')         setHospitalId(val.trim());
    else if (type === 'mpi')         setPatientId(val.trim());
    else if (type === 'name')        setPatientName(val.trim());
    else if (type === 'requisition') setAccessionNo(val.trim());
    else {
>>>>>>> upstream/main
      setAccessionNo(val.trim());
      setHospitalId(val.trim());
      setPatientName(val.trim());
    }
  };

  const handleIdentifierChange = (val: string) => {
    setIdentifierQuery(val);
    const type = detectIdentifierType(val);
    setDetectedType(type);
    applyIdentifier(val, type);
  };

  const IDENTIFIER_BADGE: Record<NonNullable<IdentifierType>, { label: string; color: string }> = {
<<<<<<< HEAD
    accession: { label: 'Accession #',  color: '#8B5CF6' },
    mrn:       { label: 'MRN',          color: '#0891B2' },
    name:      { label: 'Patient Name', color: '#10B981' },
    ambiguous: { label: 'All fields',   color: '#F59E0B' },
  };

  const [dateFrom,     setDateFrom]     = useState(daysAgo(30));
  const [dateTo,       setDateTo]       = useState(today());
=======
    accession:   { label: 'Accession #',   color: '#8B5CF6' },
    mrn:         { label: 'MRN',           color: '#0891B2' },
    mpi:         { label: 'MPI ID',        color: '#6366F1' },
    slide:       { label: 'Slide Barcode', color: '#10B981' },
    requisition: { label: 'Requisition #', color: '#F59E0B' },
    name:        { label: 'Patient Name',  color: '#10B981' },
    ambiguous:   { label: 'All fields',    color: '#F59E0B' },
  };

  const [dateFrom,     setDateFrom]     = useState(daysAgo(30, config.facilityTimezone));
  const [dateTo,       setDateTo]       = useState(today(config.facilityTimezone));
  // Tracks which date-range shortcut (7d/30d/90d/1yr) was last clicked, if
  // any — null once the user edits a date field manually, since at that
  // point no shortcut's value is necessarily still accurate. Default '30d'
  // matches the initial dateFrom/dateTo state above exactly.
  const [activeDateRange, setActiveDateRange] = useState<string | null>('30d');
>>>>>>> upstream/main

  const [specimenQuery,       setSpecimenQuery]       = useState('');
  const [specimenList,        setSpecimenList]        = useState<string[]>([]);
  const [specimenSuggestions, setSpecimenSuggestions] = useState<string[]>([]);
  const [showSpecimenDrop,    setShowSpecimenDrop]    = useState(false);
  const specimenRef = useRef<HTMLDivElement|null>(null);

  const [diagnosisText, setDiagnosisText] = useState('');
  const [diagnosisList, setDiagnosisList] = useState<string[]>([]);

  const [snomedQuery,       setSnomedQuery]       = useState('');
  const [snomedList,        setSnomedList]        = useState<ClinicalCode[]>([]);
  const [snomedSuggestions, setSnomedSuggestions] = useState<ClinicalCode[]>([]);
  const [showSnomedDrop,    setShowSnomedDrop]    = useState(false);
  const snomedRef = useRef<HTMLDivElement|null>(null);

  const [icdQuery,       setIcdQuery]       = useState('');
  const [icdCodes,       setIcdCodes]       = useState<ClinicalCode[]>([]);
  const [icdSuggestions, setIcdSuggestions] = useState<ClinicalCode[]>([]);
  const [showIcdDrop,    setShowIcdDrop]    = useState(false);
  const icdRef = useRef<HTMLDivElement|null>(null);

  const [synopticIds,    setSynopticIds]    = useState<string[]>([]);
  const [flagsList,      setFlagsList]      = useState<string[]>([]);
  const [pathologistIds, setPathologistIds] = useState<string[]>([]);
  const [attendingIds,   setAttendingIds]   = useState<string[]>([]);
<<<<<<< HEAD
=======
  const [compFlagsList,  setCompFlagsList]  = useState<string[]>([]);
  const [clientIds,      setClientIds]      = useState<string[]>([]);
  const [compFlagsModal, setCompFlagsModal] = useState(false);
  const [clientModal,    setClientModal]    = useState(false);
>>>>>>> upstream/main
  const [submittingNames,setSubmittingNames]= useState<string[]>([]);
  const [statusList,     setStatusList]     = useState<string[]>([]);
  const [priorityList,   setPriorityList]   = useState<string[]>([]);
  // Patient Demographics
  const [genderList,     setGenderList]     = useState<string[]>([]);
  const [dobFrom,        setDobFrom]        = useState('');
  const [dobTo,          setDobTo]          = useState('');
  const [ageMin,         setAgeMin]         = useState('');
  const [ageMax,         setAgeMax]         = useState('');

  const [results,     setResults]     = useState<PathologyCase[]|null>(null);
  const [hasSearched, setHasSearched] = useState(false);
<<<<<<< HEAD
=======
  // Real, live pagination - Load More appends rather than replaces,
  // matching the cursor contract built into caseRouter.getAll() (both the
  // mock and Firestore paths now honor pageSize/cursor identically).
  const [hasMoreResults, setHasMoreResults] = useState(false);
  const [nextCursor,     setNextCursor]     = useState<string | undefined>(undefined);
  const [isLoadingMore,  setIsLoadingMore]  = useState(false);
  // Increments only on a genuine fresh search (never on Load More) - used
  // as WorklistTable's key below instead of results.length, so appending
  // more results doesn't force a full remount (which would reset the
  // table's own scroll position, sort state, and internal batching).
  const [searchGeneration, setSearchGeneration] = useState(0);

  // flagDefinitions still feeds WorklistTable/FlagManagerModal-style
  // consumers on this page; computationalFlags removed along with the
  // Sidecar it only ever fed.
  const [flagDefinitions, setFlagDefinitions] = useState<Flag[]>([]);
  useEffect(() => {
    flagService.getAll().then(res => {
      if (!res.ok) return;
      setFlagDefinitions(res.data);
    }).catch(() => {});
  }, []);
  // Real fix: ALL_FLAGS/ALL_COMP_FLAGS used to be static, hand-curated
  // name lists - confirmed directly against the real
  // services/flags/mockFlagService.ts data that many real, active flags
  // ('Malignant', 'Discordant', 'Intraoperative Consult', 'Margins
  // Involved', and more) were completely missing, so a search filtering
  // by one of those real flags had no way to select it via this picker.
  // Same bug class as the earlier ALL_ATTENDINGS fix in this same file.
  //
  // Sourced from the flag catalog (flagService.getAll()), not scraped
  // from raw case data, because that catalog is confirmed to be the
  // real, current, authoritative source: utils/flagAdapter.ts's own
  // header comment documents FlagManagerModal ("the only place flags
  // can be applied") as reading from this exact same catalog. Separate,
  // lower-priority observation, not fixed here: some older seed cases
  // (mockCaseService.ts) carry inline caseFlags/specimenFlags objects
  // predating this catalog's centralization (e.g. time-specific MDT
  // flags like "Colorectal MDT — Mon 13:00") that don't correspond to
  // any real catalog entry - legacy seed-data artifacts, not something
  // a flag applied via the current, real FlagManagerModal workflow
  // would ever produce, so not a gap this picker needs to cover.
  //
  // tagClass is documented elsewhere (IFlagService.ts) as vestigial for
  // real backend decisions, but it's still present on the data and this
  // is a presentational UI grouping (preserving the existing two-picker
  // structure), not a functional gate - flags missing tagClass default
  // to the general list rather than being silently dropped from both.
  const realFlagNames = React.useMemo(
    () => flagDefinitions.filter(f => f.status === 'Active' && f.tagClass !== 'COMPUTATIONAL').map(f => f.name),
    [flagDefinitions]
  );
  const realCompFlagNames = React.useMemo(
    () => flagDefinitions.filter(f => f.status === 'Active' && f.tagClass === 'COMPUTATIONAL').map(f => f.name),
    [flagDefinitions]
  );
  // Auto-collapses the filter sidebar after a search runs, freeing real
  // width for the results table — mirrors SynopticReportPage's
  // Sidebar.tsx collapsed/expanded pattern exactly. Set explicitly at
  // each search-trigger call site below rather than via a useEffect on
  // hasSearched, since hasSearched may already be true on a second
  // search and wouldn't re-fire a dependency-based effect.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
>>>>>>> upstream/main
  const [isSearching, setIsSearching] = useState(false);

  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(lsLoad);
  const [activeSavedId, setActiveSavedId] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [saveNameInput, setSaveNameInput] = useState('');
  const saveInputRef = useRef<HTMLInputElement|null>(null);

  // â”€â”€ Effects â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => {
    const returning = sessionStorage.getItem('pathscribe:searchReturn') === '1';
    sessionStorage.removeItem('pathscribe:searchReturn');
    if (!returning) { ssClear(); return; }
    const snap = ssLoad(); if (!snap) return;
    const f = snap.filters;
<<<<<<< HEAD
    setPatientName(f.patientName); setHospitalId(f.hospitalId); setAccessionNo(f.accessionNo);
    setDateFrom(f.dateFrom); setDateTo(f.dateTo);
    setSpecimenList(f.specimenList); setDiagnosisList(f.diagnosisList);
=======
    setPatientName(f.patientName); setHospitalId(f.hospitalId); setPatientId(f.patientId); setAccessionNo(f.accessionNo);
    setDateFrom(f.dateFrom); setDateTo(f.dateTo);
    setActiveDateRange(matchDateRangeShortcut(f.dateFrom, f.dateTo, config.facilityTimezone));
>>>>>>> upstream/main
    setSnomedList(f.snomedList); setIcdCodes(f.icdCodes);
    setSynopticIds(f.synopticIds); setFlagsList(f.flagsList);
    setPathologistIds(f.pathologistIds ?? []); setAttendingIds(f.attendingIds ?? []);
    setSubmittingNames(f.submittingNames); setStatusList(f.statusList); setPriorityList(f.priorityList);
<<<<<<< HEAD
=======
    // Restore demographics (previously omitted — back-navigation lost these filters)
    setGenderList(f.genderList ?? []);
    setDobFrom(f.dobFrom ?? '');
    setDobTo(f.dobTo ?? '');
    setAgeMin(f.ageMin !== undefined ? String(f.ageMin) : '');
    setAgeMax(f.ageMax !== undefined ? String(f.ageMax) : '');
>>>>>>> upstream/main
    setResults(snap.results); setHasSearched(snap.hasSearched);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { const t = setTimeout(()=>setIsLoaded(true), 80); return ()=>clearTimeout(t); }, []);
<<<<<<< HEAD
  useEffect(() => { lsSave(savedSearches); }, [savedSearches]);
=======
  useEffect(() => { pushCrumb('Case Search', '/search'); }, [pushCrumb]);
  useEffect(() => { lsSave(savedSearches); }, [savedSearches]);

  // Real bug fix, same pattern already found in AuditLogPage.tsx: this
  // page declared isResourcesOpen and rendered a Resources modal off it,
  // but never listened for the global PATHSCRIBE_PAGE_OPEN_RESOURCES
  // event that actually opens it elsewhere (see WorklistPage.tsx) —
  // meaning the modal had no way to ever open on this page either.
  useEffect(() => {
    const openResources = () => setIsResourcesOpen(true);
    window.addEventListener('PATHSCRIBE_PAGE_OPEN_RESOURCES', openResources);
    return () => window.removeEventListener('PATHSCRIBE_PAGE_OPEN_RESOURCES', openResources);
  }, []);
>>>>>>> upstream/main
  useEffect(() => { if (showSaveInput) saveInputRef.current?.focus(); }, [showSaveInput]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (specimenRef.current && !specimenRef.current.contains(e.target as Node)) setShowSpecimenDrop(false);
      if (snomedRef.current   && !snomedRef.current.contains(e.target as Node))   setShowSnomedDrop(false);
      if (icdRef.current      && !icdRef.current.contains(e.target as Node))      setShowIcdDrop(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (!specimenQuery || specimenQuery.length < 2) { setSpecimenSuggestions([]); setShowSpecimenDrop(false); return; }
    const q = specimenQuery.toLowerCase();
    const hits = specimenDictionary
      .filter(s => s.active && (
        (s.name?.toLowerCase() ?? '').includes(q) ||
        (s.normalizedLabel?.toLowerCase() ?? '').includes(q) ||
        (s.synonyms ?? []).some(syn => (syn?.toLowerCase() ?? '').includes(q))
      ) && !specimenList.includes(s.name))
      .map(s => s.name)
      .slice(0, 8);
    const fallback = hits.length > 0 ? hits :
      SPECIMEN_DICTIONARY.filter(s => s.toLowerCase().includes(q) && !specimenList.includes(s)).slice(0, 8);
    setSpecimenSuggestions(fallback); setShowSpecimenDrop(fallback.length > 0);
<<<<<<< HEAD
  }, [specimenQuery, specimenList]);
=======
  }, [specimenQuery, specimenList, specimenDictionary]);
>>>>>>> upstream/main

  useEffect(() => {
    if (!snomedQuery || snomedQuery.length < 2) { setSnomedSuggestions([]); setShowSnomedDrop(false); return; }
    codeService.search({ system:'SNOMED', query: snomedQuery }).then(r => {
      if (r.ok) { const hits = r.data.slice(0,6); setSnomedSuggestions(hits); setShowSnomedDrop(hits.length>0); }
    });
  }, [snomedQuery]);

  useEffect(() => {
    if (!icdQuery || icdQuery.length < 2) { setIcdSuggestions([]); setShowIcdDrop(false); return; }
    codeService.search({ system:'ICD-10', query: icdQuery }).then(r => {
      if (r.ok) { const hits = r.data.slice(0,6); setIcdSuggestions(hits); setShowIcdDrop(hits.length>0); }
    });
  }, [icdQuery]);

<<<<<<< HEAD
  useEffect(() => {
    if (!hasSearched) return; void runSearch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientName,hospitalId,accessionNo,diagnosisList,specimenList,snomedList,icdCodes,synopticIds,flagsList,pathologistIds,attendingIds,submittingNames,statusList,priorityList,dateFrom,dateTo,genderList,dobFrom,dobTo,ageMin,ageMax]);
=======
  // REMOVED: previously auto-re-ran the search on every single filter
  // change once hasSearched was true (any checkbox/dropdown edit fired a
  // real query immediately, no debounce, no confirmation step). Under
  // concurrent multi-pathologist usage that's a real backend-load concern
  // — someone adjusting several filters in sequence while deciding what
  // they actually want fires one query per click, not one query per
  // decision. "Search Cases" (handleSubmit) is now the single deliberate
  // trigger for any query, matching how the very first search already
  // worked (this effect was a no-op until hasSearched flipped true).
  // Filter state still updates instantly in the UI either way — only the
  // actual backend query is now gated behind the explicit button press.
>>>>>>> upstream/main

  // â”€â”€ Filter helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const currentFilters = (): FilterState => ({
<<<<<<< HEAD
    patientName, hospitalId, accessionNo, diagnosisList, specimenList,
    snomedList, icdCodes, synopticIds, flagsList, pathologistIds, attendingIds,
    submittingNames, statusList, priorityList, dateFrom, dateTo,
    genderList: [], dobFrom: '', dobTo: '', ageMin: undefined, ageMax: undefined,
  });

  const applyFilters = (f: FilterState) => {
    setPatientName(f.patientName); setHospitalId(f.hospitalId); setAccessionNo(f.accessionNo);
    // Restore smart identifier box from whichever field was populated
    const restored = f.accessionNo || f.patientName || f.hospitalId;
=======
    patientName, hospitalId, patientId, accessionNo, diagnosisList, specimenList,
    snomedList, icdCodes, synopticIds, flagsList, pathologistIds, attendingIds,
    submittingNames, statusList, priorityList, dateFrom, dateTo,
    // Previously hardcoded to empty — now reads actual state so session
    // snapshots and saved searches correctly preserve demographic filters.
    genderList,
    dobFrom,
    dobTo,
    ageMin: ageMin ? parseInt(ageMin, 10) : undefined,
    ageMax: ageMax ? parseInt(ageMax, 10) : undefined,
  });

  const applyFilters = (f: FilterState) => {
    setPatientName(f.patientName); setHospitalId(f.hospitalId); setPatientId(f.patientId); setAccessionNo(f.accessionNo);
    // Restore smart identifier box from whichever field was populated
    const restored = f.accessionNo || f.patientName || f.hospitalId || f.patientId;
>>>>>>> upstream/main
    setIdentifierQuery(restored);
    setDetectedType(restored ? detectIdentifierType(restored) : null);
    setDiagnosisList(f.diagnosisList); setSpecimenList(f.specimenList);
    setSnomedList(f.snomedList); setIcdCodes(f.icdCodes ?? []);
    setSynopticIds(f.synopticIds); setFlagsList(f.flagsList);
    setPathologistIds(f.pathologistIds ?? []); setAttendingIds(f.attendingIds ?? []);
    setSubmittingNames(f.submittingNames); setStatusList(f.statusList); setPriorityList(f.priorityList);
    setDateFrom(f.dateFrom); setDateTo(f.dateTo);
<<<<<<< HEAD
    setGenderList([]); setDobFrom(''); setDobTo(''); setAgeMin(''); setAgeMax('');
=======
    setActiveDateRange(matchDateRangeShortcut(f.dateFrom, f.dateTo, config.facilityTimezone));
    // Restore demographics — previously hardcoded to empty which broke saved-search round-trips
    setGenderList(f.genderList ?? []);
    setDobFrom(f.dobFrom ?? '');
    setDobTo(f.dobTo ?? '');
    setAgeMin(f.ageMin !== undefined ? String(f.ageMin) : '');
    setAgeMax(f.ageMax !== undefined ? String(f.ageMax) : '');
>>>>>>> upstream/main
  };

  const toggle = (val: string, list: string[], setter: (v: string[]) => void) =>
    list.includes(val) ? setter(list.filter(x=>x!==val)) : setter([...list, val]);

  const addSpecimen = (val: string) => {
    const v = val.trim(); if (!v) return;
    setSpecimenList(p=>p.includes(v)?p:[...p,v]); setSpecimenQuery(''); setShowSpecimenDrop(false);
  };
  const addDiagnosis = () => {
    const v = diagnosisText.trim(); if (!v) return;
    setDiagnosisList(p=>p.includes(v)?p:[...p,v]); setDiagnosisText('');
  };
  const addSnomed = (s: ClinicalCode) => {
<<<<<<< HEAD
    setSnomedList((p: any)=>p.some((x: any)=>x.code===s.code)?p:[...p,s]); setSnomedQuery(''); setShowSnomedDrop(false);
  };
  const addIcd = (s: ClinicalCode) => {
    setIcdCodes((p: any)=>p.some((x: any)=>x.code===s.code)?p:[...p,s]); setIcdQuery(''); setShowIcdDrop(false);
  };

  const runSearch = async () => {
    setIsSearching(true);
    const params: CaseFilterParams = {
      patientName,
      hospitalId,
      accessionNo,
      diagnosisList,
      specimenList,
      snomedCodes:    snomedList.map(s => s.display),
      icdCodes:       icdCodes.map(s => s.display),
      statusList:     statusList as CaseFilterParams['statusList'],
      priorityList:   priorityList as CaseFilterParams['priorityList'],
      genderList:     genderList.length ? genderList as CaseFilterParams['genderList'] : undefined,
      dobFrom:        dobFrom || undefined,
      dobTo:          dobTo   || undefined,
      ageMin:         ageMin  ? parseInt(ageMin)  : undefined,
      ageMax:         ageMax  ? parseInt(ageMax)  : undefined,
    };
    const result = await caseService.getAll(params);
    if (result.ok) {
      setResults(result.data);
      ssSave({ filters: currentFilters(), results: result.data, hasSearched: true });
    }
    setIsSearching(false);
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); setHasSearched(true); void runSearch(); };

  const handleClear = () => {
    setPatientName(''); setHospitalId(''); setAccessionNo('');
=======
    setSnomedList(p=>p.some(x=>x.code===s.code)?p:[...p,s]); setSnomedQuery(''); setShowSnomedDrop(false);
  };
  const addIcd = (s: ClinicalCode) => {
    setIcdCodes(p=>p.some(x=>x.code===s.code)?p:[...p,s]); setIcdQuery(''); setShowIcdDrop(false);
  };

  const runSearch = async (loadMore = false) => {
    if (loadMore) setIsLoadingMore(true); else { setIsSearching(true); setSearchGeneration(g => g + 1); }
    try {
      const params: CaseFilterParams = {
        patientName,
        hospitalId,
        patientId,
        accessionNo,
        dateFrom:            dateFrom || undefined,
        dateTo:              dateTo   || undefined,
        diagnosisList,
        specimenList,
        // Pass codes (not display text) so service can match c.coding.snomed / c.coding.icd10
        snomedCodes:         snomedList.map(s => s.code),
        icdCodes:            icdCodes.map(s => s.code),
        statusList:          statusList  as CaseFilterParams['statusList'],
        priorityList:        priorityList as CaseFilterParams['priorityList'],
        genderList:          genderList.length ? genderList as CaseFilterParams['genderList'] : undefined,
        dobFrom:             dobFrom || undefined,
        dobTo:               dobTo   || undefined,
        ageMin:              ageMin  ? parseInt(ageMin, 10)  : undefined,
        ageMax:              ageMax  ? parseInt(ageMax, 10)  : undefined,
        clientIds:           clientIds.length      ? clientIds      : undefined,
        // Previously omitted — these are the filters that were being tracked in state but never sent
        flagIds:             flagsList.length      ? flagsList      : undefined,
        pathologistIds:      pathologistIds.length ? pathologistIds : undefined,
        // Resolve p01 → 'breast_invasive' templateId before passing so service can match synopticReports
        synopticProtocolIds: synopticIds.length
          ? synopticIds.map(id => ALL_SYNOPTICS.find(t => t.id === id)?.templateId ?? '').filter(Boolean)
          : undefined,
        // Pass full provider names (not att-1 IDs) — service matches c.order.requestingProvider
        ...(attendingIds.length && {
          attendingNames: attendingIds
            .map(id => attendings.find(u => u.id === id)?.name ?? '')
            .filter(Boolean) as string[],
        }),
        pageSize: SEARCH_PAGE_SIZE,
        cursor: loadMore ? nextCursor : undefined,
      };
      const result = await caseRouter.getAll(params, {
        includeOrchestration: canViewOrchestration,
        userId: user?.id,
      });
      if (result.ok) {
        const filteredData = compFlagsList.length > 0
          ? result.data.filter((c: PathologyCase) =>
              compFlagsList.some(code =>
                (c.specimenFlags ?? []).some(sf =>
                  // Real fix: SpecimenFlag's real field is `.label`, not
                  // `.name` — that comparison was checking a property that
                  // doesn't exist on the type (only caught once the `any`
                  // cast masking it was removed). `compFlagsList` holds
                  // catalog Flag.name values, so `.label` is the actual
                  // field that was supposed to match them; `.lisCode`/`.id`
                  // kept as-is in case either coincidentally matches too.
                  sf.lisCode === code || sf.id === code || sf.label === code
                )
              )
            )
          : result.data;
        // compFlagsList filters client-side, after the real page was
        // already fetched — hasMore/nextCursor still reflect the real,
        // unfiltered page boundary from the backend, not this narrower
        // view. Honest, known limitation: a heavily-narrowing computational
        // flag filter combined with Load More can mean a "full" page from
        // the backend renders as a short (or empty) visible page here —
        // clicking Load More again still correctly advances to genuinely
        // new cases, it just may take more than one click to see new rows.
        const combined = loadMore ? [...(results ?? []), ...filteredData] : filteredData;
        setResults(combined);
        setHasMoreResults(!!result.meta?.hasMore);
        setNextCursor(result.meta?.nextCursor);
        ssSave({ filters: currentFilters(), results: combined, hasSearched: true });
      }
    } catch (err) {
      console.error('[SearchPage] runSearch error:', err);
    } finally {
      // Always reset — even if caseService throws
      setIsSearching(false);
      setIsLoadingMore(false);
    }
  };

  const loadMoreResults = () => { void runSearch(true); };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); setHasSearched(true); setSidebarCollapsed(true); void runSearch(); };

  const handleClear = () => {
    setPatientName(''); setHospitalId(''); setPatientId(''); setAccessionNo('');
>>>>>>> upstream/main
    setIdentifierQuery(''); setDetectedType(null);
    setDiagnosisText(''); setDiagnosisList([]);
    setSpecimenQuery(''); setSpecimenList([]);
    setSnomedQuery(''); setSnomedList([]);
    setIcdQuery(''); setIcdCodes([]);
    setSynopticIds([]); setFlagsList([]); setPathologistIds([]); setAttendingIds([]);
    setSubmittingNames([]); setStatusList([]); setPriorityList([]);
    setGenderList([]); setDobFrom(''); setDobTo(''); setAgeMin(''); setAgeMax('');
<<<<<<< HEAD
    setDateFrom(daysAgo(30)); setDateTo(today());
=======
    setDateFrom(daysAgo(30, config.facilityTimezone)); setDateTo(today(config.facilityTimezone)); setActiveDateRange('30d');
>>>>>>> upstream/main
    setResults(null); setHasSearched(false); setActiveSavedId('');
    ssClear();
  };

<<<<<<< HEAD
=======
  const handleExportCSV = () => {
    if (!results || results.length === 0) return;
    const headers = [
      'Accession', 'Patient Name', 'MRN', 'Sex', 'DOB',
      'Specimen(s)', 'Accession Date', 'Physician', 'Priority', 'Status', 'Flags',
    ];
    const rows = results.map(c => [
      c.accession?.fullAccession ?? '',
      `${c.patient?.firstName ?? ''} ${c.patient?.lastName ?? ''}`.trim(),
      c.patient?.mrn ?? '',
      c.patient?.sex ?? '',
      c.patient?.dateOfBirth
        ? new Date(c.patient.dateOfBirth).toLocaleDateString('en-US', { year:'numeric', month:'2-digit', day:'2-digit' })
        : '',
      (c.specimens ?? []).map(s => s.description ?? s.label ?? '').join('; '),
      c.specimens?.[0]?.receivedAt
        ? new Date(c.specimens[0].receivedAt).toLocaleDateString('en-US', { year:'numeric', month:'2-digit', day:'2-digit' })
        : '',
      c.order?.requestingProvider ?? '',
      c.order?.priority ?? '',
      c.status ?? '',
      // Real fix: same .name/.label bug as the computational-flags filter
      // above (CaseFlag's real field is .label, not .name) - this export
      // column was silently empty for every case that actually had flags.
      (c.caseFlags ?? []).map(f => f.label ?? '').join('; '),
    ]);
    const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map(row => row.map(escape).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv, ''], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `pathscribe-cases-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

>>>>>>> upstream/main
  const handleSaveSearch = () => {
    const name = saveNameInput.trim(); if (!name) return;
    const ns: SavedSearch = { id:crypto.randomUUID(), name, filters:currentFilters(), createdAt:new Date().toISOString() };
    setSavedSearches(p=>[...p,ns]); setActiveSavedId(ns.id); setSaveNameInput(''); setShowSaveInput(false);
  };

  const handleLoadSearch = (id: string) => {
    const s = savedSearches.find(x=>x.id===id); if (!s) return;
<<<<<<< HEAD
    applyFilters(s.filters); setActiveSavedId(id); setHasSearched(true); void runSearch();
=======
    applyFilters(s.filters); setActiveSavedId(id); setHasSearched(true); setSidebarCollapsed(true); void runSearch();
>>>>>>> upstream/main
  };

  const handleDeleteSearch = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); setSavedSearches(p=>p.filter(x=>x.id!==id));
    if (activeSavedId===id) setActiveSavedId('');
  };

  // ── Voice: selected result index ────────────────────────────
  const [selectedResultIndex, setSelectedResultIndex] = useState<number>(-1);

  // ── Voice: set SEARCH context on mount ─────────────────────────
  useEffect(() => {
    mockActionRegistryService.setCurrentContext(VOICE_CONTEXT.SEARCH);
    return () => mockActionRegistryService.setCurrentContext(VOICE_CONTEXT.WORKLIST);
  }, []);

  // ── Voice: table navigation and search action listeners ─────────────────────
  useEffect(() => {
    const resultList = results ?? [];
    const clamp = (i: number) => Math.max(0, Math.min(i, resultList.length - 1));

    const next     = () => setSelectedResultIndex(i => clamp(i + 1));
    const previous = () => setSelectedResultIndex(i => clamp(Math.max(0, i) - 1));
    const pageDown = () => setSelectedResultIndex(i => clamp(i + 10));
    const pageUp   = () => setSelectedResultIndex(i => clamp(Math.max(0, i) - 10));
    const first    = () => setSelectedResultIndex(0);
    const last     = () => setSelectedResultIndex(resultList.length - 1);

    const openSelected = () => {
      if (selectedResultIndex >= 0 && resultList[selectedResultIndex]) {
        sessionStorage.setItem('pathscribe:navFrom', 'search');
        navigate(`/case/${resultList[selectedResultIndex].id}/synoptic`);
      }
    };

    const clearSearch = () => {
      handleClear();
      setSelectedResultIndex(-1);
    };

    const runVoiceSearch = () => {
      setHasSearched(true);
<<<<<<< HEAD
=======
      setSidebarCollapsed(true);
>>>>>>> upstream/main
      void runSearch();
    };

    window.addEventListener('PATHSCRIBE_TABLE_NEXT',          next);
    window.addEventListener('PATHSCRIBE_TABLE_PREVIOUS',      previous);
    window.addEventListener('PATHSCRIBE_TABLE_PAGE_DOWN',     pageDown);
    window.addEventListener('PATHSCRIBE_TABLE_PAGE_UP',       pageUp);
    window.addEventListener('PATHSCRIBE_TABLE_FIRST',         first);
    window.addEventListener('PATHSCRIBE_TABLE_LAST',          last);
    window.addEventListener('PATHSCRIBE_TABLE_OPEN_SELECTED', openSelected);
    window.addEventListener('PATHSCRIBE_TABLE_CLEAR_SEARCH',  clearSearch);
    window.addEventListener('PATHSCRIBE_TABLE_SEARCH',        runVoiceSearch);

    return () => {
      window.removeEventListener('PATHSCRIBE_TABLE_NEXT',          next);
      window.removeEventListener('PATHSCRIBE_TABLE_PREVIOUS',      previous);
      window.removeEventListener('PATHSCRIBE_TABLE_PAGE_DOWN',     pageDown);
      window.removeEventListener('PATHSCRIBE_TABLE_PAGE_UP',       pageUp);
      window.removeEventListener('PATHSCRIBE_TABLE_FIRST',         first);
      window.removeEventListener('PATHSCRIBE_TABLE_LAST',          last);
      window.removeEventListener('PATHSCRIBE_TABLE_OPEN_SELECTED', openSelected);
      window.removeEventListener('PATHSCRIBE_TABLE_CLEAR_SEARCH',  clearSearch);
      window.removeEventListener('PATHSCRIBE_TABLE_SEARCH',        runVoiceSearch);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, selectedResultIndex, navigate]);

  // â”€â”€ Style helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

<<<<<<< HEAD
  const INPUT: React.CSSProperties = {
    width:'100%', padding:'6px 10px',
    background:'rgba(15,23,42,0.7)', border:'1px solid rgba(148,163,184,0.25)',
    borderRadius:7, color:'#f1f5f9', fontSize:12, outline:'none', boxSizing:'border-box',
    transition:'border-color 0.15s',
  };

  // onF/onB now also update activeSection via data-section attribute
  const onF = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = '#0891B2';
    setActiveSection(e.currentTarget.dataset.section ?? '');
  };
  const onB = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = 'rgba(148,163,184,0.25)';
=======
  // onF/onB update activeSection via data-section attribute. Was also
  // directly mutating e.currentTarget.style.borderColor for the focus
  // ring — replaced with a real CSS :focus rule on ps-searchpage-filter-
  // input, same fix already applied to hover-driven inline-style hacks
  // elsewhere in this review.
  const onF = (e: React.FocusEvent<HTMLInputElement>) => {
    setActiveSection(e.currentTarget.dataset.section ?? '');
  };
  const onB = () => {
>>>>>>> upstream/main
    setActiveSection('');
  };

  const activeCount = [
<<<<<<< HEAD
    patientName, hospitalId, accessionNo,
=======
    patientName, hospitalId, patientId, accessionNo,
>>>>>>> upstream/main
    ...diagnosisList, ...specimenList,
    ...snomedList.map(s=>s.code), ...icdCodes.map(s=>s.code),
    ...synopticIds, ...flagsList, ...pathologistIds, ...attendingIds, ...submittingNames,
    ...statusList, ...priorityList, dateFrom?'df':'', dateTo?'dt':'',
  ].filter(Boolean).length;

<<<<<<< HEAD
  const summary = hasSearched ? buildSummary(currentFilters()) : null;
=======
  const summary = hasSearched ? buildSummary(currentFilters(), pathologists, attendings) : null;
>>>>>>> upstream/main

  const quickLinks = {
    Protocols:  [{ title:'CAP Cancer Protocols', url:'https://www.cap.org/protocols-and-guidelines' }, { title:'WHO Classification', url:'https://www.who.int/publications' }],
    References: [{ title:'PathologyOutlines', url:'https://www.pathologyoutlines.com' }, { title:'UpToDate', url:'https://www.uptodate.com' }],
    Systems:    [{ title:'Hospital LIS', url:'#' }, { title:'Lab Management', url:'#' }],
  };

<<<<<<< HEAD
  const modalOverlay: React.CSSProperties = { position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,0.85)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:10000 };
=======
>>>>>>> upstream/main

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  return (
<<<<<<< HEAD
    <div style={{ position:'relative', width:'100vw', height:'100vh', backgroundColor:'#000', color:'#fff', fontFamily:"'Inter',sans-serif", opacity:isLoaded?1:0, transition:'opacity 0.5s ease', display:'flex', flexDirection:'column', overflow:'hidden' }}>

      <div style={{ position:'absolute', inset:0, backgroundImage:'url(/main_background.jpg)', backgroundSize:'cover', backgroundPosition:'center', zIndex:0, filter:'brightness(0.3) contrast(1.1)' }} />
      <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom,rgba(0,0,0,0.4) 0%,#000 100%)', zIndex:1 }} />

      <div style={{ position:'relative', zIndex:10, display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden' }}>

        {/* â”€â”€ Nav â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}

        {/* â”€â”€ Page header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div style={{ background:'rgba(0,0,0,0.4)', backdropFilter:'blur(12px)', padding:'8px 40px', borderBottom:'1px solid rgba(255,255,255,0.08)', flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontSize:18, fontWeight:700, color:'#f1f5f9', marginBottom:1 }}>Case Search</div>
              <div style={{ color:'#94a3b8', fontSize:12 }}>Search across cases, specimens, diagnoses, and clinical codes</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', justifyContent:'flex-end', maxWidth:560 }}>
              {savedSearches.map(s => (
                <button key={s.id} type="button" onClick={()=>handleLoadSearch(s.id)} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px 4px 11px', borderRadius:999, cursor:'pointer', fontSize:11, fontWeight:500, background:activeSavedId===s.id?'rgba(139,92,246,0.2)':'rgba(255,255,255,0.05)', border:`1px solid ${activeSavedId===s.id?'#8B5CF6':'rgba(255,255,255,0.1)'}`, color:activeSavedId===s.id?'#c4b5fd':'#94a3b8' }}>
                  ðŸ”– {s.name}
                  <span onClick={e=>handleDeleteSearch(s.id,e)} style={{ marginLeft:2, color:'#cbd5e1', fontSize:13, cursor:'pointer', padding:'0 2px' }} onMouseEnter={e=>(e.currentTarget.style.color='#ef4444')} onMouseLeave={e=>(e.currentTarget.style.color='#cbd5e1')}>Ã—</span>
                </button>
              ))}
              {showSaveInput ? (
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <input ref={saveInputRef} type="text" value={saveNameInput} onChange={e=>setSaveNameInput(e.target.value)}
                    onKeyDown={e=>{if(e.key==='Enter')handleSaveSearch();if(e.key==='Escape'){setShowSaveInput(false);setSaveNameInput('');}}}
                    placeholder="Name this searchâ€¦" style={{ padding:'4px 9px', fontSize:11, border:'1px solid rgba(255,255,255,0.15)', borderRadius:7, outline:'none', color:'#e2e8f0', background:'rgba(15,23,42,0.7)', width:145 }} />
                  <button type="button" onClick={handleSaveSearch} style={{ border:'none', background:'#8B5CF6', color:'#fff', borderRadius:7, padding:'4px 10px', fontSize:11, fontWeight:600, cursor:'pointer' }}>Save</button>
                  <button type="button" onClick={()=>{setShowSaveInput(false);setSaveNameInput('');}} style={{ border:'1px solid #e2e8f0', background:'transparent', color:'#94a3b8', borderRadius:7, padding:'4px 8px', fontSize:11, cursor:'pointer' }}>âœ•</button>
                </div>
              ) : (
                <button type="button" onClick={()=>setShowSaveInput(true)} style={{ border:'1px dashed #8B5CF6', background:'transparent', color:'#8B5CF6', borderRadius:999, padding:'4px 12px', fontSize:11, fontWeight:600, cursor:'pointer' }}>+ Save Search</button>
              )}
              {activeCount>0&&<span style={{ background:'#8B5CF6', color:'#fff', fontSize:10, fontWeight:700, borderRadius:999, padding:'2px 8px', marginLeft:4 }}>{activeCount} filter{activeCount!==1?'s':''}</span>}
=======
    <div className={`ps-search-page-root${isLoaded ? ' ps-search-page-root--loaded' : ''}`}>

      <div className="ps-search-bg-image" />
      <div className="ps-search-bg-gradient" />

      <div className="ps-search-shell">

        {/* â”€â”€ Page header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="ps-search-header">
          <div className="ps-search-header-row">
            <div>
              <div className="ps-search-title-block-title">Case Search</div>
              <div className="ps-search-title-block-sub">Search across cases, specimens, diagnoses, and clinical codes</div>
            </div>
            <div className="ps-search-saved-chips">
              {savedSearches.map(s => (
                <button key={s.id} type="button" onClick={()=>handleLoadSearch(s.id)} className={`ps-searchpage-saved-chip${activeSavedId===s.id ? ' ps-searchpage-saved-chip--active' : ''}`}>
                  {s.name}
                  <span onClick={e=>handleDeleteSearch(s.id,e)} className="ps-searchpage-saved-chip-remove">×</span>
                </button>
              ))}
              {showSaveInput ? (
                <div className="ps-searchpage-save-row">
                  <input ref={saveInputRef} type="text" value={saveNameInput} onChange={e=>setSaveNameInput(e.target.value)}
                    onKeyDown={e=>{if(e.key==='Enter')handleSaveSearch();if(e.key==='Escape'){setShowSaveInput(false);setSaveNameInput('');}}}
                    placeholder="Name this search…" className="ps-searchpage-save-input" />
                  <button type="button" onClick={handleSaveSearch} className="ps-searchpage-save-btn">Save</button>
                  <button type="button" onClick={()=>{setShowSaveInput(false);setSaveNameInput('');}} className="ps-searchpage-save-cancel-btn">✕</button>
                </div>
              ) : (
                <button type="button" onClick={()=>setShowSaveInput(true)} className="ps-searchpage-save-new-btn">+ Save Search</button>
              )}
              {activeCount>0&&<span className="ps-searchpage-active-count-badge">{activeCount} filter{activeCount!==1?'s':''}</span>}
>>>>>>> upstream/main
            </div>
          </div>
        </div>

        {/* â”€â”€ Body â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
<<<<<<< HEAD
        <main style={{ flex:1, minHeight:0, padding:'20px 40px', display:'flex', flexDirection:'column', overflow:'hidden', gap:16 }}>
          <div style={{ flex:1, minHeight:0, display:'flex', gap:16, overflow:'hidden' }}>

          {/* â”€â”€ Sidebar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <aside style={{ width:360, flexShrink:0, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <form onSubmit={handleSubmit} style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

              {/* Accession Date */}
              <div style={{ padding:'10px 16px 8px', borderBottom:'1px solid rgba(255,255,255,0.08)', flexShrink:0 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
                  <SectionLabel title="Accession Date" active={activeSection==="date"} />
                  <div style={{ display:'flex', gap:3 }}>
                    {([['7d',7],['30d',30],['90d',90],['1yr',365]] as [string,number][]).map(([label,days])=>(
                      <button key={label} type="button" onClick={()=>{setDateFrom(daysAgo(days));setDateTo(today());}}
                        style={{ fontSize:10, padding:'2px 6px', borderRadius:5, cursor:'pointer', border:'1px solid rgba(8,145,178,0.4)', background:'rgba(8,145,178,0.08)', color:'#7dd3fc', fontWeight:600 }}>{label}</button>
                    ))}
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                  <div>
                    <div style={{ fontSize:10, color:activeSection==='date'?'#7dd3fc':'#94a3b8', marginBottom:2, transition:'color 0.15s' }}>From</div>
                    <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} onFocus={onF} onBlur={onB} data-section="date" style={{...INPUT, colorScheme:'dark' as any}} />
                  </div>
                  <div>
                    <div style={{ fontSize:10, color:activeSection==='date'?'#7dd3fc':'#94a3b8', marginBottom:2, transition:'color 0.15s' }}>To</div>
                    <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} onFocus={onF} onBlur={onB} data-section="date" style={{...INPUT, colorScheme:'dark' as any}} />
=======
        <main className="ps-search-main">
          <div className="ps-search-row">

          {/* â”€â”€ Sidebar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <aside className={`ps-search-sidebar ${sidebarCollapsed ? 'collapsed' : 'expanded'}`}>
            {sidebarCollapsed ? (
              <div className="ps-search-rail">
                <button type="button" className="ps-search-rail-toggle" onClick={() => setSidebarCollapsed(false)} title="Expand filters">
                  &rsaquo;
                </button>
                <div className="ps-search-rail-badge">Filters</div>
              </div>
            ) : (
            <>
            <button type="button" className="ps-search-sidebar-toggle" onClick={() => setSidebarCollapsed(true)} title="Collapse filters">
              &lsaquo;
            </button>
            <form onSubmit={handleSubmit} className="ps-search-form">

              {/* Accession Date */}
              <div className="ps-search-date-section">
                <div className="ps-searchpage-date-header-row">
                  <SectionLabel title="Accession Date" active={activeSection==="date"} />
                  <div className="ps-searchpage-date-shortcuts">
                    {([['7d',7],['30d',30],['90d',90],['1yr',365]] as [string,number][]).map(([label,days])=>{
                      const isActive = activeDateRange === label;
                      return (
                        <button key={label} type="button"
                          onClick={()=>{setDateFrom(daysAgo(days, config.facilityTimezone));setDateTo(today(config.facilityTimezone));setActiveDateRange(label);}}
                          className={`ps-searchpage-date-shortcut-btn${isActive ? ' ps-searchpage-date-shortcut-btn--active' : ''}`}
                        >{label}</button>
                      );
                    })}
                    {/* "All" — deliberately separate from the days-based
                        shortcuts above (not representable as N-days-back).
                        Amber/warning coloring rather than cyan to visually
                        flag it as a different kind of action, not just a
                        wider version of the same thing. The tooltip is a
                        forward-looking caution about a real production
                        concern (unbounded query against years of clinical
                        records) — with the current mock service this
                        actually returns instantly, so the warning describes
                        the eventual real backend, not a live measurement of
                        anything slow happening today. */}
                    <button type="button"
                      onClick={()=>{setDateFrom('');setDateTo('');setActiveDateRange('all');}}
                      title="Searches all accession dates with no limit. Once connected to a production database with years of records, this could take noticeably longer to return results."
                      className={`ps-searchpage-date-shortcut-btn ps-searchpage-date-shortcut-btn--all${activeDateRange === 'all' ? ' ps-searchpage-date-shortcut-btn--all-active' : ''}`}
                    >All</button>
                  </div>
                </div>
                <div className="ps-searchpage-date-grid">
                  <div>
                    <div className={`ps-searchpage-date-label${activeSection==='date' ? ' ps-searchpage-date-label--active' : ''}`}>From</div>
                    <input type="date" value={dateFrom} onChange={e=>{setDateFrom(e.target.value);setActiveDateRange(null);}} onFocus={onF} onBlur={onB} data-section="date" aria-label="Accession date from" className="ps-searchpage-filter-input ps-searchpage-filter-input--date" />
                  </div>
                  <div>
                    <div className={`ps-searchpage-date-label${activeSection==='date' ? ' ps-searchpage-date-label--active' : ''}`}>To</div>
                    <input type="date" value={dateTo} onChange={e=>{setDateTo(e.target.value);setActiveDateRange(null);}} onFocus={onF} onBlur={onB} data-section="date" aria-label="Accession date to" className="ps-searchpage-filter-input ps-searchpage-filter-input--date" />
>>>>>>> upstream/main
                  </div>
                </div>
              </div>

              {/* Scrollable filters */}
<<<<<<< HEAD
              <div className="ps-scroll" style={{ flex:1, overflowY:'auto', padding:'8px 12px 0', display:'flex', flexDirection:'column', gap:7, scrollbarWidth:'thin', scrollbarColor:'rgba(148,163,184,0.15) transparent' }}>

                {/* Identifiers */}
                {/* Identifiers â€” smart single box */}
                <div onMouseEnter={()=>setActiveSection('id')} onMouseLeave={()=>setActiveSection(s=>s==='id'?'':s)}>
                  <div style={{marginBottom:4}}><SectionLabel title="Identifier" active={activeSection==='id'} /></div>
                  <div style={{ position:'relative' }}>
=======
              <div className="ps-search-filter-scroll">

                {/* Identifiers */}
                {/* Identifiers ”” smart single box */}
                <div onMouseEnter={()=>setActiveSection('id')} onMouseLeave={()=>setActiveSection(s=>s==='id'?'':s)}>
                  <div className="ps-searchpage-section-mb4"><SectionLabel title="Identifier" active={activeSection==='id'} /></div>
                  <div className="ps-searchpage-rel-wrap">
>>>>>>> upstream/main
                    <input
                      data-capture-hide="true"
                      type="text"
                      value={identifierQuery}
                      onChange={e => handleIdentifierChange(e.target.value)}
                      onFocus={onF} onBlur={onB} data-section="id"
<<<<<<< HEAD
                      style={INPUT}
                      placeholder={`Accession #, patient name, or MRNâ€¦`}
                    />
                    {detectedType && identifierQuery && (
                      <div style={{
                        position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
                        background: `${IDENTIFIER_BADGE[detectedType].color}22`,
                        border: `1px solid ${IDENTIFIER_BADGE[detectedType].color}66`,
                        color: IDENTIFIER_BADGE[detectedType].color,
                        borderRadius:999, padding:'1px 8px', fontSize:10, fontWeight:700,
                        pointerEvents:'none', whiteSpace:'nowrap',
                      }}>
=======
                      className="ps-searchpage-filter-input"
                      placeholder={`Accession #, patient name, or MRN…`}
                    />
                    {identifierQuery && (
                      <button
                        type="button"
                        onClick={() => handleIdentifierChange('')}
                        className="ps-searchpage-identifier-clear"
                        aria-label="Clear identifier search"
                        title="Clear"
                      >
                        ×
                      </button>
                    )}
                    {detectedType && identifierQuery && (
                      <div className="ps-searchpage-identifier-badge" style={{ '--accent': IDENTIFIER_BADGE[detectedType].color } as React.CSSProperties}>
>>>>>>> upstream/main
                        {IDENTIFIER_BADGE[detectedType].label}
                      </div>
                    )}
                  </div>
                </div>


                {/* Patient Demographics */}
                <div
                  onMouseEnter={()=>setActiveSection('demographics')}
                  onMouseLeave={()=>setActiveSection(s=>s==='demographics'?'':s)}
                >
<<<<<<< HEAD
                  <div style={{ marginBottom:6 }}><SectionLabel title="Patient Demographics" active={activeSection==='demographics'} /></div>

                  {/* Gender */}
                  <div style={{ marginBottom:8 }}>
                    <div style={{ fontSize:10, color:'#64748b', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>Gender</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
=======
                  <div className="ps-searchpage-section-mb6"><SectionLabel title="Patient Demographics" active={activeSection==='demographics'} /></div>

                  {/* Gender */}
                  <div className="ps-searchpage-section-mb8">
                    <div className="ps-searchpage-mini-label">Gender</div>
                    <div className="ps-searchpage-pill-row">
>>>>>>> upstream/main
                      {(['Male','Female','Non-binary','Other','Unknown'] as const).map(g => (
                        <CheckPill key={g} label={g} checked={genderList.includes(g)} onChange={()=>toggle(g,genderList,setGenderList)} />
                      ))}
                    </div>
                  </div>

                  {/* Date of Birth range */}
<<<<<<< HEAD
                  <div style={{ marginBottom:8 }}>
                    <div style={{ fontSize:10, color:'#64748b', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>Date of Birth</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                      <div>
                        <div style={{ fontSize:9, color:'#475569', marginBottom:2 }}>From</div>
                        <input type="date" value={dobFrom} onChange={e=>setDobFrom(e.target.value)}
                          style={{...INPUT, colorScheme:'dark' as any, fontSize:11}} />
                      </div>
                      <div>
                        <div style={{ fontSize:9, color:'#475569', marginBottom:2 }}>To</div>
                        <input type="date" value={dobTo} onChange={e=>setDobTo(e.target.value)}
                          style={{...INPUT, colorScheme:'dark' as any, fontSize:11}} />
=======
                  <div className="ps-searchpage-section-mb8">
                    <div className="ps-searchpage-mini-label ps-searchpage-mini-label--soft">Date of Birth</div>
                    <div className="ps-searchpage-mini-grid">
                      <div>
                        <div className="ps-searchpage-mini-field-label">From</div>
                        <input type="date" value={dobFrom} onChange={e=>setDobFrom(e.target.value)}
                          aria-label="Date of birth from"
                          className="ps-searchpage-filter-input ps-searchpage-filter-input--date ps-searchpage-filter-input--sm" />
                      </div>
                      <div>
                        <div className="ps-searchpage-mini-field-label">To</div>
                        <input type="date" value={dobTo} onChange={e=>setDobTo(e.target.value)}
                          aria-label="Date of birth to"
                          className="ps-searchpage-filter-input ps-searchpage-filter-input--date ps-searchpage-filter-input--sm" />
>>>>>>> upstream/main
                      </div>
                    </div>
                  </div>

                  {/* Age range */}
                  <div>
<<<<<<< HEAD
                    <div style={{ fontSize:10, color:'#64748b', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>Age (years)</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                      <div>
                        <div style={{ fontSize:9, color:'#475569', marginBottom:2 }}>Min</div>
                        <input type="number" min={0} max={130} placeholder="e.g. 40" value={ageMin} onChange={e=>setAgeMin(e.target.value)}
                          style={{...INPUT, fontSize:12}} />
                      </div>
                      <div>
                        <div style={{ fontSize:9, color:'#475569', marginBottom:2 }}>Max</div>
                        <input type="number" min={0} max={130} placeholder="e.g. 65" value={ageMax} onChange={e=>setAgeMax(e.target.value)}
                          style={{...INPUT, fontSize:12}} />
=======
                    <div className="ps-searchpage-mini-label">Age (years)</div>
                    <div className="ps-searchpage-mini-grid">
                      <div>
                        <div className="ps-searchpage-mini-field-label ps-searchpage-mini-field-label--dim">Min</div>
                        <input type="number" min={0} max={130} placeholder="e.g. 40" value={ageMin} onChange={e=>setAgeMin(e.target.value)}
                          className="ps-searchpage-filter-input" />
                      </div>
                      <div>
                        <div className="ps-searchpage-mini-field-label ps-searchpage-mini-field-label--dim">Max</div>
                        <input type="number" min={0} max={130} placeholder="e.g. 65" value={ageMax} onChange={e=>setAgeMax(e.target.value)}
                          className="ps-searchpage-filter-input" />
>>>>>>> upstream/main
                      </div>
                    </div>
                  </div>
                </div>

<<<<<<< HEAD
                {/* Status + Priority â€” single row */}
                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <SectionLabel title="Status" active={activeSection==='status'} />
                    <div style={{ width:1, height:10, background:'rgba(255,255,255,0.1)' }} />
=======
                {/* Status + Priority ”” single row */}
                <div className="ps-searchpage-status-priority-row">
                  <div className="ps-searchpage-label-pair-row">
                    <SectionLabel title="Status" active={activeSection==='status'} />
                    <div className="ps-searchpage-vdivider" />
>>>>>>> upstream/main
                    <SectionLabel title="Priority" active={activeSection==='priority'} />
                  </div>
                  <div
                    onMouseEnter={()=>setActiveSection('status')}
                    onMouseLeave={()=>setActiveSection(s=>s==='status'||s==='priority'?'':s)}
<<<<<<< HEAD
                    style={{ display:'flex', flexWrap:'wrap', gap:3 }}
                  >
                    {CASE_STATUS_OPTIONS.map(s=><CheckPill key={s} label={s} checked={statusList.includes(s)} onChange={()=>toggle(s,statusList,setStatusList)} />)}
                    <div style={{ width:1, alignSelf:'stretch', background:'rgba(255,255,255,0.1)', margin:'0 2px' }} />
                    {PRIORITY_OPTIONS.map(p=><CheckPill key={p} label={p} checked={priorityList.includes(p)} onChange={()=>toggle(p,priorityList,setPriorityList)} accent={p==='STAT'?'#ef4444':'#0891B2'} />)}
                  </div>
                </div>

                {/* Flags */}
                <div onMouseEnter={()=>setActiveSection('flags')} onMouseLeave={()=>setActiveSection(s=>s==='flags'?'':s)}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                    <SectionLabel title="Flags" active={activeSection==='flags'} />
                    <BrowseBtn onClick={()=>setFlagsModal(true)} count={ALL_FLAGS.length} />
                  </div>
                  {flagsList.length>0&&<div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>{flagsList.map(f=><Chip key={f} label={f} onRemove={()=>setFlagsList(p=>p.filter(x=>x!==f))} />)}</div>}
=======
                    className="ps-searchpage-pill-row"
                  >
                    {CASE_STATUS_OPTIONS.map(s=><CheckPill key={s} label={STATUS_PILL_META[s].label} checked={statusList.includes(s)} onChange={()=>toggle(s,statusList,setStatusList)} accent={STATUS_PILL_META[s].color} />)}
                    <div className="ps-searchpage-vdivider--stretch" />
                    {PRIORITY_OPTIONS.map(p=><CheckPill key={p} label={p} checked={priorityList.includes(p)} onChange={()=>toggle(p,priorityList,setPriorityList)} accent={p==='STAT'?'#ef4444':p==='Rush'?'#f59e0b':'#0891B2'} />)}
                  </div>
                </div>

                {/* ── Browse-button sections: 2-column grid ── */}
                <div className="ps-search-2col">

                {/* Flags */}
                <div onMouseEnter={()=>setActiveSection('flags')} onMouseLeave={()=>setActiveSection(s=>s==='flags'?'':s)}>
                  <div className="ps-searchpage-header-row">
                    <SectionLabel title="Flags" active={activeSection==='flags'} />
                    <BrowseBtn onClick={()=>setFlagsModal(true)} count={realFlagNames.length} />
                  </div>
                  {flagsList.length>0&&<div className="ps-searchpage-pill-row">{flagsList.map(f=><Chip key={f} label={f} onRemove={()=>setFlagsList(p=>p.filter(x=>x!==f))} />)}</div>}
>>>>>>> upstream/main
                </div>

                {/* Synoptic */}
                <div onMouseEnter={()=>setActiveSection('synoptic')} onMouseLeave={()=>setActiveSection(s=>s==='synoptic'?'':s)}>
<<<<<<< HEAD
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                    <SectionLabel title="Synoptic Protocol" active={activeSection==='synoptic'} />
                    <BrowseBtn onClick={()=>setSynopticModal(true)} count={ALL_SYNOPTICS.length} />
                  </div>
                  {synopticIds.length>0&&<div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>{synopticIds.map(id=>{const t=ALL_SYNOPTICS.find(s=>s.id===id);return t?<Chip key={id} label={t.organ} onRemove={()=>setSynopticIds(p=>p.filter(x=>x!==id))} />:null;})}</div>}
=======
                  <div className="ps-searchpage-header-row">
                    <SectionLabel title="Synoptic Protocol" active={activeSection==='synoptic'} />
                    <BrowseBtn onClick={()=>setSynopticModal(true)} count={ALL_SYNOPTICS.length} />
                  </div>
                  {synopticIds.length>0&&<div className="ps-searchpage-pill-row">{synopticIds.map(id=>{const t=ALL_SYNOPTICS.find(s=>s.id===id);return t?<Chip key={id} label={t.organ} onRemove={()=>setSynopticIds(p=>p.filter(x=>x!==id))} />:null;})}</div>}
>>>>>>> upstream/main
                </div>

                {/* Pathologist */}
                <div onMouseEnter={()=>setActiveSection('path')} onMouseLeave={()=>setActiveSection(s=>s==='path'?'':s)}>
<<<<<<< HEAD
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                    <SectionLabel title="Pathologist" active={activeSection==='path'} />
                    <BrowseBtn onClick={()=>setPathModal(true)} count={ALL_PATHOLOGISTS.length} />
                  </div>
                  {pathologistIds.length>0&&<div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>{pathologistIds.map(id=>{const u=ALL_PATHOLOGISTS.find(x=>x.id===id);return u?<Chip key={id} label={u.name.replace('Dr. ','')} onRemove={()=>setPathologistIds(p=>p.filter(x=>x!==id))} />:null;})}</div>}
=======
                  <div className="ps-searchpage-header-row">
                    <SectionLabel title="Pathologist" active={activeSection==='path'} />
                    <BrowseBtn onClick={()=>setPathModal(true)} count={pathologists.length} />
                  </div>
                  {pathologistIds.length>0&&<div className="ps-searchpage-pill-row">{pathologistIds.map(id=>{const u=pathologists.find(x=>x.id===id);return u?<Chip key={id} label={u.name.replace('Dr. ','')} onRemove={()=>setPathologistIds(p=>p.filter(x=>x!==id))} />:null;})}</div>}
>>>>>>> upstream/main
                </div>

                {/* Attending Physician */}
                <div onMouseEnter={()=>setActiveSection('attending')} onMouseLeave={()=>setActiveSection(s=>s==='attending'?'':s)}>
<<<<<<< HEAD
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                    <SectionLabel title="Attending Physician" active={activeSection==='attending'} />
                    <BrowseBtn onClick={()=>setAttendingModal(true)} count={ALL_ATTENDINGS.length} />
                  </div>
                  {attendingIds.length>0&&<div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>{attendingIds.map(id=>{const u=ALL_ATTENDINGS.find(x=>x.id===id);return u?<Chip key={id} label={u.name.replace('Dr. ','')} onRemove={()=>setAttendingIds(p=>p.filter(x=>x!==id))} />:null;})}</div>}
                </div>

                {/* Specimen */}
                <div onMouseEnter={()=>setActiveSection('specimen')} onMouseLeave={()=>setActiveSection(s=>s==='specimen'?'':s)}>
                  <div style={{marginBottom:4}}><SectionLabel title="Specimen" active={activeSection==='specimen'} /></div>
                  <div style={{ display:'flex', gap:4 }} ref={specimenRef}>
                    <div style={{ position:'relative', flex:1 }}>
                      <input type="text" value={specimenQuery} onChange={e=>setSpecimenQuery(e.target.value)} onFocus={onF} onBlur={onB} data-section="specimen" style={INPUT} placeholder="Search specimen dictionaryâ€¦"
                        onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();if(specimenQuery.trim())addSpecimen(specimenQuery);}}} />
                      {showSpecimenDrop&&(
                        <div style={DROPDOWN_STYLE}>
                          {specimenSuggestions.map(s=>(
                            <button key={s} type="button" onClick={()=>addSpecimen(s)} style={DROP_BTN}
                              onMouseEnter={e=>(e.currentTarget.style.background='rgba(8,145,178,0.15)')} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>{s}</button>
                          ))}
                          {specimenQuery.trim()&&!SPECIMEN_DICTIONARY.some(s=>s.toLowerCase()===specimenQuery.toLowerCase())&&(
                            <button type="button" onClick={()=>addSpecimen(specimenQuery)} style={{...DROP_BTN,color:'#7dd3fc',borderTop:'1px solid rgba(148,163,184,0.1)'}}
                              onMouseEnter={e=>(e.currentTarget.style.background='rgba(8,145,178,0.15)')} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>+ Add "{specimenQuery}"</button>
=======
                  <div className="ps-searchpage-header-row">
                    <SectionLabel title="Attending Physician" active={activeSection==='attending'} />
                    <BrowseBtn onClick={()=>setAttendingModal(true)} count={attendings.length} />
                  </div>
                  {attendingIds.length>0&&<div className="ps-searchpage-pill-row">{attendingIds.map(id=>{const u=attendings.find(x=>x.id===id);return u?<Chip key={id} label={u.name.replace('Dr. ','')} onRemove={()=>setAttendingIds(p=>p.filter(x=>x!==id))} />:null;})}</div>}
                </div>


                {/* Computational Flags */}
                <div className="ps-searchpage-section-mb4">
                  <div className="ps-searchpage-header-row">
                    <SectionLabel title="Comp Flags" active={false} />
                    <BrowseBtn onClick={()=>setCompFlagsModal(true)} count={compFlagsList.length||undefined} />
                  </div>
                  {compFlagsList.length>0&&<div className="ps-searchpage-pill-row">
                    {compFlagsList.map(f=><Chip key={f} label={f} onRemove={()=>setCompFlagsList(p=>p.filter(x=>x!==f))} accent="#0891b2" />)}
                  </div>}
                </div>

                {/* Client */}
                <div className="ps-searchpage-section-mb4">
                  <div className="ps-searchpage-header-row">
                    <SectionLabel title="Client" active={false} />
                    <BrowseBtn onClick={()=>setClientModal(true)} count={clientIds.length||undefined} />
                  </div>
                  {clientIds.length>0&&<div className="ps-searchpage-pill-row">
                    {clientIds.map(id=><Chip key={id} label={clients.find(c=>c.id===id)?.name??id} onRemove={()=>setClientIds(p=>p.filter(x=>x!==id))} accent="#8b5cf6" />)}
                  </div>}
                </div>

                </div>{/* end ps-search-2col */}

                {/* Specimen */}
                <div onMouseEnter={()=>setActiveSection('specimen')} onMouseLeave={()=>setActiveSection(s=>s==='specimen'?'':s)}>
                  <div className="ps-searchpage-section-mb4"><SectionLabel title="Specimen" active={activeSection==='specimen'} /></div>
                  <div className="ps-searchpage-input-row" ref={specimenRef}>
                    <div className="ps-searchpage-rel-wrap--flex1">
                      <input type="text" value={specimenQuery} onChange={e=>setSpecimenQuery(e.target.value)} onFocus={onF} onBlur={onB} data-section="specimen" className="ps-searchpage-filter-input" placeholder="Search specimen dictionary…"
                        onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();if(specimenQuery.trim())addSpecimen(specimenQuery);}}} />
                      {showSpecimenDrop&&(
                        <div className={DROPDOWN_CLASS}>
                          {specimenSuggestions.map(s=>(
                            <button key={s} type="button" onClick={()=>addSpecimen(s)} className={DROP_BTN_CLASS}>{s}</button>
                          ))}
                          {specimenQuery.trim()&&!SPECIMEN_DICTIONARY.some(s=>s.toLowerCase()===specimenQuery.toLowerCase())&&(
                            <button type="button" onClick={()=>addSpecimen(specimenQuery)} className={`${DROP_BTN_CLASS} ps-searchpage-dropdown-btn--add`}>+ Add "{specimenQuery}"</button>
>>>>>>> upstream/main
                          )}
                        </div>
                      )}
                    </div>
                    <BrowseBtn onClick={()=>setSpecimenModal(true)} count={specimenList.length||undefined} />
                  </div>
<<<<<<< HEAD
                  {specimenList.length>0&&<div style={{ marginTop:4, display:'flex', flexWrap:'wrap', gap:3 }}>{specimenList.map(s=><Chip key={s} label={s} onRemove={()=>setSpecimenList(p=>p.filter(x=>x!==s))} />)}</div>}
=======
                  {specimenList.length>0&&<div className="ps-searchpage-pill-row--mt4">{specimenList.map(s=><Chip key={s} label={s} onRemove={()=>setSpecimenList(p=>p.filter(x=>x!==s))} />)}</div>}
>>>>>>> upstream/main
                </div>

                {/* Diagnosis */}
                <div onMouseEnter={()=>setActiveSection('diagnosis')} onMouseLeave={()=>setActiveSection(s=>s==='diagnosis'?'':s)}>
<<<<<<< HEAD
                  <div style={{marginBottom:4}}><SectionLabel title="Diagnosis" active={activeSection==='diagnosis'} /></div>
                  <div style={{ display:'flex', gap:4 }}>
                    <input type="text" value={diagnosisText} onChange={e=>setDiagnosisText(e.target.value)} onFocus={onF} onBlur={onB} data-section="diagnosis" style={INPUT} placeholder="e.g. Carcinoma"
                      onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addDiagnosis();}}} />
                    <button type="button" onClick={addDiagnosis} style={{ border:'none', borderRadius:6, padding:'0 8px', background:'#0891B2', color:'#e5e7eb', fontSize:12, fontWeight:700, cursor:'pointer', flexShrink:0 }}>+</button>
                  </div>
                  {diagnosisList.length>0&&<div style={{ marginTop:4, display:'flex', flexWrap:'wrap', gap:3 }}>{diagnosisList.map(d=><Chip key={d} label={d} onRemove={()=>setDiagnosisList(p=>p.filter(x=>x!==d))} />)}</div>}
=======
                  <div className="ps-searchpage-section-mb4"><SectionLabel title="Diagnosis" active={activeSection==='diagnosis'} /></div>
                  <div className="ps-searchpage-input-row">
                    <input type="text" value={diagnosisText} onChange={e=>setDiagnosisText(e.target.value)} onFocus={onF} onBlur={onB} data-section="diagnosis" className="ps-searchpage-filter-input" placeholder="e.g. Carcinoma"
                      onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addDiagnosis();}}} />
                    <button type="button" onClick={addDiagnosis} className="ps-searchpage-add-btn">+</button>
                  </div>
                  {diagnosisList.length>0&&<div className="ps-searchpage-pill-row--mt4">{diagnosisList.map(d=><Chip key={d} label={d} onRemove={()=>setDiagnosisList(p=>p.filter(x=>x!==d))} />)}</div>}
>>>>>>> upstream/main
                </div>

                {/* SNOMED CT */}
                <div onMouseEnter={()=>setActiveSection('snomed')} onMouseLeave={()=>setActiveSection(s=>s==='snomed'?'':s)}>
<<<<<<< HEAD
                  <div style={{marginBottom:4}}><SectionLabel title="SNOMED CT" active={activeSection==='snomed'} /></div>
                  <div style={{ display:'flex', gap:4 }} ref={snomedRef}>
                    <div style={{ position:'relative', flex:1 }}>
                      <input type="text" value={snomedQuery} onChange={e=>setSnomedQuery(e.target.value)} onFocus={onF} onBlur={onB} data-section="snomed" style={INPUT} placeholder="Search concept or descriptionâ€¦" />
                      {showSnomedDrop&&(
                        <div style={DROPDOWN_STYLE}>
                          {snomedSuggestions.map(s=>(
                            <button key={s.code} type="button" onClick={()=>addSnomed(s)} style={DROP_BTN}
                              onMouseEnter={e=>(e.currentTarget.style.background='rgba(8,145,178,0.15)')} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                              <span style={{ fontFamily:'monospace', color:'#7dd3fc', marginRight:5, fontSize:11 }}>{s.code}</span>
                              <span style={{ color:'#cbd5e1', fontSize:11 }}>{s.display.substring(0,38)}â€¦</span>
=======
                  <div className="ps-searchpage-section-mb4"><SectionLabel title="SNOMED CT" active={activeSection==='snomed'} /></div>
                  <div className="ps-searchpage-input-row" ref={snomedRef}>
                    <div className="ps-searchpage-rel-wrap--flex1">
                      <input type="text" value={snomedQuery} onChange={e=>setSnomedQuery(e.target.value)} onFocus={onF} onBlur={onB} data-section="snomed" className="ps-searchpage-filter-input" placeholder="Search concept or description…" />
                      {showSnomedDrop&&(
                        <div className={DROPDOWN_CLASS}>
                          {snomedSuggestions.map(s=>(
                            <button key={s.code} type="button" onClick={()=>addSnomed(s)} className={DROP_BTN_CLASS}>
                              <span className="ps-searchpage-dropdown-code ps-searchpage-dropdown-code--snomed">{s.code}</span>
                              <span className="ps-searchpage-dropdown-desc">{s.display.substring(0,38)}…</span>
>>>>>>> upstream/main
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <BrowseBtn onClick={()=>setSnomedModal(true)} count={snomedList.length||undefined} />
                  </div>
                  {snomedList.length>0&&(
<<<<<<< HEAD
                    <div style={{ marginTop:4, display:'flex', flexWrap:'wrap', gap:3 }}>
=======
                    <div className="ps-searchpage-pill-row--mt4">
>>>>>>> upstream/main
                      {snomedList.map(s=><Chip key={s.code} label={s.code} title={`SNOMED CT: ${s.display}`} onRemove={()=>setSnomedList(p=>p.filter(x=>x.code!==s.code))} accent='#8B5CF6' />)}
                    </div>
                  )}
                </div>

<<<<<<< HEAD
                {/* ICD Codes â€” unified ICD-10 / ICD-11 / ICD-O */}
                <div onMouseEnter={()=>setActiveSection('icd')} onMouseLeave={()=>setActiveSection(s=>s==='icd'?'':s)} style={{ paddingBottom:8 }}>
                  <div style={{marginBottom:4}}><SectionLabel title="ICD Codes" active={activeSection==='icd'} /></div>
                  <div style={{ display:'flex', gap:4 }} ref={icdRef}>
                    <div style={{ position:'relative', flex:1 }}>
                      <input type="text" value={icdQuery} onChange={e=>setIcdQuery(e.target.value)} onFocus={onF} onBlur={onB} data-section="icd" style={INPUT} placeholder="Search ICD-10 code or descriptionâ€¦" />
                      {showIcdDrop&&(
                        <div className="ps-scroll" style={DROPDOWN_STYLE}>
                          {icdSuggestions.map(s=>(
                            <button key={s.code} type="button" onClick={()=>addIcd(s)} style={DROP_BTN}
                              onMouseEnter={e=>(e.currentTarget.style.background='rgba(8,145,178,0.15)')} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                              <span style={{ fontFamily:'monospace', color:'#c4b5fd', marginRight:5, fontSize:11 }}>{s.code}</span>
                              <span style={{ color:'#cbd5e1', fontSize:11 }}>{s.display.substring(0,38)}â€¦</span>
=======
                {/* ICD Codes ”” unified ICD-10 / ICD-11 / ICD-O */}
                <div onMouseEnter={()=>setActiveSection('icd')} onMouseLeave={()=>setActiveSection(s=>s==='icd'?'':s)} className="ps-searchpage-icd-section-pb">
                  <div className="ps-searchpage-section-mb4"><SectionLabel title="ICD Codes" active={activeSection==='icd'} /></div>
                  <div className="ps-searchpage-input-row" ref={icdRef}>
                    <div className="ps-searchpage-rel-wrap--flex1">
                      <input type="text" value={icdQuery} onChange={e=>setIcdQuery(e.target.value)} onFocus={onF} onBlur={onB} data-section="icd" className="ps-searchpage-filter-input" placeholder="Search ICD-10 code or description…" />
                      {showIcdDrop&&(
                        <div className={`ps-scroll ${DROPDOWN_CLASS}`}>
                          {icdSuggestions.map(s=>(
                            <button key={s.code} type="button" onClick={()=>addIcd(s)} className={DROP_BTN_CLASS}>
                              <span className="ps-searchpage-dropdown-code ps-searchpage-dropdown-code--icd">{s.code}</span>
                              <span className="ps-searchpage-dropdown-desc">{s.display.substring(0,38)}…</span>
>>>>>>> upstream/main
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <BrowseBtn onClick={()=>setIcdModal(true)} count={icdCodes.length||undefined} />
                  </div>
                  {icdCodes.length>0&&(
<<<<<<< HEAD
                    <div style={{ marginTop:4, display:'flex', flexWrap:'wrap', gap:3 }}>
=======
                    <div className="ps-searchpage-pill-row--mt4">
>>>>>>> upstream/main
                      {icdCodes.map(s=>{
                        const icdAccent = s.system==='ICD-11'?'#F59E0B':s.system?.startsWith('ICD-O')?'#10B981':'#8B5CF6';
                        return <Chip key={`${s.system}-${s.code}`} label={`${s.system} ${s.code}`} title={s.display} onRemove={()=>setIcdCodes(p=>p.filter(x=>x.code!==s.code))} accent={icdAccent} />;
                      })}
                    </div>
                  )}
                </div>

              </div>{/* end scrollable filters */}

              {/* Action buttons */}
<<<<<<< HEAD
              <div style={{ padding:'10px 16px 12px', borderTop:'1px solid rgba(255,255,255,0.05)', flexShrink:0, display:'flex', gap:8 }}>
                <button type="button" onClick={handleClear} style={{ flex:1, borderRadius:8, border:'1px solid rgba(148,163,184,0.3)', background:'transparent', color:'#64748b', padding:'8px', fontSize:12, cursor:'pointer' }}>Clear</button>
                <button type="submit" disabled={isSearching} style={{ flex:2.5, borderRadius:8, border:'none', background:isSearching?'#0f172a':'#22c55e', color:isSearching?'#64748b':'#022c22', padding:'8px', fontSize:13, fontWeight:700, cursor:isSearching?'default':'pointer' }}>
                  {isSearching?'Searchingâ€¦':'Search Cases'}
=======
              <div className="ps-search-actions">
                <button type="button" onClick={handleClear} className="ps-search-btn-clear">Clear</button>
                <button type="submit" disabled={isSearching} className="ps-search-btn-submit">
                  {isSearching?'Searching…':'Search Cases'}
>>>>>>> upstream/main
                </button>
              </div>

            </form>
<<<<<<< HEAD
          </aside>

          {/* â”€â”€ Results pane â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div data-capture-hide="true" style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', overflow:'hidden', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12 }}>

            {/* Summary bar */}
            <div style={{ padding:'9px 20px', flexShrink:0, borderBottom:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.02)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
              {summary ? (
                <p style={{ margin:0, fontSize:12, color:'#94a3b8', lineHeight:1.5, flex:1 }}>
                  <span style={{ color:'#94a3b8', marginRight:6 }}>ðŸ”</span>
                  {summary.split(' Â· ').map((part,i,arr)=>(
                    <React.Fragment key={i}>
                      <span style={{ color:i===0?'#cbd5e1':'#7dd3fc', fontWeight:i===0?400:500 }}>{part}</span>
                      {i<arr.length-1&&<span style={{ color:'#1e293b', margin:'0 5px' }}>Â·</span>}
=======
            </>
            )}
          </aside>

          {/* â”€â”€ Results pane â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div data-capture-hide="true" className="ps-search-results-pane">

            {/* Summary bar */}
            <div className="ps-search-summary-bar">
              {summary ? (
                <p className="ps-searchpage-summary-text">
                  
                  {summary.split(' · ').map((part,i,arr)=>(
                    <React.Fragment key={i}>
                      <span className={i===0 ? 'ps-searchpage-summary-part--first' : 'ps-searchpage-summary-part'}>{part}</span>
                      {i<arr.length-1&&<span className="ps-searchpage-summary-sep">·</span>}
>>>>>>> upstream/main
                    </React.Fragment>
                  ))}
                </p>
              ) : (
<<<<<<< HEAD
                <p style={{ margin:0, fontSize:12, color:'#94a3b8' }}>Set filters and press <strong style={{ color:'#22c55e' }}>Search Cases</strong> to begin</p>
              )}
              <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
                {results!==null&&<span style={{ fontSize:12, color:'#94a3b8' }}>{results.length} case{results.length!==1?'s':''}</span>}
                {results!==null&&results.length>0&&(
                  <button type="button" style={{ border:'1px solid rgba(148,163,184,0.2)', background:'transparent', color:'#64748b', borderRadius:6, padding:'3px 10px', fontSize:11, cursor:'pointer' }}>Export CSV</button>
=======
                <p className="ps-searchpage-summary-empty">Set filters and press <strong className="ps-searchpage-summary-cta">Search Cases</strong> to begin</p>
              )}
              <div className="ps-search-summary-actions">
                {results!==null&&<span className="ps-searchpage-result-count">{results.length} case{results.length!==1?'s':''}</span>}
                {results!==null&&results.length>0&&(
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="ps-searchpage-export-btn"
                  >Export CSV</button>
>>>>>>> upstream/main
                )}
              </div>
            </div>

<<<<<<< HEAD
            {/* Result table â€” WorklistTable owns its own internal scroll */}
            <div style={{ flex:1, minHeight:0, display:'flex', flexDirection:'column', overflow:'hidden' }}>
              {hasSearched
                ? <WorklistTable key={results?.length ?? 0} cases={results??[]} activeFilter="all" selectedIndex={selectedResultIndex} onRowSelect={setSelectedResultIndex} onBeforeNavigate={(_caseId)=>sessionStorage.setItem('pathscribe:navFrom','search')} />
                : <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#1e293b', fontSize:13 }}>No search run yet</div>
              }
            </div>
=======
            {/* Result table — WorklistTable owns its own internal scroll
                (.wl-table-scroll). minWidth:0 here (and on .ps-search-results-body
                in pathscribe.css) is required for that to actually kick in —
                without it, the 1100px-wide table can push this flex chain wider
                instead of being clamped, which only shows up as truncation on
                narrower viewports rather than a visible bug on a wide monitor. */}
            <div ref={wrapperRef} className="ps-search-table-wrap">
              {hasSearched
                ? <WorklistTable key={searchGeneration} cases={results??[]} activeFilter="all" selectedIndex={selectedResultIndex} onRowSelect={setSelectedResultIndex} onBeforeNavigate={(_caseId)=>sessionStorage.setItem('pathscribe:navFrom','search')} tableHeight={tableHeight} forceCardView flagDefinitions={flagDefinitions} />
                : <div className="ps-searchpage-no-search">No search run yet</div>
              }
            </div>
            {hasSearched && hasMoreResults && (
              <div className="ps-searchpage-loadmore-row">
                <button
                  type="button"
                  onClick={loadMoreResults}
                  disabled={isLoadingMore}
                  className={`ps-searchpage-loadmore-btn${isLoadingMore ? ' ps-searchpage-loadmore-btn--loading' : ''}`}
                >
                  {isLoadingMore ? 'Loading…' : `Load More (${SEARCH_PAGE_SIZE} more)`}
                </button>
              </div>
            )}
>>>>>>> upstream/main
          </div>
          </div>{/* end inner flex row */}
        </main>
      </div>

      {/* â”€â”€ Lookup modals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}

      {specimenModal&&(
        <LookupModal
          title="Specimen Dictionary"
          subtitle={`${specimenDictionary.filter(s=>s.active).length} specimens across ${[...new Set(specimenDictionary.map(s=>s.type))].length} types`}
          selectedCount={specimenList.length}
          onClose={()=>setSpecimenModal(false)}
        >
          <SpecimenLookupContent
            specimens={specimenDictionary}
            selected={specimenList}
            onToggle={name => setSpecimenList(p => p.includes(name) ? p.filter(x=>x!==name) : [...p, name])}
          />
        </LookupModal>
      )}

      {snomedModal&&(
        <LookupModal
          title="SNOMED CT"
          subtitle={`Search across ${SNOMED_AXIS_META.length} axes: ${SNOMED_AXIS_META.map(m=>m.label).join(", ")}`}
          selectedCount={snomedList.length}
          onClose={()=>setSnomedModal(false)}
        >
          <SnomedModalContent
            selected={snomedList}
            onToggle={c=>setSnomedList(p=>p.some(x=>x.code===c.code)?p.filter(x=>x.code!==c.code):[...p,c])}
          />
        </LookupModal>
      )}

      {icdModal&&(
        <LookupModal
          title="ICD Codes"
          subtitle="Select codes across active ICD systems"
          selectedCount={icdCodes.length}
          onClose={()=>setIcdModal(false)}
        >
          <IcdModalContent
            selected={icdCodes}
            onToggle={c=>setIcdCodes(p=>p.some(x=>x.code===c.code)?p.filter(x=>x.code!==c.code):[...p,c])}
            icd10Active={config.terminologyConfig.icd10.active}
            icd11Active={config.terminologyConfig.icd11.active}
            icdoActive={config.terminologyConfig.icdo.active}
          />
        </LookupModal>
      )}

      {synopticModal&&(
        <LookupModal title="Synoptic Protocol" subtitle={`${ALL_SYNOPTICS.length} protocols across ${Array.from(new Set(ALL_SYNOPTICS.map(s=>s.category))).length} categories`} selectedCount={synopticIds.length} onClose={()=>setSynopticModal(false)}>
          <SynopticLookupContent selected={synopticIds} onToggle={id=>toggle(id,synopticIds,setSynopticIds)} />
        </LookupModal>
      )}

      {flagsModal&&(
<<<<<<< HEAD
        <LookupModal title="Case Flags" subtitle={`${ALL_FLAGS.length} available flags`} selectedCount={flagsList.length} onClose={()=>setFlagsModal(false)}>
          <FlagsLookupContent selected={flagsList} onToggle={f=>toggle(f,flagsList,setFlagsList)} />
=======
        <LookupModal title="Case Flags" subtitle={`${realFlagNames.length} available flags`} selectedCount={flagsList.length} onClose={()=>setFlagsModal(false)}>
          <FlagsLookupContent flags={realFlagNames} selected={flagsList} onToggle={f=>toggle(f,flagsList,setFlagsList)} />
>>>>>>> upstream/main
        </LookupModal>
      )}

      {pathModal&&(
        <LookupModal title="Pathologist" subtitle="Filter by assigned pathologist" selectedCount={pathologistIds.length} onClose={()=>setPathModal(false)}>
<<<<<<< HEAD
          <UserLookupContent users={ALL_PATHOLOGISTS} selected={pathologistIds} onToggle={id=>toggle(id,pathologistIds,setPathologistIds)} />
=======
          <UserLookupContent users={pathologists} selected={pathologistIds} onToggle={id=>toggle(id,pathologistIds,setPathologistIds)} />
>>>>>>> upstream/main
        </LookupModal>
      )}

      {attendingModal&&(
        <LookupModal title="Attending Physician" subtitle="Filter by referring or attending physician" selectedCount={attendingIds.length} onClose={()=>setAttendingModal(false)}>
<<<<<<< HEAD
          <UserLookupContent users={ALL_ATTENDINGS} selected={attendingIds} onToggle={id=>toggle(id,attendingIds,setAttendingIds)} accent="#10B981" />
        </LookupModal>
      )}

      {/* â”€â”€ Profile modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {isProfileOpen&&(
        <div style={modalOverlay} onClick={()=>setIsProfileOpen(false)}>
          <div style={{ width:400, backgroundColor:'#111', borderRadius:20, padding:40, border:'1px solid rgba(8,145,178,0.3)', textAlign:'center' }} onClick={e=>e.stopPropagation()}>
            <div style={{ color:'#0891B2', fontSize:24, fontWeight:700, marginBottom:24 }}>User Preferences</div>
            <button onClick={()=>setIsProfileOpen(false)} style={{ padding:'12px 24px', borderRadius:10, background:'rgba(8,145,178,0.15)', border:'1px solid rgba(8,145,178,0.3)', color:'#0891B2', fontWeight:600, fontSize:15, cursor:'pointer', width:'100%' }}>Close</button>
=======
          <UserLookupContent users={attendings} selected={attendingIds} onToggle={id=>toggle(id,attendingIds,setAttendingIds)} accent="#10B981" />
        </LookupModal>
      )}

      {/* Client browse modal */}
      {clientModal && (
        <LookupModalX
          title="Submitting Client"
          subtitle="Filter cases by submitting facility"
          selectedCount={clientIds.length}
          onClose={() => setClientModal(false)}
          onClear={() => setClientIds([])}
          onDone={() => setClientModal(false)}
        >
          <ClientLookupContent
            clients={clients}
            selected={clientIds}
            onToggle={id => toggle(id, clientIds, setClientIds)}
          />
        </LookupModalX>
      )}

      {/* Computational Flags browse modal */}
      {compFlagsModal && (
        <LookupModalX
          title="Computational Flags"
          subtitle="Filter by live LIS test result flags"
          selectedCount={compFlagsList.length}
          onClose={() => setCompFlagsModal(false)}
          onClear={() => setCompFlagsList([])}
          onDone={() => setCompFlagsModal(false)}
        >
          <CompFlagsLookupContent
            flags={realCompFlagNames}
            selected={compFlagsList}
            onToggle={f => toggle(f, compFlagsList, setCompFlagsList)}
          />
        </LookupModalX>
      )}

      {/* â”€â”€ Profile modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {isProfileOpen&&(
        <div className="ps-modal-overlay" onClick={()=>setIsProfileOpen(false)}>
          <div className="ps-searchpage-profile-modal" onClick={e=>e.stopPropagation()}>
            <div className="ps-searchpage-modal-title">User Preferences</div>
            <button onClick={()=>setIsProfileOpen(false)} className="ps-searchpage-modal-close-btn">Close</button>
>>>>>>> upstream/main
          </div>
        </div>
      )}

      {/* â”€â”€ Resources modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {isResourcesOpen&&(
<<<<<<< HEAD
        <div style={modalOverlay} onClick={()=>setIsResourcesOpen(false)}>
          <div style={{ width:500, maxHeight:'80vh', overflowY:'auto', backgroundColor:'#111', borderRadius:20, padding:40, border:'1px solid rgba(8,145,178,0.3)' }} onClick={e=>e.stopPropagation()}>
            <div style={{ color:'#0891B2', fontSize:24, fontWeight:700, marginBottom:24, textAlign:'center' }}>Quick Links</div>
            {Object.entries(quickLinks).map(([section,links])=>(
              <div key={section} style={{ marginBottom:24 }}>
                <div style={{ color:'#94a3b8', fontSize:12, fontWeight:700, marginBottom:12, textTransform:'uppercase' }}>{section}</div>
                {links.map((link,i)=>(
                  <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" onClick={()=>setIsResourcesOpen(false)}
                    style={{ display:'block', color:'#cbd5e1', textDecoration:'none', padding:'12px 16px', fontSize:16, borderRadius:8, marginBottom:8 }}
                    onMouseEnter={e=>{e.currentTarget.style.color='#0891B2';e.currentTarget.style.background='rgba(8,145,178,0.1)';}}
                    onMouseLeave={e=>{e.currentTarget.style.color='#cbd5e1';e.currentTarget.style.background='transparent';}}>â†’ {link.title}</a>
                ))}
              </div>
            ))}
            <button onClick={()=>setIsResourcesOpen(false)} style={{ padding:'12px 24px', borderRadius:10, background:'rgba(8,145,178,0.15)', border:'1px solid rgba(8,145,178,0.3)', color:'#0891B2', fontWeight:600, fontSize:15, cursor:'pointer', width:'100%' }}>Close</button>
=======
        <div className="ps-modal-overlay" onClick={()=>setIsResourcesOpen(false)}>
          <div className="ps-searchpage-resources-modal" onClick={e=>e.stopPropagation()}>
            <div className="ps-searchpage-modal-title ps-searchpage-modal-title--resources">Quick Links</div>
            {Object.entries(quickLinks).map(([section,links])=>(
              <div key={section} className="ps-searchpage-resource-section">
                <div className="ps-searchpage-resource-section-label">{section}</div>
                {links.map((link,i)=>(
                  <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" onClick={()=>setIsResourcesOpen(false)}
                    className="ps-searchpage-resource-link">→ {link.title}</a>
                ))}
              </div>
            ))}
            <button onClick={()=>setIsResourcesOpen(false)} className="ps-searchpage-modal-close-btn">Close</button>
>>>>>>> upstream/main
          </div>
        </div>
      )}


      {/* â”€â”€ Logout modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {showLogoutModal&&(
<<<<<<< HEAD
        <div style={modalOverlay}>
          <div style={{ width:400, backgroundColor:'#111', padding:40, borderRadius:28, textAlign:'center', border:'1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize:48, marginBottom:20 }}>âš ï¸</div>
            <h2 style={{ fontSize:24, fontWeight:800, color:'#fff', margin:'0 0 12px' }}>Sign out?</h2>
            <p style={{ color:'#94a3b8', marginBottom:30, lineHeight:1.6, fontSize:15 }}>You'll be signed out of PathScribeAI.</p>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <button onClick={()=>setShowLogoutModal(false)} style={{ padding:16, borderRadius:12, background:'#0891B2', border:'none', color:'#fff', fontWeight:700, fontSize:16, cursor:'pointer' }}>â† Stay on Search</button>
              <button onClick={handleLogout} style={{ padding:16, borderRadius:12, background:'transparent', border:'2px solid #F59E0B', color:'#F59E0B', fontWeight:600, fontSize:15, cursor:'pointer' }}
                onMouseEnter={e=>{e.currentTarget.style.background='#F59E0B';e.currentTarget.style.color='#000';}}
                onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='#F59E0B';}}>Sign Out</button>
=======
        <div className="ps-modal-overlay">
          <div className="ps-searchpage-logout-modal">
            <div className="ps-searchpage-logout-icon">⚠️</div>
            <h2 className="ps-searchpage-logout-title">Sign out?</h2>
            <p className="ps-searchpage-logout-body">You'll be signed out of PathScribeAI.</p>
            <div className="ps-searchpage-logout-actions">
              <button onClick={()=>setShowLogoutModal(false)} className="ps-searchpage-logout-stay-btn">← Stay on Search</button>
              <button onClick={handleLogout} className="ps-searchpage-logout-signout-btn">Sign Out</button>
>>>>>>> upstream/main
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchPage;



