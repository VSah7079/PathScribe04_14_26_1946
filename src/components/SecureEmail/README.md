# components/SecureEmail

## SecureEmailModal.tsx (Batch 517, PS-143)

The secure message window. Batch 517 moved it out of `AppShell.tsx` so that the critical-findings flow can open it too.

- **Gateways.** It sends through one of the person's lab's gateways. The lab's default is preselected.
  - The gateways are set in Configuration → Facility dictionary → the lab's enterprise facility → **Secure messaging**.
  - The lab is found from the person's organisation (`secureMessagingConfigService.forOrganisation`).
- **Branding.** The window shows the chosen gateway's name, not a fixed "NHSMail" (Pete, Oct 2: Option A). The security notice names the gateway's BAA or data processing agreement and its reference.
- **Patient data.**
  - A "Contains patient or case details" box is ticked by default. A caller that knows the message carries patient data (the critical-findings email) passes `containsPatientData` and the box can't be unticked.
  - A gateway without its agreement in force can't carry patient data. The window says why, and `messageService.sendSecureEmail` refuses the send again.
- **Clinical-messaging gateways.** HealthLink, Medical-Objects, ReferralNet and Korea's health information exchange address a recipient's directory ID, not an email address. The To field changes to match.
- **Field Requirements** (Batch 384), the `message:secure-email:send` check (Batch 385) and the voice/keyboard "submit secure email" command work as before.
- **PHI.** The subject and text may name a case, so they are tagged `data-phi`.
- **Not real yet.** Sending is still simulated; the real transports are PS-332.
- **Mounting.** The window is mounted only while open, so its hooks run only then.

Tests: `components/AppShell/messagingRequirements.test.tsx` (field requirements, permission, per-gateway agreements, no gateway) and `pages/SynopticReportPage/modals/CriticalFindingsModal.test.tsx`.
