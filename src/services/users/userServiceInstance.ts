// src/services/users/userServiceInstance.ts
// Batch 616 (PS-484): the app's userService, exported from `@/services`.
// The mock in the demo; the API server's with an address (docs/architecture/HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpUserService } from './httpUserService';
import { mockUserService } from './mockUserService';
import type { IUserService } from './IUserService';

export const userService: IUserService = chooseService<IUserService>('users', mockUserService, createHttpUserService);
