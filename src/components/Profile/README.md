# components/Profile

Batch 432. The signed-in person's own lists, opened from the profile menu (click your initials → the About panel).

| File | What it is |
|---|---|
| `MyDictionaryModal.tsx` | "My dictionary": words in your own spelling dictionary; add and remove (only you can remove yours). |
| `MyVoiceCommandsModal.tsx` | "My voice commands": phrases PathScribe learned from you; remove one that runs the wrong action. Learned commands are per person since Batch 432. |
| `BiometricSigningModal.tsx` | Batch 433: "Biometric signing". The invitation after sign-in (when the lab asks for it and the person hasn't enrolled) and the profile-menu entry to enrol or remove your own device. Shown only when the lab's policy is on. |

---
*Update this file when a personal list is added here.*

## Batch 611 (part F)

`BiometricSigningModal` shows a **Simulated** note and which prompt (the device's own, or the demonstration one) enrolment used. Test: `BiometricSigningModal.test.tsx`.
