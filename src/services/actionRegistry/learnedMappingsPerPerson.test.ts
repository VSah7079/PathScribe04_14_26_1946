// @vitest-environment happy-dom
//
// src/services/actionRegistry/learnedMappingsPerPerson.test.ts
// Batch 432 (Pete): learned voice commands belong to the person who taught them.
import { describe, it, expect, vi } from 'vitest';

let sessionId = '1';
vi.mock('../auth/caseAccessControl', () => ({ getSessionUser: () => ({ id: sessionId }) }));

describe('learned voice commands are per person', () => {
  it('a phrase Sarah taught is hers; another person does not see or match it', async () => {
    localStorage.clear();
    const { mockActionRegistryService: svc } = await import('./mockActionRegistryService');
    const action = svc.getActions().find(a => a.isActive)!;
    expect(action).toBeTruthy();
    const miss = svc.recordMiss('frobnicate the thing');
    svc.confirmMiss(miss.id, action.id, 'manual');
    expect(svc.getLearnedMappings().map(m => m.transcript)).toEqual(['frobnicate the thing']);
    sessionId = '2';
    expect(svc.getLearnedMappings()).toEqual([]);
    sessionId = '1';
    expect(svc.getLearnedMappings().map(m => m.transcript)).toEqual(['frobnicate the thing']);
    svc.removeLearnedMapping('frobnicate the thing');
    expect(svc.getLearnedMappings()).toEqual([]);
  });
});
