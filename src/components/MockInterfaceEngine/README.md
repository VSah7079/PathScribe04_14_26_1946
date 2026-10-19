# components/MockInterfaceEngine

Batch 605: panels on the Mock Interface Engine page and the buttons that hand messages to the simulated engine.

- `InboundSimulatorPanel.tsx`: pick or paste an inbound ADT message or event and run it; shows what changed.
- `SimulatedEngineLogPanel.tsx`: messages the simulated engine received (type and outcome), with a clear button.
- `RegistryAnswerSimulatorPanel.tsx`: plays the registry's answer for a sent submission.
- `SendBlockOrderButton.tsx`: sends the block, slide or specimen label order from the block editor.

Everything here is labelled Simulated. See `services/mockInterfaceEngine/README.md`.
