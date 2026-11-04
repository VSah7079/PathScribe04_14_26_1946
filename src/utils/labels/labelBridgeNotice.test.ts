import { describe, expect, it, vi } from 'vitest';
import { reportLabelBridgeFailure, subscribeLabelBridgeFailure } from './labelBridgeNotice';

describe('labelBridgeNotice', () => {
  it('tells a subscriber once per failure', () => {
    const listener = vi.fn();
    const stop = subscribeLabelBridgeFailure(listener);
    reportLabelBridgeFailure();
    expect(listener).toHaveBeenCalledTimes(1);
    stop();
  });

  it('stops telling a subscriber after it unsubscribes', () => {
    const listener = vi.fn();
    subscribeLabelBridgeFailure(listener)();
    reportLabelBridgeFailure();
    expect(listener).not.toHaveBeenCalled();
  });
});
