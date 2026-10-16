// src/components/FacilityDictionary/FacilitySecureMessagingTab.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 517 (PS-143): the Facility editor's Secure messaging tab, for a
// performing-lab tenant (an enterprise facility). The lab picks the gateways
// its staff may send through, its sending address on each, the default, and
// records the BAA or data processing agreement each gateway has. Without an
// agreement in force a gateway can still send messages with no patient data.
//
// Saves on its own button through secureMessagingConfigService.save, which
// checks config:secure-messaging:manage and the rules in
// services/secureMessaging/secureGatewayRules.ts.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { secureMessagingConfigService } from '@/services';
import type { Facility } from '@/services/facilities/IFacilityService';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { useAuth } from '@/contexts/AuthContext';
import { CONFIG_NOT_PERMITTED } from '@/services/authorization/guardConfigWrites';
import { gatewaysForJurisdiction, secureGateway, type SecureGatewayId } from '@/services/secureMessaging/secureGateways';
import {
  agreementInForce, isSecureMessagingConfigProblem, localToday, secureMessagingConfigProblem,
  type GatewaySetup, type SecureMessagingConfig,
} from '@/services/secureMessaging/secureGatewayRules';

const K = 'facilitySecureMessagingTab';

export const FacilitySecureMessagingTab: React.FC<{ facility: Facility }> = ({ facility }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [config, setConfig] = useState<SecureMessagingConfig>({ facilityId: facility.id, gateways: [] });
  const [adding, setAdding] = useState<SecureGatewayId | ''>('');
  const [status, setStatus] = useState<{ kind: 'saved' | 'error'; message: string } | null>(null);
  const today = localToday();

  useEffect(() => {
    let live = true;
    void secureMessagingConfigService.getForFacility(facility.id).then(r => {
      if (live && r.ok && r.data) setConfig(r.data);
    });
    return () => { live = false; };
  }, [facility.id]);

  const change = (next: SecureMessagingConfig) => { setConfig(next); setStatus(null); };
  const patch = (id: SecureGatewayId, p: Partial<GatewaySetup>) =>
    change({ ...config, gateways: config.gateways.map(g => (g.gatewayId === id ? { ...g, ...p } : g)) });
  const available = gatewaysForJurisdiction(facility.jurisdiction).filter(d => !config.gateways.some(g => g.gatewayId === d.id));
  const problem = secureMessagingConfigProblem(config);

  const add = () => {
    if (!adding) return;
    change({ ...config, gateways: [...config.gateways, { gatewayId: adding, enabled: true }], defaultGatewayId: config.defaultGatewayId ?? adding });
    setAdding('');
  };
  const remove = (id: SecureGatewayId) =>
    change({ ...config, gateways: config.gateways.filter(g => g.gatewayId !== id), defaultGatewayId: config.defaultGatewayId === id ? undefined : config.defaultGatewayId });

  const save = async () => {
    const result = await secureMessagingConfigService.save(config, { userId: user?.id ?? '' });
    if (result.ok) { setConfig(result.data); setStatus({ kind: 'saved', message: t(`${K}.saved`) }); return; }
    setStatus({ kind: 'error', message: isSecureMessagingConfigProblem(result.error) ? t(`${K}.problems.${result.error}`)
      : result.error === CONFIG_NOT_PERMITTED ? t(`${K}.notPermitted`) : t(`${K}.saveFailed`) });
  };

  return (
    <div className="ps-client-editor-form">
      <div className="cem-section">{t(`${K}.title`)}</div>
      <p className="cem-hint-sm">{t(`${K}.intro`)}</p>

      {config.gateways.length === 0 && <div className="cem-empty-text">{t(`${K}.none`)}</div>}

      {config.gateways.map(g => {
        const def = secureGateway(g.gatewayId);
        const name = t(`secureMessaging.gatewayNames.${g.gatewayId}`);
        const agreementName = t(`secureMessaging.agreementKinds.${def?.agreement ?? 'DPA'}`);
        const inForce = agreementInForce(g, today);
        return (
          <div key={g.gatewayId} className="ps-secure-gateway-card">
            <div className="ps-secure-gateway-head">
              <span className="cem-toggle-label--bold">{name}</span>
              <span className={`cem-badge ${inForce ? 'ps-secure-gateway-badge--ok' : 'cem-badge--warn'}`}>
                {t(inForce ? `${K}.agreementInForce` : `${K}.noAgreement`, { agreement: agreementName })}
              </span>
              <span className="cem-hint--tight">{t(`${K}.kinds.${def?.kind ?? 'email'}`)}</span>
            </div>
            <div className="ps-client-editor-grid-2">
              <label className="cem-toggle-row">
                <input type="checkbox" className="cem-checkbox-toggle" checked={g.enabled} onChange={e => patch(g.gatewayId, { enabled: e.target.checked })} />
                <span className="cem-toggle-label">{t(`${K}.enabled`)}</span>
              </label>
              <label className="cem-toggle-row">
                <input type="radio" name="secure-default" className="cem-checkbox-toggle" checked={config.defaultGatewayId === g.gatewayId}
                  disabled={!g.enabled} onChange={() => change({ ...config, defaultGatewayId: g.gatewayId })} />
                <span className="cem-toggle-label">{t(`${K}.default`)}</span>
              </label>
              <div className="cem-field--span">
                <label className="cem-label" htmlFor={`sm-sender-${g.gatewayId}`}>{t(def?.kind === 'clinicalMessaging' ? `${K}.senderId` : `${K}.senderAddress`)}</label>
                <input id={`sm-sender-${g.gatewayId}`} className="cem-input" value={g.senderAddress ?? ''}
                  onChange={e => patch(g.gatewayId, { senderAddress: e.target.value || undefined })} />
              </div>
              <label className="cem-toggle-row cem-field--span">
                <input type="checkbox" className="cem-checkbox-toggle" checked={!!g.agreement}
                  onChange={e => patch(g.gatewayId, { agreement: e.target.checked ? { kind: def?.agreement ?? 'DPA', reference: '', signedOn: today } : undefined })} />
                <span className="cem-toggle-label">{t(`${K}.agreementOnFile`, { agreement: agreementName })}</span>
              </label>
              {g.agreement && (
                <>
                  <div className="cem-field--span">
                    <label className="cem-label" htmlFor={`sm-ref-${g.gatewayId}`}>{t(`${K}.agreementReference`)}</label>
                    <input id={`sm-ref-${g.gatewayId}`} className="cem-input" value={g.agreement.reference}
                      onChange={e => patch(g.gatewayId, { agreement: { ...g.agreement!, reference: e.target.value } })} />
                  </div>
                  <div>
                    <label className="cem-label" htmlFor={`sm-signed-${g.gatewayId}`}>{t(`${K}.signedOn`)}</label>
                    <input id={`sm-signed-${g.gatewayId}`} type="date" className="cem-input" value={g.agreement.signedOn}
                      onChange={e => patch(g.gatewayId, { agreement: { ...g.agreement!, signedOn: e.target.value } })} />
                  </div>
                  <div>
                    <label className="cem-label" htmlFor={`sm-expires-${g.gatewayId}`}>{t(`${K}.expiresOn`)}</label>
                    <input id={`sm-expires-${g.gatewayId}`} type="date" className="cem-input" value={g.agreement.expiresOn ?? ''}
                      onChange={e => patch(g.gatewayId, { agreement: { ...g.agreement!, expiresOn: e.target.value || undefined } })} />
                  </div>
                </>
              )}
            </div>
            <div className="ps-secure-gateway-actions">
              <button type="button" className="ps-conf-btn-secondary" onClick={() => remove(g.gatewayId)}>{t(`${K}.remove`)}</button>
            </div>
          </div>
        );
      })}

      {available.length > 0 && (
        <div className="ps-secure-gateway-add">
          <label className="cem-label" htmlFor="sm-add">{t(`${K}.addLabel`)}</label>
          <select id="sm-add" className="cem-input" value={adding} onChange={e => setAdding(e.target.value as SecureGatewayId | '')}>
            <option value="">{t(`${K}.addPlaceholder`)}</option>
            {available.map(d => <option key={d.id} value={d.id}>{t(`secureMessaging.gatewayNames.${d.id}`)}</option>)}
          </select>
          <button type="button" className="ps-conf-btn-secondary" disabled={!adding} onClick={add}>{t(`${K}.add`)}</button>
        </div>
      )}

      {problem && <p className="cem-note ps-facility-print-problem" role="alert">{t(`${K}.problems.${problem}`)}</p>}
      {status && <p className={status.kind === 'saved' ? 'cem-hint ps-facility-print-saved' : 'cem-note ps-facility-print-problem'} role="status">{status.message}</p>}
      <div className="ps-facility-print-actions">
        <CapabilityButton capability="config:secure-messaging:manage" className="ps-conf-btn-primary"
          disabled={!!problem} disabledTitle={problem ? t(`${K}.problems.${problem}`) : undefined}
          onClick={() => { void save(); }}>
          {t(`${K}.save`)}
        </CapabilityButton>
      </div>
    </div>
  );
};
