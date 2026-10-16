import { describe, it, expect, vi } from 'vitest';
import { playAlertTone } from './alertTone';

describe('playAlertTone (Batch 503)', () => {
  it('plays two short beeps with Web Audio, no download', () => {
    const started: number[] = [];
    class FakeCtx {
      state = 'running'; currentTime = 0; destination = {};
      createOscillator() { return { type: '', frequency: { value: 0 }, connect: (g: unknown) => g, start: (t: number) => started.push(t), stop: vi.fn() }; }
      createGain() { const g = { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: (d: unknown) => d }; return g; }
      resume() { return Promise.resolve(); }
    }
    playAlertTone({ AudioContext: FakeCtx as never });
    expect(started).toEqual([0, 0.2]);
  });

  it('without Web Audio it does nothing and never throws', () => {
    expect(() => playAlertTone({})).not.toThrow();
  });
});
