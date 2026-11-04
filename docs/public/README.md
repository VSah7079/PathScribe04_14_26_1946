# PathScribe — Public Documentation

This folder is for external-facing documentation, public API
references, landing page assets, and end-user release notes.

**Deliberately empty of premature content.** PathScribe hasn't been
deployed to production or released to a customer yet — writing public
API references or release notes now would describe a public surface
that doesn't exist and could mislead whoever reads it later. This
folder is scaffolded and ready; real content belongs here once there's
a real, external audience for it.

## What already exists, elsewhere

- **In-app end-user documentation** (User Guide, Administrator Guide) is built from `docs/user-guide/` and `docs/admin-guide/` into `public/help/user-guide/` and `public/help/admin-guide/`, and opens from the top-bar Help buttons. The old embedded PDFs were removed in Batch 669c.
- **A public API contract** doesn't exist yet in any current, accurate
  form — an earlier draft was found stale (predating most of the
  app's current surface) and was purged rather than kept as a
  misleading starting point. See `../ARCHIVE.md`.

*Corrected in the Batch 496 README audit (Oct 9, 2026): `GETTING_STARTED.md` has no guide-rebuild workflow; the rebuild is `scripts/Update-GuideAssets.ps1`.*

## When to actually write into this folder

Once there's a real production deployment, a real customer-facing API
surface, or a real release worth announcing — write it here then,
against what's actually true at that time.
