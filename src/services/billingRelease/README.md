# billingRelease/

Batch 619 (PS-800). When a **generated** charge is **released** from the Outbound Queue to billing. The performing laboratory controls this per billing type; the interface engine still owns how the charge is sent.

Generation is unchanged: the Billing Type Trigger setting decides the milestone (technical charge at grossing, professional -26 and Global at final sign-out; PS-336). These rules start from that milestone.

| File | What it is |
|---|---|
| `billingRelease.ts` | The rules, pure: validation, matching (a performing facility's own rule beats any enterprise rule; the more a rule says, the more specific), the decision (`decideRelease`: due, waiting, review, manual), the cron view, `releaseStatusFor`, `planAmendment`, the enterprise seed. Timing reuses `deliverySchedules` (`evaluateSchedule`). |
| `IBillingReleaseService.ts`, `mockBillingReleaseService.ts`, `httpBillingReleaseService.ts`, `billingReleaseServiceInstance.ts` | Stored rules (`getAll`, `getForFacility`, `set`, `remove`); changes need `config:billing-release:manage`. Contract `docs/architecture/BILLING_RELEASE_API.md`. |
| `billingReleaseFeed.ts` | `withBillingRelease(adapter, deps)` wraps the Outbound Queue's `IBillingFeedAdapter` so billing items carry `scheduledReleaseAt`, `needsReview`, `amendmentDelta`, `overriddenBy` and show as held until the rules release them; `retractQueuedCharges` cancels a case's unsent charges. |
| `billingReleaseFacts.ts` | The demo's source of the facts the rules read about a charge (best effort from the case). |

Defaults (editable): technical charge not held; professional and Global released at final sign-out; unmapped CPT or missing technical-component facility parked for review; an amendment's delta charge always reviewed.
