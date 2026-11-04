// src/components/SecureEmail/SecureEmailModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 517 (PS-143): the secure message window, moved out of AppShell.tsx so
// the critical-findings flow can open it too.
//
//   • It sends through one of the person's lab's gateways (Configuration →
//     facility → Secure messaging), the default preselected, and is branded
//     with that gateway (Pete, Oct 2: Option A) instead of always "NHSMail".
//   • "Contains patient information" (ticked by default; fixed on when the
//     caller says the message carries patient data). A gateway without its BAA
//     or data processing agreement in force can't carry it; the window says so,
//     and messageService.sendSecureEmail refuses it again.
//   • A clinical-messaging gateway (HealthLink, Medical-Objects, ReferralNet,
//     Korea's exchange) addresses a recipient's directory ID, not an email.
//
// What the message needs comes from the organisation's Field Requirements
// (Batch 384), the send needs message:secure-email:send (Batch 385), and the
// voice/keyboard "submit secure email" presses the same Send. The subject and
// text may name a case or patient, so both are tagged data-phi. The send itself
// is still simulated (PS-332).
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import ReactDOM from 'react-dom';
import { useTranslation, Trans } from 'react-i18next';
import { messageService, actionRegistryService, secureEmailMissing, messagingFieldRequired, MESSAGE_NOT_PERMITTED, secureMessagingConfigService } from '@/services';
import { useCapabilities } from '@/hooks/useCapabilities';
import { useAuditLog } from '@/components/Audit/useAuditLog';
import { useFieldRequirements } from '@/hooks/useFieldRequirements';
import { useAuth } from '@/contexts/AuthContext';
import { formatList } from '@/utils/formatList';
import { secureGateway } from '@/services/secureMessaging/secureGateways';
import {
  agreementInForce, isSecureSendProblem, localToday, preferredGateway, secureSendProblem, sendableGateways,
  type SecureMessagingConfig,
} from '@/services/secureMessaging/secureGatewayRules';
import '../../pathscribe.css';
import './SecureEmailModal.css';

const K = 'appShell.secureEmailModal';

export interface SecureEmailModalProps {
  isOpen: boolean;
  fromName: string;
  fromEmail: string;
  prefillTo?: string;
  prefillSubject?: string;
  prefillBody?: string;
  /** True when the caller knows the message carries patient or finding details (it can't be unticked). */
  containsPatientData?: boolean;
  onClose: () => void;
  /** Called once the send completes (the caller logs or records it). */
  onSent?: (to: string, subject: string, gatewayId: string) => void;
}

// Mounted only while open, so its hooks (session, field requirements, the
// lab's gateways) run only then and reopening starts clean.
export const SecureEmailModal: React.FC<SecureEmailModalProps> = (props) =>
  props.isOpen ? <SecureEmailModalBody {...props} /> : null;

const SecureEmailModalBody: React.FC<SecureEmailModalProps> = ({
  isOpen, fromName, fromEmail, prefillTo = '', prefillSubject = '', prefillBody = '', containsPatientData, onClose, onSent,
}) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { log } = useAuditLog();
  const [auditRecorded, setAuditRecorded] = React.useState(false);
  const requirements = useFieldRequirements('messaging');
  const [to,      setTo]      = React.useState(prefillTo);
  const [subject, setSubject] = React.useState(prefillSubject);
  const [body,    setBody]    = React.useState(prefillBody);
  const [status,  setStatus]  = React.useState<'compose' | 'sending' | 'sent'>('compose');
  const [sendError, setSendError] = React.useState<string | null>(null);
  const [config, setConfig] = React.useState<SecureMessagingConfig | null>(null);
  const [configLoaded, setConfigLoaded] = React.useState(false);
  const [gatewayId, setGatewayId] = React.useState<string>('');
  const [patientData, setPatientData] = React.useState(true);
  const { has, loading } = useCapabilities();
  const mayEmail = has('message:secure-email:send');
  const organisationId = user?.organisationId;
  const carriesPatientData = containsPatientData ?? patientData;
  const today = localToday();

  // Reset the form, and read the lab's gateways, each time the window opens.
  React.useEffect(() => {
    if (!isOpen) return;
    setTo(prefillTo); setSubject(prefillSubject); setBody(prefillBody); setStatus('compose'); setSendError(null); setAuditRecorded(false);
    setPatientData(true); setConfigLoaded(false);
    let live = true;
    void secureMessagingConfigService.forOrganisation(organisationId).then(r => {
      if (!live) return;
      const loaded = r.ok ? r.data : null;
      setConfig(loaded);
      setGatewayId(preferredGateway(loaded, containsPatientData ?? true, localToday())?.gatewayId ?? '');
      setConfigLoaded(true);
    });
    return () => { live = false; };
  }, [isOpen, prefillTo, prefillSubject, prefillBody, organisationId, containsPatientData]);

  const options = sendableGateways(config);
  const setup = options.find(g => g.gatewayId === gatewayId);
  const definition = setup ? secureGateway(setup.gatewayId) : undefined;
  const gatewayName = definition ? t(`secureMessaging.gatewayNames.${definition.id}`) : '';
  const agreementName = definition ? t(`secureMessaging.agreementKinds.${definition.agreement}`) : '';
  const covered = !!setup && agreementInForce(setup, today);
  const clinicalMessaging = definition?.kind === 'clinicalMessaging';
  const gatewayProblem = configLoaded ? secureSendProblem(config, gatewayId, carriesPatientData, today) : null;

  const missing = secureEmailMissing(to, subject, body, requirements);
  const canSend = missing.length === 0 && mayEmail && configLoaded && !gatewayProblem;
  const star = (id: string) => messagingFieldRequired(requirements, id) && <span className="ps-conf-required">*</span>;

  const handleSend = async () => {
    if (!canSend) return;
    setStatus('sending');
    setSendError(null);
    const result = await messageService.sendSecureEmail({
      fromName, fromEmail: setup?.senderAddress || fromEmail, to, subject, body,
      organisationId, gatewayId, containsPatientData: carriesPatientData,
    });
    if (result.ok === false) {
      setStatus('compose');
      setSendError(isSecureSendProblem(result.error)
        ? t(`${K}.problems.${result.error}`, { gateway: gatewayName, agreement: agreementName })
        : t(result.error === MESSAGE_NOT_PERMITTED ? 'appShell.messaging.notPermittedSecureEmail' : 'appShell.messaging.sendFailed'));
      return;
    }
    // The window writes the audit entry itself (every caller, one place); the
    // line below shows only once the write has gone through.
    try { log('secure_email_sent', { recipientEmail: to, subject }); setAuditRecorded(true); } catch { setAuditRecorded(false); }
    setStatus('sent');
    onSent?.(to, subject, gatewayId);
  };

  // Voice/keyboard "submit secure email": the same Send, with the same check.
  const sendRef = React.useRef(handleSend);
  sendRef.current = handleSend;
  React.useEffect(() => {
    if (!isOpen) return;
    return actionRegistryService.onAction((actionId: string) => {
      if (actionId === 'SECURE_EMAIL_SUBMIT' && status === 'compose') void sendRef.current();
    });
  }, [isOpen, status]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="ps-overlay" onClick={onClose}>
      <div className="ps-modal-dark ps-modal-dark--secure-email" onClick={e => e.stopPropagation()}>
        <div className="ps-sem-header">
          <div>
            <div className="ps-sem-eyebrow">
              {definition ? t(`${K}.eyebrow`, { gateway: gatewayName }) : t(`${K}.eyebrowNoGateway`)}
            </div>
            <div className="ps-sem-title">{t(`${K}.title`)}</div>
          </div>
          <button onClick={onClose} className="ps-sem-close-btn" aria-label={t(`${K}.closeButton`)}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          </button>
        </div>

        {status === 'sent' ? (
          <div className="ps-sem-sent">
            <div className="ps-sem-sent-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div>
              <div className="ps-sem-sent-title">{t(`${K}.sentTitle`)}</div>
              <div className="ps-sem-sent-delivered">
                <Trans i18nKey={`${K}.deliveredTo`} values={{ to, gateway: gatewayName }} components={{ strong: <strong className="ps-sem-sent-delivered-strong" /> }} />
              </div>
              <div className="ps-sem-sent-notice" role="status" data-testid="secure-email-simulated">{t(`${K}.simulatedNotice`)}</div>
              {auditRecorded && <div className="ps-sem-sent-audit" data-testid="secure-email-audit">{t(`${K}.auditRecorded`)}</div>}
            </div>
            <button onClick={onClose} className="ps-sem-sent-close-btn">{t(`${K}.closeButton`)}</button>
          </div>
        ) : (
          <div className="ps-sem-form">
            <div className="ps-sem-field-row">
              <span className="ps-sem-field-label">{t(`${K}.fromLabel`)}</span>
              <div className="ps-sem-from-value">
                {t(`${K}.fromValue`, { name: fromName, address: setup?.senderAddress || fromEmail })}
              </div>
            </div>

            {options.length > 1 && (
              <div className="ps-sem-field-row">
                <label className="ps-sem-field-label" htmlFor="sem-gateway">{t(`${K}.gatewayLabel`)}</label>
                <select id="sem-gateway" className="ps-sem-field-input" value={gatewayId} onChange={e => { setGatewayId(e.target.value); setSendError(null); }}>
                  {options.map(g => (
                    <option key={g.gatewayId} value={g.gatewayId}>
                      {t(agreementInForce(g, today) ? `${K}.gatewayOption` : `${K}.gatewayOptionNoAgreement`, {
                        gateway: t(`secureMessaging.gatewayNames.${g.gatewayId}`),
                        agreement: t(`secureMessaging.agreementKinds.${secureGateway(g.gatewayId)?.agreement ?? 'DPA'}`),
                      })}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="ps-sem-field-row">
              <label className="ps-sem-field-label" htmlFor="sem-to">{t(clinicalMessaging ? `${K}.toRecipientIdLabel` : `${K}.toLabel`)} {star('secureEmailTo')}</label>
              <input
                id="sem-to"
                type={clinicalMessaging ? 'text' : 'email'}
                placeholder={t(clinicalMessaging ? `${K}.toRecipientIdPlaceholder` : `${K}.toPlaceholder`)}
                value={to}
                onChange={e => setTo(e.target.value)}
                className="ps-sem-field-input"
              />
            </div>

            <div className="ps-sem-field-row">
              <label className="ps-sem-field-label" htmlFor="sem-subject">{t(`${K}.subjectLabel`)} {star('secureEmailSubject')}</label>
              <input
                id="sem-subject"
                type="text"
                placeholder={t(`${K}.subjectPlaceholder`)}
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="ps-sem-field-input"
                data-phi="true"
              />
            </div>

            <textarea
              aria-label={t(`${K}.bodyPlaceholder`)}
              placeholder={t(`${K}.bodyPlaceholder`)}
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={7}
              className="ps-sem-body-textarea"
              data-phi="true"
            />

            <label className="ps-sem-patient-data">
              <input type="checkbox" checked={carriesPatientData} disabled={containsPatientData !== undefined}
                onChange={e => { setPatientData(e.target.checked); setSendError(null); }} />
              {' '}{t(`${K}.containsPatientData`)}
            </label>

            {missing.length > 0 && (
              <p className="ps-field-still-required" role="status">
                {t('fieldRequirements.stillRequired', { fields: formatList(missing.map(id => t(`fieldRequirements.fields.messaging.${id}`)), i18n.language) })}
              </p>
            )}
            {gatewayProblem && <p className="ps-field-still-required" role="alert">{t(`${K}.problems.${gatewayProblem}`, { gateway: gatewayName, agreement: agreementName })}</p>}
            {!mayEmail && !loading && <p className="ps-field-still-required" role="status">{t('appShell.messaging.notPermittedSecureEmail')}</p>}
            {sendError && <p className="ps-field-still-required" role="alert">{sendError}</p>}

            {definition && (
              <div className="ps-sem-security-notice">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <span className="ps-sem-security-notice-text">
                  {covered
                    ? t(`${K}.securityNotice`, { gateway: gatewayName, agreement: agreementName, reference: setup?.agreement?.reference ?? '' })
                    : t(`${K}.securityNoticeNoAgreement`, { gateway: gatewayName, agreement: agreementName })}
                </span>
              </div>
            )}

            <div className="ps-sem-actions">
              <button onClick={onClose} className="ps-sem-cancel-btn">{t(`${K}.cancelButton`)}</button>
              <button
                onClick={handleSend}
                disabled={!canSend || status === 'sending'}
                className={`ps-sem-send-btn${canSend ? ' ps-sem-send-btn--enabled' : ''}`}
              >
                {status === 'sending' ? (
                  <>
                    <div className="ps-sem-spinner" />
                    {t(`${K}.sendingButton`)}
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    {t(`${K}.sendButton`)}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default SecureEmailModal;
