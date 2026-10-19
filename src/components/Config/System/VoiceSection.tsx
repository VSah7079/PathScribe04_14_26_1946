// src/components/Config/System/VoiceSection.tsx
// PathScribe admin toggle — enables or disables voice for a client deployment.
// One switch only. If the deployment has a Gemini key, users get AI + Local.
// If not, they get Local only. That's handled automatically — no config needed.

import React from 'react';
import { useTranslation, Trans } from 'react-i18next';
import '../../../pathscribe.css';
import { useSystemConfig } from '../../../contexts/SystemConfigContext';
import { reviewablePrompts } from '@/services/voice/dictationRefinementPrompt';

const PROMPTS = reviewablePrompts();

export const VoiceSection: React.FC = () => {
  const { t } = useTranslation();
  const { config, updateConfig } = useSystemConfig();
  const enabled = config.voiceEnabled;
  const englishFuzzy = config.voiceEnglishFuzzyFallback ?? true;

  return (
    <div className="config-section-container">
      <div className="config-section-header">
        <h2 className="config-section-title">🎙️ {t('voiceSection.title')}</h2>
        <p className="config-section-description">
          {t('voiceSection.description')}
        </p>
      </div>

      <div className="config-section-body">
        <div className="ps-form-row config-toggle-row">
          <div className="config-toggle-row__text">
            <div className="ps-conf-field-title">
              {t('voiceSection.fieldTitle')}
            </div>
            <div className="ps-conf-field-desc">
              {t('voiceSection.fieldDesc')}
            </div>
          </div>
          <label className="config-toggle-wrap">
            <input
              type="checkbox"
              checked={enabled}
              onChange={e => updateConfig({ voiceEnabled: e.target.checked })}
            />
            <div className={`config-toggle-track config-toggle-track--${enabled ? 'on' : 'off'}`}>
              <div className={`config-toggle-thumb${enabled ? ' config-toggle-thumb--on' : ''}`} />
            </div>
            <span className={`config-toggle-label config-toggle-label--${enabled ? 'on' : 'off'}`}>
              {enabled ? t('voiceSection.toggleOn') : t('voiceSection.toggleOff')}
            </span>
          </label>
        </div>

        <div className="ps-form-row config-toggle-row" data-testid="voice-english-fuzzy-row">
          <div className="config-toggle-row__text">
            <div className="ps-conf-field-title">
              {t('voiceSection.englishFuzzy.title')}
            </div>
            <div className="ps-conf-field-desc">
              {t('voiceSection.englishFuzzy.desc')}
            </div>
          </div>
          <label className="config-toggle-wrap">
            <input
              type="checkbox"
              checked={englishFuzzy}
              aria-label={t('voiceSection.englishFuzzy.title')}
              onChange={e => updateConfig({ voiceEnglishFuzzyFallback: e.target.checked })}
            />
            <div className={`config-toggle-track config-toggle-track--${englishFuzzy ? 'on' : 'off'}`}>
              <div className={`config-toggle-thumb${englishFuzzy ? ' config-toggle-thumb--on' : ''}`} />
            </div>
            <span className={`config-toggle-label config-toggle-label--${englishFuzzy ? 'on' : 'off'}`}>
              {englishFuzzy ? t('voiceSection.toggleOn') : t('voiceSection.toggleOff')}
            </span>
          </label>
        </div>

        <div className="ps-conf-field-title">{t('voiceSection.promptReview.title')}</div>
        <div className="ps-conf-field-desc">{t('voiceSection.promptReview.desc')}</div>
        <div className="ps-voice-prompts" data-testid="voice-prompt-review">
          {PROMPTS.map(p => (
            <details key={p.id} className="ps-voice-prompt">
              <summary>
                {t(`voiceSection.promptReview.lang.${p.id}`)}
                {p.language !== 'en' && <span className="ps-voice-prompt__flag"> · {t('voiceSection.promptReview.needsReview')}</span>}
              </summary>
              <pre className="ps-voice-prompt__text">{p.prompt}</pre>
            </details>
          ))}
        </div>

        <div className="config-staff-note">
          <strong>{t('voiceSection.staffNote.label')}</strong>{' '}
          <Trans
            i18nKey="voiceSection.staffNote.body"
            components={{ code: <code /> }}
          />
        </div>
      </div>
    </div>
  );
};
