# deliverySchedules (Batch 619, PS-800)

When things go out. PathScribe decides when; the interface engine decides how.

- `deliverySchedule.ts`: the schedule model, validation, time-zone helpers, `evaluateSchedule`, `batchRunForItem`, `deadlineStatus`, `resolveDeliverySchedule` (performing facility, then enterprise, then the feed's default). Pure.
- `IDeliveryScheduleService.ts`, `mockDeliveryScheduleService.ts` (guarded by `config:delivery-schedules:manage`), `httpDeliveryScheduleService.ts`, `deliveryScheduleServiceInstance.ts`.
- `registryChoices.ts`: the registries that can have a schedule (one each).
- Screen: `components/Config/System/DeliverySchedulesSection.tsx`. Contract: `docs/architecture/DELIVERY_SCHEDULES_API.md`.
