# services/biometric/

WebAuthn-based biometric e-signature (fingerprint/face) for report sign-out.

**Pattern:** Standard interface/mock/firestore pattern.

## Notes

- Real WebAuthn architecture documented inline: enrollBiometric challenge/attestation flow, verifyEnrolment server-side verification.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*