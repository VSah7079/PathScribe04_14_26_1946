// src/components/Config/System/BiopsyResectionCorrelationSection.tsx
// Batch 453 (PS-324, PS-156 follow-up): Configuration → System → Biopsy-to-
// resection window. The same screen as the cyto-histo correlation window
// (components/Config/Cytology/CytologyHistologyCorrelationSection.tsx), on
// the surgical settings (services/quality/biopsyResectionCorrelationSettings.ts),
// checked against config:biopsy-resection-correlation:manage.
import React from 'react';
import { biopsyResectionCorrelationSettingsService, facilityBiopsyResectionCorrelationOverrideService } from '@/services';
import { CorrelationWindowSettings } from '../Cytology/CytologyHistologyCorrelationSection';

const BiopsyResectionCorrelationSection: React.FC = () => (
  <CorrelationWindowSettings
    settingsService={biopsyResectionCorrelationSettingsService}
    overrideService={facilityBiopsyResectionCorrelationOverrideService}
    titleKey="biopsyResectionCorrelationSection.title"
    subtitleKey="biopsyResectionCorrelationSection.subtitle"
  />
);

export default BiopsyResectionCorrelationSection;
