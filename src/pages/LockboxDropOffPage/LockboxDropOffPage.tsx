// src/pages/LockboxDropOffPage/LockboxDropOffPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 645: Lockbox Drop-Off. After-hours specimens dropped in a lockbox are scanned in at a kiosk (tab "Drop-Off") and
// followed up in the morning (tab "Overnight folder", lockbox:folder:review). Reached from Home; the route is behind ScreenGate
// (screen:lockbox-drop-off:open). Each receipt is written by services/lockbox, which checks lockbox:specimen:receive and stamps
// the server's time and user.
//
// Rendering only. Keyboard: the scan field keeps focus; Enter records; Alt+S focus the scan field, Alt+G mark the next drop
// urgent, Alt+D Drop-Off, Alt+M Overnight folder (voice phrases too; constants/lockboxActionGroup.ts).
// ─────────────────────────────────────────────────────────────────────────────
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../../pathscribe.css';
import './LockboxDropOffPage.css';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { useCapabilities } from '@/hooks/useCapabilities';
import { actionRegistryService } from '@/services';
import { VOICE_CONTEXT } from '@/constants/systemActions';
import { LOCKBOX_VOICE_CONTEXT } from '@/constants/lockboxActionGroup';
import { DropOffPanel, type DropOffHandle } from './DropOffPanel';
import { OvernightFolderPanel } from './OvernightFolderPanel';
import { useLockboxFolder } from './hooks/useLockboxFolder';
import { useLockboxActionEvents } from './hooks/useLockboxActionEvents';

type Tab = 'dropOff' | 'folder';

const LockboxDropOffPage: React.FC = () => {
  const { t } = useTranslation();
  const { pushCrumb } = useBreadcrumb();
  const { has } = useCapabilities();
  const canReview = has('lockbox:folder:review');
  const [tab, setTab] = useState<Tab>('dropOff');
  const dropOff = useRef<DropOffHandle>(null);
  const folder = useLockboxFolder(tab === 'folder' && canReview);

  useEffect(() => { pushCrumb(t('lockboxDropOff.pageTitle'), '/lockbox-drop-off'); }, [pushCrumb, t]);
  useEffect(() => {
    actionRegistryService.setCurrentContext(LOCKBOX_VOICE_CONTEXT);
    return () => { actionRegistryService.setCurrentContext(VOICE_CONTEXT.WORKLIST); };
  }, []);

  const showDropOff = useCallback(() => { setTab('dropOff'); setTimeout(() => dropOff.current?.focusScan(), 0); }, []);
  const showFolder = useCallback(() => { if (canReview) setTab('folder'); }, [canReview]);
  useLockboxActionEvents({
    focusScan: () => { if (tab !== 'dropOff') showDropOff(); else dropOff.current?.focusScan(); },
    toggleUrgent: () => { if (tab !== 'dropOff') showDropOff(); dropOff.current?.toggleUrgent(); },
    showDropOff, showFolder,
  });

  const tabs: { id: Tab; label: string }[] = [{ id: 'dropOff', label: t('lockboxDropOff.tabs.dropOff') }, ...(canReview ? [{ id: 'folder' as const, label: t('lockboxDropOff.tabs.folder') }] : [])];
  return (
    <div className="ps-lbx">
      <h1 className="ps-lbx-title">{t('lockboxDropOff.pageTitle')}</h1>
      <p className="ps-lbx-subtitle">{t('lockboxDropOff.subtitle')}</p>
      <div className="ps-lbx-tabs" role="tablist" aria-label={t('lockboxDropOff.tabs.label')}>
        {tabs.map(x => (
          <button key={x.id} type="button" role="tab" id={`ps-lbx-tab-${x.id}`} aria-selected={tab === x.id} aria-controls={`ps-lbx-panel-${x.id}`} className="ps-lbx-tab" onClick={() => setTab(x.id)}>{x.label}</button>
        ))}
      </div>
      {/* The kiosk stays mounted so a half-typed scan or an open form is not lost when the folder is looked at. */}
      <div role="tabpanel" id="ps-lbx-panel-dropOff" aria-labelledby="ps-lbx-tab-dropOff" hidden={tab !== 'dropOff'}><DropOffPanel ref={dropOff} /></div>
      {tab === 'folder' && canReview && (
        <div role="tabpanel" id="ps-lbx-panel-folder" aria-labelledby="ps-lbx-tab-folder">
          <OvernightFolderPanel folder={folder.folder} loading={folder.loading} error={folder.error} onRefresh={() => void folder.refresh()} onMarkAccessioned={folder.markAccessioned} onResolve={folder.resolvePlaceholder} />
        </div>
      )}
    </div>
  );
};

export default LockboxDropOffPage;
