# components/Interfaces

- **`EngineStatusLine.tsx`** (Batch 554, PS-539 phase 2d): one line above the Audit Log's Interfaces sub-tabs, for example "Interface engines: 1 offline, 1 listener down and 2 online". Zero counts are left out. One click opens Engines.
  - It is shown with the API server and `interface:engine-status:view`, and not while the last read failed.
  - It is styled as a problem when an engine is offline or degraded, or a listener is down.
  - Data comes from `hooks/useInterfaceEngines.ts`, and the rules from `services/interfaceMonitoring`.
