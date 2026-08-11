# src/services/hardware/

One file: `ModeAInterfaceService.ts` — dispatches hardware/LIS orders
(currently just `BLOCK_ORDER`) through the existing HL7 seam
(`hl7/ormBuilder.ts` for the standard core, then a named
`IHL7VendorAdapter` for vendor-specific transformation).

Genuinely excellent, careful code — no issues found. Real
architectural discipline worth noting: it deliberately builds on the
*existing* HL7 pipeline rather than a new, parallel one, specifically
so nothing here has to guess at vendor-specific field layouts without
a verified integration guide. The two not-yet-supported event types
(`dispatchSlideOrder`, `dispatchSpecimenLabel`) throw clear, explicit
"not yet implemented" errors rather than faking a message-building
path that doesn't exist — same honesty standard as the vendor adapter
layer itself. `resolveModeAOrgContext`'s own comment explicitly
explains why it does *not* try to resolve a hardware endpoint URL
(no site-to-endpoint mapping exists anywhere in this codebase yet, and
fabricating one would repeat exactly the kind of unverified-guess
mistake this whole feature exists to avoid).

**Currently unwired, by design, not by accident.** Every reference to
`ModeAInterfaceService` found elsewhere in the codebase (`Case.ts`,
`AddSpecimenPayload.ts`, `organisationService.ts`,
`AccessionPage.tsx`) turned out to be a comment explaining *why*
something is designed the way it is with this future integration in
mind — not an actual import or call. This is real, planned,
forward-looking infrastructure for a hardware-triggered
specimen/order-dispatch flow that hasn't been connected to a caller
yet, not dead or abandoned code.
