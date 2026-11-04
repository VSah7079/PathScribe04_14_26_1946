**Batch 617 (part R):** the server version(s) in this folder use the one route style `/api/<area>/<service>/<method-kebab>` (GET for plain-value reads, POST otherwise); earlier paths are in `docs/architecture/HTTP_ROUTE_MAPPING.md`.

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

## Batch 611 (part F) — device prompt, labelled Simulated (#158)

- `platformAuthenticator.ts`: the browser's WebAuthn platform authenticator with a challenge made in the browser (`createPlatformCredential`, `assertPlatformCredential`; `unavailable` / `declined` when absent or refused). Only the credential id and the public key the browser hands over are kept.
- `enrollBiometric` / `verifyBiometric` use it when present and fall back to the demonstration prompt; the credential records which (`prompt: 'device' | 'simulated'`). A cancelled enrolment stores nothing; a refused check returns `DECLINED` so sign-out falls back to the password.
- Audit entries ("Biometric Enrolment (Simulated)", "Biometric Check (Simulated)", "…Not Recognised (Simulated)") name no one.
- Tests: `platformAuthenticator.test.ts`. Still server work: a server-issued challenge and signature verification.



Batch 616: server version in `httpBiometricService.ts` (used when the deployment has an API server address; the demo keeps the mock). Chosen in `(none yet)`. Contract: `docs/architecture/ACCESS_SESSION_API.md`. The screens still use the browser-side functions in `mockBiometricService.ts`, so a server build does not choose this service yet.

## Batch 616 (part F, PS-512) — one flow for the screens

- Screens and the sign-in flow use **`biometricFlow`** (`IBiometricFlow`, from `@/services`). Demo: `mockBiometricFlow.ts` (the labelled Simulated check in `mockBiometricService.ts`, unchanged). API server: `serverBiometricFlow.ts` over `httpBiometricService.ts` (the server makes the challenge and checks the answer; this side only relays the device's WebAuthn response; no simulated fallback; nothing kept in browser storage). `biometricFlowInstance.ts` chooses.
- Moved onto it: the policy card, the profile menu's Biometric signing, the sign-out confirmation, the AppShell and pre-finalisation checks, and the invitation after sign-in (`AuthContext` asks `shouldShowWizard`).
- Test: `serverBiometricFlow.test.ts`.

**Batch 617 (PS-512):** `biometricDeploymentSwitch.ts` wraps the flow: `VITE_BIOMETRIC_SIGN_IN=false` turns biometric sign-in off for the whole deployment (policy shown as off, cannot be turned on, no wizard, no device prompt). Unset, the lab's policy decides as before.
