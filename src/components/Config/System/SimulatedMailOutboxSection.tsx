// src/components/Config/System/SimulatedMailOutboxSection.tsx
// ─────────────────────────────────────────────────
// Batch 604: every e-mail the demo would have sent, kept in the browser and
// labelled Simulated (services/communications/simulatedMailOutbox.ts). With a
// real mail service connected this list stays empty.
// ─────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  clearSimulatedEmails, listSimulatedEmails, subscribeSimulatedMail, type SimulatedEmail,
} from '@/services/communications';

const SimulatedMailOutboxSection: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState<readonly SimulatedEmail[]>(() => listSimulatedEmails());
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => subscribeSimulatedMail(() => setItems([...listSimulatedEmails()])), []);

  const open = items.find(i => i.id === openId) ?? null;
  const when = (iso: string) => new Date(iso).toLocaleString(i18n.language);

  return (
    <div className="ps-conf-section" data-testid="simulated-mail-outbox">
      <h2 className="ps-conf-section-title">{t('simulatedMail.title')}</h2>
      <p className="ps-conf-section-subtitle">{t('simulatedMail.explain')}</p>
      <div>
        <span className="ps-conf-value">{t('simulatedMail.count', { count: items.length })}</span>{' '}
        <button className="ps-conf-btn-secondary" disabled={items.length === 0}
          onClick={() => { if (window.confirm(t('simulatedMail.clearConfirm'))) { clearSimulatedEmails(); setOpenId(null); } }}>
          {t('simulatedMail.clear')}
        </button>
      </div>
      {items.length === 0 ? (
        <p className="ps-conf-section-subtitle" data-testid="simulated-mail-empty">{t('simulatedMail.empty')}</p>
      ) : (
        <table className="ps-conf-table">
          <thead><tr>
            <th>{t('simulatedMail.when')}</th><th>{t('simulatedMail.kind')}</th><th>{t('simulatedMail.to')}</th><th>{t('simulatedMail.subject')}</th><th />
          </tr></thead>
          <tbody>
            {items.map(m => (
              <tr key={m.id}>
                <td>{when(m.recordedAt)}</td>
                <td><span className="ps-conf-badge">{t('simulatedMail.badge')}</span> {t(m.kind === 'email' ? 'simulatedMail.kindEmail' : 'simulatedMail.kindTemplate')}</td>
                <td data-phi="name">{m.to.length ? m.to.join(', ') : t('simulatedMail.serverChooses')}</td>
                <td data-phi="name">{m.subject}</td>
                <td><button className="ps-conf-btn-secondary" onClick={() => setOpenId(m.id)}>{t('simulatedMail.open')}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {open && (
        <div data-capture-hide="true" className="ps-conf-backdrop" onClick={() => setOpenId(null)}>
          <div className="ps-conf-modal" role="dialog" aria-label={open.subject} onClick={e => e.stopPropagation()}>
            <div className="ps-conf-modal-header"><span className="ps-conf-badge">{t('simulatedMail.badge')}</span> {open.subject}</div>
            <div className="ps-conf-modal-body">
              <p className="ps-conf-section-subtitle">{t('simulatedMail.notSent')}</p>
              <p className="ps-conf-value">{t('simulatedMail.to')}: {open.to.length ? open.to.join(', ') : t('simulatedMail.serverChooses')}</p>
              {open.cc.length > 0 && <p className="ps-conf-value">{t('simulatedMail.cc')}: {open.cc.join(', ')}</p>}
              {open.attachmentNames.length > 0 && <p className="ps-conf-value">{t('simulatedMail.attachments')}: {open.attachmentNames.join(', ')}</p>}
              <pre data-phi="name" className="ps-conf-value ps-sim-mail-body" data-testid="simulated-mail-body">{open.bodyText}</pre>
            </div>
            <div className="ps-conf-modal-footer">
              <button className="ps-conf-btn-secondary" onClick={() => setOpenId(null)}>{t('common.close')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimulatedMailOutboxSection;
