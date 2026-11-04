// src/services/cytology/resolveCytologyScuWeight.test.ts
import { describe, it, expect } from 'vitest';
import { resolveCytologyScuWeight, resolveCytologyScuWeightAdded } from './resolveCytologyScuWeight';

describe('resolveCytologyScuWeight — real, per direct guidance\'s own CLIA weight table', () => {
  it('a real, standard full manual screen weighs 1.0 SCU', () => {
    expect(resolveCytologyScuWeight('primary_manual')).toBe(1.0);
  });

  it('a real liquid-based non-gyn prep weighs 0.5 SCU', () => {
    expect(resolveCytologyScuWeight('liquid_nongyn')).toBe(0.5);
  });

  it('a real FOV-assisted pass with no rescreen weighs 0.5 SCU', () => {
    expect(resolveCytologyScuWeight('fov_assisted')).toBe(0.5);
  });

  it('a real FOV pass escalated to full manual rescreen weighs the real, higher 1.5 SCU', () => {
    expect(resolveCytologyScuWeight('fov_manual_rescreen')).toBe(1.5);
  });

  it('a real pathologist confirmatory review weighs 0 — CLIA\'s own daily cap never governs pathologists', () => {
    expect(resolveCytologyScuWeight('pathologist_review')).toBe(0.0);
  });

  it('Batch 574: a new review adds its weight; an edit only an escalation\'s extra, never less than nothing', () => {
    expect(resolveCytologyScuWeightAdded(undefined, 'primary_manual')).toBe(1);
    expect(resolveCytologyScuWeightAdded('primary_manual', 'primary_manual')).toBe(0);
    expect(resolveCytologyScuWeightAdded('fov_assisted', 'fov_manual_rescreen')).toBe(1);
    expect(resolveCytologyScuWeightAdded('fov_manual_rescreen', 'fov_assisted')).toBe(0);
  });
});
