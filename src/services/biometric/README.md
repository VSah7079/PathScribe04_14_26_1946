# services/biometric/

WebAuthn-based biometric e-signature (fingerprint/face) for report sign-out.

**Pattern:** Standard interface/mock/firestore pattern.

## Notes

- Real WebAuthn architecture documented inline: enrollBiometric challenge/attestation flow, verifyEnrolment server-side verification.

**Batch 344:**
- **Barrel export:** the module is exported from `@/services` as `biometricService`, so `PreFinalisationModal` no longer imports the mock file.
- **Signing:** the check is still simulated (`verifyBiometric` always succeeds after enrolment). So signing with it is offered only in demo builds, through `services/auth/signerConfirmation.ts`.
- **Still to do:** a real WebAuthn challenge issued and verified by the API server.

## Batch 433 — biometric signing policy

- The lab's policy (on/off, how often the device check is asked: every sign-out, once per session, every N days, never) is kept in the lab settings store; `normaliseBiometricPolicy` fills gaps. `saveBiometricPolicy` needs `config:session-security:manage`.
- Enrolling and removing a credential are for the signed-in person only (`getSessionUser`); nobody enrols or removes someone else's device.
- Screens: Configuration → System → Session security → Biometric e-signature (`components/Config/System/BiometricPolicyCard.tsx`); the profile menu's **Biometric signing** and the invitation after sign-in (`components/Profile/BiometricSigningModal.tsx`).
- Test: `biometricPolicy.test.ts`.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*
## Batch 526

Test files here no longer set their own time limit below the suite's 60 s (`vitest.config.ts`); on a busy Windows machine those shorter limits caused false timeouts.
