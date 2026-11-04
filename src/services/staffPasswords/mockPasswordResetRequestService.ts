// src/services/staffPasswords/mockPasswordResetRequestService.ts
// Batch 711: the demo build's password reset request service, on the demo's mock services and browser-held data.
import { createPasswordResetRequestService, type IPasswordResetRequestService } from './passwordResetRequestService';
import { mockUserService } from '../users/mockUserService';
import { roleService } from '../roles/roleServiceInstance';
import { messageService } from '../messages/messageServiceInstance';
import { mockAuditService } from '../auditlog/mockAuditService';

export const mockPasswordResetRequestService: IPasswordResetRequestService = createPasswordResetRequestService({
  users: mockUserService, roles: roleService, messages: messageService, audit: mockAuditService,
});
