// src/components/Config/ConfigRefusalBanner.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 428: when a Configuration change is refused (the person lacks the
// section's capability), the service says so here and this banner names the
// permission. Shown on the Configuration page and the pages it opens.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../../pathscribe.css';
import { onConfigRefused } from '@/services/authorization/guardConfigWrites';
import { capabilityLabelKey } from '@/services/authorization/configRefusalLabel';

const ConfigRefusalBanner: React.FC = () => {
  const { t } = useTranslation();
  const [capability, setCapability] = useState<string | null>(null);

  useEffect(() => onConfigRefused(setCapability), []);

  if (!capability) return null;
  const labelKey = capabilityLabelKey(capability);
  return (
    <div className="ps-config-refusal" role="alert">
      <span className="ps-config-refusal-text">
        {t('configRefusal.message', { permission: labelKey ? t(labelKey) : capability })}
      </span>
      <button type="button" className="ps-config-refusal-dismiss" onClick={() => setCapability(null)}>
        {t('configRefusal.dismiss')}
      </button>
    </div>
  );
};

export default ConfigRefusalBanner;
