/**
 * services/communications/index.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Re-exports the public API of the communications folder.
 * Import from here rather than from individual files.
 *
 * Usage:
 *   import { sendEmail, sendSynopticNotification } from '@services/communications';
 * ─────────────────────────────────────────────────────────────────────────────
 */

// Generic transport
export { sendEmail, postTemplateLifecycleEvent } from './notificationService';

// Domain-specific services
export { sendSynopticNotification }     from './synopticNotificationService';

// Types
export { buildTemplateLifecycleEventPayload, isNotifiableTemplateEvent } from './templateLifecycleEvent';
export type { TemplateLifecycleEventPayload } from './templateLifecycleEvent';
export type { EmailPayload, EmailAttachment } from './types';
export {
  recordSimulatedEmail, recordSimulatedTemplateEvent, listSimulatedEmails, clearSimulatedEmails,
  subscribeSimulatedMail, type SimulatedEmail,
} from './simulatedMailOutbox';
