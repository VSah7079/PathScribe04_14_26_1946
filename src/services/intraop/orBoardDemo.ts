// src/services/intraop/orBoardDemo.ts
// Batch 669 (ops-14): the shared names for the OR Suite Live Board's demo. Start demo and Stop demo put four
// invented DEMO cases into (and take them out of) the real intraoperative data, so they need a capability.
// The capability is `config:or-board-demo:run`; the literal sits at each check (authorizationService.enforce) so the capabilities guard can see it.
/** Every session the demo creates has an id starting with this; Stop demo removes exactly those. */
export const OR_BOARD_DEMO_ID_PREFIX = 'demo-orboard-';
/** Fixed text for logs; the page shows its own translated message. */
export const OR_BOARD_DEMO_NOT_PERMITTED = 'Not permitted to run the OR Suite demo.';
