// src/components/Config/AI/AiProviderSettings.tsx
// ─────────────────────────────────────────────────────────────
// Admin UI for configuring the org-level AI provider.
// Accessible from Settings → AI Provider.
//
// Admins select the provider and model; API keys are configured
// in the backend secrets manager and never entered here.
// Developers can set a personal override (with key) for local testing.
//
// Labels/notes below deliberately show real vendor and model names —
// unlike the internal AiProviderId type (protocol-shape-named, see
// aiProviderConfig.ts), an admin picking a provider here needs to know
// which real vendor account/contract they're actually configuring.
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef } from 'react';
import { useReportConfigDirty } from '../configDirtyGuardContext';
import { draftDiffers } from '@/services/configDirty/configDirtyRegistry';
import { useTranslation } from 'react-i18next';
import {
  resolveAiConfig,
  setUserAiConfig,
  clearUserAiConfig,
  PROVIDER_MODELS,
  modelOptionLabel,
  aiProviderLabel,
  aiHostingRegion,
  type AiProviderId,
} from '@/components/Config/AI/aiProviderConfig';
import { saveOrgAiProvider } from '@/services/aiConfig/saveAiSettings';
import { HostingRegionsCard } from './HostingRegionsCard';
import { aiVendorPolicyService, aiVendorConflicts, type AiVendorRule, type AiVendorRuleScope } from '@/services';

const PROVIDER_NOTE_KEY: Record<AiProviderId, string> = {
  structured_messages:      'aiProviderSettings.providerNote.serverKey',
  chat_completions:         'aiProviderSettings.providerNote.serverKey',
  chat_completions_managed: 'aiProviderSettings.providerNote.azure',
  model_gateway:            'aiProviderSettings.providerNote.bedrock',
  structured_content:       'aiProviderSettings.providerNote.serverKey',
  mock:                     'aiProviderSettings.providerNote.mock',
  custom:                   'aiProviderSettings.providerNote.custom',
};

interface AiProviderSettingsProps {
  /** true = org admin view (saves org config), false = dev override view */
  isAdmin?: boolean;
  onSaved?: () => void;
}

const AiProviderSettings: React.FC<AiProviderSettingsProps> = ({
  isAdmin = false,
  onSaved,
}) => {
  const { t } = useTranslation();
  const providerLabel = (id: AiProviderId): string => aiProviderLabel(id, t);
  const rawConfig = resolveAiConfig();
  // Guard: if the stored providerId isn't a known key (e.g. after a host
  // migration corrupted / cleared localStorage), fall back to
  // 'structured_messages' so PROVIDER_MODELS[providerId] is never undefined.
  const current = PROVIDER_MODELS[rawConfig.providerId]
    ? rawConfig
    : { ...rawConfig, providerId: 'structured_messages' as AiProviderId, modelId: PROVIDER_MODELS['structured_messages'][0].id };

  const [providerId,    setProviderId]    = useState<AiProviderId>(current.providerId);
  const [modelId,       setModelId]       = useState(current.modelId);
  const [managedEndpoint, setManagedEndpoint] = useState(current.managedEndpoint ?? '');
  const [managedDeployment, setManagedDeployment] = useState(current.managedDeploymentName ?? '');
  const [gatewayRegion, setGatewayRegion] = useState(current.gatewayRegion ?? 'us-east-1');
  const [hostingRegion, setHostingRegion] = useState(current.hostingRegion ?? '');
  const [policy, setPolicy] = useState<{ rules: AiVendorRule[]; scopes: AiVendorRuleScope[]; facilities: { id: string; name: string }[] }>({ rules: [], scopes: [], facilities: [] });
  const [customEndpoint,setCustomEndpoint]= useState(current.customEndpoint ?? '');
  const [saved,         setSaved]         = useState(false);
  const [testResult,    setTestResult]    = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [testError,     setTestError]     = useState('');

  // When provider changes, reset model to first available. Batch 437: not on
  // the first render, which used to replace the saved model with the
  // provider's first one before anyone touched the form.
  const providerShown = useRef(providerId);
  useEffect(() => {
    if (providerShown.current === providerId) return;
    providerShown.current = providerId;
    const models = PROVIDER_MODELS[providerId];
    if (models?.length) setModelId(models[0].id);
  }, [providerId]);

  // Batch 536 (PS-558): the AI vendor policy, to warn before saving a service a served jurisdiction doesn't allow.
  useEffect(() => {
    void Promise.all([aiVendorPolicyService.list(), aiVendorPolicyService.served()])
      .then(([res, served]) => setPolicy({ rules: res.ok ? res.data : [], scopes: served.scopes, facilities: served.facilities }))
      .catch(() => {});
  }, []);
  const conflicts = aiVendorConflicts(policy.rules, policy.scopes, { providerId, region: aiHostingRegion({ providerId, gatewayRegion, hostingRegion }) });

  // PS-128 (Batch 437): unsaved changes keep you from leaving without a warning.
  useReportConfigDirty(draftDiffers(
    { providerId: current.providerId, modelId: current.modelId, managedEndpoint: current.managedEndpoint ?? '', managedDeployment: current.managedDeploymentName ?? '', gatewayRegion: current.gatewayRegion ?? 'us-east-1', hostingRegion: current.hostingRegion ?? '', customEndpoint: current.customEndpoint ?? '' },
    { providerId, modelId, managedEndpoint, managedDeployment, gatewayRegion, hostingRegion, customEndpoint },
  ));

  const handleSave = async () => {
    const config = {
      providerId,
      modelId,
      managedDeploymentName: managedEndpoint ? managedDeployment : undefined,
      managedEndpoint:       managedEndpoint || undefined,
      gatewayRegion:         gatewayRegion || undefined,
      hostingRegion:         hostingRegion.trim() || undefined,
      customEndpoint:        customEndpoint || undefined,
    };

    if (isAdmin) {
      // Batch 428: the service checks config:ai-provider:manage; a refusal saves nothing.
      if (!(await saveOrgAiProvider(config))) return;
    } else {
      // Personal override (testing). Batch 444: never a key; the proxy holds it.
      setUserAiConfig(config);
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    onSaved?.();
  };

  const handleTest = async () => {
    setTestResult('testing');
    setTestError('');
    try {
      // Dynamic import to avoid pulling the service into admin bundles unnecessarily
      const { callAi } = await import('@/services/aiIntegration/aiProviderService');
      const { text } = await callAi({
        system: 'You are a test assistant.',
        prompt: 'Reply with exactly: PathScribe AI connection OK',
        maxTokens: 20,
        context: { feature: 'connection-test' },
      });
      setTestResult(text.includes('OK') || text.length > 0 ? 'ok' : 'fail');
    } catch (e: any) {
      setTestResult('fail');
      setTestError(e?.message ?? 'Unknown error');
    }
  };

  const handleClearOverride = () => {
    clearUserAiConfig();
    const refreshed = resolveAiConfig();
    setProviderId(refreshed.providerId);
    setModelId(refreshed.modelId);
    setManagedEndpoint(refreshed.managedEndpoint ?? '');
    setManagedDeployment(refreshed.managedDeploymentName ?? '');
    setGatewayRegion(refreshed.gatewayRegion ?? 'us-east-1');
    setHostingRegion(refreshed.hostingRegion ?? '');
    setCustomEndpoint(refreshed.customEndpoint ?? '');
  };

  const devOnly = !isAdmin;

  return (
    <div className="ps-aiprovider-page">
      <h2 className="ps-aiprovider-heading">
        {isAdmin ? `🔧 ${t('aiProviderSettings.adminHeading')}` : `🧪 ${t('aiProviderSettings.devHeading')}`}
      </h2>
      <p className="ps-aiprovider-subtitle">
        {isAdmin ? t('aiProviderSettings.adminSubtitle') : t('aiProviderSettings.devSubtitle')}
      </p>

      {/* Real, per direct guidance's own priority follow-up on PHI
          handling ("will the data going to the LLM be encrypted, we
          have to be careful") - placed here, front and center, since
          this is the one screen an admin is actually making the
          provider decision this warning concerns. */}
      <div className="ps-aiprovider-warning-box">
        <strong>{t('aiProviderSettings.dataHandlingWarningTitle')}</strong>{' '}
        {t('aiProviderSettings.dataHandlingWarningBody')}
      </div>

      {/* Active config summary */}
      <div className="ps-aiprovider-active-box">
        <strong>{t('aiProviderSettings.currentlyActive')}</strong>{' '}
        {t('aiProviderSettings.activeSummary', { provider: providerLabel(current.providerId), model: current.modelId })}
      </div>

      {/* Demo mode banner */}
      {providerId === 'mock' && (
        <div className="ps-aiprovider-demo-box">
          <strong>{t('aiProviderSettings.demoModeActive')}</strong> — {t('aiProviderSettings.demoModeBody')}
        </div>
      )}

      {/* Provider selector */}
      <div className="ps-aiprovider-field-group">
        <label className="ps-aiprovider-label">{t('aiProviderSettings.providerLabel')}</label>
        <select aria-label={t('aiProviderSettings.providerLabel')}
          value={providerId}
          onChange={e => setProviderId(e.target.value as AiProviderId)}
          className="ps-aiprovider-input"
        >
          {/* Real providers */}
          <optgroup label={t('aiProviderSettings.productionProvidersGroup')}>
            {(['structured_messages', 'chat_completions', 'chat_completions_managed', 'model_gateway', 'structured_content', 'custom'] as AiProviderId[]).map(id => (
              <option key={id} value={id}>{providerLabel(id)}</option>
            ))}
          </optgroup>
          {/* Mock for demos */}
          <optgroup label={t('aiProviderSettings.developmentDemoGroup')}>
            <option value="mock">{providerLabel('mock')}</option>
          </optgroup>
        </select>
        <p className="ps-aiprovider-hint">
          {t(PROVIDER_NOTE_KEY[providerId])}
        </p>
      </div>

      {/* Model selector */}
      <div className="ps-aiprovider-field-group">
        <label className="ps-aiprovider-label">{t('aiProviderSettings.modelLabel')}</label>
        <select aria-label={t('aiProviderSettings.modelLabel')} value={modelId} onChange={e => setModelId(e.target.value)} className="ps-aiprovider-input">
          {(PROVIDER_MODELS[providerId] ?? PROVIDER_MODELS['structured_messages']).map(m => (
            <option key={m.id} value={m.id}>{modelOptionLabel(m, t)}</option>
          ))}
        </select>
      </div>

      {/* Managed-deployment-specific fields */}
      {providerId === 'chat_completions_managed' && (
        <>
          <div className="ps-aiprovider-field-group ps-aiprovider-field-group--sm">
            <label className="ps-aiprovider-label">{t('aiProviderSettings.azureEndpointLabel')}</label>
            <input aria-label={t('aiProviderSettings.azureEndpointLabel')}
              type="url" value={managedEndpoint}
              onChange={e => setManagedEndpoint(e.target.value)}
              placeholder="https://my-org.openai.azure.com"
              className="ps-aiprovider-input"
            />
          </div>
          <div className="ps-aiprovider-field-group ps-aiprovider-field-group--sm">
            <label className="ps-aiprovider-label">{t('aiProviderSettings.deploymentNameLabel')}</label>
            <input aria-label={t('aiProviderSettings.deploymentNameLabel')}
              type="text" value={managedDeployment}
              onChange={e => setManagedDeployment(e.target.value)}
              placeholder="my-gpt4-deployment"
              className="ps-aiprovider-input"
            />
          </div>
        </>
      )}

      {/* Model gateway region */}
      {providerId === 'model_gateway' && (
        <div className="ps-aiprovider-field-group ps-aiprovider-field-group--sm">
          <label className="ps-aiprovider-label">{t('aiProviderSettings.awsRegionLabel')}</label>
          <input aria-label={t('aiProviderSettings.awsRegionLabel')}
            type="text" value={gatewayRegion}
            onChange={e => setGatewayRegion(e.target.value)}
            placeholder="us-east-1"
            className="ps-aiprovider-input"
          />
        </div>
      )}

      {/* Batch 536 (PS-558): where the service runs, checked against each jurisdiction's AI vendor policy */}
      {providerId !== 'model_gateway' && providerId !== 'mock' && (
        <div className="ps-aiprovider-field-group ps-aiprovider-field-group--sm">
          <label className="ps-aiprovider-label">{t('aiProviderSettings.hostingRegionLabel')}</label>
          <input aria-label={t('aiProviderSettings.hostingRegionLabel')}
            type="text" value={hostingRegion}
            onChange={e => setHostingRegion(e.target.value)}
            placeholder="eu-west-1"
            className="ps-aiprovider-input"
          />
          <p className="ps-aiprovider-hint">{t('aiProviderSettings.hostingRegionHint')}</p>
        </div>
      )}

      {/* Batch 557: where the deployment keeps its data (database and file storage, from the server), beside the AI region */}
      <HostingRegionsCard aiRegion={aiHostingRegion({ providerId, gatewayRegion, hostingRegion })} />

      {/* Custom endpoint */}
      {providerId === 'custom' && (
        <div className="ps-aiprovider-field-group ps-aiprovider-field-group--sm">
          <label className="ps-aiprovider-label">{t('aiProviderSettings.customEndpointLabel')}</label>
          <input aria-label={t('aiProviderSettings.customEndpointLabel')}
            type="url" value={customEndpoint}
            onChange={e => setCustomEndpoint(e.target.value)}
            placeholder="https://my-llm.hospital.internal/v1"
            className="ps-aiprovider-input"
          />
          <p className="ps-aiprovider-hint">
            {t('aiProviderSettings.customEndpointHint')}
          </p>
        </div>
      )}

      {/* Batch 536 (PS-558): warned before saving, inline (CLAUDE.md rule 8) */}
      {conflicts.length > 0 && (
        <div className="ps-aiprovider-policy-warning" role="alert">
          {t('aiProviderSettings.policyConflict', {
            places: conflicts.map(c => (c.scope.facilityId
              ? t('aiVendorPolicySection.facilityScope', { facility: policy.facilities.find(f => f.id === c.scope.facilityId)?.name ?? c.scope.facilityId, jurisdiction: t(`jurisdictionNames.${c.scope.jurisdiction}`) })
              : t(`jurisdictionNames.${c.scope.jurisdiction}`))).join(', '),
          })}
        </div>
      )}

      {/* Action row */}
      <div className="ps-aiprovider-action-row">
        <button
          onClick={handleSave}
          className="ps-conf-btn-primary"
        >
          {saved ? `✓ ${t('aiProviderSettings.savedButton')}` : isAdmin ? t('aiProviderSettings.saveOrgConfigButton') : t('aiProviderSettings.saveOverrideButton')}
        </button>

        <button
          onClick={handleTest}
          disabled={testResult === 'testing'}
          className={`ps-conf-btn-secondary ps-aiprovider-test-btn${testResult === 'ok' ? ' ps-aiprovider-test-btn--ok' : testResult === 'fail' ? ' ps-aiprovider-test-btn--fail' : ''}${testResult === 'testing' ? ' ps-aiprovider-test-btn--testing' : ''}`}
        >
          {testResult === 'testing' ? `⏳ ${t('aiProviderSettings.testingButton')}`
           : testResult === 'ok'    ? `✓ ${t('aiProviderSettings.connectionOkButton')}`
           : testResult === 'fail'  ? `✗ ${t('aiProviderSettings.failedButton')}`
           :                          t('aiProviderSettings.testConnectionButton')}
        </button>

        {devOnly && (
          <button
            onClick={handleClearOverride}
            className="ps-conf-btn-secondary ps-aiprovider-clear-btn"
          >
            {t('aiProviderSettings.clearOverrideButton')}
          </button>
        )}
      </div>

      {testResult === 'fail' && testError && (
        <p className="ps-aiprovider-error-text">
          {t('aiProviderSettings.errorPrefix', { message: testError })}
        </p>
      )}
    </div>
  );
};

export default AiProviderSettings;
