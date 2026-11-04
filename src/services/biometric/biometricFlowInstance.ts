// src/services/biometric/biometricFlowInstance.ts
// Batch 616 (PS-512): biometric signing as the app uses it. The browser-only demo flow with no API address; the server's with one.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpBiometricService } from './httpBiometricService';
import { createServerBiometricFlow } from './serverBiometricFlow';
import { mockBiometricFlow } from './mockBiometricFlow';
import type { IBiometricFlow } from './IBiometricFlow';
import { withDeploymentSwitch } from './biometricDeploymentSwitch';

// Batch 617: VITE_BIOMETRIC_SIGN_IN=false turns it off for the whole deployment (biometricDeploymentSwitch.ts).
export const biometricFlow: IBiometricFlow = withDeploymentSwitch(chooseService<IBiometricFlow>('biometric', mockBiometricFlow, client => createServerBiometricFlow(createHttpBiometricService(client))));
