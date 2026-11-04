// src/services/usEpath/epathTransport.ts
// ─────────────────────────────────────────────────────────────────────
// Batch 620 (part E, PS-800): the transport adapter layer. States differ in how they are reached (PHIN-MS, SFTP,
// a direct TCP connection, an HTTPS API), so the HL7 message and the way it travels are kept apart: a profile
// names its transport, and an adapter carries the message without knowing anything about its content.
//
// The transport belongs to the interface engine (PathScribe decides what and when; the engine decides how). The
// adapters here are the CONTRACT and the browser's mocks: they send nothing anywhere and always answer as the engine
// would on a good day (accepted), or as the caller asks in a test. PathScribe keeps the destination (the profile's
// transport) and the status that comes back (an engine acknowledgement updates the queue entry); it never opens a
// connection. Contract: docs/architecture/US_EPATH_API.md
// ─────────────────────────────────────────────────────────────────────
import { EPATH_TRANSPORTS, type EpathTransportKind } from './epathProfile';

export type EpathTransportFailure = 'UNREACHABLE' | 'TIMEOUT' | 'REJECTED';
export interface EpathTransportResult { accepted: boolean; failure?: EpathTransportFailure }
export interface EpathTransportInput { messageControlId: string; message: string }

export interface IEpathTransportAdapter {
  readonly kind: EpathTransportKind;
  send(input: EpathTransportInput): Promise<EpathTransportResult>;
}

/** A mock adapter: nothing leaves the browser. `outcome` lets a test make the receiver fail. */
export function createMockEpathTransport(kind: EpathTransportKind, outcome: EpathTransportResult = { accepted: true }): IEpathTransportAdapter {
  return { kind, send: async () => outcome };
}

/** One adapter per transport; a profile's transport picks the one to use. */
export function createMockEpathTransports(): Record<EpathTransportKind, IEpathTransportAdapter> {
  return Object.fromEntries(EPATH_TRANSPORTS.map(k => [k, createMockEpathTransport(k)])) as Record<EpathTransportKind, IEpathTransportAdapter>;
}
