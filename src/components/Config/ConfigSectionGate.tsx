// src/components/Config/ConfigSectionGate.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 429 (Pete: grey out each section's controls). Shows a Configuration
// section view only to someone who can't change it: a note naming the
// permission, and the section's action buttons and toggles greyed out and
// inert (tabs, sub-tabs, search and filters, and closing a dialog still
// work). Batch 430: fields other than search and filters don't take changes
// either, so a dropdown that saves as soon as it changes can't fire. Which capabilities a section needs, and which controls stay usable,
// are decided in services/screens/configSectionAccess.ts. The services still
// check every change, so this only decides what the screen offers.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { useTranslation } from 'react-i18next';
import '../../pathscribe.css';
import { useCapabilities } from '@/hooks/useCapabilities';
import { configSectionAccess, isViewOnlyControlAllowed } from '@/services/screens/configSectionAccess';
import { capabilityLabelKey } from '@/services/authorization/configRefusalLabel';

const ConfigSectionGate: React.FC<{ section: string; children: React.ReactNode }> = ({ section, children }) => {
  const { t } = useTranslation();
  const { loading, has } = useCapabilities();
  const access = configSectionAccess(section, c => has(c));
  // Until the capabilities are known the section shows as usual; the services check every change anyway.
  if (loading || access.editable) return <>{children}</>;

  const names = access.needs.map(c => { const k = capabilityLabelKey(c); return k ? t(k) : c; });
  const check = (event: 'click' | 'change') => (e: React.SyntheticEvent) => {
    const el = (e.target as HTMLElement).closest(event === 'click' ? 'button, input' : 'input, select, textarea') as HTMLInputElement | null;
    if (!el) return;
    const allowed = isViewOnlyControlAllowed({
      tagName: el.tagName, type: el.type, className: typeof el.className === 'string' ? el.className : '',
      role: el.getAttribute('role'), navMarked: el.closest('[data-config-nav]') !== null,
    }, event);
    // Stopping a change before React sees it leaves a controlled field at its value.
    if (!allowed) { if (event === 'click') e.preventDefault(); e.stopPropagation(); }
  };
  const block = check('click');
  return (
    <div className="ps-config-viewonly" onClickCapture={block} onChangeCapture={check('change')} onInputCapture={check('change')}
      onKeyDownCapture={e => { if (e.key === 'Enter' || e.key === ' ') block(e); }}>
      <div className="ps-config-viewonly-note" role="note">
        {t('configViewOnly.message', { permissions: names.join(t('configViewOnly.or')) })}
      </div>
      {children}
    </div>
  );
};

export default ConfigSectionGate;
