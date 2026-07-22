import React from 'react';

interface ResourcesModalProps {
  isOpen:   boolean;
  onClose:  () => void;
  quickLinks: {
    protocols: { title: string; url: string }[];
    references: { title: string; url: string }[];
    systems: { title: string; url: string }[];
  };
}

const LinkSection: React.FC<{ label: string; links: { title: string; url: string }[] }> = ({ label, links }) => (
  <div style={{ marginBottom: 24 }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>{label}</div>
    {links.map(link => (
      <a key={link.url} href={link.url} target="_blank" rel="noreferrer"
        style={{ display: 'block', padding: '10px 16px', marginBottom: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#cbd5e1', fontSize: 14, textDecoration: 'none' }}
      >{link.title}</a>
    ))}
  </div>
);

const ResourcesModal: React.FC<ResourcesModalProps> = ({ isOpen, onClose, quickLinks }) => {
  if (!isOpen) return null;
  return (
    <div className="ps-overlay" onClick={onClose}>
      <div className="ps-modal-dark" style={{ width: 400 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ color: '#0891B2', fontSize: 24, fontWeight: 700, marginBottom: 24, textAlign: 'center' }}>
          Quick Links
        </div>

        <LinkSection label="Protocols"  links={quickLinks.protocols} />
        <LinkSection label="References" links={quickLinks.references} />
        <LinkSection label="Systems"    links={quickLinks.systems} />

        <button className="ps-btn-ghost-dark" onClick={onClose} style={{ width: '100%', marginTop: 24 }}>
          Close
        </button>
      </div>
    </div>
  );
};

export default ResourcesModal;
