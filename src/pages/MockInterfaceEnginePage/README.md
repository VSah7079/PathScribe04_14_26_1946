# pages/MockInterfaceEnginePage/

- **`MockInterfaceEnginePage.tsx`** — the real control panel for the mock
  PS-239 backend endpoint. See `services/mockInterfaceEngine/README.md` for
  the full account of what this is, why it's safely gated, and exactly what
  it does and doesn't affect.

**Real, deliberate placement**: reachable only at `/dev/mock-interface-engine`
— not linked from Config, the home page, or any real navigation. A real
admin or clinical user should never stumble onto a developer tool that fakes
a backend response.

**Batch 427:** the route also needs Configuration access (`ScreenGate screen="configuration"`), so someone without it can't open the tool by typing its address.

## Batch 435

A switch, **Answer for the slide scanner**, is on by default. The banner and subtitle now say the tool also answers every outbound interface message, not only the molecular worklist. See `services/mockInterfaceEngine/README.md`.

## Batch 467b — Molecular orders: send-out results, plate, sign-out, instrument

"Molecular instrument results" chooses what the simulated instrument reports after a worklist: Positive, Negative or no results.
