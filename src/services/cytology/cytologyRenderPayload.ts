// src/services/cytology/cytologyRenderPayload.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 539 (PS-539 decision D2, Pete, Oct 12, 2026: "PDF that leaves
// PathScribe, and the browser only shows previews. As long as the preview
// matches exactly what gets sent out"). The cytology report as the report
// renderer draws it (functions/cytology_report.py): every line of text, in
// the report's language and date format, in order. Pure.
//
// One builder for the preview and for the release, so the two can't differ in
// wording; only an unsigned preview adds its watermark. The renderer lays the
// lines out (A4, 15 mm margins, embedded fonts, accession barcode, page X of Y)
// and adds nothing of its own.
//
// The content and order are those of the browser renderer this replaces
// (generateCytologyReportPdf.ts, removed in Batch 539): title; correction,
// addendum or preliminary banner; letterhead; patient; specimen type;
// adequacy; general categorization; interpretation; adjunctive testing;
// recommendations; addendum (on its own page when the lab says so); sign-off.
// ─────────────────────────────────────────────────────────────────────────────

import { renderPageSetup, type RenderPageSetup } from '../reportAppearance/pageSetup';
import { renderDocumentStyle, type RenderDocumentStyle } from '../reportAppearance/renderDocumentStyle';
import type { CytologyReportContent } from '@/types/cytology/CytologyReportContent';
import type { CytologyCaseReport } from '@/types/cytology/CytologyCaseReport';
import { formatDate, formatDateTime } from '@/utils/formatDate';
import { reportDateLocale } from '../reports/reportLanguage';
import { fillLabel, type CytologyPdfLabels } from './cytologyPdfLabels';
import { cytologyPreliminaryReasonText } from './cytologyPreliminaryReasons';

export interface CytologyRenderLine { text: string; bold?: boolean; size?: number }
export interface CytologyRenderSection { heading: string; lines: CytologyRenderLine[]; newPage?: boolean }
export interface CytologyRenderDocument {
  title: string;
  /** Code 128 of the accession, top right of the document's first page. */
  barcode?: string;
  banner?: CytologyRenderLine[];
  branding?: { logoBase64?: string; lines: CytologyRenderLine[] };
  sections: CytologyRenderSection[];
  /** The identity line on the document's pages after the first. */
  continuation?: string;
  /** This document's language and "Page {{page}} of {{total}}": a case report can mix languages,
   *  and each specimen prints as it does on its own (font and page label). */
  language?: string;
  pageLabel?: string;
}
export interface CytologyRenderPayload {
  template: 'cytology';
  outputFormat: 'pdf';
  language?: string;
  /** "Page {{page}} of {{total}}", in the report's language. */
  pageLabel: string;
  watermarkText?: string;
  metadata: { title: string; author: string; subject: string; timestamp: string };
  documents: CytologyRenderDocument[];
  /** The lab's page size and margins (Document Style). */
  pageSetup: RenderPageSetup;
  /** Batch 609 (PS-35): the lab's header, body and footer text style (Document Style). The cytology
   *  template prints in its embedded font whatever the family; size, weight, case and underline apply. */
  documentStyle: RenderDocumentStyle;
}

export interface CytologyRenderOptions {
  /** An unsigned preview's watermark (PRELIMINARY — SUBJECT TO CHANGE, in the report's language). */
  watermarkText?: string;
  /** The letterhead logo, by its URL, already fetched (base64). */
  logos?: Readonly<Record<string, string>>;
  /** Overrides the lab's page setup (tests). */
  pageSetup?: RenderPageSetup;
  /** Overrides the lab's document style (tests). */
  documentStyle?: RenderDocumentStyle;
}

const join = (parts: (string | undefined | false)[]) => parts.filter(Boolean).join(' · ');

/** One signed report (or preview) as a document. */
export function cytologyReportDocument(content: CytologyReportContent, labels: CytologyPdfLabels, logos: Readonly<Record<string, string>> = {}): CytologyRenderDocument {
  const L = labels;
  const locale = reportDateLocale(content);
  const day = (iso: string) => formatDate(iso, locale);
  const dayTime = (iso: string) => formatDateTime(iso, locale);
  const line = (text: string, extra: Omit<CytologyRenderLine, 'text'> = {}): CytologyRenderLine => ({ text, ...extra });

  const banner: CytologyRenderLine[] = [];
  if (content.revision) {
    const r = content.revision;
    banner.push(line(r.kind === 'correction' ? L.correctedReport : L.addendumBanner, { bold: true, size: 12 }));
    banner.push(line(fillLabel(L.reason, { reason: r.reason }), { size: 9 }));
    if (r.kind === 'correction' && r.previouslyReportedAs) banner.push(line(fillLabel(L.previouslyReported, { diagnosis: r.previouslyReportedAs }), { size: 9 }));
  }
  if (content.preliminary) {
    const p = content.preliminary;
    banner.push(line(L.preliminaryBanner, { bold: true, size: 12 }));
    banner.push(line(L.preliminaryNotice, { size: 9 }));
    banner.push(line(fillLabel(L.reason, { reason: cytologyPreliminaryReasonText(p.reason, L) }), { size: 9 }));
    if (p.note) banner.push(line(fillLabel(L.preliminaryNote, { note: p.note }), { size: 9 }));
  }

  let branding: CytologyRenderDocument['branding'];
  if (content.printBranding) {
    const b = content.printBranding;
    const lines = [line(b.facilityName, { bold: true })];
    const address = [b.address, b.city, b.state, b.zip].filter(Boolean).join(', ');
    if (address) lines.push(line(address, { size: 8 }));
    const reg = [
      b.directorName ? fillLabel(L.director, { name: b.directorName }) : undefined,
      b.cliaOrIsoNumber ? fillLabel(L.clia, { number: b.cliaOrIsoNumber }) : undefined,
    ].filter(Boolean).join('   ');
    if (reg) lines.push(line(reg, { size: 8 }));
    const logo = b.headerLogoUrl ? logos[b.headerLogoUrl] : undefined;
    branding = { lines, ...(logo ? { logoBase64: logo } : {}) };
  }

  const sections: CytologyRenderSection[] = [];
  const patient = [
    line(join([content.patientName, content.patientDateOfBirth && fillLabel(L.dob, { date: day(content.patientDateOfBirth) }), content.patientMrn && fillLabel(L.mrn, { mrn: content.patientMrn })])),
    line(join([fillLabel(L.accession, { accession: content.accessionNumber }), content.orderingProvider && fillLabel(L.orderingProvider, { name: content.orderingProvider })])),
  ];
  if (content.specimenCollectedAt) patient.push(line(fillLabel(L.collected, { date: dayTime(content.specimenCollectedAt) })));
  if (content.specimenReceivedAt) patient.push(line(fillLabel(L.received, { date: dayTime(content.specimenReceivedAt) })));
  if (content.lastMenstrualPeriod) patient.push(line(fillLabel(L.lmp, { date: day(content.lastMenstrualPeriod) })));
  sections.push({ heading: L.patient, lines: patient });

  const prep = content.preparationMethod ? ` (${content.preparationMethod === 'Liquid-Based' ? L.prepLiquidBased : L.prepConventional})` : '';
  sections.push({ heading: L.specimenType, lines: [line(content.specimenTypeDescription + prep)] });
  sections.push({ heading: L.specimenAdequacy, lines: content.specimenAdequacy.map(a => line(`• ${a}`)) });
  if (content.generalCategorization) sections.push({ heading: L.generalCategorization, lines: [line(content.generalCategorization)] });
  sections.push({ heading: L.interpretation, lines: [line(content.primaryInterpretation), ...content.additionalInterpretations.map(a => line(`• ${a}`))] });

  if (content.hpvResult || content.computerAssistedScreening) {
    const adj: CytologyRenderLine[] = [];
    if (content.hpvResult) adj.push(line(fillLabel(L.hpv, { result: content.hpvResult })));
    const cas = content.computerAssistedScreening;
    if (cas) adj.push(line(fillLabel(L.computerAssisted, { value: `${cas.used ? L.yes : L.no}${cas.system ? ` (${cas.system})` : ''}` })));
    sections.push({ heading: L.adjunctive, lines: adj });
  }
  if (content.recommendations.length > 0 || content.educationalNotes) {
    sections.push({ heading: L.recommendations, lines: [...content.recommendations.map(r => line(`• ${r}`)), ...(content.educationalNotes ? [line(content.educationalNotes)] : [])] });
  }
  if (content.addendumText) {
    sections.push({ heading: L.addendum, lines: [line(content.addendumText)], ...(content.forceAddendumOnDedicatedPage ? { newPage: true } : {}) });
  }
  const signOff: CytologyRenderLine[] = [];
  if (content.screenedBy) signOff.push(line(fillLabel(L.screenedBy, { name: content.screenedBy.name })));
  // Batch 533: a preliminary is released, not signed out.
  signOff.push(line(fillLabel(content.preliminary ? L.preliminaryReleasedBy : L.signedBy, {
    name: content.signedBy.name, role: content.signedBy.isPathologist ? L.rolePathologist : L.roleCytotechnologist, date: dayTime(content.signedAt),
  })));
  sections.push({ heading: L.signOff, lines: signOff });

  return {
    title: L.title,
    barcode: content.accessionNumber,
    ...(banner.length ? { banner } : {}),
    ...(branding ? { branding } : {}),
    sections,
    continuation: join([content.patientName, content.patientMrn && fillLabel(L.mrn, { mrn: content.patientMrn }), fillLabel(L.accession, { accession: content.accessionNumber })]),
    ...(content.language ? { language: content.language } : {}),
    pageLabel: L.continuationPage,
  };
}

/** One report (a specimen's signed report, a preliminary, or a preview). */
export function buildCytologyReportRenderPayload(content: CytologyReportContent, labels: CytologyPdfLabels, options: CytologyRenderOptions = {}): CytologyRenderPayload {
  return {
    template: 'cytology',
    outputFormat: 'pdf',
    ...(content.language ? { language: content.language } : {}),
    pageLabel: labels.continuationPage,
    ...(options.watermarkText ? { watermarkText: options.watermarkText } : {}),
    metadata: { title: fillLabel(labels.metadataTitle, { accession: content.accessionNumber }), author: content.signedBy.name, subject: labels.metadataSubject, timestamp: content.signedAt },
    documents: [cytologyReportDocument(content, labels, options.logos)],
    pageSetup: options.pageSetup ?? renderPageSetup(),
    documentStyle: options.documentStyle ?? renderDocumentStyle(),
  };
}

/** Whether the case report needs its first page (pure): more than one specimen, or any not reported. */
export function caseReportNeedsCover(report: Pick<CytologyCaseReport, 'specimens'>): boolean {
  return report.specimens.length !== 1 || !report.specimens[0].record;
}

/**
 * Batch 532 (Pete, Oct 12): the consolidated case report. One specimen,
 * reported: that specimen's report as signed. Otherwise a first page listing
 * every specimen and its status, then each reported specimen's report (each in
 * its own report's language), in case order.
 */
export function buildCytologyCaseRenderPayload(
  report: CytologyCaseReport,
  labelsFor: (language: string | undefined) => CytologyPdfLabels,
  options: CytologyRenderOptions = {},
): CytologyRenderPayload {
  const L = labelsFor(report.language);
  const reported = report.specimens.filter(s => s.record);
  const documents: CytologyRenderDocument[] = [];
  if (caseReportNeedsCover(report)) {
    const lines: CytologyRenderLine[] = [];
    for (const sp of report.specimens) {
      lines.push({ text: sp.description ? fillLabel(L.caseSpecimen, { label: sp.label, description: sp.description }) : sp.label, bold: true });
      lines.push({ text: sp.record ? L.caseReported : fillLabel(L.caseNotReported, { reason: sp.notReportedReason ?? '' }) });
    }
    documents.push({
      title: fillLabel(L.caseTitle, { accession: report.accessionNumber }), sections: [{ heading: L.caseContents, lines }],
      ...(report.language ? { language: report.language } : {}), pageLabel: L.continuationPage,
    });
  }
  for (const sp of reported) documents.push(cytologyReportDocument(sp.record!.reportContent, labelsFor(sp.record!.reportContent.language), options.logos));
  const newest = reported.map(s => s.record!.signedAt).sort().pop() ?? new Date(0).toISOString();
  return {
    template: 'cytology',
    outputFormat: 'pdf',
    ...(report.language ? { language: report.language } : {}),
    pageLabel: L.continuationPage,
    ...(options.watermarkText ? { watermarkText: options.watermarkText } : {}),
    metadata: {
      title: report.accessionNumber,
      author: reported.map(s => s.record!.signedBy.userName).filter((n, i, a) => a.indexOf(n) === i).join(', '),
      subject: L.metadataSubject,
      timestamp: newest,
    },
    documents,
    pageSetup: options.pageSetup ?? renderPageSetup(),
    documentStyle: options.documentStyle ?? renderDocumentStyle(),
  };
}

/** The letterhead logo URLs a set of reports needs. */
export function cytologyLogoUrls(contents: readonly CytologyReportContent[]): string[] {
  return [...new Set(contents.map(c => c.printBranding?.headerLogoUrl).filter((u): u is string => !!u))];
}
