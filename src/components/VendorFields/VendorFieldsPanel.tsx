// src/components/VendorFields/VendorFieldsPanel.tsx
// ─────────────────────────────────────────────────
// Batch 612: the "Vendor fields" panel on a case: the extension fields that vendor
// profiles (Configuration → System → Interface Dictionary) added from a vendor's own
// message, read-only, with the vendor and profile version each came from. Shown
// only when there are some, so a case without any takes no room. In the demo the
// values come from a message pasted in by ForMedrixAI staff and carry a Simulated tag.
// ─────────────────────────────────────────────────
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { interfaceDictionaryService, type ExtensionValue } from '@/services';
import { formatDateTime } from '@/utils/formatDate';

export const VendorFieldsPanel: React.FC<{ caseId: string }> = ({ caseId }) => {
  const { t, i18n } = useTranslation();
  const [fields, setFields] = useState<ExtensionValue[]>([]);

  useEffect(() => {
    let cancelled = false;
    setFields([]);
    void interfaceDictionaryService.getCaseFields(caseId).then(r => { if (!cancelled && r.ok) setFields(r.data); });
    return () => { cancelled = true; };
  }, [caseId]);

  const byVendor = useMemo(() => {
    const groups = new Map<string, ExtensionValue[]>();
    for (const f of fields) groups.set(`${f.vendorId}:${f.profileVersion}`, [...(groups.get(`${f.vendorId}:${f.profileVersion}`) ?? []), f]);
    return [...groups.values()];
  }, [fields]);

  if (fields.length === 0) return null;

  return (
    <details className="ps-vendorfields" open data-testid="vendor-fields-panel">
      <summary>{t('vendorFields.title')}</summary>
      {byVendor.map(group => (
        <div key={`${group[0].vendorId}:${group[0].profileVersion}`} className="ps-vendorfields-group">
          <p className="ps-conf-hint">
            {t('vendorFields.from', { vendor: group[0].vendorName, version: group[0].profileVersion, when: formatDateTime(group[0].receivedAt, i18n.language) })}
            {group.some(f => f.simulated) && <> <span className="ps-simulated-badge">{t('vendorFields.simulated')}</span></>}
          </p>
          <dl className="ps-vendorfields-list">
            {group.map(f => (
              <div key={f.target} className="ps-vendorfields-item" data-testid={`vendor-field-${f.target}`}>
                <dt>{f.label}</dt>
                <dd data-phi="true">{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </details>
  );
};
