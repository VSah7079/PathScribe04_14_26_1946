// src/components/Config/Protocols/DemoChecklistRemovalCard.tsx
// Batch 754 (Pete, Oct 31, 2026): ForMedrixAI support removes the 19 demonstration checklists from a customer
// organisation's synoptic library (platform:demo-checklists:remove). Shown only to people who hold it. The removal
// archives them; the rules are in services/templates/demoChecklistRemoval.ts.
import React from 'react';
import { useTranslation } from 'react-i18next';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { useCapabilities } from '@/hooks/useCapabilities';
import { useDemoChecklistRemoval } from '@/hooks/useDemoChecklistRemoval';
import { formatList } from '@/utils/formatList';
import { DEMO_CHECKLISTS_IN_BUILD } from '@/services/templates/demoChecklists';
import { useProtocols } from './protocolShared';

const K = 'demoChecklists';

export const DemoChecklistRemovalCard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const library = useProtocols();
  const { has } = useCapabilities();
  const r = useDemoChecklistRemoval(library);
  if (!has('platform:demo-checklists:remove') || !DEMO_CHECKLISTS_IN_BUILD) return null;
  const names = (list: readonly { name: string }[]) => formatList(list.map(e => e.name), i18n.language);
  const count = r.plan.toRemove.length;
  const res = r.result;

  return (
    <div className="ps-conf-card ps-conf-card--mb" id="demo-checklists">
      <div className="ps-conf-card-title">{t(`${K}.title`)}</div>
      <p className="ps-conf-card-description">{t(`${K}.intro`)}</p>
      <p className="ps-conf-card-description ps-conf-card-description--tight">{count > 0 ? t(`${K}.inLibrary`, { count }) : t(`${K}.noneLeft`)}</p>
      <p className="ps-conf-card-description ps-conf-card-description--tight">{t(`${K}.demoBuildNote`)}</p>
      {r.busy && <p className="ps-conf-card-description ps-conf-card-description--tight" role="status">{t(`${K}.working`)}</p>}
      {count > 0 && !r.confirming && !r.busy && (
        <div className="ps-conf-btn-row">
          <button type="button" className="ps-conf-btn-secondary" disabled={r.busy} onClick={() => { void r.check(); }}>{t(`${K}.check`)}</button>
          <CapabilityButton capability="platform:demo-checklists:remove" className="ps-conf-btn-primary" disabled={r.busy} onClick={r.askToConfirm}>{t(`${K}.remove`)}</CapabilityButton>
        </div>
      )}
      {r.confirming && (
        <div className="ps-conf-btn-row" role="group" aria-label={t(`${K}.confirm`, { count })}>
          <span>{t(`${K}.confirm`, { count })}</span>
          <button type="button" className="ps-conf-btn-primary" disabled={r.busy} onClick={() => { void r.remove(); }}>{t(`${K}.confirmYes`)}</button>
          <button type="button" className="ps-conf-btn-secondary" disabled={r.busy} onClick={r.cancel}>{t(`${K}.cancel`)}</button>
        </div>
      )}
      {res && !res.ok && <p className="ps-conf-card-description ps-conf-card-description--tight" role="alert">{t(`${K}.notPermitted`)}</p>}
      {res && res.ok && res.dryRun && (
        <p className="ps-conf-card-description ps-conf-card-description--tight" role="status">
          {res.plan.toRemove.length > 0 ? t(`${K}.wouldRemove`, { names: names(res.plan.toRemove) }) : t(`${K}.noneLeft`)}
        </p>
      )}
      {res && res.ok && !res.dryRun && (
        <p className="ps-conf-card-description ps-conf-card-description--tight" role="status">
          {t(`${K}.removed`, { count: res.removed.length })}
          {res.failed.length > 0 && <> {t(`${K}.failed`, { count: res.failed.length, names: names(res.failed.map(f => f.entry)) })}</>}
        </p>
      )}
    </div>
  );
};

export default DemoChecklistRemovalCard;
