// src/services/supportAccess/defaultSupportAccessService.ts
// Batch 372: the app's support access service, wired to this build's
// services. Exported from `@/services` as `supportAccessService`.

import { DEMO_SUPPORT_ACCESS_SETTINGS, demoSupportAccessRequests } from './demoSupportAccessSeed';
import i18n from '@/i18n/config';
import { storageGet, storageSet } from '../mockStorage';
import { readSessionProfile } from '../auth/sessionProfile';
import { facilityService } from '../facilities/facilityServiceInstance';
import { userService } from '../users/userServiceInstance';
import { roleService } from '../roles/roleServiceInstance';
import { messageService } from '../messages/messageServiceInstance';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { createSupportAccessService } from './supportAccessService';
import { setSupportActivityHandler } from './supportActivity';
import { recordSimulatedEmail } from '../communications/simulatedMailOutbox';
import { browserRunsServerJob } from '../serverJobs/browserStandIns';

export const supportAccessService = createSupportAccessService({
  authorization: authorizationService,
  // Batch 555: once the API server runs supportAccess.expire (VITE_SERVER_JOBS), it records the expiries.
  runServerJobs: () => browserRunsServerJob('supportAccess.expire'),
  session: () => {
    const p = readSessionProfile();
    return p ? { id: p.id, name: p.name, role: p.role, organisationId: p.organisationId } : null;
  },
  enterpriseFacilities: async () => {
    const r = await facilityService.getAll();
    return r.ok ? r.data.filter(f => f.isEnterprise) : [];
  },
  staff: async () => { const r = await userService.getAll(); return r.ok ? r.data : []; },
  roles: async () => { const r = await roleService.getAll(); return r.ok ? r.data : []; },
  // In-app message to each approver, in the app's current language. Email
  // and webhooks are the API server's job (phase 4).
  notify: async m => {
    await messageService.send({
      senderId: m.senderId, senderName: m.senderName, recipientId: m.recipientId, recipientName: m.recipientName,
      subject: i18n.t('supportAccess.notification.subject', { ticket: m.ticketId }),
      body: i18n.t('supportAccess.notification.body', { agent: m.senderName, organisation: m.tenantName, ticket: m.ticketId, reason: m.reason }),
      configLink: '/configuration?tab=system&section=support_access',
      timestamp: new Date(), isUrgent: true,
    } as any);
    // Batch 604: the approver's e-mail/webhook notice is the API server's job; here it is kept as a
    // labelled Simulated e-mail (no ticket reason in it: it can describe a patient).
    if (m.recipientEmail) {
      recordSimulatedEmail({
        to: [m.recipientEmail], subject: i18n.t('supportAccess.notification.subject', { ticket: m.ticketId }),
        bodyText: i18n.t('supportAccess.notification.emailBody', { agent: m.senderName, organisation: m.tenantName, ticket: m.ticketId }),
        bodyHtml: '', metadata: { source: 'support-access-request' },
      }, m.senderName);
    }
  },
  store: { get: storageGet, set: storageSet },
  seedSettings: DEMO_SUPPORT_ACCESS_SETTINGS,
  // Batch 456: a request awaiting Desert Valley's approval (demo seed).
  seedRequests: () => demoSupportAccessRequests(),
});

// Batch 604: the support agent's own exports and configuration changes also go to the support stream.
setSupportActivityHandler(a => supportAccessService.recordSupportActivity(a));
