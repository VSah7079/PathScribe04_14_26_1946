// Seeded, labelled-simulated engraver devices and dispatch history, used when no Firebase project is connected.
import type { EngraverDevice } from './fetchEngraverDevices';
import type { DispatchHistoryEntry } from './fetchDispatchHistoryForCase';

export function simulatedEngraverDevices(now: Date = new Date()): EngraverDevice[] {
  const ago = (min: number) => new Date(now.getTime() - min * 60000).toISOString();
  const base = { diagnosticsUrl: null, sourceSystem: 'Simulated' };
  return [
    { ...base, deviceId: 'SIM-ENG-01', deviceName: 'Cassette printer 1', locationLabel: 'Histology bench A', organisationId: 'ORG-MFT', siteId: 'SITE-MRI', status: 'online', supplyWarnings: [], warnings: [], lastReportedAt: ago(1) },
    { ...base, deviceId: 'SIM-ENG-02', deviceName: 'Cassette printer 2', locationLabel: 'Histology bench B', organisationId: 'ORG-MFT', siteId: 'SITE-MRI', status: 'engraving', supplyWarnings: [], warnings: [], lastReportedAt: ago(2) },
    { ...base, deviceId: 'SIM-ENG-03', deviceName: 'Slide printer 1', locationLabel: 'Slide room', organisationId: 'ORG-MFT', siteId: 'SITE-WYT', status: 'warning', supplyWarnings: [{ code: 'CASSETTE_SUPPLY_LOW', colorKey: 'COLOR_BIOPSY' }], warnings: ['Firmware update available'], lastReportedAt: ago(5) },
    { ...base, deviceId: 'SIM-ENG-04', deviceName: 'Cassette printer 3', locationLabel: 'Frozen section lab', organisationId: 'ORG-NWH', siteId: null, status: 'fault', supplyWarnings: [{ code: 'CASSETTE_SUPPLY_DEPLETED', colorKey: 'COLOR_RESECTION' }], warnings: ['Cover open'], lastReportedAt: ago(9) },
    { ...base, deviceId: 'SIM-ENG-05', deviceName: 'Cassette printer 4', locationLabel: 'Satellite lab', organisationId: 'ORG-NWH', siteId: null, status: 'offline', supplyWarnings: [], warnings: [], lastReportedAt: ago(240) },
  ];
}

export function simulatedDispatchHistory(caseId: string, now: Date = new Date()): DispatchHistoryEntry[] {
  const at = (min: number) => new Date(now.getTime() - min * 60000).toISOString();
  return [
    { eventType: 'block-exception', createdAt: at(10), payload: { messageId: `SIM-${caseId}-3`, timestamp: at(10), organisationId: 'ORG-MFT', internalCaseId: caseId, accessionNumber: caseId, specimenLetter: 'A', blockNumber: 'A2', status: 'Damaged', note: 'Simulated: block cracked at embedding' } as never },
    { eventType: 'cassette-dispatch-outcome', createdAt: at(30), payload: { messageId: `SIM-${caseId}-2`, caseId, specimenLabel: 'A', requestedColorKey: 'COLOR_BIOPSY', actualColorKey: 'COLOR_RESECTION', outcome: 'fallback_used', message: 'Simulated: requested colour empty, fallback used', reportedAt: at(30), sourceSystem: 'Simulated' } },
    { eventType: 'cassette-dispatch-outcome', createdAt: at(31), payload: { messageId: `SIM-${caseId}-1`, caseId, specimenLabel: 'A', requestedColorKey: 'COLOR_BIOPSY', actualColorKey: 'COLOR_BIOPSY', outcome: 'dispatched', reportedAt: at(31), sourceSystem: 'Simulated' } },
  ];
}
