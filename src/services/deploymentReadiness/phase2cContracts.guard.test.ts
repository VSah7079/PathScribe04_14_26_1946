// src/services/deploymentReadiness/phase2cContracts.guard.test.ts
// Batch 542 (PS-539 phase 2c): the contracts written from Pete's decisions stay
// true to the code. CLAUDE.md rule 6: docs lag the code; this makes them fail
// here instead.
//   - MESSAGE_BUS_API.md (D1) names the browser stand-ins it replaces: each
//     file it cites exists, and every server job of the readiness review's §7
//     has a place in it.
//   - ASYNC_EXPORT_API.md (D7) and asyncExportContract.ts cover every export
//     capability in the catalog, and nothing else.
//   - BLOB_STORAGE_API.md (Batch 543) cites only real files and names each
//     place the browser holds a file or a link to one today.
//   - INTERFACE_ENGINE_EDGE.md (Batch 545, decision D6) cites only real
//     files, has a row for every answer engineEdgeContract.ts defines, and
//     the review's §6.2 points to it.
//   - SITE_AGENT_API.md (Batch 546, decision D3) cites only real files, places
//     every error the agent reports, the review's §6.3 points to it, and the
//     browser never reaches the Node print transports (F3).
//   - Batch 544 (Pete, Oct 13, 2026): images and attachments are links only.
//     No screen takes an image file, and the contract plans no container for
//     images or attachments.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CAPABILITY_CATALOG } from '../authorization/capabilityCatalog';
import { EXPORT_KINDS } from '../exports/asyncExportContract';
import { INBOUND_RESPONSES } from '../interfaceEngine/engineEdgeContract';
import {
  AGENT_ERROR_CODES, AGENT_HEALTH_LIMITS, AGENT_JOB_LIMITS, ENROLLMENT_LIMITS, PICKUP_DEDUPE_DAYS, SHARE_PICKUP_DEFAULTS, agentFailureRetriable,
} from '../siteAgent/siteAgentContract';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

function allFiles(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.git', 'venv', 'test-results', 'e2e-results'].includes(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) allFiles(p, out); else out.push(p.slice(ROOT.length + 1).replace(/\\/g, '/'));
  }
  return out;
}
const files = allFiles(ROOT);
const citedFiles = (text: string) => [...new Set([...text.matchAll(/`([A-Za-z0-9_./-]+\.(?:ts|tsx|py|md|json))`/g)].map(m => m[1]))];
const exists = (c: string) => files.some(f => f === c || f.endsWith(`/${c}`));

describe('MESSAGE_BUS_API.md (decision D1)', () => {
  const text = read('docs/architecture/MESSAGE_BUS_API.md');

  it('every file it cites exists', () => {
    expect(citedFiles(text).filter(c => !exists(c))).toEqual([]);
  });

  it('has a job for every server job the readiness review lists (§7)', () => {
    const review = read('docs/architecture/DEPLOYMENT_READINESS_REVIEW.md');
    const section = review.slice(review.indexOf('## 7. Server jobs'), review.indexOf('## 8.'));
    // The browser stand-in named in each row of the review's §7 table.
    const standIns = [
      'startDeliveryBackgroundWork', 'startReleaseBackgroundWork', 'recordExpiries', 'escalateStaleRegistrySubmissions',
      'sendFollowUpAlertsLive', 'supportAccessService.expire', 'cytologyHistologyCorrelationLive', 'networkPrintJobs',
    ];
    const rows = section.split('\n').filter(l => l.startsWith('| ') && !l.startsWith('| Job') && !l.startsWith('|---'));
    expect(rows.length, 'the review still has its job rows').toBeGreaterThanOrEqual(12);
    for (const n of standIns) {
      expect(section, `review §7 names ${n}`).toContain(n);
      expect(text, `MESSAGE_BUS_API.md places ${n}`).toContain(n);
    }
    for (const job of ['Assist LIS polling', 'print-batch aggregation', 'Charge outbox', 'Cytology QC SLA']) expect(section, job).toContain(job);
    for (const kind of ['assist.pollLis', 'print.batchAggregation', 'charge.dispatch', 'cytology.roseSlaMonitor']) expect(text, kind).toContain(kind);
  });

  it('keeps the contract tests Pete asked for (one suite, every implementation)', () => {
    expect(text).toContain('MessageBusContractTests');
    expect(text).toMatch(/run against \*\*every implementation\*\*/);
  });
});

describe('ASYNC_EXPORT_API.md (decision D7)', () => {
  const text = read('docs/architecture/ASYNC_EXPORT_API.md');

  it('every file it cites exists', () => {
    expect(citedFiles(text).filter(c => !exists(c))).toEqual([]);
  });

  it('every export capability in the catalog has an export kind, and every kind is a catalog capability', () => {
    const catalog = CAPABILITY_CATALOG.map(c => c.key as string).filter(k => k.endsWith(':export')).sort();
    const kinds = Object.values(EXPORT_KINDS).map(k => k.capability as string).sort();
    expect(kinds).toEqual(catalog);
    expect(text).toContain(`There are ${kinds.length}, one per export capability`);
  });
});

describe('BLOB_STORAGE_API.md (file storage, Batch 543)', () => {
  const text = read('docs/architecture/BLOB_STORAGE_API.md');

  it('every file it cites exists', () => {
    expect(citedFiles(text).filter(c => !exists(c))).toEqual([]);
  });

  it('names every place the browser holds a file today, and each still exists', () => {
    const held: [string, string][] = [
      ['src/types/reports/ReportVersionRecord.ts', 'pdfBase64'],
      ['src/types/reportRelease/HeldRelease.ts', 'pdfBase64'],
      ['src/types/printing/PrintJob.ts', 'pdfBase64'],
      ['src/services/users/IUserService.ts', 'signatureUrl'],
      ['src/types/events/ReferralResultEventPayload.ts', 'pdfAttachmentUrl'],
      ['src/types/config/FacilityBranding.ts', 'headerLogoUrl'],
      ['src/services/organMapping/organMapFigures.ts', 'pngDataUrl'],
    ];
    for (const [file, field] of held) {
      expect(read(file), `${file} still has ${field}`).toContain(field);
      expect(text, `BLOB_STORAGE_API.md covers ${field} in ${file}`).toContain(file);
    }
  });

  it('links only: no screen reads an image file, and no image or attachment container is planned (Batch 544)', () => {
    const imageInputs = files.filter(f => /^src\/.*\.tsx$/.test(f) && !/\.test\.tsx$/.test(f))
      .filter(f => /type=["']file["'][^>]*accept=["'][^"']*image/.test(read(f)) || /accept=["'][^"']*image[^>]*type=["']file["']/.test(read(f)));
    expect(imageInputs).toEqual([]);
    expect(read('src/components/Config/Staff/StaffTab.tsx')).not.toMatch(/FileReader|readAsDataURL/);
    for (const c of ['images', 'attachments', 'signatures', 'branding', 'uploads-staging']) {
      expect(text, `no \`${c}\` container`).not.toMatch(new RegExp('^\\| `' + c + '` \\|', 'm'));
    }
    expect(text).toContain('PathScribe stores no images and no file attachments; it keeps links to them');
  });

  it('the review points to it', () => {
    expect(read('docs/architecture/DEPLOYMENT_READINESS_REVIEW.md')).toContain('BLOB_STORAGE_API.md');
  });
});

describe('INTERFACE_ENGINE_EDGE.md (decision D6, Batch 545)', () => {
  const text = read('docs/architecture/INTERFACE_ENGINE_EDGE.md');

  it('every file it cites exists', () => {
    expect(citedFiles(text).filter(c => !exists(c))).toEqual([]);
  });

  it('has a row for every answer the contract defines, with its status', () => {
    for (const [outcome, { status }] of Object.entries(INBOUND_RESPONSES)) {
      expect(text, outcome).toMatch(new RegExp(`\\| \`${outcome}\` \\| ${status} \\|`));
    }
  });

  it('the review points to it from its rules for the edge', () => {
    const review = read('docs/architecture/DEPLOYMENT_READINESS_REVIEW.md');
    const section = review.slice(review.indexOf('### 6.2'), review.indexOf('### 6.3'));
    expect(section).toContain('INTERFACE_ENGINE_EDGE.md');
  });

  it('F10 stays fixed: no engine webhook claims a message first and then answers 404', () => {
    const hooks = files.filter(f => /^api\/webhooks\/engine\/[^/]+\.ts$/.test(f) && !f.endsWith('.test.ts'));
    expect(hooks.length).toBeGreaterThanOrEqual(4);
    for (const f of hooks) {
      const src = read(f);
      if (src.includes('status: 404')) {
        expect(src, `${f} claims first and can answer 404`).not.toContain('claimMessageId(');
        expect(src, `${f} claims inside the update`).toContain('messageId: payload.messageId, eventType: EVENT_TYPE');
      }
    }
  });
});

describe('SITE_AGENT_API.md (decision D3, Batch 546)', () => {
  const text = read('docs/architecture/SITE_AGENT_API.md');

  it('every file it cites exists', () => {
    expect(citedFiles(text).filter(c => !exists(c))).toEqual([]);
  });

  it('its failure table places every error the agent reports, retried or not as the contract says', () => {
    const table = text.slice(text.indexOf('## 6. Failures'), text.indexOf('## 7.'));
    const rows = table.split('\n').filter(l => l.startsWith('| `'));
    for (const code of AGENT_ERROR_CODES) {
      const row = rows.find(r => r.includes(`\`${code}\``));
      expect(row, code).toBeDefined();
      expect(row!.includes('| yes |'), code).toBe(agentFailureRetriable(code, 'print.report'));
    }
  });

  it('states the contract\'s limits as the contract sets them', () => {
    expect(text).toContain(`${AGENT_JOB_LIMITS.leaseSeconds} s lease`);
    expect(text).toContain(`at most ${AGENT_JOB_LIMITS.maxInFlight} claimed jobs`);
    expect(text).toContain(`Report prints expire ${AGENT_JOB_LIMITS.reportPrintExpiryHours} hours`);
    expect(text).toContain(`label prints after ${AGENT_JOB_LIMITS.labelPrintExpiryMinutes} minutes`);
    expect(text).toContain(`valid for ${ENROLLMENT_LIMITS.certificateDays} days`);
    expect(text).toContain(`${ENROLLMENT_LIMITS.renewBeforeDays} days before expiry`);
    expect(text).toContain(`no heartbeat received for ${AGENT_HEALTH_LIMITS.offlineAfterSeconds} s`);
    expect(text).toContain(`disk is below ${AGENT_HEALTH_LIMITS.minDiskFreePercent}%`);
    expect(text).toContain(`within ${AGENT_HEALTH_LIMITS.certWarningDays} days`);
    expect(text).toContain(`${SHARE_PICKUP_DEFAULTS.maxFileMegabytes} MB by default`);
    expect(text).toContain(`changed for ${SHARE_PICKUP_DEFAULTS.minStableSeconds} s`);
    expect(text).toContain(`keeps keys for ${PICKUP_DEDUPE_DAYS} days`);
  });

  it('the review points to it from its on-site agent section', () => {
    const review = read('docs/architecture/DEPLOYMENT_READINESS_REVIEW.md');
    expect(review.slice(review.indexOf('### 6.3'), review.indexOf('## 7.'))).toContain('SITE_AGENT_API.md');
  });

  it('F3 stays fixed: a network print checks where it runs before reaching the Node transports', () => {
    const src = read('src/services/printing/attemptPrintDelivery.ts');
    const check = src.indexOf('canSendNetworkPrintHere()');
    expect(check).toBeGreaterThan(0);
    expect(check).toBeLessThan(src.indexOf('dispatchViaPrintProtocol(input.destination'));
  });
});
