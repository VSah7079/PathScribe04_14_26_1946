import { ServiceResult, ID } from '../types';
import type { MessageRecipient } from './messageRecipients';

export type { MessageRecipient };

/** The error a send returns when the person lacks the permission (Batch 385). */
export const MESSAGE_NOT_PERMITTED = 'MESSAGE_NOT_PERMITTED';

/**
 * Batch 385: `composedByPerson: true` marks a message the signed-in person wrote in the
 * messages drawer; only those need message:internal:send. Notices the app sends itself
 * (access requests to administrators, template and LIS notices) don't, so someone without the
 * permission can still ask for access.
 */
export interface SendOptions { composedByPerson?: boolean }

export interface SecureEmailInput {
  fromName: string;
  fromEmail: string;
  to: string;
  subject: string;
  body: string;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MessageThread {
  sender: string;
  senderId: ID;
  text: string;
  timestamp: Date;
}

export interface Message {
  id: ID;
  senderId: ID;
  senderName: string;
  recipientId: ID;
  recipientName: string;
  subject: string;
  body: string;
  caseNumber?: string;
  configLink?: string;
  timestamp: Date;
  isUrgent: boolean;
  isRead: boolean;
  isDeleted: boolean;
  thread: MessageThread[];
}

// ─── Interface ────────────────────────────────────────────────────────────────

export interface IMessageService {
  /** Who a message can be addressed to (the organisation's staff). */
  listRecipients(): Promise<ServiceResult<MessageRecipient[]>>;

  /** Send a secure email to an external address. Needs message:secure-email:send. */
  sendSecureEmail(input: SecureEmailInput): Promise<ServiceResult<void>>;

  /** Fetch all messages for a given user (inbox + sent) */
  getInbox(userId: ID): Promise<ServiceResult<Message[]>>;

  /** Fetch a single message by ID */
  getById(id: ID): Promise<ServiceResult<Message>>;

  /** Send a new message. One composed by a person needs message:internal:send (error MESSAGE_NOT_PERMITTED otherwise). */
  send(message: Omit<Message, 'id' | 'isRead' | 'isDeleted' | 'thread'>, options?: SendOptions): Promise<ServiceResult<Message>>;

  /** Reply to an existing thread. A person's reply needs message:internal:send. */
  reply(messageId: ID, senderId: ID, senderName: string, text: string, options?: SendOptions): Promise<ServiceResult<Message>>;

  /** Mark a message as read */
  markRead(id: ID): Promise<ServiceResult<Message>>;

  /** Mark all messages as read for a user */
  markAllRead(userId: ID): Promise<ServiceResult<void>>;

  /** Soft-delete (move to Recently Deleted) */
  softDelete(id: ID): Promise<ServiceResult<Message>>;

  /** Restore from Recently Deleted */
  restore(id: ID): Promise<ServiceResult<Message>>;

  /** Permanently delete a message */
  permanentDelete(id: ID): Promise<ServiceResult<void>>;

  /** Permanently delete all deleted messages for a user */
  emptyDeleted(userId: ID): Promise<ServiceResult<void>>;
}
