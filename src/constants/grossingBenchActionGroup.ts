// src/constants/grossingBenchActionGroup.ts
// Batch 720: the Grossing screen's bench tools as their own action group, so systemActions.ts (over 1,000 lines) does not grow.
// Spread into ACTION_GROUPS through addedActionGroups.ts. Screen actions: they work only while the Grossing screen is open
// (context GROSSING, which the screen already sets).
//   grossing.printCassettes  print the cassette labels for the case                  Alt+Shift+1   foot pedal 2
//   grossing.takePhoto       open the camera for a gross photo of the first specimen  Alt+Shift+2   foot pedal 1
//   grossing.assignDecal     send the first block that needs it to a decal batch      Alt+Shift+3
//   grossing.addOnOrder      open the Add-On Order Builder for this case              Alt+Shift+4
// Releasing blocks stays a deliberate click (the triage checklist gates it). Phrases: services/actionRegistry/grossingBenchVoiceCommands.ts.
// The screen listens in pages/GrossingScreenPage/hooks/useGrossingBenchEvents.ts.
import type { ActionGroup } from './systemActions';

export type GrossingBenchActionId = 'grossing.printCassettes' | 'grossing.takePhoto' | 'grossing.assignDecal' | 'grossing.addOnOrder';

export const GROSSING_BENCH_ACTION_GROUP: ActionGroup = {
  id: 'grossing_bench',
  title: 'Grossing Bench',
  actions: [
    { id: 'grossing.printCassettes', label: 'Print Cassettes', internalKey: 'F38+PS001' },
    { id: 'grossing.takePhoto', label: 'Take a Gross Photo', internalKey: 'F38+PS002' },
    { id: 'grossing.assignDecal', label: 'Assign to Decalcification', internalKey: 'F38+PS003' },
    { id: 'grossing.addOnOrder', label: 'Open the Add-On Order Builder', internalKey: 'F38+PS004' },
  ],
};
