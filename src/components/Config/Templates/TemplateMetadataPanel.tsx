import React from "react";
import '../../../pathscribe.css';

interface Props { name: string; version: string; source: string; status: string; lastUpdated: string; reviewedBy: string; }

export const TemplateMetadataPanel: React.FC<Props> = ({ name, version, source, status, lastUpdated, reviewedBy }) => {
  const badgeClass = status === 'approved' ? 'ps-tmpl-meta-badge--approved' : status === 'staged' ? 'ps-tmpl-meta-badge--staged' : 'ps-tmpl-meta-badge--default';
  return (
    <div className="ps-tmpl-meta-panel">
      <h2 className="ps-tmpl-meta-title">{name}</h2>
      <div className="ps-tmpl-meta-fields">
        <div><strong>Source:</strong> {source}</div>
        <div><strong>Version:</strong> {version}</div>
        <div><strong>Status:</strong> <span className={`ps-tmpl-meta-badge ${badgeClass}`}>{status}</span></div>
        <div><strong>Last Updated:</strong> {lastUpdated}</div>
        <div><strong>Reviewed By:</strong> {reviewedBy}</div>
      </div>
    </div>
  );
};
