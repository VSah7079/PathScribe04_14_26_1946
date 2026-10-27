import React from 'react';
import { useTranslation } from 'react-i18next';
import '../../pathscribe.css';
import './ResourcesModal.css';

import type { ResourceQuickLink } from '@/services/externalResources/externalResourceUrl';

interface ResourcesModalProps {
  isOpen:   boolean;
  onClose:  () => void;
  quickLinks: {
    protocols: ResourceQuickLink[];
    references: ResourceQuickLink[];
    systems: ResourceQuickLink[];
  };
}

// Batch 652: a stored http link is shown as text with a warning and is never opened.
const LinkSection: React.FC<{ label: string; links: ResourceQuickLink[] }> = ({ label, links }) => {
  const { t } = useTranslation();
  return (
    <div className="ps-resources-section">
      <div className="ps-resources-section-label">{label}</div>
      {links.map(link => link.insecure ? (
        <span key={link.url} className="ps-resources-link ps-resources-link--insecure" title={t('resourcesModal.insecureLinkTitle')}>
          {link.title} <span className="ps-resources-insecure-tag">{t('resourcesModal.insecureLink')}</span>
        </span>
      ) : (
        <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="ps-resources-link">
          {link.title}
        </a>
      ))}
    </div>
  );
};

const ResourcesModal: React.FC<ResourcesModalProps> = ({ isOpen, onClose, quickLinks }) => {
  const { t } = useTranslation();
  if (!isOpen) return null;
  return (
    <div className="ps-overlay" onClick={onClose}>
      <div className="ps-modal-dark ps-resources-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ps-resources-title">
          {t('resourcesModal.quickLinks')}
        </div>

        <LinkSection label={t('resourcesModal.protocols')}  links={quickLinks.protocols} />
        <LinkSection label={t('resourcesModal.references')} links={quickLinks.references} />
        <LinkSection label={t('resourcesModal.systems')}    links={quickLinks.systems} />

        <button className="ps-btn-ghost-dark ps-resources-close-btn" onClick={onClose}>
          {t('resourcesModal.close')}
        </button>
      </div>
    </div>
  );
};

export default ResourcesModal;
