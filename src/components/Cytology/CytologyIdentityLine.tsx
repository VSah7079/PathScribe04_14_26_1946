// src/components/Cytology/CytologyIdentityLine.tsx
// Batch 760 (Cytology Workspace & Automated Screening Module spec §2.1, Pete, Nov 2, 2026): the vial type and the slide
// source identifiers of a cytology case, shown on the screening screen and the cytology worklist in place of the
// patient's name and MRN. Presentation only (services/cytology/cytologyBenchIdentity.ts decides what is shown).
import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatList } from '@/utils/formatList';
import type { CytologyCaseIdentity } from '@/services/cytology/cytologyBenchIdentity';

const CytologyIdentityLine: React.FC<{ identity: CytologyCaseIdentity; className?: string }> = ({ identity, className }) => {
  const { t, i18n } = useTranslation();
  const vials = identity.vials.map(v => v.platform
    ? t('cytologyIdentity.vialWithPlatform', { label: v.label, platform: v.platform, description: v.description })
    : t('cytologyIdentity.vial', { label: v.label, description: v.description }));
  const vialText = formatList(vials, i18n.language);
  return (
    <span className={className} data-phi="accession">
      {identity.slideIds.length > 0 ? t('cytologyIdentity.withSlides', { vials: vialText, slides: identity.slideIds.join(', ') }) : vialText}
    </span>
  );
};

export default CytologyIdentityLine;
