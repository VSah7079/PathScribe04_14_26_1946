<<<<<<< HEAD
import React from "react";
import '../../pathscribe.css';
import { FlagDefinition } from "../../types/FlagDefinition";

interface Props {
  flags: FlagDefinition[];
}

const AutoCreatedBanner: React.FC<Props> = ({ flags }) => {
  const codes = flags.map(f => f.lisCode).join(", ");

  return (
    <div className="banner-warning">
      <strong>New LIS Flags Detected:</strong> {codes}
      <div>These flags were automatically created from LIS codes. Review and update as needed.</div>
=======
import React from 'react';
import '../../pathscribe.css';
import { Flag } from '../../services/flags/IFlagService';

interface Props {
  flags: Flag[];
  onReview: () => void;
}

const AutoCreatedBanner: React.FC<Props> = ({ flags, onReview }) => {
  if (!flags.length) return null;

  const codes = flags.map(f => f.lisCode).join(', ');
  const count = flags.length;

  return (
    <div className="banner-warning" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
      <div>
        <strong>
          {count} new LIS flag{count !== 1 ? 's' : ''} detected:
        </strong>{' '}
        {codes}
        <div style={{ marginTop: 4, fontSize: 13 }}>
          These flags were automatically created from unrecognised LIS codes and added as
          Administrative flags. Review and update them before they appear in case workflows.
        </div>
      </div>
      <button
        className="ps-conf-btn-primary"
        onClick={onReview}
        style={{ flexShrink: 0 }}
      >
        Review Now
      </button>
>>>>>>> upstream/main
    </div>
  );
};

export default AutoCreatedBanner;
