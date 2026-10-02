# components/Config/RegistryGoLive

`RegistryGoLivePanel` is the registry connection panel (Batches 423–424). It appears on:
- Configuration → Cytology → Screening registry reporting, for the registry being configured;
- Configuration → System → Cancer Registry Reporting, for the enterprise registry and any registry a facility override uses.

What it shows depends on the instance (`services/deployment/`):
- **Badges:** the instance (validation or production) and the connection state (Pending / Testing / Validated / Live). Below them, the template version and what the latest version changed.
- **Both instances:**
  - **The data-sharing agreement.** Nothing is sent until it is recorded, and production's go-live pre-checks it.
  - **Local changes.** This is the overlay of code mappings, the identifier hold and the engine adapter's local rules. A newer template that touches any of them flags them for review, and a **Confirm reviewed** button clears that. Adapter rules can be added and removed here.
- **Validation instance:**
  - the synthetic test suite (**Run test suite**, with per-case results);
  - the accepted count;
  - **Export validation record**, which downloads the JSON file that production imports.
- **Production instance:**
  - Import the validation record.
  - Request go-live, with eight pre-checks.
  - Approve, in stated capacities, with the credential prompt (`SignatureConfirmModal`, action `registry-go-live`, the same prompt as report sign-out). On going live, held results are resent.
  - The permanent statement.
  - **Stop live reporting**, which makes results held again.
  - Approval settings, in the same shape as Template Review.
  - History.

Before Batch 424 the panel had a "Return to test system" button. A production instance never sends to a test system, so that button became **Stop live reporting**.

The panel is rendering only. State is in `hooks/useRegistryGoLive.ts`, and decisions are in `services/registryGoLive/`.
