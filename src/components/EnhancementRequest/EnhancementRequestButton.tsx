/**
 * components/EnhancementRequest/EnhancementRequestButton.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Trigger button for Enhancement Requests and QA / Testing Feedback.
 *
 * mode="enhancement"  (default)
 *   💡 lightbulb — submits a product enhancement request
 *   Routes to the product team email (ENHANCEMENT_EMAIL in config)
 *
 * mode="qa"
 *   🐛 bug — submits QA / testing feedback
 *   Routes to QA team email (QA_EMAIL in config), cc's admin
 *   Categories restricted to QA-relevant set
 *   Whether it is shown is decided by Configuration → System → Feedback
 *   (services/feedback/feedbackSettingsRules.ts qaButtonShown), which NavBar
 *   reads. Batch 499: the button no longer also hides itself when the build
 *   mode is 'production'. Every built bundle (`vite build`) is 'production',
 *   validation instances included, so that check hid the QA button on every
 *   real deployment whatever the setting said.
 *
 * Drop-in path: src/components/EnhancementRequest/EnhancementRequestButton.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../../pathscribe.css';
import { EnhancementRequestModal } from './EnhancementRequestModal';

export type EnhancementButtonMode = 'enhancement' | 'qa';

interface Props {
  mode?:        EnhancementButtonMode;
}

export const EnhancementRequestButton: React.FC<Props> = ({
  mode = 'enhancement',
}) => {
  const { t }            = useTranslation();
  const [open, setOpen] = useState(false);

  const isQA    = mode === 'qa';
  const icon    = isQA ? '🐛' : '💡';
  const tooltip = isQA ? t('enhancementRequestButton.qaTooltip') : t('enhancementRequestButton.enhancementTooltip');

  const handleClick = () => setOpen(true);
  const handleClose = () => setOpen(false);

  return (
    <>
      <button
        onClick={handleClick}
        title={tooltip}
        className="erb-trigger-btn"
      >
        {icon}
      </button>

      {open && (
        <EnhancementRequestModal
          mode={mode}
          onClose={handleClose}
        />
      )}
    </>
  );
};
