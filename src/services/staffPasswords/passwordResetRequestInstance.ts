// src/services/staffPasswords/passwordResetRequestInstance.ts
// Batch 711: the app's password reset request service, exported from `@/services`.
// The mock in the demo. With an API server configured the build signs in through the
// customer's identity provider and has no passwords, so the "server" version always
// answers 'unavailable' (docs/architecture/PASSWORD_RESET_REQUEST_API.md).
import { chooseService } from '../apiServer/serviceSelection';
import { mockPasswordResetRequestService } from './mockPasswordResetRequestService';
import type { IPasswordResetRequestService } from './passwordResetRequestService';

const unavailableService: IPasswordResetRequestService = {
  request: async () => ({ ok: true, data: 'unavailable' }),
  markHandled: async () => 0,
  openRequests: async () => [],
};

export const passwordResetRequestService: IPasswordResetRequestService = chooseService<IPasswordResetRequestService>(
  'passwordResetRequest', mockPasswordResetRequestService, () => unavailableService);
