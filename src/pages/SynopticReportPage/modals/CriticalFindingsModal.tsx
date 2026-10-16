// src/pages/SynopticReportPage/modals/CriticalFindingsModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Real, per direct guidance's own revised PS-105 scope ("Sign-Out
// Guardrails" - soft block, not a hard block): surfaced from
// useSignOutWorkflow.ts's own handleRequestFinalize, the moment a real
// 'critical' severity finding is detected (detectCriticalFindings.ts)
// and hasn't already been acknowledged this session. A pathologist can
// either record a real CriticalResultNotification (who was called, how,
// whether they read it back) or explicitly acknowledge without
// recording - the detection is an LLM-based heuristic that can be
// wrong, and the finding may already have been communicated through a
// real means this feature doesn't capture.
//
// Same real shell/pattern as CaseHoldModal.tsx - a pathologist who's
// learned one already knows the other.
//
// i18n note: `f.term`/`.sourceField`/`.sourceQuote` are real, detected
// clinical-narrative data, never translated. The notification-method
// labels and three of the form field's own labels/placeholder reuse
// identical, already-translated strings from `AmendmentModal.tsx`'s
// own clinical-notification section (same real
// `NotificationMethod`/`CriticalResultNotification` vocabulary).
//
// Batch 380 (PS-359): what Record needs comes from the organisation's Field
// Requirements (report page, Critical findings): the clinician, the method
// and who notified are locked as always required; read-back can be required.
// The check is services/fieldRequirements/reportPageChecks.ts. Record can
// also be said ("record notification", CRITICAL_NOTIFICATION_RECORD).
//
// Batch 517 (PS-143): choosing "Secure email" opens the secure message window
// pre-filled with the case and the findings (it carries patient data, so only
// a gateway with its BAA / data processing agreement in force can send it).
// The notification is recorded once the email is sent; closing the window
// without sending records nothing. Read-back is a spoken repeat, so it is
// hidden for email.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../../../pathscribe.css';
import { actionRegistryService, criticalNotificationMissing, reportFieldRequired } from '@/services';
import { useFieldRequirements } from '@/hooks/useFieldRequirements';
import { formatList } from '@/utils/formatList';
import type { CriticalFindingFlag } from '@/services/clinical/detectCriticalFindings';
import type { NotificationMethod } from '@/types/clinical/CriticalResultNotification';
import { SecureEmailModal } from '@/components/SecureEmail/SecureEmailModal';
import { criticalFindingEmail } from '@/services/clinical/criticalFindingEmail';

const NOTIFICATION_METHOD_LABEL_KEY: Record<NotificationMethod, string> = {
  verbal_phone: 'amendmentModal.notificationMethod.verbalPhone',
  secure_page: 'amendmentModal.notificationMethod.securePage',
  direct_lis_flag: 'amendmentModal.notificationMethod.directLisFlag',
  secure_email: 'amendmentModal.notificationMethod.secureEmail',
  fax: 'amendmentModal.notificationMethod.fax',
};

interface CriticalFindingsModalProps {
  findings: CriticalFindingFlag[];
  /** Real, per direct guidance: defaults the new, editable "notified
   *  by" field to the real, currently signed-in user — the common
   *  case, where the same person recording this also made the real
   *  call. Editable since that's not always true: a representative
   *  may have made the real call, with staff simply transcribing the
   *  event into the record afterward. */
  defaultNotifiedByName?: string;
  /** Batch 517: the case's accession, for the secure email's subject. */
  caseReference?: string;
  /** Batch 517: the sender's address when the lab's gateway has none. */
  senderEmail?: string;
  onRecord: (input: { clinicianName: string; method: NotificationMethod; readBackConfirmed?: boolean; notifiedByName: string }) => void;
  onAcknowledge: () => void;
}

export const CriticalFindingsModal: React.FC<CriticalFindingsModalProps> = ({
  findings, defaultNotifiedByName, caseReference, senderEmail = '', onRecord, onAcknowledge,
}) => {
  const { t, i18n } = useTranslation();
  const requirements = useFieldRequirements('report');
  const [clinicianName, setClinicianName] = useState('');
  const [method, setMethod] = useState<NotificationMethod | ''>('');
  const [readBackConfirmed, setReadBackConfirmed] = useState(false);
  const [notifiedByName, setNotifiedByName] = useState(defaultNotifiedByName ?? '');
  const [busy, setBusy] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const byEmail = method === 'secure_email';

  const missing = criticalNotificationMissing({ clinicianName, method, notifiedByName, readBackConfirmed }, requirements);
  const canRecord = missing.length === 0;
  const required = (id: string) => reportFieldRequired(requirements, id);

  const handleRecord = async () => {
    if (!canRecord || busy) return;
    if (byEmail) { setEmailOpen(true); return; }
    setBusy(true);
    await onRecord({ clinicianName: clinicianName.trim(), method: method as NotificationMethod, readBackConfirmed, notifiedByName: notifiedByName.trim() });
    setBusy(false);
  };

  // Batch 517: recorded only once the secure email has gone.
  const recordEmailSent = async () => {
    setEmailOpen(false);
    setBusy(true);
    await onRecord({ clinicianName: clinicianName.trim(), method: 'secure_email', notifiedByName: notifiedByName.trim() });
    setBusy(false);
  };
  const email = criticalFindingEmail(findings, caseReference, t);

  // Voice/keyboard "record notification": the same Record, with the same check.
  const recordRef = useRef(handleRecord);
  recordRef.current = handleRecord;
  useEffect(() => actionRegistryService.onAction((actionId: string) => {
    if (actionId === 'CRITICAL_NOTIFICATION_RECORD') void recordRef.current();
  }), []);

  return (
    <div className="ps-ms-overlay">
      <div className="ps-ms-modal">
        <div className="ps-ms-header">⚠️ {t('criticalFindingsModal.header')}</div>
        <div className="ps-ms-body">
          <p className="ps-intraop-note ps-intraop-note--danger ps-mb-16">
            <span className="ps-intraop-note-label ps-intraop-note-label--danger">{t('criticalFindingsModal.requiresUrgentLabel')}</span>
            {t('criticalFindingsModal.intro')}
          </p>

          {findings.map((f, i) => (
            <div key={i} className="ps-intraop-note ps-mb-10">
              <span className="ps-intraop-note-label">{t('criticalFindingsModal.findingLabel', { term: f.term, sourceField: f.sourceField })}</span>
              {t('criticalFindingsModal.sourceQuote', { quote: f.sourceQuote })}
            </div>
          ))}

          <div className="ps-conf-form-field ps-mt-16">
            <label className="ps-conf-label">{t('criticalFindingsModal.notifiedByLabel')} {required('criticalNotifiedBy') && <span className="ps-conf-required">*</span>}</label>
            <input aria-label={t('criticalFindingsModal.notifiedByLabel')}
              className="ps-conf-input"
              value={notifiedByName}
              onChange={e => setNotifiedByName(e.target.value)}
              placeholder={t('criticalFindingsModal.notifiedByPlaceholder')}
            />
          </div>
          <div className="ps-conf-form-field">
            <label className="ps-conf-label">{t('amendmentModal.notification.clinicianNotifiedLabel')} {required('criticalClinician') && <span className="ps-conf-required">*</span>}</label>
            <input aria-label={t('amendmentModal.notification.clinicianNotifiedLabel')}
              className="ps-conf-input"
              value={clinicianName}
              onChange={e => setClinicianName(e.target.value)}
              placeholder={t('criticalFindingsModal.clinicianNotifiedPlaceholder')}
            />
          </div>
          <div className="ps-conf-form-field">
            <label className="ps-conf-label" htmlFor="critical-notify-method">{t('amendmentModal.notification.methodLabel')} {required('criticalMethod') && <span className="ps-conf-required">*</span>}</label>
            <select id="critical-notify-method" className="ps-conf-select" value={method} onChange={e => setMethod(e.target.value as NotificationMethod | '')}>
              <option value="">{t('amendmentModal.notification.methodSelectPlaceholder')}</option>
              {(Object.keys(NOTIFICATION_METHOD_LABEL_KEY) as NotificationMethod[]).map(m => (
                <option key={m} value={m}>{t(NOTIFICATION_METHOD_LABEL_KEY[m])}</option>
              ))}
            </select>
          </div>
          {byEmail ? (
            <p className="ps-conf-hint">{t('criticalFindingsModal.secureEmailNote')}</p>
          ) : (
            <label className="ps-conf-label ps-flex-row-gap-8 ps-conf-label--clickable">
              <input type="checkbox" checked={readBackConfirmed} onChange={e => setReadBackConfirmed(e.target.checked)} />
              {t('criticalFindingsModal.readBackLabel')}
              {required('criticalReadBack') && <span className="ps-conf-required">*</span>}
            </label>
          )}
          {missing.length > 0 && (
            <p className="ps-field-still-required" role="status">
              {t('fieldRequirements.stillRequired', { fields: formatList(missing.map(id => t(`fieldRequirements.fields.report.${id}`)), i18n.language) })}
            </p>
          )}
        </div>
        <div className="ps-ms-footer">
          <button className="ps-btn-secondary" onClick={onAcknowledge} disabled={busy}>
            {t('criticalFindingsModal.acknowledgeButton')}
          </button>
          <button className="ps-ms-btn-apply" onClick={handleRecord} disabled={busy || !canRecord}>
            {t(byEmail ? 'criticalFindingsModal.composeEmailButton' : 'criticalFindingsModal.recordButton')}
          </button>
        </div>
      </div>
      <SecureEmailModal
        isOpen={emailOpen}
        fromName={notifiedByName.trim() || defaultNotifiedByName || ''}
        fromEmail={senderEmail}
        prefillSubject={email.subject}
        prefillBody={email.body}
        containsPatientData
        onClose={() => setEmailOpen(false)}
        onSent={() => { void recordEmailSent(); }}
      />
    </div>
  );
};

export default CriticalFindingsModal;
