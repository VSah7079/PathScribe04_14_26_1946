// src/components/Printing/SiteAgentStatusLine.tsx
// Batch 552 (PS-539 phase 2d; SITE_AGENT_API.md §9): one line in the Print
// Queue saying how the site agents that print its jobs are doing (online,
// needs attention, offline), with a link to Configuration → Site agents.
// Shown only with the API server and at least one agent the user may see.
// Renders only: hooks/useSiteAgents.ts (useSiteAgentCounts).
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useSiteAgentCounts } from '@/hooks/useSiteAgents';
import type { ISiteAgentAdminService } from '@/services/siteAgent/siteAgentAdminService';

export const SITE_AGENTS_CONFIG_PATH = '/configuration?tab=system&section=site_agents';

export const SiteAgentStatusLine: React.FC<{ service?: ISiteAgentAdminService }> = ({ service }) => {
  const { t } = useTranslation();
  const counts = useSiteAgentCounts(service);
  if (!counts) return null;
  const attention = counts.degraded + counts.offline > 0;
  return (
    <p className={`ps-siteagents-line${attention ? ' ps-siteagents-line--attention' : ''}`} role="status">
      <span>{t('siteAgents.line', { online: counts.online, degraded: counts.degraded, offline: counts.offline })}</span>
      <Link to={SITE_AGENTS_CONFIG_PATH} className="ps-siteagents-link">{t('siteAgents.lineLink')}</Link>
    </p>
  );
};
