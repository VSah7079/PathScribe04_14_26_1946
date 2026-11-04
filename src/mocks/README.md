# src/mocks/

Developer-only network answers ([MSW](https://mswjs.io/)). They are started from `main.tsx` only in a development build, and only when switched on at `/dev/mock-interface-engine`; see `services/mockInterfaceEngine/README.md`.

- `handlers.ts`:
  - `POST /api/v1/events/molecular-worklist` (PS-239);
  - since Batch 435, the interface engine's receiving end (`VITE_INTERFACE_RECEIVER_ENDPOINT`) for every outbound interface message.

  Both answer in the chosen mode (succeed, fail, hang). After a `WSI_SCAN_MANIFEST` the handler can also play the slide scanner (`services/mockInterfaceEngine/simulateWsiScanner.ts`).
- `browser.ts`: the MSW worker.

## Batch 467b — Molecular orders: send-out results, plate, sign-out, instrument

The molecular worklist handler starts the simulated instrument (`services/mockInterfaceEngine/simulateMolecularInstrument.ts`).

---
*When this folder's contents change meaningfully, update THIS file.*
