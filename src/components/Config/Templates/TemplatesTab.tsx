import React, { useState } from 'react';
import '../../../pathscribe.css';
import { AdminTemplateList } from './AdminTemplateList';

type TemplateSection = 'review' | 'list';

export const TemplatesTab: React.FC = () => {
  const [active, setActive] = useState<TemplateSection>('review');
  return (
    <div>
      <div className="ps-tmpl-subnav">
        {([['review', 'Template Review Queue'], ['list', 'All Templates']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setActive(id)}
            className={`ps-tmpl-subnav-btn${active === id ? ' ps-tmpl-subnav-btn--active' : ''}`}>
            {label}
          </button>
        ))}
      </div>
      {active === 'review' && <AdminTemplateList />}
      {active === 'list' && (
        <div className="ps-tmpl-list-placeholder">
          <h2 className="ps-tmpl-all-title">All Templates</h2>
          <p className="ps-tmpl-all-desc">Manage all grossing and reporting templates.</p>
        </div>
      )}
    </div>
  );
};
