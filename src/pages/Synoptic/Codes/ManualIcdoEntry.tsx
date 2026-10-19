// Manual ICD-O-3 entry for the Add Code window. Checks the behaviour digit locally; works with no terminology service.
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { checkIcdO3Entry } from '@/services/terminologySearch/simulatedCodeLookup';
import { RegistryCheckNote } from './RegistryCheckNote';
import type { CodeResult } from '@/services/terminologySearch/codeSearchService';

interface Props { onAdd: (r: CodeResult) => void }

const ManualIcdoEntry: React.FC<Props> = ({ onAdd }) => {
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const typed = checkIcdO3Entry(value);

  const submit = () => {
    const c = checkIcdO3Entry(value);
    if (!c.ok) { setError(t(`manualIcdo.error.${c.reason}`)); return; }
    setError(null);
    onAdd({
      code: c.code,
      display: c.kind === 'morphology' ? t('manualIcdo.displayMorphology', { behaviour: c.behaviour }) : t('manualIcdo.displayTopography'),
      system: 'ICDO',
    });
    setValue('');
  };

  return (
    <div className="acd-manual-icdo" data-testid="manual-icdo">
      <label className="fm-eyebrow" htmlFor="manual-icdo-input">{t('manualIcdo.label')}</label>
      <div className="acd-manual-icdo-row">
        <input id="manual-icdo-input" className="fm-search-input" value={value} placeholder={t('manualIcdo.placeholder')}
          onChange={e => { setValue(e.target.value); setError(null); }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }} />
        <button type="button" className="ps-conf-btn-row" onClick={submit}>{t('manualIcdo.add')}</button>
      </div>
      <div className="fm-empty-hint">{t('manualIcdo.hint')}{typed.ok && typed.kind === 'morphology' && <> <RegistryCheckNote code={typed.code} /></>}</div>
      {error && <div className="fm-empty-hint acd-empty-heading--warning" role="alert">{error}</div>}
    </div>
  );
};

export default ManualIcdoEntry;
