// src/components/Config/RegistryGoLive/RegistryGoLivePanel.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 423 (Registry Engine SRS v2.1, step 7), reworked in Batch 424 for the
// two PathScribe instances. On both registry settings screens (Cytology →
// Screening registry reporting; System → Cancer Registry Reporting).
//
// Validation instance: the connection's state (Pending → Testing →
// Validated), the data-sharing agreement, the synthetic test suite, and the
// validation record to carry to production.
// Production instance: Pending (real results held) → Live: importing that
// validation record, requesting go-live with the pre-checks, approving in
// stated capacities with re-entered credentials (SignatureConfirmModal, the
// same prompt as report sign-out), the permanent statement, stopping live
// reporting.
// Both: what the latest template changed, the site's local changes (the
// overlay) with the ones a newer template touched, the engine adapter's local
// rules, the approval settings and the history.
//
// Rendering only: decisions are in services/registryGoLive/.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import '../../../pathscribe.css';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { SignatureConfirmModal } from '@/components/Signing/SignatureConfirmModal';
import { useAuth } from '@/contexts/AuthContext';
import { useRegistryGoLive } from '@/hooks/useRegistryGoLive';
import { downloadText } from '@/utils/downloadText';
import { formatDate, formatDateTime } from '@/utils/formatDate';
import { REGISTRY_GO_LIVE_APPROVALS_MAX, REGISTRY_GO_LIVE_APPROVALS_MIN, REGISTRY_GO_LIVE_CAPACITIES } from '@/services/registryGoLive/registryGoLiveRules';
import { REGISTRY_MANAGE_CAPABILITY, type TestSuiteOutcome } from '@/services/registryGoLive/registryGoLive';
import { REGISTRY_TEMPLATE_ELEMENTS, type RegistryDomain, type RegistryTemplateElement } from '@/services/registryGoLive/registryTemplateVersions';
import { recordExport } from '@/services';

const K = 'registryGoLive';
const APPROVAL_CHOICES = Array.from({ length: REGISTRY_GO_LIVE_APPROVALS_MAX - REGISTRY_GO_LIVE_APPROVALS_MIN + 1 }, (_, i) => REGISTRY_GO_LIVE_APPROVALS_MIN + i);
const elementKey = (e: string) => `${K}.elements.${e.replace(':', '_')}`;

interface Props {
  domain: RegistryDomain;
  registryId: string;
  /** The registry's display name. */
  registryName: string;
  /** Called after anything that changes the registry's configuration. */
  onChanged?: () => void;
}

export const RegistryGoLivePanel: React.FC<Props> = ({ domain, registryId, registryName, onChanged }) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const g = useRegistryGoLive(domain, registryId, user);
  const [suite, setSuite] = useState<TestSuiteOutcome['results']>(undefined);
  const view = g.view;
  if (!view) return null;
  const manage = REGISTRY_MANAGE_CAPABILITY[domain] as 'config:screening-registry:manage';
  const lang = i18n.language;
  const production = view.role === 'production';
  const configurable = view.setup.definition?.specStatus === 'configurable';
  const canRequest = production && !view.openRequest && !(view.status.state === 'current' && view.liveRecord?.templateVersion === view.latest?.version);
  const latestChanges = view.latest?.changes ?? [];

  const say = (outcome: string, ok: boolean, params?: Record<string, unknown>) => (ok ? toast.success : toast.warning)(t(`${K}.outcomes.${outcome}`, params ?? {}));
  const after = (outcome: string, okOutcomes: string[], params?: Record<string, unknown>) => { say(outcome, okOutcomes.includes(outcome), params); onChanged?.(); };

  const statusText = !production ? t(`${K}.validation.stateNote.${view.adapterState}`)
    : view.status.state === 'notApproved' ? t(`${K}.status.unapprovedLive`)
      : view.status.state === 'current' ? t(`${K}.status.current`, { version: view.status.approvedVersion })
        : t(`${K}.status.${view.status.state}`, {
          version: view.status.blockingVersion?.version ?? '', change: t(`${K}.changeClasses.${view.status.blockingVersion?.changeClass ?? 'minor'}`),
          date: formatDate(view.status.holdsFrom, lang),
        });
  const statusTone = view.adapterState === 'live' ? (view.status.state === 'reapprovalDue' ? 'due' : 'live')
    : production ? 'held' : view.adapterState === 'validated' ? 'live' : 'test';

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    const r = await g.importValidation(await file.text());
    if (r.outcome === 'rejected') toast.warning(t(`${K}.outcomes.validationRejected`, { problems: (r.problems ?? []).map(p => t(`${K}.validationProblems.${p}`)).join(', ') }));
    else after(r.outcome, ['imported']);
  };

  return (
    <div className="ps-golive">
      <div className="ps-golive-head">
        <div className="ps-conf-card-title">{t(`${K}.title`)}</div>
        <div className="ps-golive-badges">
          <span className={`ps-golive-env ps-golive-env--${production ? 'live' : 'test'}`}>{t(`${K}.instance.${view.role}`)}</span>
          <span className={`ps-golive-state ps-golive-state--${view.adapterState}`}>{t(`${K}.states.${view.adapterState}`)}</span>
        </div>
      </div>
      <div className="ps-registry-note">{t(production ? `${K}.subtitleProduction` : `${K}.subtitleValidation`)}</div>
      <div className="ps-golive-facts">
        {view.latest && <span>{t(`${K}.template`, { version: view.latest.version, change: t(`${K}.changeClasses.${view.latest.changeClass}`), date: formatDate(view.latest.effectiveOn, lang) })}</span>}
        <span className={`ps-golive-status ps-golive-status--${statusTone}`}>{statusText}</span>
      </div>

      {latestChanges.length > 0 && (
        <details className="ps-golive-block">
          <summary className="ps-golive-label">{t(`${K}.changes.title`, { version: view.latest!.version })}</summary>
          <ul className="ps-golive-list">
            {latestChanges.map((c, i) => <li key={i}>{t(`${K}.changes.item`, { element: t(elementKey(c.element)), change: t(`${K}.changeClasses.${c.changeClass}`), note: c.note })}</li>)}
          </ul>
        </details>
      )}

      {/* Both instances: the data-sharing agreement (validation needs it to test; production's go-live pre-checks it). */}
      <div className="ps-golive-block">
        <div className="ps-golive-label">{t(`${K}.agreement.title`)}</div>
        {view.agreement
          ? <div className="ps-golive-muted">{t(`${K}.agreement.onRecord`, { reference: view.agreement.reference, name: view.agreement.recordedBy, date: formatDateTime(view.agreement.recordedAt, lang) })}</div>
          : <div className="ps-registry-note">{t(`${K}.agreement.pendingNote`)}</div>}
        <label className="ps-golive-field">
          <span>{t(`${K}.agreement.reference`)}</span>
          <input className="ps-conf-input" value={g.agreementReference} placeholder={t(`${K}.agreement.placeholder`)} onChange={e => g.setAgreementReference(e.target.value)} />
        </label>
        <div className="ps-conf-row-actions">
          <CapabilityButton capability={manage} className="ps-conf-btn-secondary" disabled={g.busy || !g.agreementReference.trim()}
            onClick={async () => after(await g.recordAgreement(), ['recorded'])}>{t(`${K}.agreement.record`)}</CapabilityButton>
        </div>
      </div>

      {/* ── Validation instance ───────────────────────────────────────────── */}
      {!production && (
        <>
          <div className="ps-golive-block">
            <div className="ps-golive-label">{t(`${K}.suite.title`)}</div>
            <div className="ps-registry-note">{t(`${K}.suite.note`)}</div>
            <div>{t(`${K}.suite.accepted`, { count: view.acceptedSynthetic, version: view.latest?.version ?? '' })}</div>
            {suite && (
              <ul className="ps-golive-checks">
                {suite.map(r => (
                  <li key={r.caseRef} className={`ps-golive-check ps-golive-check--${r.result === 'sent' ? 'passed' : 'failed'}`}>
                    <span className="ps-golive-check-mark">{t(`${K}.suite.results.${r.result}`)}</span>
                    <span>{r.scenario}</span>
                    {r.detail && <span className="ps-golive-muted">{r.detail}</span>}
                  </li>
                ))}
              </ul>
            )}
            <div className="ps-conf-row-actions">
              <CapabilityButton capability="registry:test-suite:run" className="ps-conf-btn-primary" disabled={g.busy || !view.agreement}
                onClick={async () => { const r = await g.runSuite(); setSuite(r.results); after(r.outcome, ['ran']); }}>{t(`${K}.suite.run`)}</CapabilityButton>
              <CapabilityButton capability={manage} className="ps-conf-btn-secondary" disabled={g.busy || view.acceptedSynthetic === 0}
                onClick={async () => {
                  const r = await g.exportValidation();
                  if (r.outcome === 'exported') {
                    // PS-282 (Batch 437): audited.
                    void recordExport('registry-validation-file', { filename: r.fileName!, rowCount: 1, format: 'json' });
                    downloadText(r.fileName!, r.text!, 'application/json');
                  }
                  after(r.outcome, ['exported']);
                }}>{t(`${K}.validation.export`)}</CapabilityButton>
            </div>
            {view.validation && (
              <div className="ps-golive-muted">{t(`${K}.validation.lastExported`, { version: view.validation.record.templateVersion, release: view.validation.record.release, date: formatDateTime(view.validation.storedAt, lang), count: view.validation.record.accepted.length })}</div>
            )}
          </div>
        </>
      )}

      {/* ── Production instance ───────────────────────────────────────────── */}
      {production && view.liveRecord?.auditStatement && (
        <div className="ps-golive-statement">
          <div className="ps-golive-label">{t(`${K}.live.statement`, { date: formatDateTime(view.liveRecord.liveAt, lang) })}</div>
          <p>{view.liveRecord.auditStatement}</p>
        </div>
      )}
      {production && view.liveRecord && (
        <div className="ps-conf-row-actions">
          <CapabilityButton capability={manage} className="ps-conf-btn-secondary" disabled={g.busy}
            onClick={async () => after(await g.stopLive(), ['stopped'])}>{t(`${K}.stopLive`)}</CapabilityButton>
        </div>
      )}

      {production && (
        <div className="ps-golive-block">
          <div className="ps-golive-label">{t(`${K}.validation.importTitle`)}</div>
          {view.validation
            ? <div className="ps-golive-muted">{t(`${K}.validation.imported`, { version: view.validation.record.templateVersion, release: view.validation.record.release, name: view.validation.record.exportedBy.name, date: formatDateTime(view.validation.record.validatedAt, lang), count: view.validation.record.accepted.length })}</div>
            : <div className="ps-registry-note">{t(`${K}.validation.importNote`, { release: view.release })}</div>}
          {view.validation && view.validationProblems !== 'missing' && view.validationProblems.length > 0 && (
            <div className="ps-registry-note">{t(`${K}.validation.stale`, { problems: view.validationProblems.map(p => t(`${K}.validationProblems.${p}`)).join(', ') })}</div>
          )}
          <label className="ps-golive-field">
            <span>{t(`${K}.validation.chooseFile`)}</span>
            <input type="file" accept="application/json,.json" disabled={g.busy} onChange={e => { void onImport(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
        </div>
      )}

      {production && view.openRequest && (
        <div className="ps-golive-block">
          <div className="ps-golive-label">{t(`${K}.open.title`)}</div>
          <div className="ps-golive-muted">{t(`${K}.open.by`, { name: view.openRequest.preparedBy.name, date: formatDateTime(view.openRequest.preparedAt, lang), version: view.openRequest.templateVersion })}</div>
          <div className="ps-golive-muted">{t(`${K}.open.evidence`, { reference: view.openRequest.evidence.reference, count: view.openRequest.evidence.acceptedTestSubmissions })}</div>
          {view.openProgress && <div>{t(`${K}.open.progress`, { counted: view.openProgress.counted, required: view.openProgress.required })}</div>}
          {view.openProgress && !view.openProgress.hasDirector && <div className="ps-registry-note">{t(`${K}.open.needsDirector`)}</div>}
          {view.openRequest.approvals.length > 0 && (
            <ul className="ps-golive-list">
              {view.openRequest.approvals.map(a => (
                <li key={a.userId}>{t(`${K}.open.approval`, { name: a.name, capacities: a.capacities.map(c => t(`${K}.capacities.${c}`)).join(', '), date: formatDateTime(a.at, lang) })}</li>
              ))}
            </ul>
          )}
          <fieldset className="ps-golive-capacities">
            <legend>{t(`${K}.capacities.title`)}</legend>
            {REGISTRY_GO_LIVE_CAPACITIES.map(c => (
              <label key={c} className="ps-registry-check">
                <input type="checkbox" checked={g.capacities.includes(c)} onChange={() => g.toggleCapacity(c)} />
                {t(`${K}.capacities.${c}`)}
              </label>
            ))}
          </fieldset>
          <div className="ps-conf-row-actions">
            <CapabilityButton capability="registry:live-register:approve" className="ps-conf-btn-primary"
              disabled={g.busy || g.capacities.length === 0} onClick={g.startApprove}>{t(`${K}.approve`)}</CapabilityButton>
            <CapabilityButton capability={manage} className="ps-conf-btn-secondary" disabled={g.busy}
              onClick={async () => after(await g.withdraw(), ['withdrawn'])}>{t(`${K}.withdraw`)}</CapabilityButton>
          </div>
        </div>
      )}

      {canRequest && (
        <div className="ps-golive-block">
          <div className="ps-golive-label">{t(`${K}.request.title`)}</div>
          <ul className="ps-golive-checks">
            {g.prechecks.map(c => (
              <li key={c.id} className={`ps-golive-check ps-golive-check--${c.status}`}>
                <span className="ps-golive-check-mark">{t(`${K}.checkStatus.${c.status}`)}</span>
                <span>{t(`${K}.prechecks.${c.id}`, c.params ?? {})}</span>
                {c.params?.missing ? <span className="ps-golive-muted">{t(`${K}.prechecks.codesMissing`, { missing: c.params.missing })}</span> : null}
              </li>
            ))}
          </ul>
          <label className="ps-golive-field">
            <span>{t(`${K}.request.reference`)}</span>
            <input className="ps-conf-input" value={g.reference} placeholder={t(`${K}.request.referencePlaceholder`)} onChange={e => g.setReference(e.target.value)} />
          </label>
          {configurable && (
            <label className="ps-registry-check">
              <input type="checkbox" checked={g.specConfirmed} onChange={e => g.setSpecConfirmed(e.target.checked)} />
              {t(`${K}.request.specConfirmed`)}
            </label>
          )}
          <div className="ps-conf-row-actions">
            <CapabilityButton capability={manage} className="ps-conf-btn-primary" disabled={g.busy || g.prechecks.some(c => c.status === 'failed')}
              onClick={async () => after((await g.request()).outcome, ['requested'])}>{t(`${K}.request.submit`)}</CapabilityButton>
          </div>
        </div>
      )}

      {/* ── Both: the local overlay ───────────────────────────────────────── */}
      <details className="ps-golive-block" open={view.needingReview.length > 0}>
        <summary className="ps-golive-label">{t(`${K}.overlay.title`, { count: view.localChanges.length })}</summary>
        <div className="ps-registry-note">{t(`${K}.overlay.note`)}</div>
        {view.needingReview.length > 0 && (
          <>
            <div className="ps-golive-status ps-golive-status--due">{t(`${K}.overlay.needsReview`, { count: view.needingReview.length })}</div>
            <ul className="ps-golive-list">
              {view.needingReview.map(n => (
                <li key={`${n.kind}:${n.id}`}>{t(`${K}.overlay.reviewItem`, {
                  kind: t(`${K}.overlay.kinds.${n.kind}`), element: t(elementKey(n.element)), detail: n.detail || '—',
                  baseline: n.baselineVersion, versions: n.touchedBy.map(x => x.version).join(', '),
                })}</li>
              ))}
            </ul>
            <div className="ps-conf-row-actions">
              <CapabilityButton capability={manage} className="ps-conf-btn-primary" disabled={g.busy}
                onClick={async () => { const r = await g.confirmLocalChanges(); after(r.outcome, ['confirmed'], { count: r.count ?? 0 }); }}>{t(`${K}.overlay.confirm`)}</CapabilityButton>
            </div>
          </>
        )}
        <div className="ps-golive-label">{t(`${K}.overlay.adapterTitle`)}</div>
        {view.adapterRules.length === 0 && <div className="ps-golive-muted">{t(`${K}.overlay.noAdapterRules`)}</div>}
        <ul className="ps-golive-list">
          {view.adapterRules.map(r => (
            <li key={r.id} className="ps-golive-rule">
              <span>{t(`${K}.overlay.adapterRule`, { element: t(elementKey(r.element)), description: r.description, baseline: r.baselineVersion })}</span>
              <CapabilityButton capability={manage} className="ps-conf-btn-secondary" disabled={g.busy}
                onClick={async () => after(await g.removeRule(r.id), ['removed'])}>{t('common.remove')}</CapabilityButton>
            </li>
          ))}
        </ul>
        <div className="ps-golive-field">
          <select className="ps-conf-select" aria-label={t(`${K}.overlay.element`)} value={g.rule.element} onChange={e => g.setRule({ ...g.rule, element: e.target.value as RegistryTemplateElement })}>
            {REGISTRY_TEMPLATE_ELEMENTS.map(e => <option key={e} value={e}>{t(elementKey(e))}</option>)}
          </select>
          <input className="ps-conf-input" aria-label={t(`${K}.overlay.description`)} placeholder={t(`${K}.overlay.descriptionPlaceholder`)} value={g.rule.description} onChange={e => g.setRule({ ...g.rule, description: e.target.value })} />
          <CapabilityButton capability={manage} className="ps-conf-btn-secondary" disabled={g.busy || !g.rule.description.trim()}
            onClick={async () => after(await g.addRule(), ['added'])}>{t(`${K}.overlay.add`)}</CapabilityButton>
        </div>
      </details>

      {production && (
        <details className="ps-golive-block">
          <summary className="ps-golive-label">{t(`${K}.governance.title`)}</summary>
          <label className="ps-registry-check">
            <input type="checkbox" checked={view.governance.allowSelfApproval} disabled={g.busy}
              onChange={async e => after((await g.saveGovernance({ allowSelfApproval: e.target.checked })).outcome, ['saved'])} />
            {t(`${K}.governance.selfApproval`)}
          </label>
          <div className="ps-registry-note">{t(`${K}.governance.selfApprovalNote`)}</div>
          <label className="ps-golive-field">
            <span>{t(`${K}.governance.required`)}</span>
            <select className="ps-conf-select" value={view.governance.requiredReviewers} disabled={g.busy}
              onChange={async e => after((await g.saveGovernance({ requiredReviewers: Number(e.target.value) })).outcome, ['saved'])}>
              {APPROVAL_CHOICES.map(n => <option key={n} value={n}>{t(`${K}.governance.requiredOption`, { count: n })}</option>)}
            </select>
          </label>
        </details>
      )}

      {view.records.length > 0 && (
        <details className="ps-golive-block">
          <summary className="ps-golive-label">{t(`${K}.history.title`, { count: view.records.length })}</summary>
          <ul className="ps-golive-list">
            {view.records.map(r => (
              <li key={r.id}>
                {t(`${K}.history.row`, { version: r.templateVersion, status: t(`${K}.history.status.${r.status}`), name: r.preparedBy.name, date: formatDateTime(r.preparedAt, lang) })}
                {r.auditStatement && <div className="ps-golive-muted">{r.auditStatement}</div>}
              </li>
            ))}
          </ul>
        </details>
      )}

      <SignatureConfirmModal
        show={g.confirming}
        action="registry-go-live"
        caseRef={null}
        title={t(`${K}.confirm.title`)}
        message={t(`${K}.confirm.message`, { registry: registryName })}
        confirmLabel={t(`${K}.confirm.label`)}
        onConfirmed={async confirmation => {
          const r = await g.approve(confirmation);
          after(r.outcome, ['approved', 'live'], { resent: r.catchUp?.resent ?? 0, held: r.catchUp?.stillHeld ?? 0 });
        }}
        onCancel={g.cancelApprove}
      />
    </div>
  );
};

export default RegistryGoLivePanel;
